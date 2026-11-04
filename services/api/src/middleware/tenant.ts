import { FastifyRequest, FastifyReply } from 'fastify';
import { pool } from '../plugins/db.js';
import { OrganizationRole } from '@kiot/shared-types';

declare module 'fastify' {
  interface FastifyRequest {
    tenant?: {
      userId: string;
      organizationId: string;
      role: OrganizationRole;
    };
  }
}

// Fallback demo user for local development testing
const DEMO_USER_ID = '00000000-0000-4000-b000-000000000001';

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

  // Resolve user identity from Bearer token or development fallback
  let userId = DEMO_USER_ID;
  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (token.startsWith('user_')) {
      userId = token.replace('user_', '');
    }
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

  request.tenant = {
    userId,
    organizationId: orgHeader,
    role: result.rows[0].role as OrganizationRole,
  };
}

