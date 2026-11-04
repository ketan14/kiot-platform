import { FastifyInstance } from 'fastify';
import { requireTenantContext } from '../middleware/tenant.js';
import { withTenantClient, pool } from '../plugins/db.js';

export async function organizationRoutes(app: FastifyInstance): Promise<void> {
  // List all organizations for the current authenticated user
  app.get(
    '/v1/organizations',
    {
      schema: {
        description: 'List organizations where the authenticated user is a member',
        tags: ['Organizations'],
        headers: {
          type: 'object',
          properties: {
            authorization: { type: 'string' },
          },
        },
      },
    },
    async (request) => {
      // Default demo user for dev testing
      const userId = '00000000-0000-4000-b000-000000000001';
      const query = `
        SELECT o.id, o.name, o.slug, o.logo_url, m.role, m.status, o.created_at
        FROM organizations o
        JOIN organization_memberships m ON o.id = m.organization_id
        WHERE m.user_id = $1 AND o.is_active = true;
      `;
      const result = await pool.query(query, [userId]);
      return { organizations: result.rows };
    }
  );

  // Get active organization profile (requires X-KIOT-Organization-Id header)
  app.get(
    '/v1/organizations/:id',
    {
      preHandler: [requireTenantContext],
      schema: {
        description: 'Get organization details (requires active organization context)',
        tags: ['Organizations'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        headers: {
          type: 'object',
          required: ['x-kiot-organization-id'],
          properties: {
            'x-kiot-organization-id': { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const tenant = request.tenant!;

      if (id !== tenant.organizationId) {
        return reply.status(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: 'Requested organization does not match active session context.',
        });
      }

      return withTenantClient(tenant.userId, tenant.organizationId, async (client) => {
        const query = `SELECT id, name, slug, logo_url, is_active, created_at, updated_at FROM organizations WHERE id = $1;`;
        const result = await client.query(query, [id]);
        if (result.rowCount === 0) {
          return reply.status(404).send({ error: 'Organization not found' });
        }
        return { organization: result.rows[0] };
      });
    }
  );

  // List organization members
  app.get(
    '/v1/organizations/:id/members',
    {
      preHandler: [requireTenantContext],
      schema: {
        description: 'List members of the organization',
        tags: ['Organizations'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request) => {
      const tenant = request.tenant!;
      return withTenantClient(tenant.userId, tenant.organizationId, async (client) => {
        const query = `
          SELECT m.id, m.role, m.status, m.created_at, u.id AS user_id, u.email, u.full_name, u.avatar_url
          FROM organization_memberships m
          JOIN user_profiles u ON m.user_id = u.id
          WHERE m.organization_id = $1
          ORDER BY m.created_at ASC;
        `;
        const result = await client.query(query, [tenant.organizationId]);
        return { members: result.rows };
      });
    }
  );
}

