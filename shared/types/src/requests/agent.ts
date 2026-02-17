import { z } from 'zod';

export const AgentStatusSchema = z.enum([
  'draft',
  'active',
  'paused',
  'archived',
  'error',
]);

export const GetAgentsRequestSchema = z.object({
  organizationId: z.string(),
})

export const GetAgentRequestSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
})

export const AgentWebhookSchema = z.object({
  agentId: z.string(),
  webhookUrl: z.string(),
  webhookSecret: z.string(),
})

// ElevenLabs Webhook Schemas
// Kept permissive - ElevenLabs frequently adds/changes fields in their payloads.
// Only validate the fields we actually use in processElevenLabsConversationWebhook.
export const ElevenLabsWebhookSchema = z.object({
  type: z.string(),
  event_timestamp: z.number().optional(),
  data: z.object({
    agent_id: z.string(),
    conversation_id: z.string(),
    status: z.string().optional(),
    transcript: z.array(z.any()).optional(),
    metadata: z.object({
      start_time_unix_secs: z.number().optional(),
      call_duration_secs: z.number().optional().default(0),
      cost: z.number().optional().default(0),
      phone_call: z.any().nullable().optional(),
    }).passthrough().optional(),
    analysis: z.object({
      transcript_summary: z.string().nullable().optional(),
    }).passthrough().optional(),
  }).passthrough(),
}).passthrough()

export const CreateAgentRequestSchema = z.object({
  organizationId: z.string(),
  name: z.string().min(1),
  firstMessage: z.string().min(1),
  prompt: z.string().min(1),
})

export const DeleteAgentRequestSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
})

// ElevenLabs Agent Management Schemas
export const CreateElevenLabsAgentSchema = z.object({
  organizationId: z.string(),
  name: z.string().min(1),
  industry: z.string().optional(),
  useCase: z.string().optional(),
  website: z.string().optional(),
  mainGoal: z.string().optional(),
  voiceId: z.string().optional(),
  firstMessage: z.string().optional(),
  systemPrompt: z.string().optional(),
})

export const UpdateElevenLabsAgentSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  name: z.string().optional(),
  firstMessage: z.string().optional(),
  systemPrompt: z.string().optional(),
  voiceId: z.string().optional(),
  language: z.string().optional(),
  llmModel: z.string().optional(),
  temperature: z.number().optional(),
  maxTokens: z.number().optional(),
  stability: z.number().optional(),
  similarityBoost: z.number().optional(),
  speed: z.number().optional(),
  dataCollection: z.record(z.string(), z.any()).optional(),
  evaluationCriteria: z.array(z.any()).optional(),
  tools: z.array(z.any()).optional(),
  knowledgeBase: z.any().optional(),
  status: AgentStatusSchema.optional(),
  advanced: z.object({
    maxConcurrentCalls: z.number().optional(),
    maxCallDuration: z.number().optional(),
    silenceEndCallTimeout: z.number().optional(),
    turnTimeout: z.number().optional(),
    postCallWebhookUrl: z.string().optional(),
  }).optional(),
})

export const OwnerUpdateAgentSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  name: z.string().optional(),
  firstMessage: z.string().optional(),
  systemPrompt: z.string().optional(),
  voiceId: z.string().optional(),
  status: AgentStatusSchema.optional(),
})

export const DeleteElevenLabsAgentSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
})

export const GetAgentConfigSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
})

export const GetAgentAnalyticsSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  granularity: z.enum(['hour', 'day', 'week', 'month']).optional(),
})

export const GetAgentConversationsSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  pageSize: z.coerce.number().optional().default(50),
})

export const GetAgentHealthSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
})

export type GetAgentsRequest = z.infer<typeof GetAgentsRequestSchema>
export type GetAgentRequest = z.infer<typeof GetAgentRequestSchema>
export type AgentWebhookRequest = z.infer<typeof AgentWebhookSchema>
export type ElevenLabsWebhook = z.infer<typeof ElevenLabsWebhookSchema>
export type CreateAgentRequest = z.infer<typeof CreateAgentRequestSchema>
export type DeleteAgentRequest = z.infer<typeof DeleteAgentRequestSchema>
export type CreateElevenLabsAgentRequest = z.infer<typeof CreateElevenLabsAgentSchema>
export type UpdateElevenLabsAgentRequest = z.infer<typeof UpdateElevenLabsAgentSchema>
export type OwnerUpdateAgentRequest = z.infer<typeof OwnerUpdateAgentSchema>
export type DeleteElevenLabsAgentRequest = z.infer<typeof DeleteElevenLabsAgentSchema>
export type GetAgentConfigRequest = z.infer<typeof GetAgentConfigSchema>
export type GetAgentAnalyticsRequest = z.infer<typeof GetAgentAnalyticsSchema>
export type GetAgentConversationsRequest = z.infer<typeof GetAgentConversationsSchema>
export type GetAgentHealthRequest = z.infer<typeof GetAgentHealthSchema>

export interface AgentDegradedModeMetadata {
  enabled: boolean
  reason: string | null
}

export interface AgentHealthResponse {
  agentId: string
  organizationId: string
  status: 'healthy' | 'degraded'
  degradedMode: AgentDegradedModeMetadata
  checks: {
    provider: {
      status: 'ok' | 'degraded'
      provider: string
      checkedAt: string
      message: string
    }
  }
}
