import { z } from 'zod';

export const AgentMessageTypeSchema = z.enum(['email', 'sms', 'voice']);
export type AgentMessageType = z.infer<typeof AgentMessageTypeSchema>;

export const AgentMessageDirectionSchema = z.enum(['outbound', 'inbound']);
export type AgentMessageDirection = z.infer<typeof AgentMessageDirectionSchema>;

export const AgentMessageStatusSchema = z.enum([
  'queued',
  'sending',
  'sent',
  'delivered',
  'opened',
  'clicked',
  'failed',
]);
export type AgentMessageStatus = z.infer<typeof AgentMessageStatusSchema>;

export const UpsertAgentEmailConfigRequestSchema = z.object({
  organizationId: z.string(),
  agentId: z.string(),
  provider: z.string().min(1),
  fromEmail: z.string().email().optional(),
  fromName: z.string().optional(),
  replyToEmail: z.string().email().optional(),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  tokenExpiresAt: z.coerce.date().optional(),
  smtpHost: z.string().optional(),
  smtpPort: z.coerce.number().int().positive().optional(),
  smtpSecure: z.boolean().optional(),
  smtpUsername: z.string().optional(),
  smtpPassword: z.string().optional(),
  isEnabled: z.boolean().optional(),
});
export type UpsertAgentEmailConfigRequest = z.infer<
  typeof UpsertAgentEmailConfigRequestSchema
>;

export const CreateAgentMessageRequestSchema = z.object({
  organizationId: z.string(),
  agentId: z.string(),
  leadId: z.string().optional(),
  campaignId: z.string().optional(),
  emailConfigId: z.string().optional(),
  messageType: AgentMessageTypeSchema.default('email'),
  direction: AgentMessageDirectionSchema.default('outbound'),
  status: AgentMessageStatusSchema.default('queued'),
  subject: z.string().optional(),
  body: z.string().min(1),
  providerMessageId: z.string().optional(),
  threadId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type CreateAgentMessageRequest = z.infer<
  typeof CreateAgentMessageRequestSchema
>;

export const UpdateAgentMessageStatusRequestSchema = z.object({
  organizationId: z.string(),
  id: z.string(),
  status: AgentMessageStatusSchema,
  errorMessage: z.string().optional(),
  sentAt: z.coerce.date().optional(),
  deliveredAt: z.coerce.date().optional(),
  openedAt: z.coerce.date().optional(),
  clickedAt: z.coerce.date().optional(),
  failedAt: z.coerce.date().optional(),
});
export type UpdateAgentMessageStatusRequest = z.infer<
  typeof UpdateAgentMessageStatusRequestSchema
>;

export const UpsertAgentWorkflowRequestSchema = z.object({
  organizationId: z.string(),
  agentId: z.string(),
  name: z.string().min(1).max(200),
  status: z.string().default('draft'),
  definition: z.record(z.string(), z.unknown()).optional(),
  isDefault: z.boolean().optional(),
});
export type UpsertAgentWorkflowRequest = z.infer<
  typeof UpsertAgentWorkflowRequestSchema
>;
