import { z } from 'zod';

export const CampaignChannelSchema = z.enum(['voice', 'sms', 'email', 'multi']);
export type CampaignChannel = z.infer<typeof CampaignChannelSchema>;

export const CampaignStatusSchema = z.enum([
  'draft',
  'active',
  'paused',
  'completed',
  'archived',
]);
export type CampaignStatus = z.infer<typeof CampaignStatusSchema>;

export const ListCampaignsRequestSchema = z.object({
  organizationId: z.string(),
  status: CampaignStatusSchema.optional(),
  channel: CampaignChannelSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
});
export type ListCampaignsRequest = z.infer<typeof ListCampaignsRequestSchema>;

export const GetCampaignRequestSchema = z.object({
  organizationId: z.string(),
  id: z.string(),
});
export type GetCampaignRequest = z.infer<typeof GetCampaignRequestSchema>;

export const CreateCampaignRequestSchema = z.object({
  organizationId: z.string(),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  channel: CampaignChannelSchema.default('voice'),
  status: CampaignStatusSchema.default('draft'),
  startAt: z.coerce.date().optional(),
  endAt: z.coerce.date().optional(),
  createdByUserId: z.string().optional(),
});
export type CreateCampaignRequest = z.infer<typeof CreateCampaignRequestSchema>;

export const UpdateCampaignRequestSchema = z.object({
  organizationId: z.string(),
  id: z.string(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  channel: CampaignChannelSchema.optional(),
  status: CampaignStatusSchema.optional(),
  startAt: z.coerce.date().nullable().optional(),
  endAt: z.coerce.date().nullable().optional(),
  archivedAt: z.coerce.date().nullable().optional(),
});
export type UpdateCampaignRequest = z.infer<typeof UpdateCampaignRequestSchema>;

export const AddCampaignLeadRequestSchema = z.object({
  organizationId: z.string(),
  campaignId: z.string(),
  leadId: z.string(),
  status: z.string().default('pending'),
});
export type AddCampaignLeadRequest = z.infer<typeof AddCampaignLeadRequestSchema>;

export const AddCampaignUserRequestSchema = z.object({
  organizationId: z.string(),
  campaignId: z.string(),
  userId: z.string(),
  role: z.string().default('owner'),
});
export type AddCampaignUserRequest = z.infer<typeof AddCampaignUserRequestSchema>;

export const AddCampaignListRequestSchema = z.object({
  organizationId: z.string(),
  campaignId: z.string(),
  listId: z.string(),
  source: z.string().optional(),
  filter: z.record(z.string(), z.unknown()).optional(),
});
export type AddCampaignListRequest = z.infer<typeof AddCampaignListRequestSchema>;

export const UpsertCampaignOrchestrationRequestSchema = z.object({
  organizationId: z.string(),
  campaignId: z.string(),
  status: z.string().default('draft'),
  version: z.coerce.number().int().positive().default(1),
  state: z.record(z.string(), z.unknown()).optional(),
});
export type UpsertCampaignOrchestrationRequest = z.infer<
  typeof UpsertCampaignOrchestrationRequestSchema
>;
