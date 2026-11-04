import { pool } from '../db.js';

export async function handleStateMessage(
  topicParts: string[],
  rawPayload: Buffer
): Promise<void> {
  // Topic pattern: kiot/{organizationId}/devices/{deviceId}/state
  const organizationId = topicParts[1];
  const deviceId = topicParts[3];

  if (!organizationId || !deviceId) return;

  let reportedState: Record<string, unknown>;
  try {
    reportedState = JSON.parse(rawPayload.toString('utf-8'));
  } catch {
    console.error('[State Handler] Malformed JSON from device:', deviceId);
    return;
  }

  const client = await pool.connect();
  try {
    // 1. Fetch current shadow desired state
    const shadowRes = await client.query(
      `SELECT desired, version FROM device_shadows WHERE device_id = $1 AND organization_id = $2;`,
      [deviceId, organizationId]
    );

    const desiredState = shadowRes.rowCount && shadowRes.rowCount > 0 ? (shadowRes.rows[0].desired as Record<string, unknown>) : {};
    const nextVersion = shadowRes.rowCount && shadowRes.rowCount > 0 ? (shadowRes.rows[0].version as number) + 1 : 1;

    // 2. Compute delta
    const delta: Record<string, unknown> = {};
    for (const [key, desiredVal] of Object.entries(desiredState)) {
      if (reportedState[key] !== desiredVal) {
        delta[key] = desiredVal;
      }
    }

    // 3. Upsert into device_shadows
    const upsertQuery = `
      INSERT INTO device_shadows (device_id, organization_id, desired, reported, delta, version, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, now())
      ON CONFLICT (device_id) DO UPDATE SET
        reported = EXCLUDED.reported,
        delta = EXCLUDED.delta,
        version = EXCLUDED.version,
        updated_at = now();
    `;
    await client.query(upsertQuery, [
      deviceId,
      organizationId,
      JSON.stringify(desiredState),
      JSON.stringify(reportedState),
      JSON.stringify(delta),
      nextVersion,
    ]);

    // 4. Update device heartbeat
    await client.query(
      `UPDATE devices SET last_seen_at = now(), status = 'online' WHERE id = $1;`,
      [deviceId]
    );

    console.log(`[State Handler] Updated shadow for device ${deviceId} (Version: ${nextVersion})`);
  } catch (err) {
    console.error(`[State Handler] Failed to update shadow for ${deviceId}:`, err);
  } finally {
    client.release();
  }
}

