import { FastifyInstance } from 'fastify';
import { requireTenantContext } from '../middleware/tenant.js';
import { withTenantClient, pool } from '../plugins/db.js';
import { inviteMemberSchema } from '@kiot/validation';

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

  // Invite or add team member to organization
  app.post(
    '/v1/organizations/:id/members',
    {
      preHandler: [requireTenantContext],
      schema: {
        description: 'Invite or add a team member to the organization with assigned RBAC role',
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
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const tenant = request.tenant!;

      if (id !== tenant.organizationId) {
        return reply.status(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: 'Operation target does not match active session organization.',
        });
      }

      const parseResult = inviteMemberSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Validation failed',
          issues: parseResult.error.format(),
        });
      }

      const { email, role, fullName } = parseResult.data;

      // 1. Ensure user_profile exists for this email
      const userProfileResult = await pool.query(
        `INSERT INTO user_profiles (email, full_name)
         VALUES ($1, $2)
         ON CONFLICT (email) DO UPDATE SET full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name)
         RETURNING id, email, full_name, avatar_url;`,
        [email.toLowerCase().trim(), fullName || email.split('@')[0]]
      );
      const user = userProfileResult.rows[0];

      // 2. Add or update organization membership under tenant client (enforces RLS)
      return withTenantClient(tenant.userId, tenant.organizationId, async (client) => {
        const membershipResult = await client.query(
          `INSERT INTO organization_memberships (organization_id, user_id, role, status)
           VALUES ($1, $2, $3, 'active')
           ON CONFLICT (organization_id, user_id) 
           DO UPDATE SET role = EXCLUDED.role, status = 'active', updated_at = NOW()
           RETURNING id, organization_id, user_id, role, status, created_at, updated_at;`,
          [tenant.organizationId, user.id, role]
        );

        const membership = membershipResult.rows[0];

        return reply.status(201).send({
          member: {
            id: membership.id,
            role: membership.role,
            status: membership.status,
            createdAt: membership.created_at,
            userId: user.id,
            email: user.email,
            fullName: user.full_name,
            avatarUrl: user.avatar_url,
          },
        });
      });
    }
  );

  // Remove member from organization
  app.delete(
    '/v1/organizations/:id/members/:userId',
    {
      preHandler: [requireTenantContext],
      schema: {
        description: 'Remove a team member from the organization',
        tags: ['Organizations'],
        params: {
          type: 'object',
          required: ['id', 'userId'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request, reply) => {
      const { id, userId } = request.params as { id: string; userId: string };
      const tenant = request.tenant!;

      if (id !== tenant.organizationId) {
        return reply.status(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: 'Operation target does not match active session organization.',
        });
      }

      return withTenantClient(tenant.userId, tenant.organizationId, async (client) => {
        // Prevent deleting the last owner of the organization
        const ownerCheck = await client.query(
          `SELECT count(*) AS owner_count 
           FROM organization_memberships 
           WHERE organization_id = $1 AND role = 'owner';`,
          [tenant.organizationId]
        );
        const ownerCount = parseInt(ownerCheck.rows[0].owner_count, 10);

        const targetUserRole = await client.query(
          `SELECT role FROM organization_memberships WHERE organization_id = $1 AND user_id = $2;`,
          [tenant.organizationId, userId]
        );

        if (targetUserRole.rowCount === 0) {
          return reply.status(404).send({ error: 'Membership not found' });
        }

        if (targetUserRole.rows[0].role === 'owner' && ownerCount <= 1) {
          return reply.status(400).send({
            statusCode: 400,
            error: 'Bad Request',
            message: 'Cannot remove the sole owner of the organization.',
          });
        }

        await client.query(
          `DELETE FROM organization_memberships WHERE organization_id = $1 AND user_id = $2;`,
          [tenant.organizationId, userId]
        );

        return { success: true, message: 'Member removed successfully.' };
      });
    }
  );
}
