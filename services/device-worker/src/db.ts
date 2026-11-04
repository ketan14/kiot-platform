import pg from 'pg';
import { config } from './config.js';
import { TelemetryReading } from '@kiot/shared-types';

export const pool = new pg.Pool({
  connectionString: config.DATABASE_URL,
  max: 15,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[Worker DB Pool Error]:', err);
});

/**
 * Bulk insert telemetry readings into TimescaleDB hypertable
 */
export async function bulkInsertTelemetry(readings: TelemetryReading[]): Promise<number> {
  if (readings.length === 0) return 0;

  const client = await pool.connect();
  try {
    const valueTuples: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    for (const r of readings) {
      valueTuples.push(
        `($${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++})`
      );
      values.push(
        r.deviceTimestamp,
        r.organizationId,
        r.productId,
        r.deviceId,
        r.gatewayId || null,
        r.metric,
        r.value,
        r.unit,
        r.quality || 'good',
        r.sequenceNumber || null
      );
    }

    const query = `
      INSERT INTO telemetry_readings (
        time, organization_id, product_id, device_id, gateway_id,
        metric, value, unit, quality, sequence_number
      ) VALUES ${valueTuples.join(', ')}
      ON CONFLICT DO NOTHING;
    `;

    const res = await client.query(query, values);
    return res.rowCount || 0;
  } finally {
    client.release();
  }
}

/**
 * Update device online status and heartbeat timestamp
 */
export async function updateDeviceHeartbeat(deviceId: string, lastSeenAt: string): Promise<void> {
  const query = `
    UPDATE devices 
    SET last_seen_at = $1, status = 'online', updated_at = now() 
    WHERE id = $2;
  `;
  try {
    await pool.query(query, [lastSeenAt, deviceId]);
  } catch (err) {
    console.error(`[Worker DB] Failed to update heartbeat for ${deviceId}:`, err);
  }
}

