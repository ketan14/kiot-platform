import 'dotenv/config';
import { z } from 'zod';

const configSchema = z.object({
  APP_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/kiot_dev'),
  REDIS_URL: z.string().default('redis://localhost:6380'),
  EMQX_HOST: z.string().default('localhost'),
  EMQX_PORT: z.coerce.number().default(1883),
  BATCH_FLUSH_INTERVAL_MS: z.coerce.number().default(250),
  BATCH_MAX_SIZE: z.coerce.number().default(500),
});

export type WorkerConfig = z.infer<typeof configSchema>;

export const config: WorkerConfig = configSchema.parse({
  APP_ENV: process.env.APP_ENV || process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL,
  EMQX_HOST: process.env.EMQX_HOST,
  EMQX_PORT: process.env.EMQX_PORT,
  BATCH_FLUSH_INTERVAL_MS: process.env.BATCH_FLUSH_INTERVAL_MS,
  BATCH_MAX_SIZE: process.env.BATCH_MAX_SIZE,
});

