import { z } from 'zod';

export const telemetryReadingSchema = z.object({
  organizationId: z.string().uuid(),
  productId: z.enum(['home', 'cold', 'industrial', 'energy']),
  gatewayId: z.string().optional(),
  deviceId: z.string().min(1),
  metric: z.string().min(1),
  value: z.number(),
  unit: z.string().min(1),
  deviceTimestamp: z.string().datetime(),
  serverTimestamp: z.string().datetime().optional(),
  sequenceNumber: z.number().int().nonnegative().optional(),
  quality: z.enum(['good', 'bad', 'uncertain']).default('good'),
});

export type ValidatedTelemetryReading = z.infer<typeof telemetryReadingSchema>;

export const telemetryBatchSchema = z.object({
  organizationId: z.string().uuid(),
  deviceId: z.string().min(1),
  readings: z.array(
    z.object({
      metric: z.string().min(1),
      value: z.number(),
      unit: z.string().min(1),
      deviceTimestamp: z.string().datetime(),
    })
  ).min(1),
});

export type ValidatedTelemetryBatch = z.infer<typeof telemetryBatchSchema>;

