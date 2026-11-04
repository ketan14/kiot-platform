import pg from 'pg';
import { config } from '../config.js';

export const pool = new pg.Pool({
  connectionString: config.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[Database Pool Error]:', err);
});

/**
 * Execute database queries within an isolated tenant transaction.
 * Injects session variables so PostgreSQL Row-Level Security (RLS) is automatically enforced.
 */
export async function withTenantClient<T>(
  userId: string,
  organizationId: string,
  fn: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const uuidRegex = /^[0-9a-fA-F-]{36}$/;
  if (!uuidRegex.test(userId) || !uuidRegex.test(organizationId)) {
    throw new Error('Invalid UUID format for session context');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.current_user_id', '${userId}', true);`);
    await client.query(`SELECT set_config('app.current_org_id', '${organizationId}', true);`);

    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
