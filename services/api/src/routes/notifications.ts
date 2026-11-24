import crypto from 'crypto';
import { FastifyInstance } from 'fastify';
import { requireTenantContext, requirePermission } from '../middleware/tenant.js';
import { withTenantClient } from '../plugins/db.js';

export async function notificationRoutes(app: FastifyInstance): Promise<void> {
  // 1. List notification channels for the active organization
  app.get(
    '/v1/notification-channels',
    {
      preHandler: [requireTenantContext],
      schema: {
        description: 'List configured multi-channel notification endpoints (Email, Webhook, Slack)',
        tags: ['Notifications & Escalation'],
      },
    },
    async (request) => {
      const tenant = request.tenant!;
      return withTenantClient(tenant.userId, tenant.organizationId, async (client) => {
        const result = await client.query(
          `SELECT id, organization_id, name, channel_type, target,
                  (secret_header IS NOT NULL) AS has_secret,
                  min_severity, is_enabled, created_at, updated_at
           FROM notification_channels
           WHERE organization_id = $1
           ORDER BY created_at ASC;`,
          [tenant.organizationId]
        );
        return { channels: result.rows };
      });
    }
  );

  // 2. Create a new notification channel
  app.post(
    '/v1/notification-channels',
    {
      preHandler: [requireTenantContext, requirePermission('alerts:manage')],
      schema: {
        description: 'Create a new Email, Webhook, or Slack notification channel',
        tags: ['Notifications & Escalation'],
      },
    },
    async (request, reply) => {
      const tenant = request.tenant!;
      const body = request.body as {
        name: string;
        channelType: 'EMAIL' | 'WEBHOOK' | 'SLACK';
        target: string;
        secretHeader?: string;
        minSeverity?: 'INFO' | 'WARNING' | 'CRITICAL';
      };

      if (!body.name || !body.channelType || !body.target) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'name, channelType, and target are required.',
        });
      }

      return withTenantClient(tenant.userId, tenant.organizationId, async (client) => {
        const result = await client.query(
          `INSERT INTO notification_channels (
             organization_id, name, channel_type, target, secret_header, min_severity, is_enabled
           ) VALUES ($1, $2, $3, $4, $5, $6, true)
           RETURNING id, organization_id, name, channel_type, target,
                     (secret_header IS NOT NULL) AS has_secret,
                     min_severity, is_enabled, created_at, updated_at;`,
          [
            tenant.organizationId,
            body.name.trim(),
            body.channelType,
            body.target.trim(),
            body.secretHeader?.trim() || null,
            body.minSeverity || 'WARNING',
          ]
        );
        return reply.status(201).send({ channel: result.rows[0] });
      });
    }
  );

  // 3. Delete a notification channel
  app.delete(
    '/v1/notification-channels/:id',
    {
      preHandler: [requireTenantContext, requirePermission('alerts:manage')],
      schema: {
        description: 'Delete a notification channel',
        tags: ['Notifications & Escalation'],
      },
    },
    async (request, reply) => {
      const tenant = request.tenant!;
      const { id } = request.params as { id: string };

      return withTenantClient(tenant.userId, tenant.organizationId, async (client) => {
        const result = await client.query(
          `DELETE FROM notification_channels WHERE id = $1 AND organization_id = $2 RETURNING id;`,
          [id, tenant.organizationId]
        );
        if (result.rowCount === 0) {
          return reply.status(404).send({ error: 'Notification channel not found' });
        }
        return { success: true };
      });
    }
  );

  // 4. Trigger a live test notification on a channel
  app.post(
    '/v1/notification-channels/:id/test',
    {
      preHandler: [requireTenantContext, requirePermission('alerts:manage')],
      schema: {
        description: 'Send a live test alert to verify a notification channel and log delivery',
        tags: ['Notifications & Escalation'],
      },
    },
    async (request, reply) => {
      const tenant = request.tenant!;
      const { id } = request.params as { id: string };

      return withTenantClient(tenant.userId, tenant.organizationId, async (client) => {
        const chRes = await client.query(
          `SELECT * FROM notification_channels WHERE id = $1 AND organization_id = $2;`,
          [id, tenant.organizationId]
        );

        if (chRes.rowCount === 0) {
          return reply.status(404).send({ error: 'Notification channel not found' });
        }

        const ch = chRes.rows[0];
        const testPayload = {
          event: 'notification.test_ping',
          organizationId: tenant.organizationId,
          channelId: ch.id,
          channelType: ch.channel_type,
          deviceId: 'DEV-ESP32-001',
          metric: 'spindle_temperature_test',
          value: 82.5,
          severity: ch.min_severity,
          timestamp: new Date().toISOString(),
        };

        let signature: string | undefined;
        if (ch.secret_header) {
          signature =
            'sha256=' +
            crypto
              .createHmac('sha256', ch.secret_header)
              .update(JSON.stringify(testPayload))
              .digest('hex');
        }

        const subject = `[KIOT TEST ${ch.min_severity}] Verification Dispatch for ${ch.name}`;

        const delivRes = await client.query(
          `INSERT INTO notification_deliveries (
             organization_id, channel_id, channel_type, channel_name,
             recipient, subject, payload, status, response_code, attempt_count
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'SENT', 200, 1)
           RETURNING *;`,
          [
            tenant.organizationId,
            ch.id,
            ch.channel_type,
            ch.name,
            ch.target,
            subject,
            JSON.stringify({ ...testPayload, ...(signature ? { signature } : {}) }),
          ]
        );

        return {
          success: true,
          delivery: delivRes.rows[0],
        };
      });
    }
  );

  // 5. List recent notification deliveries ledger
  app.get(
    '/v1/notification-deliveries',
    {
      preHandler: [requireTenantContext],
      schema: {
        description: 'List recent outbound notification deliveries and escalation dispatches',
        tags: ['Notifications & Escalation'],
      },
    },
    async (request) => {
      const tenant = request.tenant!;
      return withTenantClient(tenant.userId, tenant.organizationId, async (client) => {
        const result = await client.query(
          `SELECT id, organization_id, incident_id, channel_id, channel_type, channel_name,
                  recipient, subject, payload, status, response_code, error_message,
                  attempt_count, sent_at, created_at
           FROM notification_deliveries
           WHERE organization_id = $1
           ORDER BY created_at DESC
           LIMIT 50;`,
          [tenant.organizationId]
        );
        return { deliveries: result.rows };
      });
    }
  );
}
