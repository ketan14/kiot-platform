import { FastifyInstance } from 'fastify';
import { requireTenantContext } from '../middleware/tenant.js';
import { withTenantClient } from '../plugins/db.js';

export async function deviceRoutes(app: FastifyInstance): Promise<void> {
  // List devices for active organization with filtering
  app.get(
    '/v1/devices',
    {
      preHandler: [requireTenantContext],
      schema: {
        description: 'List devices with optional filtering by product, gateway, or status',
        tags: ['Devices'],
        querystring: {
          type: 'object',
          properties: {
            product: { type: 'string', enum: ['home', 'cold', 'industrial', 'energy'] },
            gateway_id: { type: 'string' },
            status: { type: 'string', enum: ['online', 'offline', 'degraded', 'provisioning'] },
            page: { type: 'integer', default: 1 },
            limit: { type: 'integer', default: 20 },
          },
        },
      },
    },
    async (request) => {
      const tenant = request.tenant!;
      const queryParams = request.query as {
        product?: string;
        gateway_id?: string;
        status?: string;
        page?: number;
        limit?: number;
      };

      const page = Math.max(1, queryParams.page || 1);
      const limit = Math.min(100, Math.max(1, queryParams.limit || 20));
      const offset = (page - 1) * limit;

      return withTenantClient(tenant.userId, tenant.organizationId, async (client) => {
        const conditions: string[] = ['organization_id = $1'];
        const values: unknown[] = [tenant.organizationId];
        let paramIndex = 2;

        if (queryParams.product) {
          conditions.push(`product_id = $${paramIndex++}`);
          values.push(queryParams.product);
        }
        if (queryParams.gateway_id) {
          conditions.push(`gateway_id = $${paramIndex++}`);
          values.push(queryParams.gateway_id);
        }
        if (queryParams.status) {
          conditions.push(`status = $${paramIndex++}`);
          values.push(queryParams.status);
        }

        const whereClause = conditions.join(' AND ');

        // Count total
        const countQuery = `SELECT count(*) AS total FROM devices WHERE ${whereClause};`;
        const countResult = await client.query(countQuery, values);
        const total = parseInt(countResult.rows[0].total, 10);

        // Fetch page
        const selectQuery = `
          SELECT id, product_id, gateway_id, location_id, name, hardware_type, hardware_serial,
                 firmware_version, status, last_seen_at, metadata, created_at, updated_at
          FROM devices
          WHERE ${whereClause}
          ORDER BY created_at DESC
          LIMIT $${paramIndex++} OFFSET $${paramIndex++};
        `;
        values.push(limit, offset);

        const result = await client.query(selectQuery, values);

        return {
          devices: result.rows,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        };
      });
    }
  );

  // Get device details by ID (including Device Shadow)
  app.get(
    '/v1/devices/:id',
    {
      preHandler: [requireTenantContext],
      schema: {
        description: 'Get device details and current Device Shadow (reported vs desired state)',
        tags: ['Devices'],
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
      const { id } = request.params as { id: string };
      const tenant = request.tenant!;

      return withTenantClient(tenant.userId, tenant.organizationId, async (client) => {
        const query = `
          SELECT d.*, s.desired, s.reported, s.delta, s.version AS shadow_version
          FROM devices d
          LEFT JOIN device_shadows s ON d.id = s.device_id
          WHERE d.id = $1 AND d.organization_id = $2;
        `;
        const result = await client.query(query, [id, tenant.organizationId]);

        if (result.rowCount === 0) {
          return reply.status(404).send({ error: 'Device not found' });
        }

        return { device: result.rows[0] };
      });
    }
  );

  // List Gateways
  app.get(
    '/v1/gateways',
    {
      preHandler: [requireTenantContext],
      schema: {
        description: 'List edge gateways registered in the organization',
        tags: ['Devices'],
      },
    },
    async (request) => {
      const tenant = request.tenant!;
      return withTenantClient(tenant.userId, tenant.organizationId, async (client) => {
        const query = `
          SELECT id, name, model, ip_address, status, last_heartbeat_at, location_id, created_at
          FROM gateways
          WHERE organization_id = $1
          ORDER BY created_at DESC;
        `;
        const result = await client.query(query, [tenant.organizationId]);
        return { gateways: result.rows };
      });
    }
  );
}

