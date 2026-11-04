import { FastifyInstance } from 'fastify';
import { requireTenantContext } from '../middleware/tenant.js';
import { withTenantClient } from '../plugins/db.js';
import { publishDeviceCommand } from '../plugins/mqtt.js';

export async function commandRoutes(app: FastifyInstance): Promise<void> {
  // Dispatch a command to a physical device
  app.post(
    '/v1/devices/:id/commands',
    {
      preHandler: [requireTenantContext],
      schema: {
        description: 'Dispatch a control command to a device via REST and MQTT',
        tags: ['Device Commands'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['commandType', 'payload'],
          properties: {
            commandType: { type: 'string', minLength: 1 },
            payload: { type: 'object', additionalProperties: true },
            ttlSeconds: { type: 'integer', default: 300 },
          },
        },
      },
    },
    async (request, reply) => {
      const { id: deviceId } = request.params as { id: string };
      const { commandType, payload, ttlSeconds } = request.body as {
        commandType: string;
        payload: Record<string, unknown>;
        ttlSeconds?: number;
      };
      const tenant = request.tenant!;

      // 1. Insert command into database within committed tenant transaction
      const command = await withTenantClient(tenant.userId, tenant.organizationId, async (client) => {
        // Verify device exists and belongs to this organization
        const deviceCheck = await client.query(
          `SELECT id, status FROM devices WHERE id = $1 AND organization_id = $2;`,
          [deviceId, tenant.organizationId]
        );

        if (deviceCheck.rowCount === 0) {
          return null;
        }

        const expiresAt = new Date(Date.now() + (ttlSeconds || 300) * 1000);

        const insertQuery = `
          INSERT INTO device_commands (
            organization_id, device_id, command_type, payload, status, issued_by, expires_at
          ) VALUES ($1, $2, $3, $4, 'PENDING', $5, $6)
          RETURNING id, organization_id, device_id, command_type, payload, status, expires_at, created_at;
        `;
        const insertResult = await client.query(insertQuery, [
          tenant.organizationId,
          deviceId,
          commandType,
          JSON.stringify(payload),
          tenant.userId,
          expiresAt.toISOString(),
        ]);

        return insertResult.rows[0];
      });

      if (!command) {
        return reply.status(404).send({ error: 'Device not found' });
      }

      // 2. Now that the record is fully committed and visible in PostgreSQL, publish to MQTT
      try {
        await publishDeviceCommand(tenant.organizationId, deviceId, {
          commandId: command.id,
          commandType,
          payload,
          expiresAt: command.expires_at,
        });

        // Update command status to SENT only if it hasn't already been transitioned to SUCCEEDED/FAILED by fast edge ACK
        await withTenantClient(tenant.userId, tenant.organizationId, async (client) => {
          const updateRes = await client.query(
            `UPDATE device_commands SET status = 'SENT', updated_at = now() WHERE id = $1 AND status = 'PENDING' RETURNING status;`,
            [command.id]
          );
          if (updateRes.rowCount && updateRes.rowCount > 0) {
            command.status = 'SENT';
          } else {
            // Already ACKed or completed
            const currentRes = await client.query(`SELECT status FROM device_commands WHERE id = $1;`, [command.id]);
            if (currentRes.rowCount) command.status = currentRes.rows[0].status;
          }
        });
      } catch (mqttError) {
        console.warn('[MQTT Warning] Failed to publish immediately to broker:', mqttError);
      }

      return reply.status(201).send({ command });
    }
  );

  // List command history for a device
  app.get(
    '/v1/devices/:id/commands',
    {
      preHandler: [requireTenantContext],
      schema: {
        description: 'Get command history for a device',
        tags: ['Device Commands'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    async (request) => {
      const { id: deviceId } = request.params as { id: string };
      const tenant = request.tenant!;

      return withTenantClient(tenant.userId, tenant.organizationId, async (client) => {
        const query = `
          SELECT id, command_type, payload, status, error_message, expires_at,
                 acknowledged_at, completed_at, created_at
          FROM device_commands
          WHERE device_id = $1 AND organization_id = $2
          ORDER BY created_at DESC
          LIMIT 50;
        `;
        const result = await client.query(query, [deviceId, tenant.organizationId]);
        return { commands: result.rows };
      });
    }
  );
}

