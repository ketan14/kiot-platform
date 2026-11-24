import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  APP_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/kiot_dev'),
  REDIS_URL: z.string().default('redis://localhost:6380'),
  ESCALATION_TIMEOUT_MINUTES: z.coerce.number().default(5),
  ESCALATION_CHECK_INTERVAL_MS: z.coerce.number().default(30000),
});

export const config = envSchema.parse({
  APP_ENV: process.env.APP_ENV || process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL,
  ESCALATION_TIMEOUT_MINUTES: process.env.ESCALATION_TIMEOUT_MINUTES,
  ESCALATION_CHECK_INTERVAL_MS: process.env.ESCALATION_CHECK_INTERVAL_MS,
});
