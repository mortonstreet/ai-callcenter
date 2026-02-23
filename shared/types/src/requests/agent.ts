import { z } from 'zod'

export const WIZARD_INPUT_SCHEMA_VERSION = 'wizard_input_v2' as const
export const WIZARD_INTENT_PROFILE_SCHEMA_VERSION =
  'wizard_intent_profile_v1' as const

export const AgentStatusSchema = z.enum([
  'draft',
  'active',
  'paused',
  'archived',
  'error',
])

export const ProvisioningJobStatusSchema = z.enum([
  'queued',
  'running',
  'retrying',
  'failed',
  'completed',
  'blocked_manual',
])

export const ProvisioningStepStatusSchema = z.enum([
  'pending',
  'running',
  'failed',
  'completed',
  'skipped',
])

export const ProvisioningStepIdSchema = z.enum([
  'validate_request',
  'compile_intent_profile',
  'compile_prompt',
  'create_or_update_agent',
  'apply_core_tabs_profile',
  'ingest_knowledge_sources',
  'attach_webhooks_and_mcp',
  'register_and_run_smoke_tests',
  'persist_versions_and_sync',
])

export const ReadinessStatusSchema = z.enum(['ready', 'degraded', 'blocked'])

export const AgentProvisioningJobStatusSchema = ProvisioningJobStatusSchema
export const AgentProvisioningStepStatusSchema = ProvisioningStepStatusSchema
export const AgentProvisioningStepIdSchema = ProvisioningStepIdSchema

export const WizardGreetingModeSchema = z.enum(['generated', 'custom'])

export const WizardVoiceSelectionSchema = z
  .object({
    voiceId: z.string().min(1).optional(),
  })
  .strict()

const IanaTimezoneSchema = z
  .string()
  .regex(
    /^[A-Za-z_]+\/[A-Za-z0-9_\-+]+(?:\/[A-Za-z0-9_\-+]+)?$/,
    'Invalid IANA timezone',
  )

export const WizardRoutingSchema = z
  .object({
    transferNumber: z.string().min(3).optional(),
    businessTimezone: IanaTimezoneSchema.optional(),
    languages: z.array(z.string().min(2)).max(10).optional(),
  })
  .strict()

export const WizardInputV2Schema = z
  .object({
    agentName: z.string().min(1),
    industry: z.string().min(1),
    useCase: z.string().min(1),
    services: z.array(z.string().min(1)).min(1),
    discoveryQuestions: z.array(z.string().min(1)).max(50).optional(),
    mainObjective: z.string().min(1),
    knowledgeSources: z.array(z.string().min(1)).max(50).optional(),
    voiceSelection: WizardVoiceSelectionSchema.optional(),
    greeting: z
      .object({
        mode: WizardGreetingModeSchema,
        customText: z.string().min(1).optional(),
      })
      .strict(),
    routing: WizardRoutingSchema.optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.greeting.mode === 'custom' && !value.greeting.customText?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'greeting.customText is required when greeting.mode=custom',
        path: ['greeting', 'customText'],
      })
    }
  })

export const WizardIntentProfileV1Schema = z
  .object({
    normalizedBusinessContext: z
      .object({
        agentName: z.string().min(1),
        industry: z.string().min(1),
        useCase: z.string().min(1),
        mainObjective: z.string().min(1),
      })
      .strict(),
    selectedServices: z.array(z.string().min(1)),
    selectedQuestions: z.array(z.string().min(1)),
    routingRules: z
      .object({
        transferNumber: z.string().nullable(),
        businessTimezone: z.string().nullable(),
        languages: z.array(z.string()),
      })
      .strict(),
    knowledgeSourceManifest: z.array(
      z
        .object({
          source: z.string().min(1),
          sourceType: z.enum(['url', 'doc']),
        })
        .strict(),
    ),
    selectedVoice: z
      .object({
        voiceId: z.string().nullable(),
        fallbackCandidate: z.string().nullable(),
      })
      .strict(),
    inputSchemaVersion: z.literal(WIZARD_INPUT_SCHEMA_VERSION),
    generatedAt: z.string().datetime(),
  })
  .strict()

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
  tool_details: z
    .object({
      type: z.string(),
      mcp_server_id: z.string().optional(),
      mcp_server_name: z.string().optional(),
      integration_type: z.string().optional(),
      parameters: z.record(z.string(), z.any()).optional(),
      approval_policy: z.string().optional(),
      requires_approval: z.boolean().optional(),
      mcp_tool_name: z.string().optional(),
      mcp_tool_description: z.string().optional(),
    })
    .nullable(),
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

const ConversationTurnMetricsSchema = z
  .object({
    metrics: z.record(
      z.string(),
      z.object({
        elapsed_time: z.number(),
      }),
    ),
  })
  .nullable()

const TranscriptItemSchema = z.object({
  role: z.enum(['agent', 'user']),
  agent_metadata: z
    .object({
      agent_id: z.string(),
      branch_id: z.string().nullable(),
      workflow_node_id: z.string().nullable(),
    })
    .nullable(),
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

const MetadataSchema = z
  .object({
    start_time_unix_secs: z.number().nullable().optional(),
    accepted_time_unix_secs: z.number().nullable().optional(),
    call_duration_secs: z.number().nullable().optional().default(0),
    cost: z.number().nullable().optional().default(0),
    deletion_settings: z.record(z.string(), z.any()).nullable().optional(),
    feedback: z.record(z.string(), z.any()).nullable().optional(),
    authorization_method: z.string().nullable().optional(),
    charging: z.record(z.string(), z.any()).nullable().optional(),
    phone_call: z.any().nullable().optional(),
    batch_call: z.any().nullable().optional(),
    termination_reason: z.string().nullable().optional(),
    error: z.any().nullable().optional(),
    warnings: z.array(z.any()).nullable().optional(),
    main_language: z.string().nullable().optional(),
    rag_usage: z.record(z.string(), z.any()).nullable().optional(),
    text_only: z.boolean().optional(),
    features_usage: z.record(z.string(), z.any()).nullable().optional(),
    eleven_assistant: z.record(z.string(), z.any()).nullable().optional(),
    initiator_id: z.string().nullable().optional(),
    conversation_initiation_source: z.string().nullable().optional(),
    conversation_initiation_source_version: z.string().nullable().optional(),
    timezone: z.string().nullable().optional(),
    initiation_trigger: z.record(z.string(), z.any()).nullable().optional(),
    async_metadata: z.any().nullable().optional(),
    whatsapp: z.any().nullable().optional(),
    agent_created_from: z.string().nullable().optional(),
    agent_last_updated_from: z.string().nullable().optional(),
  })
  .passthrough()

const AnalysisSchema = z
  .object({
    evaluation_criteria_results: z.record(z.string(), z.any()).nullable().optional(),
    data_collection_results: z.record(z.string(), z.any()).nullable().optional(),
    call_successful: z.string().nullable().optional(),
    transcript_summary: z.string().nullable().optional(),
    call_summary_title: z.string().nullable().optional(),
  })
  .passthrough()

export const ElevenLabsWebhookSchema = z.object({
  type: z.string(),
  event_timestamp: z.number().optional(),
  data: z
    .object({
      agent_id: z.string(),
      conversation_id: z.string(),
      status: z.string().optional(),
      user_id: z.string().nullable().optional(),
      branch_id: z.string().nullable().optional(),
      transcript: z.array(TranscriptItemSchema).optional(),
      metadata: MetadataSchema.optional(),
      analysis: AnalysisSchema.optional(),
      conversation_initiation_client_data: z
        .record(z.string(), z.any())
        .optional(),
    })
    .passthrough(),
})

// Wizard v2 create/start payload
const WizardForbiddenWriteFields = {
  systemPrompt: z.never().optional(),
  system_prompt: z.never().optional(),
  llmModel: z.never().optional(),
  llm: z.never().optional(),
  temperature: z.never().optional(),
  maxTokens: z.never().optional(),
  max_tokens: z.never().optional(),
  workflow: z.never().optional(),
  workflowConfig: z.never().optional(),
  analysis: z.never().optional(),
  analysisSchema: z.never().optional(),
  security: z.never().optional(),
  tools: z.never().optional(),
  toolPolicy: z.never().optional(),
  advanced: z.never().optional(),
  knowledgeBase: z.never().optional(),
  dataCollection: z.never().optional(),
  evaluationCriteria: z.never().optional(),
} as const

export const CreateElevenLabsAgentSchema = z
  .object({
    organizationId: z.string(),
    idempotencyKey: z.string().trim().min(1).max(256).optional(),
    wizard_input_v2: WizardInputV2Schema,
    ...WizardForbiddenWriteFields,
  })
  .strict()

export const StartWizardProvisioningRequestSchema = CreateElevenLabsAgentSchema

export const GetAgentProvisioningJobStatusSchema = z
  .object({
    organizationId: z.string(),
    jobId: z.string(),
  })
  .strict()

export const RetryAgentProvisioningJobSchema = z
  .object({
    organizationId: z.string(),
    jobId: z.string(),
    idempotencyKey: z.string().trim().min(1).max(256).optional(),
  })
  .strict()

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
  stability: z.number().min(0).max(1).optional(),
  similarityBoost: z.number().min(0).max(1).optional(),
  speed: z.number().min(0.5).max(2).optional(),
  dataCollection: z.record(z.string(), z.any()).optional(),
  evaluationCriteria: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        type: z.string(),
        conversation_goal: z.string().optional(),
      }),
    )
    .optional(),
  tools: z.array(z.any()).optional(),
  knowledgeBase: z.any().optional(),
  advanced: z
    .object({
      maxConcurrentCalls: z.number().optional(),
      maxCallDuration: z.number().optional(),
      silenceEndCallTimeout: z.number().optional(),
      turnTimeout: z.number().optional(),
      postCallWebhookUrl: z.string().optional(),
    })
    .optional(),
  security: z
    .object({
      authTokenEnabled: z.boolean().optional(),
      allowedOrigins: z.array(z.string()).optional(),
    })
    .optional(),
  callLimits: z
    .object({
      maxConcurrent: z.number().optional(),
      dailyCap: z.number().optional(),
    })
    .optional(),
  privacy: z
    .object({
      recordingRetention: z.string().optional(),
    })
    .optional(),
  webhooks: z
    .object({
      postCallUrl: z.string().optional(),
      events: z.array(z.string()).optional(),
    })
    .optional(),
  conversation: z
    .object({
      maxDurationSeconds: z.number().optional(),
      textOnlyMode: z.boolean().optional(),
      silenceEndCallTimeout: z.number().optional(),
      turnTimeout: z.number().optional(),
    })
    .optional(),
  status: AgentStatusSchema.optional(),
})

// Owner-limited update (first message + voice only)
export const OwnerUpdateAgentSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
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
export type WizardInputV2 = z.infer<typeof WizardInputV2Schema>
export type WizardIntentProfileV1 = z.infer<typeof WizardIntentProfileV1Schema>
export type ProvisioningJobStatus = z.infer<typeof ProvisioningJobStatusSchema>
export type ProvisioningStepStatus = z.infer<typeof ProvisioningStepStatusSchema>
export type ProvisioningStepId = z.infer<typeof ProvisioningStepIdSchema>
export type ReadinessStatus = z.infer<typeof ReadinessStatusSchema>
export type AgentProvisioningJobStatus = ProvisioningJobStatus
export type AgentProvisioningStepStatus = ProvisioningStepStatus
export type AgentProvisioningStepId = ProvisioningStepId
export type CreateElevenLabsAgentRequest = z.infer<typeof CreateElevenLabsAgentSchema>
export type StartWizardProvisioningRequest = z.infer<
  typeof StartWizardProvisioningRequestSchema
>
export type GetAgentProvisioningJobStatusRequest = z.infer<
  typeof GetAgentProvisioningJobStatusSchema
>
export type RetryAgentProvisioningJobRequest = z.infer<
  typeof RetryAgentProvisioningJobSchema
>
export type UpdateElevenLabsAgentRequest = z.infer<typeof UpdateElevenLabsAgentSchema>
export type OwnerUpdateAgentRequest = z.infer<typeof OwnerUpdateAgentSchema>
export type DeleteElevenLabsAgentRequest = z.infer<typeof DeleteElevenLabsAgentSchema>
export type GetAgentConfigRequest = z.infer<typeof GetAgentConfigSchema>
export type GetAgentAnalyticsRequest = z.infer<typeof GetAgentAnalyticsSchema>
export type GetAgentConversationsRequest = z.infer<typeof GetAgentConversationsSchema>
export type GetAgentHealthRequest = z.infer<typeof GetAgentHealthSchema>

export interface AgentDegradedModeMetadata {
  enabled: boolean
  reason:
    | 'local_fallback_agent'
    | 'provider_unavailable'
    | 'readiness_checks_failed'
    | 'readiness_blocked'
    | null
}

export type AgentHealthStatus = 'healthy' | 'degraded' | 'blocked'
export type AgentHealthCheckStatus = 'ok' | 'degraded' | 'failed' | 'blocked'
export type AgentHealthCheckName =
  | 'provider'
  | 'profile'
  | 'workflow'
  | 'knowledge_base'
  | 'tools_mcp'
  | 'webhook'
  | 'tests'
  | 'queues'

export interface AgentHealthCheckResult {
  status: AgentHealthCheckStatus
  checkedAt: string
  message: string
  blocking: boolean
  remediationAction?: string
}

export type AgentHealthCheck = AgentHealthCheckResult

export interface AgentHealthChecks {
  provider: AgentHealthCheckResult & {
    provider?: string
  }
  profile: AgentHealthCheckResult
  workflow: AgentHealthCheckResult
  knowledge_base: AgentHealthCheckResult
  tools_mcp: AgentHealthCheckResult
  webhook: AgentHealthCheckResult
  tests: AgentHealthCheckResult
  queues: AgentHealthCheckResult
}

export interface AgentActivationGate {
  allowed: boolean
  deniedBy: AgentHealthCheckName[]
}

export interface AgentHealthResponse {
  agentId: string
  organizationId: string
  status: AgentHealthStatus
  readinessStatus?: 'ready' | 'degraded' | 'blocked'
  degradedMode: AgentDegradedModeMetadata
  activation: AgentActivationGate
  checks: AgentHealthChecks
}

export const AgentHealthStatusSchema = z.enum(['healthy', 'degraded', 'blocked'])
export const AgentHealthCheckStatusSchema = z.enum([
  'ok',
  'degraded',
  'failed',
  'blocked',
])
export const AgentHealthCheckNameSchema = z.enum([
  'provider',
  'profile',
  'workflow',
  'knowledge_base',
  'tools_mcp',
  'webhook',
  'tests',
  'queues',
])

export const AgentHealthCheckResultSchema = z.object({
  status: AgentHealthCheckStatusSchema,
  checkedAt: z.string(),
  message: z.string(),
  blocking: z.boolean(),
  remediationAction: z.string().optional(),
})

export const AgentHealthChecksSchema = z
  .object({
    provider: AgentHealthCheckResultSchema.extend({
      provider: z.string().optional(),
    }),
    profile: AgentHealthCheckResultSchema,
    workflow: AgentHealthCheckResultSchema,
    knowledge_base: AgentHealthCheckResultSchema,
    tools_mcp: AgentHealthCheckResultSchema,
    webhook: AgentHealthCheckResultSchema,
    tests: AgentHealthCheckResultSchema,
    queues: AgentHealthCheckResultSchema,
  })
  .strict()

export const AgentActivationGateSchema = z.object({
  allowed: z.boolean(),
  deniedBy: z.array(AgentHealthCheckNameSchema).default([]),
})

export const AgentHealthResponseSchema = z.object({
  agentId: z.string(),
  organizationId: z.string(),
  status: AgentHealthStatusSchema,
  readinessStatus: ReadinessStatusSchema.optional(),
  degradedMode: z.object({
    enabled: z.boolean(),
    reason: z
      .enum([
        'local_fallback_agent',
        'provider_unavailable',
        'readiness_checks_failed',
        'readiness_blocked',
      ])
      .nullable(),
  }),
  activation: AgentActivationGateSchema,
  checks: AgentHealthChecksSchema,
})
