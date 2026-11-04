import { TelemetryReading, ProductType } from '@kiot/shared-types';
import { telemetryBuffer } from '../buffer.js';
import { updateHotTelemetryCache, publishTelemetryEvent } from '../redis.js';
import { updateDeviceHeartbeat } from '../db.js';

export async function handleTelemetryMessage(
  topicParts: string[],
  rawPayload: Buffer
): Promise<void> {
  // Topic pattern: kiot/{organizationId}/devices/{deviceId}/telemetry
  const organizationId = topicParts[1];
  const deviceId = topicParts[3];

  if (!organizationId || !deviceId) {
    console.warn('[Telemetry Handler] Malformed telemetry topic:', topicParts.join('/'));
    return;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawPayload.toString('utf-8'));
  } catch {
    console.error('[Telemetry Handler] Invalid JSON payload from device:', deviceId);
    return;
  }

  const payload = parsed as Record<string, unknown>;
  const serverTimestamp = new Date().toISOString();
  const deviceTimestamp = (payload.deviceTimestamp as string) || (payload.timestamp as string) || serverTimestamp;
  const productId = (payload.productId as ProductType) || 'industrial';
  const gatewayId = (payload.gatewayId as string) || undefined;

  // 1. Support batch readings array or single metric
  const items: Array<{ metric: string; value: number; unit: string }> = [];

  if (Array.isArray(payload.readings)) {
    for (const r of payload.readings as Array<Record<string, unknown>>) {
      if (typeof r.metric === 'string' && typeof r.value === 'number') {
        items.push({
          metric: r.metric,
          value: r.value,
          unit: (r.unit as string) || '',
        });
      }
    }
  } else if (typeof payload.metric === 'string' && typeof payload.value === 'number') {
    items.push({
      metric: payload.metric,
      value: payload.value,
      unit: (payload.unit as string) || '',
    });
  }

  if (items.length === 0) {
    return;
  }

  // 2. Queue into batch buffer and update hot cache & pub/sub
  for (const item of items) {
    const reading: TelemetryReading = {
      organizationId,
      productId,
      gatewayId,
      deviceId,
      metric: item.metric,
      value: item.value,
      unit: item.unit,
      deviceTimestamp,
      serverTimestamp,
      quality: 'good',
    };

    // Buffer for batch write to TimescaleDB
    telemetryBuffer.enqueue(reading);

    // Fast-path hot state cache in Redis
    void updateHotTelemetryCache(deviceId, item.metric, item.value, item.unit, deviceTimestamp);

    // Fan-out to Redis Pub/Sub for live frontend WebSocket dashboards
    void publishTelemetryEvent(organizationId, {
      type: 'TELEMETRY_UPDATE',
      organizationId,
      deviceId,
      metric: item.metric,
      value: item.value,
      unit: item.unit,
      timestamp: deviceTimestamp,
    });
  }

  // 3. Update device last_seen_at heartbeat
  void updateDeviceHeartbeat(deviceId, deviceTimestamp);
}

