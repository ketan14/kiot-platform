import fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { config } from './config.js';

import { healthRoutes } from './routes/health.js';
import { organizationRoutes } from './routes/organizations.js';
import { deviceRoutes } from './routes/devices.js';
import { machineRoutes } from './routes/machines.js';
import { commandRoutes } from './routes/commands.js';
import { telemetryRoutes } from './routes/telemetry.js';
import { alertRoutes } from './routes/alerts.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = fastify({
    logger: {
      level: config.APP_ENV === 'development' ? 'info' : 'warn',
    },
  });

  // Security & Cross-Origin
  await app.register(cors, {
    origin: config.CORS_ORIGIN === '*' ? true : config.CORS_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-KIOT-Organization-Id'],
  });

  await app.register(helmet, {
    contentSecurityPolicy: false, // Allows Swagger UI to load inline assets
  });

  // OpenAPI 3.1 & Swagger Documentation
  await app.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'KIOT Platform REST API',
        description: 'Multi-Tenant IoT SaaS REST API Service for Devices, Machines, and Telemetry',
        version: '1.0.0',
      },
      servers: [
        {
          url: `http://localhost:${config.PORT}`,
          description: 'Local Development Server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Supabase Auth JWT Token',
          },
          organizationHeader: {
            type: 'apiKey',
            in: 'header',
            name: 'X-KIOT-Organization-Id',
            description: 'Active Organization UUID Header',
          },
        },
      },
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  });

  // Register Core Routes
  await app.register(healthRoutes);
  await app.register(organizationRoutes);
  await app.register(deviceRoutes);
  await app.register(machineRoutes);
  await app.register(commandRoutes);
  await app.register(telemetryRoutes);
  await app.register(alertRoutes);

  return app;
}

