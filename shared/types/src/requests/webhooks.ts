import { z } from 'zod'

const BaseWebhookIngestSchema = z.object({
  organizationId: z.string().optional(),
  provider: z.string().min(1),
  eventId: z.string().min(1),
  eventType: z.string().min(1),
  occurredAt: z.string().datetime().optional(),
  payload: z.record(z.string(), z.any()),
})

export const IntegrationWebhookIngestRequestSchema = BaseWebhookIngestSchema
export type IntegrationWebhookIngestRequest = z.infer<
  typeof IntegrationWebhookIngestRequestSchema
>

export const CampaignWebhookIngestRequestSchema = BaseWebhookIngestSchema.extend({
  campaignId: z.string().optional(),
})
export type CampaignWebhookIngestRequest = z.infer<
  typeof CampaignWebhookIngestRequestSchema
>
