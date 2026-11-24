import { FastifyRequest, FastifyReply } from 'fastify';
import { pool } from '../plugins/db.js';
import { OrganizationRole } from '@kiot/shared-types';
import { Permission, hasPermission, ROLE_PERMISSIONS } from '@kiot/permissions';
import { resolveUserIdFromToken } from '../plugins/jwt.js';

declare module 'fastify' {
  interface FastifyRequest {
    tenant?: {
      userId: string;
      organizationId: string;
      role: OrganizationRole;
      permissions: Permission[];
    };
  }
}

// Fallback demo user for local development testing & CLI scripts
export const DEMO_USER_ID = '00000000-0000-4000-b000-000000000001';

export async function requireTenantContext(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const orgHeader = request.headers['x-kiot-organization-id'];

  if (!orgHeader || typeof orgHeader !== 'string') {
    return reply.status(400).send({
      statusCode: 400,
      error: 'Bad Request',
      code: 'MISSING_ORG_HEADER',
      message: 'Header "X-KIOT-Organization-Id" is required for this operation.',
    });
  }

  // Resolve user identity from Bearer JWT token, `user_<uuid>`, or development fallback
  const { userId, isExplicitToken } = resolveUserIdFromToken(
    request.headers.authorization,
    DEMO_USER_ID
  );

  if (!userId) {
    return reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      code: 'INVALID_OR_EXPIRED_TOKEN',
      message: isExplicitToken
        ? 'Your session token is invalid or has expired. Please sign in again.'
        : 'Authentication required.',
    });
  }

  // Validate that user is an active member of this organization
  const query = `
    SELECT role, status 
    FROM organization_memberships 
    WHERE organization_id = $1 AND user_id = $2;
  `;
  const result = await pool.query(query, [orgHeader, userId]);

  if (result.rowCount === 0 || result.rows[0].status !== 'active') {
    return reply.status(403).send({
      statusCode: 403,
      error: 'Forbidden',
      code: 'INSUFFICIENT_PERMISSIONS',
      message: 'User does not belong to or is not active in this organization.',
    });
  }

  const role = result.rows[0].role as OrganizationRole;

  request.tenant = {
    userId,
    organizationId: orgHeader,
    role,
    permissions: ROLE_PERMISSIONS[role] || [],
  };
}

/**
 * Fastify preHandler factory that enforces a granular RBAC permission
 */
export function requirePermission(permission: Permission) {
  return async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const tenant = request.tenant;
    if (!tenant) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Tenant context not initialized.',
      });
    }

    if (!hasPermission(tenant.role, permission)) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        code: 'RBAC_PERMISSION_DENIED',
        message: `Your role (${tenant.role.toUpperCase()}) does not have permission '${permission}' to perform this action.`,
      });
    }
  };
}


