import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  APP_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/kiot_dev'),
  REDIS_URL: z.string().default('redis://localhost:6380'),
  EMQX_HOST: z.string().default('localhost'),
  EMQX_PORT: z.coerce.number().default(1883),
  CORS_ORIGIN: z.string().default('*'),
});

export type Config = z.infer<typeof envSchema>;

export const config: Config = envSchema.parse({
  PORT: process.env.PORT,
  HOST: process.env.HOST,
  APP_ENV: process.env.APP_ENV || process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL,
  EMQX_HOST: process.env.EMQX_HOST,
  EMQX_PORT: process.env.EMQX_PORT,
  CORS_ORIGIN: process.env.CORS_ORIGIN,
});

