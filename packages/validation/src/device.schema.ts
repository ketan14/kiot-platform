import { z } from 'zod';

export const createDeviceSchema = z.object({
  id: z
    .string()
    .min(3, 'Device ID must be at least 3 characters')
    .max(100, 'Device ID must not exceed 100 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Device ID must contain only alphanumeric characters, dashes, and underscores'),
  name: z.string().min(2, 'Device name must be at least 2 characters').max(255),
  productId: z.enum(['industrial', 'cold', 'home', 'energy']).default('industrial'),
  hardwareType: z.enum(['esp32', 'linux_gateway', 'third_party']).default('esp32'),
  hardwareSerial: z.string().min(2, 'Serial number must be at least 2 characters').max(100),
  macAddress: z.string().max(50).optional(),
  firmwareVersion: z.string().max(50).default('1.0.0'),
  locationId: z.string().uuid().nullable().optional(),
  gatewayId: z.string().max(100).nullable().optional(),
  metadata: z.record(z.unknown()).default({}),
});

export type CreateDeviceInput = z.infer<typeof createDeviceSchema>;

export const updateDeviceSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  locationId: z.string().uuid().nullable().optional(),
  gatewayId: z.string().max(100).nullable().optional(),
  firmwareVersion: z.string().max(50).optional(),
  status: z.enum(['online', 'offline', 'degraded', 'provisioning']).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type UpdateDeviceInput = z.infer<typeof updateDeviceSchema>;

