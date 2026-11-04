import 'dotenv/config';
import { z } from 'zod';

const configSchema = z.object({
  EMQX_HOST: z.string().default('localhost'),
  EMQX_PORT: z.coerce.number().default(1883),
  ORG_ID: z.string().default('00000000-0000-4000-a000-000000000001'),
  CNC_DEVICE_ID: z.string().default('DEV-ESP32-001'),
  METER_DEVICE_ID: z.string().default('DEV-METER-001'),
  TELEMETRY_INTERVAL_MS: z.coerce.number().default(1000),
});

export type SimulatorConfig = z.infer<typeof configSchema>;

export const config: SimulatorConfig = configSchema.parse({
  EMQX_HOST: process.env.EMQX_HOST || 'localhost',
  EMQX_PORT: process.env.EMQX_PORT || 1883,
  ORG_ID: process.env.ORG_ID || '00000000-0000-4000-a000-000000000001',
  CNC_DEVICE_ID: process.env.CNC_DEVICE_ID || 'DEV-ESP32-001',
  METER_DEVICE_ID: process.env.METER_DEVICE_ID || 'DEV-METER-001',
  TELEMETRY_INTERVAL_MS: process.env.TELEMETRY_INTERVAL_MS || 1000,
});

