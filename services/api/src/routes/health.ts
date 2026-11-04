import { FastifyInstance } from 'fastify';
import { pool } from '../plugins/db.js';
import { redis } from '../plugins/redis.js';
import { mqttClient } from '../plugins/mqtt.js';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/health',
    {
      schema: {
        description: 'Health check endpoint for API, Database, Redis, and MQTT broker',
        tags: ['Health'],
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              uptime: { type: 'number' },
              timestamp: { type: 'string' },
              services: {
                type: 'object',
                properties: {
                  database: { type: 'string' },
                  redis: { type: 'string' },
                  mqtt: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async () => {
      let dbStatus = 'healthy';
      try {
        await pool.query('SELECT 1');
      } catch {
        dbStatus = 'unhealthy';
      }

      let redisStatus = 'healthy';
      try {
        const ping = await redis.ping();
        if (ping !== 'PONG') redisStatus = 'degraded';
      } catch {
        redisStatus = 'unhealthy';
      }

      const mqttStatus = mqttClient.connected ? 'healthy' : 'disconnected';

      const isOverallHealthy = dbStatus === 'healthy' && redisStatus === 'healthy';

      return {
        status: isOverallHealthy ? 'ok' : 'degraded',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        services: {
          database: dbStatus,
          redis: redisStatus,
          mqtt: mqttStatus,
        },
      };
    }
  );
}

