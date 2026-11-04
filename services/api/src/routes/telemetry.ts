import { FastifyInstance } from 'fastify';
import { requireTenantContext } from '../middleware/tenant.js';
import { withTenantClient, pool } from '../plugins/db.js';
import { getDeviceLatestState } from '../plugins/redis.js';

export async function telemetryRoutes(app: FastifyInstance): Promise<void> {
  // Get latest live state for a device (Hot Cache from Redis)
  app.get(
    '/v1/telemetry/latest',
    {
      preHandler: [requireTenantContext],
      schema: {
        description: 'Get latest real-time state for a device from Redis hot cache',
        tags: ['Telemetry & Time-Series'],
        querystring: {
          type: 'object',
          required: ['device_id'],
          properties: {
            device_id: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { device_id } = request.query as { device_id: string };
      const tenant = request.tenant!;

      // 1. Check Redis hot cache first
      const hotState = await getDeviceLatestState(device_id);
      if (hotState) {
        return {
          source: 'redis_hot_cache',
          deviceId: device_id,
          state: hotState,
        };
      }

      // 2. Fallback to latest database readings
      const query = `
        SELECT DISTINCT ON (metric) metric, value, unit, quality, time
        FROM telemetry_readings
        WHERE organization_id = $1 AND device_id = $2
        ORDER BY metric, time DESC;
      `;
      const result = await pool.query(query, [tenant.organizationId, device_id]);

      if (result.rowCount === 0) {
        return reply.status(404).send({ error: 'No telemetry found for this device' });
      }

      return {
        source: 'database_recent',
        deviceId: device_id,
        readings: result.rows,
      };
    }
  );

  // Query historical telemetry rollups (TimescaleDB Continuous Aggregates)
  app.get(
    '/v1/telemetry/history',
    {
      preHandler: [requireTenantContext],
      schema: {
        description: 'Query time-series telemetry rollups from TimescaleDB (1m or 1h continuous aggregates)',
        tags: ['Telemetry & Time-Series'],
        querystring: {
          type: 'object',
          required: ['device_id'],
          properties: {
            device_id: { type: 'string' },
            metric: { type: 'string' },
            resolution: { type: 'string', enum: ['raw', '1m', '1h'], default: '1m' },
            from: { type: 'string' },
            to: { type: 'string' },
            limit: { type: 'integer', default: 100 },
          },
        },
      },
    },
    async (request) => {
      const tenant = request.tenant!;
      const queryParams = request.query as {
        device_id: string;
        metric?: string;
        resolution?: 'raw' | '1m' | '1h';
        from?: string;
        to?: string;
        limit?: number;
      };

      const fromTime = queryParams.from || new Date(Date.now() - 86400000).toISOString(); // 24 hours ago
      const toTime = queryParams.to || new Date().toISOString();
      const limit = Math.min(1000, Math.max(1, queryParams.limit || 100));
      const resolution = queryParams.resolution || '1m';

      return withTenantClient(tenant.userId, tenant.organizationId, async (client) => {
        let query: string;
        const values: unknown[] = [tenant.organizationId, queryParams.device_id, fromTime, toTime];

        if (resolution === '1h') {
          query = `
            SELECT bucket AS time, metric, avg_value, min_value, max_value, sample_count
            FROM telemetry_1h_rollup
            WHERE organization_id = $1 AND device_id = $2 AND bucket >= $3 AND bucket <= $4
          `;
        } else if (resolution === '1m') {
          query = `
            SELECT bucket AS time, metric, avg_value, min_value, max_value, sample_count
            FROM telemetry_1m_rollup
            WHERE organization_id = $1 AND device_id = $2 AND bucket >= $3 AND bucket <= $4
          `;
        } else {
          query = `
            SELECT time, metric, value, unit, quality, sequence_number
            FROM telemetry_readings
            WHERE organization_id = $1 AND device_id = $2 AND time >= $3 AND time <= $4
          `;
        }

        if (queryParams.metric) {
          query += ` AND metric = $5`;
          values.push(queryParams.metric);
        }

        query += ` ORDER BY time DESC LIMIT $${values.length + 1};`;
        values.push(limit);

        const result = await client.query(query, values);

        return {
          deviceId: queryParams.device_id,
          resolution,
          dataPoints: result.rows,
        };
      });
    }
  );
}

