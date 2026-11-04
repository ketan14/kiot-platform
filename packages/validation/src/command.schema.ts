import { z } from 'zod';

export const createCommandSchema = z.object({
  deviceId: z.string().min(1),
  commandType: z.string().min(1),
  payload: z.record(z.unknown()),
  ttlSeconds: z.number().int().positive().default(300),
});

export type CreateCommandInput = z.infer<typeof createCommandSchema>;

export const commandAckSchema = z.object({
  commandId: z.string().uuid(),
  deviceId: z.string().min(1),
  status: z.enum(['ACKNOWLEDGED', 'SUCCEEDED', 'FAILED']),
  reason: z.string().optional(),
  timestamp: z.string().datetime(),
});

export type CommandAckInput = z.infer<typeof commandAckSchema>;

