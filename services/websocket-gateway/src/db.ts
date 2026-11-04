import pg from 'pg';
import { config } from './config.js';

export const pool = new pg.Pool({
  connectionString: config.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('[WS Gateway DB Error]:', err);
});

/**
 * Verify that user is an active member of the requested organization
 */
export async function verifyUserOrganizationMembership(
  userId: string,
  organizationId: string
): Promise<{ isValid: boolean; role?: string }> {
  try {
    const query = `
      SELECT role, status 
      FROM organization_memberships 
      WHERE organization_id = $1 AND user_id = $2;
    `;
    const result = await pool.query(query, [organizationId, userId]);

    if (result.rowCount === 0 || result.rows[0].status !== 'active') {
      return { isValid: false };
    }

    return { isValid: true, role: result.rows[0].role as string };
  } catch (error) {
    console.error('[WS Gateway Auth DB Error]:', error);
    return { isValid: false };
  }
}

