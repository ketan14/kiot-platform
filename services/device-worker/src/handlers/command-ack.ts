import { pool } from '../db.js';

export async function handleCommandAckMessage(
  topicParts: string[],
  rawPayload: Buffer
): Promise<void> {
  // Topic pattern: kiot/{organizationId}/devices/{deviceId}/commands/{commandId}/ack
  const commandId = topicParts[5];

  if (!commandId) return;

  let payload: { status?: string; reason?: string };
  try {
    payload = JSON.parse(rawPayload.toString('utf-8'));
  } catch {
    console.error('[Command Ack Handler] Malformed ACK payload for command:', commandId);
    return;
  }

  const status = payload.status || 'ACKNOWLEDGED';
  const reason = payload.reason || null;

  const client = await pool.connect();
  try {
    if (status === 'SUCCEEDED') {
      await client.query(
        `UPDATE device_commands SET status = 'SUCCEEDED', completed_at = now(), updated_at = now() WHERE id = $1;`,
        [commandId]
      );
    } else if (status === 'FAILED') {
      await client.query(
        `UPDATE device_commands SET status = 'FAILED', error_message = $2, completed_at = now(), updated_at = now() WHERE id = $1;`,
        [commandId, reason]
      );
    } else {
      await client.query(
        `UPDATE device_commands SET status = 'ACKNOWLEDGED', acknowledged_at = now(), updated_at = now() WHERE id = $1;`,
        [commandId]
      );
    }

    console.log(`[Command Ack Handler] Command ${commandId} updated to status: ${status}`);
  } catch (err) {
    console.error(`[Command Ack Handler] Error updating command ${commandId}:`, err);
  } finally {
    client.release();
  }
}

