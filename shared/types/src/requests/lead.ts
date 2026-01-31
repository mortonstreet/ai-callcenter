import { z } from 'zod';

export const ListLeadsRequestSchema = z.object({
  organizationId: z.string(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
});
export type ListLeadsRequest = z.infer<typeof ListLeadsRequestSchema>;

export const GetLeadRequestSchema = z.object({
  organizationId: z.string(),
  id: z.string(),
});
export type GetLeadRequest = z.infer<typeof GetLeadRequestSchema>;

export const CreateLeadRequestSchema = z.object({
  organizationId: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().min(1, 'Phone is required'),
  company: z.string().optional(),
  title: z.string().optional(),
  linkedInUrl: z.string().url().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  dealValue: z.coerce.number().nonnegative().optional(),
  pipelineStageId: z.string().optional(),
});
export type CreateLeadRequest = z.infer<typeof CreateLeadRequestSchema>;

export const UpdateLeadRequestSchema = z.object({
  organizationId: z.string(),
  id: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  company: z.string().optional(),
  title: z.string().optional(),
  linkedInUrl: z.string().url().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  dealValue: z.coerce.number().nonnegative().optional(),
  pipelineStageId: z.string().nullable().optional(),
});
export type UpdateLeadRequest = z.infer<typeof UpdateLeadRequestSchema>;

export const DeleteLeadRequestSchema = z.object({
  organizationId: z.string(),
  id: z.string(),
});
export type DeleteLeadRequest = z.infer<typeof DeleteLeadRequestSchema>;
