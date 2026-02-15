import { z } from 'zod';

export const IntegrationStatusSchema = z.enum([
  'disconnected',
  'connected',
  'error',
  'paused',
]);
export type IntegrationStatus = z.infer<typeof IntegrationStatusSchema>;

export const ListIntegrationsRequestSchema = z.object({
  organizationId: z.string(),
});
export type ListIntegrationsRequest = z.infer<typeof ListIntegrationsRequestSchema>;

export const GetIntegrationRequestSchema = z.object({
  organizationId: z.string(),
  id: z.string(),
});
export type GetIntegrationRequest = z.infer<typeof GetIntegrationRequestSchema>;

export const UpsertIntegrationRequestSchema = z.object({
  organizationId: z.string(),
  provider: z.string().min(1),
  displayName: z.string().optional(),
  status: IntegrationStatusSchema.optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  tokenExpiresAt: z.coerce.date().optional(),
  scopes: z.string().optional(),
  externalAccountId: z.string().optional(),
});
export type UpsertIntegrationRequest = z.infer<typeof UpsertIntegrationRequestSchema>;

export const TriggerIntegrationSyncRequestSchema = z.object({
  organizationId: z.string(),
  integrationId: z.string(),
  jobType: z.string().default('manual'),
  payload: z.record(z.string(), z.unknown()).optional(),
});
export type TriggerIntegrationSyncRequest = z.infer<
  typeof TriggerIntegrationSyncRequestSchema
>;

export const ListIntegrationSyncJobsRequestSchema = z.object({
  organizationId: z.string(),
  integrationId: z.string().optional(),
  status: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
});
export type ListIntegrationSyncJobsRequest = z.infer<
  typeof ListIntegrationSyncJobsRequestSchema
>;

export const LogIntegrationWebhookEventRequestSchema = z.object({
  organizationId: z.string(),
  provider: z.string().min(1),
  eventId: z.string().min(1),
  eventType: z.string().optional(),
  payload: z.unknown(),
});
export type LogIntegrationWebhookEventRequest = z.infer<
  typeof LogIntegrationWebhookEventRequestSchema
>;
