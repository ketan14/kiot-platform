import { z } from 'zod';

export const alertSeveritySchema = z.enum(['INFO', 'WARNING', 'CRITICAL']);
export const alertConditionSchema = z.enum(['GT', 'GTE', 'LT', 'LTE', 'EQ', 'NEQ']);
export const incidentStatusSchema = z.enum(['OPEN', 'ACKNOWLEDGED', 'RESOLVED']);

export const createAlertRuleSchema = z.object({
  name: z.string().min(1, 'Rule name is required').max(255),
  description: z.string().optional(),
  productId: z.enum(['industrial', 'cold', 'home', 'energy']).default('industrial'),
  deviceId: z.string().optional().nullable(),
  metric: z.string().min(1, 'Metric identifier is required'),
  condition: alertConditionSchema,
  threshold: z.number({ required_error: 'Threshold number is required' }),
  severity: alertSeveritySchema.default('WARNING'),
  isEnabled: z.boolean().default(true),
});

export const updateAlertRuleSchema = createAlertRuleSchema.partial();

export const acknowledgeIncidentSchema = z.object({
  notes: z.string().optional(),
});

export const resolveIncidentSchema = z.object({
  resolutionNotes: z.string().optional(),
});

export type CreateAlertRuleInput = z.infer<typeof createAlertRuleSchema>;
export type UpdateAlertRuleInput = z.infer<typeof updateAlertRuleSchema>;
export type AcknowledgeIncidentInput = z.infer<typeof acknowledgeIncidentSchema>;
export type ResolveIncidentInput = z.infer<typeof resolveIncidentSchema>;

