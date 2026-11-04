import { z } from 'zod';

export const locationTypeEnum = z.enum(['site', 'building', 'floor', 'line', 'room']);

export const createLocationSchema = z.object({
  name: z.string().min(2, 'Location name must be at least 2 characters').max(255),
  code: z.string().max(50).optional(),
  type: locationTypeEnum.default('site'),
  parentId: z.string().uuid().nullable().optional(),
  address: z.record(z.unknown()).optional(),
});

export type CreateLocationInput = z.infer<typeof createLocationSchema>;

export const updateLocationSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  code: z.string().max(50).nullable().optional(),
  type: locationTypeEnum.optional(),
  parentId: z.string().uuid().nullable().optional(),
  address: z.record(z.unknown()).nullable().optional(),
});

export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;

