import { FastifyInstance } from 'fastify';
import { requireTenantContext } from '../middleware/tenant.js';
import { withTenantClient } from '../plugins/db.js';

export async function machineRoutes(app: FastifyInstance): Promise<void> {
  // List industrial machines
  app.get(
    '/v1/machines',
    {
      preHandler: [requireTenantContext],
      schema: {
        description: 'List industrial machines for KIOT Industrial dashboard',
        tags: ['Machines (Industrial)'],
        querystring: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['running', 'stopped', 'abnormal', 'offline'] },
            category: { type: 'string' },
            page: { type: 'integer', default: 1 },
            limit: { type: 'integer', default: 20 },
          },
        },
      },
    },
    async (request) => {
      const tenant = request.tenant!;
      const queryParams = request.query as {
        status?: string;
        category?: string;
        page?: number;
        limit?: number;
      };

      const page = Math.max(1, queryParams.page || 1);
      const limit = Math.min(100, Math.max(1, queryParams.limit || 20));
      const offset = (page - 1) * limit;

      return withTenantClient(tenant.userId, tenant.organizationId, async (client) => {
        const conditions: string[] = ['m.organization_id = $1'];
        const values: unknown[] = [tenant.organizationId];
        let paramIndex = 2;

        if (queryParams.status) {
          conditions.push(`m.status = $${paramIndex++}`);
          values.push(queryParams.status);
        }
        if (queryParams.category) {
          conditions.push(`m.category = $${paramIndex++}`);
          values.push(queryParams.category);
        }

        const whereClause = conditions.join(' AND ');

        const selectQuery = `
          SELECT m.id, m.name, m.machine_code, m.category, m.status, m.current_operating_hours,
                 m.last_status_change_at, m.location_id, m.primary_device_id,
                 d.name AS device_name, d.status AS device_status, d.last_seen_at
          FROM industrial_machines m
          LEFT JOIN devices d ON m.primary_device_id = d.id
          WHERE ${whereClause}
          ORDER BY m.name ASC
          LIMIT $${paramIndex++} OFFSET $${paramIndex++};
        `;
        values.push(limit, offset);

        const result = await client.query(selectQuery, values);

        return { machines: result.rows };
      });
    }
  );

  // Machine detail by ID
  app.get(
    '/v1/machines/:id',
    {
      preHandler: [requireTenantContext],
      schema: {
        description: 'Get machine detail by ID',
        tags: ['Machines (Industrial)'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const tenant = request.tenant!;

      return withTenantClient(tenant.userId, tenant.organizationId, async (client) => {
        const query = `
          SELECT m.*, d.name AS device_name, d.status AS device_status, d.last_seen_at,
                 l.name AS location_name
          FROM industrial_machines m
          LEFT JOIN devices d ON m.primary_device_id = d.id
          LEFT JOIN locations l ON m.location_id = l.id
          WHERE m.id = $1 AND m.organization_id = $2;
        `;
        const result = await client.query(query, [id, tenant.organizationId]);

        if (result.rowCount === 0) {
          return reply.status(404).send({ error: 'Machine not found' });
        }

        return { machine: result.rows[0] };
      });
    }
  );
}

