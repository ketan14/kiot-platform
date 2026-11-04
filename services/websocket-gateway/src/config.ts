import 'dotenv/config';
import { z } from 'zod';

const configSchema = z.object({
  WS_PORT: z.coerce.number().default(3001),
  HOST: z.string().default('0.0.0.0'),
  REDIS_URL: z.string().default('redis://localhost:6380'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/kiot_dev'),
  HEARTBEAT_INTERVAL_MS: z.coerce.number().default(30000),
});

export type GatewayConfig = z.infer<typeof configSchema>;

export const config: GatewayConfig = configSchema.parse({
  WS_PORT: process.env.WS_PORT || 3001,
  HOST: process.env.HOST || '0.0.0.0',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6380',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/kiot_dev',
  HEARTBEAT_INTERVAL_MS: process.env.HEARTBEAT_INTERVAL_MS || 30000,
});

