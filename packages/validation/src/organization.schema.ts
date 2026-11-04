import { z } from 'zod';

export const organizationRoleEnum = z.enum(['owner', 'admin', 'manager', 'operator', 'viewer']);

export const inviteMemberSchema = z.object({
  email: z.string().email('Valid email address required'),
  role: organizationRoleEnum.default('operator'),
  fullName: z.string().min(2).max(255).optional(),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export const updateMemberRoleSchema = z.object({
  role: organizationRoleEnum,
});

export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;

