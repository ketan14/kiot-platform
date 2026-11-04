import { z } from 'zod';

export const machineSearchSchema = z.object({
  site_id: z.coerce.number().optional(),
  status: z.enum(['running', 'stopped', 'abnormal', 'offline']).optional(),
  page: z.coerce.number().catch(1).default(1),
  limit: z.coerce.number().catch(20).default(20),
  search: z.string().optional(),
});

export type MachineSearch = z.infer<typeof machineSearchSchema>;

export const deviceSearchSchema = z.object({
  product: z.enum(['home', 'cold', 'industrial', 'energy']).optional(),
  gateway_id: z.string().optional(),
  status: z.enum(['online', 'offline', 'degraded', 'provisioning']).optional(),
  page: z.coerce.number().catch(1).default(1),
  limit: z.coerce.number().catch(20).default(20),
});

export type DeviceSearch = z.infer<typeof deviceSearchSchema>;

export const telemetrySearchSchema = z.object({
  device_id: z.string().min(1, 'Device ID is required'),
  from: z.string().datetime().catch(() => new Date(Date.now() - 86400000).toISOString()),
  to: z.string().datetime().catch(() => new Date().toISOString()),
  metrics: z.array(z.string()).optional(),
  resolution: z.enum(['raw', '1m', '15m', '1h']).default('1m'),
});

export type TelemetrySearch = z.infer<typeof telemetrySearchSchema>;

