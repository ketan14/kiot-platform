import { FastifyInstance } from 'fastify';
import { requireTenantContext } from '../middleware/tenant.js';
import { withTenantClient } from '../plugins/db.js';
import { createAlertRuleSchema, updateAlertRuleSchema } from '@kiot/validation';

export async function alertRoutes(app: FastifyInstance): Promise<void> {
  // 1. List alert rules for the tenant
  app.get(
    '/v1/alert-rules',
    {
      preHandler: [requireTenantContext],
      schema: {
        description: 'List configured alert and anomaly detection rules',
        tags: ['Alerts & Incidents'],
        querystring: {
          type: 'object',
          properties: {
            metric: { type: 'string' },
            deviceId: { type: 'string' },
            isEnabled: { type: 'boolean' },
          },
        },
      },
    },
    async (request) => {
      const tenant = request.tenant!;
      const queryParams = request.query as {
        metric?: string;
        deviceId?: string;
        isEnabled?: boolean;
      };

      return withTenantClient(tenant.userId, tenant.organizationId, async (client) => {
        const conditions: string[] = ['organization_id = $1'];
        const values: unknown[] = [tenant.organizationId];
        let paramIndex = 2;

        if (queryParams.metric) {
          conditions.push(`metric = $${paramIndex++}`);
          values.push(queryParams.metric);
        }
        if (queryParams.deviceId) {
          conditions.push(`device_id = $${paramIndex++}`);
          values.push(queryParams.deviceId);
        }
        if (queryParams.isEnabled !== undefined) {
          conditions.push(`is_enabled = $${paramIndex++}`);
          values.push(queryParams.isEnabled);
        }

        const query = `
          SELECT id, organization_id, product_id, device_id, name, description,
                 metric, condition, threshold, severity, is_enabled, created_at, updated_at
          FROM alert_rules
          WHERE ${conditions.join(' AND ')}
          ORDER BY created_at DESC;
        `;

        const result = await client.query(query, values);
        return { rules: result.rows };
      });
    }
  );

  // 2. Create a new alert rule
  app.post(
    '/v1/alert-rules',
    {
      preHandler: [requireTenantContext],
      schema: {
        description: 'Create a new threshold alert rule',
        tags: ['Alerts & Incidents'],
        body: {
          type: 'object',
          required: ['name', 'metric', 'condition', 'threshold'],
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            productId: { type: 'string', default: 'industrial' },
            deviceId: { type: 'string' },
            metric: { type: 'string' },
            condition: { type: 'string', enum: ['GT', 'GTE', 'LT', 'LTE', 'EQ', 'NEQ'] },
            threshold: { type: 'number' },
            severity: { type: 'string', enum: ['INFO', 'WARNING', 'CRITICAL'], default: 'WARNING' },
            isEnabled: { type: 'boolean', default: true },
          },
        },
      },
    },
    async (request, reply) => {
      const tenant = request.tenant!;
      const parseResult = createAlertRuleSchema.safeParse(request.body);

      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: parseResult.error.flatten(),
        });
      }

      const input = parseResult.data;

      return withTenantClient(tenant.userId, tenant.organizationId, async (client) => {
        const query = `
          INSERT INTO alert_rules (
            organization_id, product_id, device_id, name, description,
            metric, condition, threshold, severity, is_enabled
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING id, organization_id, product_id, device_id, name, description,
                    metric, condition, threshold, severity, is_enabled, created_at, updated_at;
        `;

        const result = await client.query(query, [
          tenant.organizationId,
          input.productId,
          input.deviceId || null,
          input.name,
          input.description || null,
          input.metric,
          input.condition,
          input.threshold,
          input.severity,
          input.isEnabled ?? true,
        ]);

        return reply.status(201).send({ rule: result.rows[0] });
      });
    }
  );

  // 3. Delete an alert rule
  app.delete(
    '/v1/alert-rules/:id',
    {
      preHandler: [requireTenantContext],
      schema: {
        description: 'Delete an alert rule',
        tags: ['Alerts & Incidents'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const tenant = request.tenant!;
      const { id } = request.params as { id: string };

      return withTenantClient(tenant.userId, tenant.organizationId, async (client) => {
        const result = await client.query(
          `DELETE FROM alert_rules WHERE id = $1 AND organization_id = $2 RETURNING id;`,
          [id, tenant.organizationId]
        );

        if (result.rowCount === 0) {
          return reply.status(404).send({ error: 'Alert rule not found' });
        }

        return reply.status(200).send({ message: 'Alert rule deleted successfully' });
      });
    }
  );

  // 4. List incidents / alerts
  app.get(
    '/v1/incidents',
    {
      preHandler: [requireTenantContext],
      schema: {
        description: 'List active and historical alert incidents',
        tags: ['Alerts & Incidents'],
        querystring: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['OPEN', 'ACKNOWLEDGED', 'RESOLVED'] },
            severity: { type: 'string', enum: ['INFO', 'WARNING', 'CRITICAL'] },
            deviceId: { type: 'string' },
            limit: { type: 'integer', default: 50 },
            page: { type: 'integer', default: 1 },
          },
        },
      },
    },
    async (request) => {
      const tenant = request.tenant!;
      const queryParams = request.query as {
        status?: string;
        severity?: string;
        deviceId?: string;
        limit?: number;
        page?: number;
      };

      const limit = Math.min(100, Math.max(1, queryParams.limit || 50));
      const page = Math.max(1, queryParams.page || 1);
      const offset = (page - 1) * limit;

      return withTenantClient(tenant.userId, tenant.organizationId, async (client) => {
        const conditions: string[] = ['organization_id = $1'];
        const values: unknown[] = [tenant.organizationId];
        let paramIndex = 2;

        if (queryParams.status) {
          conditions.push(`status = $${paramIndex++}`);
          values.push(queryParams.status);
        }
        if (queryParams.severity) {
          conditions.push(`severity = $${paramIndex++}`);
          values.push(queryParams.severity);
        }
        if (queryParams.deviceId) {
          conditions.push(`device_id = $${paramIndex++}`);
          values.push(queryParams.deviceId);
        }

        const query = `
          SELECT id, organization_id, rule_id, device_id, metric, trigger_value, threshold_value,
                 severity, status, title, message, acknowledged_by, acknowledged_at,
                 resolved_by, resolved_at, created_at, updated_at
          FROM incidents
          WHERE ${conditions.join(' AND ')}
          ORDER BY created_at DESC
          LIMIT $${paramIndex++} OFFSET $${paramIndex++};
        `;
        values.push(limit, offset);

        const result = await client.query(query, values);
        return { incidents: result.rows };
      });
    }
  );

  // 5. Acknowledge an incident
  app.post(
    '/v1/incidents/:id/acknowledge',
    {
      preHandler: [requireTenantContext],
      schema: {
        description: 'Acknowledge an active incident',
        tags: ['Alerts & Incidents'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const tenant = request.tenant!;
      const { id } = request.params as { id: string };

      return withTenantClient(tenant.userId, tenant.organizationId, async (client) => {
        const query = `
          UPDATE incidents
          SET status = 'ACKNOWLEDGED',
              acknowledged_by = $1,
              acknowledged_at = now(),
              updated_at = now()
          WHERE id = $2 AND organization_id = $3
          RETURNING id, status, acknowledged_at;
        `;

        const result = await client.query(query, [tenant.userId, id, tenant.organizationId]);

        if (result.rowCount === 0) {
          return reply.status(404).send({ error: 'Incident not found' });
        }

        return { incident: result.rows[0] };
      });
    }
  );

  // 6. Resolve an incident
  app.post(
    '/v1/incidents/:id/resolve',
    {
      preHandler: [requireTenantContext],
      schema: {
        description: 'Resolve an incident',
        tags: ['Alerts & Incidents'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const tenant = request.tenant!;
      const { id } = request.params as { id: string };

      return withTenantClient(tenant.userId, tenant.organizationId, async (client) => {
        const query = `
          UPDATE incidents
          SET status = 'RESOLVED',
              resolved_by = $1,
              resolved_at = now(),
              updated_at = now()
          WHERE id = $2 AND organization_id = $3
          RETURNING id, status, resolved_at;
        `;

        const result = await client.query(query, [tenant.userId, id, tenant.organizationId]);

        if (result.rowCount === 0) {
          return reply.status(404).send({ error: 'Incident not found' });
        }

        return { incident: result.rows[0] };
      });
    }
  );
}

