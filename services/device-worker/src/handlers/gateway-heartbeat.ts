import { pool } from '../db.js';
import { publishTelemetryEvent, redis } from '../redis.js';

export async function handleGatewayHeartbeatMessage(
  topicParts: string[],
  rawPayload: Buffer
): Promise<void> {
  // Topic: kiot/{org_id}/gateways/{gateway_id}/heartbeat
  const organizationId = topicParts[1];
  const gatewayId = topicParts[3];

  if (!organizationId || !gatewayId) return;

  try {
    const data = JSON.parse(rawPayload.toString('utf8')) as {
      cpuLoadAvg?: number;
      memoryUsagePct?: number;
      offlineBufferDepth?: number;
      activeModbusSlaves?: number;
      polledRegistersCount?: number;
      uptimeSeconds?: number;
      timestamp?: string;
    };

    await pool.query(
      `UPDATE gateways
       SET status = 'online',
           last_heartbeat_at = NOW(),
           updated_at = NOW()
       WHERE id = $1 AND organization_id = $2;`,
      [gatewayId, organizationId]
    );

    // Cache live gateway diagnostics in Redis
    await redis.set(
      `gateway:${gatewayId}:diagnostics`,
      JSON.stringify({
        gatewayId,
        organizationId,
        ...data,
        lastHeartbeatAt: new Date().toISOString(),
      }),
      'EX',
      300
    );

    await publishTelemetryEvent(organizationId, {
      type: 'GATEWAY_HEARTBEAT',
      organizationId,
      gatewayId,
      diagnostics: data,
    });
  } catch (err) {
    console.error(`[Worker] Failed to process heartbeat for gateway ${gatewayId}:`, err);
  }
}
