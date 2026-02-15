import { z } from 'zod';

export const SmsCampaignStatusSchema = z.enum([
  'draft',
  'active',
  'paused',
  'completed',
  'cancelled',
]);
export type SmsCampaignStatus = z.infer<typeof SmsCampaignStatusSchema>;

export const SmsDirectionSchema = z.enum(['outbound', 'inbound']);
export type SmsDirection = z.infer<typeof SmsDirectionSchema>;

export const SmsMessageStatusSchema = z.enum([
  'queued',
  'sending',
  'sent',
  'delivered',
  'failed',
]);
export type SmsMessageStatus = z.infer<typeof SmsMessageStatusSchema>;

export const CreateSmsCampaignRequestSchema = z.object({
  organizationId: z.string(),
  campaignId: z.string(),
  name: z.string().min(1).max(200),
  fromNumber: z.string().optional(),
  timezone: z.string().optional(),
  sendWindowStart: z.string().optional(),
  sendWindowEnd: z.string().optional(),
  dailySendLimit: z.coerce.number().int().positive().optional(),
  createdByUserId: z.string().optional(),
});
export type CreateSmsCampaignRequest = z.infer<
  typeof CreateSmsCampaignRequestSchema
>;

export const UpdateSmsCampaignRequestSchema = z.object({
  organizationId: z.string(),
  id: z.string(),
  name: z.string().min(1).max(200).optional(),
  status: SmsCampaignStatusSchema.optional(),
  fromNumber: z.string().nullable().optional(),
  timezone: z.string().nullable().optional(),
  sendWindowStart: z.string().nullable().optional(),
  sendWindowEnd: z.string().nullable().optional(),
  dailySendLimit: z.coerce.number().int().positive().nullable().optional(),
});
export type UpdateSmsCampaignRequest = z.infer<
  typeof UpdateSmsCampaignRequestSchema
>;

export const AddSmsCampaignStepRequestSchema = z.object({
  campaignId: z.string(),
  stepNumber: z.coerce.number().int().nonnegative(),
  delayMinutes: z.coerce.number().int().nonnegative().default(0),
  messageTemplate: z.string().min(1),
  isActive: z.boolean().default(true),
});
export type AddSmsCampaignStepRequest = z.infer<
  typeof AddSmsCampaignStepRequestSchema
>;

export const AddSmsCampaignListRequestSchema = z.object({
  campaignId: z.string(),
  listId: z.string(),
});
export type AddSmsCampaignListRequest = z.infer<
  typeof AddSmsCampaignListRequestSchema
>;

export const EnrollLeadInSmsCampaignRequestSchema = z.object({
  campaignId: z.string(),
  leadId: z.string(),
  status: z.string().default('pending'),
  nextSendAt: z.coerce.date().optional(),
});
export type EnrollLeadInSmsCampaignRequest = z.infer<
  typeof EnrollLeadInSmsCampaignRequestSchema
>;

export const RecordSmsCampaignMessageRequestSchema = z.object({
  campaignId: z.string(),
  enrollmentId: z.string(),
  leadId: z.string(),
  stepNumber: z.coerce.number().int().nonnegative(),
  direction: SmsDirectionSchema.default('outbound'),
  status: SmsMessageStatusSchema.default('queued'),
  body: z.string().min(1),
  twilioMessageSid: z.string().optional(),
  providerMessageId: z.string().optional(),
  errorMessage: z.string().optional(),
});
export type RecordSmsCampaignMessageRequest = z.infer<
  typeof RecordSmsCampaignMessageRequestSchema
>;

export const ListPendingSmsEnrollmentsRequestSchema = z.object({
  campaignId: z.string().optional(),
  status: z.string().default('pending'),
  before: z.coerce.date().optional(),
  limit: z.coerce.number().int().positive().max(1000).default(200),
});
export type ListPendingSmsEnrollmentsRequest = z.infer<
  typeof ListPendingSmsEnrollmentsRequestSchema
>;
