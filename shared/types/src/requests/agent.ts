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
const ToolCallSchema = z.object({
  type: z.string(),
  request_id: z.string(),
  tool_name: z.string(),
  params_as_json: z.string(),
  tool_has_been_called: z.boolean(),
  tool_details: z.object({
    type: z.string(),
    mcp_server_id: z.string().optional(),
    mcp_server_name: z.string().optional(),
    integration_type: z.string().optional(),
    parameters: z.record(z.string(), z.any()).optional(),
    approval_policy: z.string().optional(),
    requires_approval: z.boolean().optional(),
    mcp_tool_name: z.string().optional(),
    mcp_tool_description: z.string().optional(),
  }).nullable(),
})

const ToolResultSchema = z.object({
  request_id: z.string(),
  tool_name: z.string(),
  result_value: z.string(),
  is_error: z.boolean(),
  tool_has_been_called: z.boolean(),
  tool_latency_secs: z.number(),
  dynamic_variable_updates: z.array(z.any()),
  type: z.string(),
})

const ConversationTurnMetricsSchema = z.object({
  metrics: z.record(z.string(), z.object({
    elapsed_time: z.number(),
  })),
}).nullable()

const TranscriptItemSchema = z.object({
  role: z.enum(['agent', 'user']),
  agent_metadata: z.object({
    agent_id: z.string(),
    branch_id: z.string().nullable(),
    workflow_node_id: z.string().nullable(),
  }).nullable(),
  message: z.string().nullable(),
  multivoice_message: z.any().nullable(),
  tool_calls: z.array(ToolCallSchema),
  tool_results: z.array(ToolResultSchema),
  feedback: z.any().nullable(),
  llm_override: z.any().nullable(),
  time_in_call_secs: z.number(),
  conversation_turn_metrics: ConversationTurnMetricsSchema,
  rag_retrieval_info: z.any().nullable(),
  llm_usage: z.any().nullable(),
  interrupted: z.boolean(),
  original_message: z.string().nullable(),
  source_medium: z.string().nullable(),
})

const MetadataSchema = z.object({
  start_time_unix_secs: z.number().optional(),
  accepted_time_unix_secs: z.number().optional(),
  call_duration_secs: z.number().optional().default(0),
  cost: z.number().optional().default(0),
  deletion_settings: z.record(z.string(), z.any()).optional(),
  feedback: z.record(z.string(), z.any()).optional(),
  authorization_method: z.string().optional(),
  charging: z.record(z.string(), z.any()).optional(),
  phone_call: z.any().nullable().optional(),
  batch_call: z.any().nullable().optional(),
  termination_reason: z.string().optional(),
  error: z.any().nullable().optional(),
  warnings: z.array(z.any()).optional(),
  main_language: z.string().optional(),
  rag_usage: z.record(z.string(), z.any()).optional(),
  text_only: z.boolean().optional(),
  features_usage: z.record(z.string(), z.any()).optional(),
  eleven_assistant: z.record(z.string(), z.any()).optional(),
  initiator_id: z.string().nullable().optional(),
  conversation_initiation_source: z.string().optional(),
  conversation_initiation_source_version: z.string().optional(),
  timezone: z.string().optional(),
  initiation_trigger: z.record(z.string(), z.any()).optional(),
  async_metadata: z.any().nullable().optional(),
  whatsapp: z.any().nullable().optional(),
  agent_created_from: z.string().optional(),
  agent_last_updated_from: z.string().optional(),
}).passthrough()

const AnalysisSchema = z.object({
  evaluation_criteria_results: z.record(z.string(), z.any()).optional(),
  data_collection_results: z.record(z.string(), z.any()).optional(),
  call_successful: z.string().optional(),
  transcript_summary: z.string().nullable().optional(),
  call_summary_title: z.string().optional(),
}).passthrough()

export const ElevenLabsWebhookSchema = z.object({
  type: z.string(),
  event_timestamp: z.number().optional(),
  data: z.object({
    agent_id: z.string(),
    conversation_id: z.string(),
    status: z.string().optional(),
    user_id: z.string().nullable().optional(),
    branch_id: z.string().nullable().optional(),
    transcript: z.array(TranscriptItemSchema).optional(),
    metadata: MetadataSchema.optional(),
    analysis: AnalysisSchema.optional(),
    conversation_initiation_client_data: z.record(z.string(), z.any()).optional(),
  }).passthrough(),
})

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
