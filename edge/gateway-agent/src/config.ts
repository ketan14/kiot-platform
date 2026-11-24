import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  GATEWAY_ID: z.string().default('GW-PUN-001'),
  ORGANIZATION_ID: z.string().default('00000000-0000-4000-a000-000000000001'),
  GATEWAY_MODEL: z.string().default('Moxa UC-8100 Linux Edge Gateway'),
  GATEWAY_IP: z.string().default('192.168.1.100'),
  EMQX_BROKER_URL: z.string().default('mqtt://localhost:1883'),
  POLL_INTERVAL_MS: z.coerce.number().default(3000),
  HEARTBEAT_INTERVAL_MS: z.coerce.number().default(10000),
  OFFLINE_BUFFER_FILE: z.string().default('/tmp/kiot-gateway-offline-buffer.jsonl'),
  MAX_BUFFER_RECORDS: z.coerce.number().default(10000),
});

export const config = envSchema.parse({
  GATEWAY_ID: process.env.GATEWAY_ID,
  ORGANIZATION_ID: process.env.ORGANIZATION_ID,
  GATEWAY_MODEL: process.env.GATEWAY_MODEL,
  GATEWAY_IP: process.env.GATEWAY_IP,
  EMQX_BROKER_URL: process.env.EMQX_BROKER_URL,
  POLL_INTERVAL_MS: process.env.POLL_INTERVAL_MS,
  HEARTBEAT_INTERVAL_MS: process.env.HEARTBEAT_INTERVAL_MS,
  OFFLINE_BUFFER_FILE: process.env.OFFLINE_BUFFER_FILE,
  MAX_BUFFER_RECORDS: process.env.MAX_BUFFER_RECORDS,
});
