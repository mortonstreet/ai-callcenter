import { z } from 'zod';

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
  start_time_unix_secs: z.number(),
  accepted_time_unix_secs: z.number(),
  call_duration_secs: z.number(),
  cost: z.number(),
  deletion_settings: z.record(z.string(), z.any()),
  feedback: z.record(z.string(), z.any()),
  authorization_method: z.string(),
  charging: z.record(z.string(), z.any()),
  phone_call: z.any().nullable(),
  batch_call: z.any().nullable(),
  termination_reason: z.string(),
  error: z.any().nullable(),
  warnings: z.array(z.any()),
  main_language: z.string(),
  rag_usage: z.record(z.string(), z.any()).optional(),
  text_only: z.boolean(),
  features_usage: z.record(z.string(), z.any()),
  eleven_assistant: z.record(z.string(), z.any()),
  initiator_id: z.string().nullable(),
  conversation_initiation_source: z.string(),
  conversation_initiation_source_version: z.string().optional(),
  timezone: z.string(),
  initiation_trigger: z.record(z.string(), z.any()),
  async_metadata: z.any().nullable(),
  whatsapp: z.any().nullable(),
  agent_created_from: z.string(),
  agent_last_updated_from: z.string(),
})

const AnalysisSchema = z.object({
  evaluation_criteria_results: z.record(z.string(), z.any()),
  data_collection_results: z.record(z.string(), z.any()),
  call_successful: z.string(),
  transcript_summary: z.string(),
  call_summary_title: z.string(),
})

export const ElevenLabsWebhookSchema = z.object({
  type: z.string(),
  event_timestamp: z.number(),
  data: z.object({
    agent_id: z.string(),
    conversation_id: z.string(),
    status: z.string(),
    user_id: z.string().nullable(),
    branch_id: z.string().nullable(),
    transcript: z.array(TranscriptItemSchema),
    metadata: MetadataSchema,
    analysis: AnalysisSchema,
    conversation_initiation_client_data: z.record(z.string(), z.any()),
  }),
})

export type GetAgentsRequest = z.infer<typeof GetAgentsRequestSchema>
export type GetAgentRequest = z.infer<typeof GetAgentRequestSchema>
export type AgentWebhookRequest = z.infer<typeof AgentWebhookSchema>
export type ElevenLabsWebhook = z.infer<typeof ElevenLabsWebhookSchema>

