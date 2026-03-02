import { randomBytes } from 'crypto'
import { config } from '@/config'

const CORE_TABS_PROFILE_REF =
  'specs/v1/agent-factory/core-tabs/default-core-tabs-profile.v1.yaml'
const WORKFLOW_PROFILE_REF =
  'specs/v1/agent-factory/workflows/common-customer-request-workflow.v1.yaml'

const CORE_TABS_PROFILE_VERSION = 'v1'
const WORKFLOW_PROFILE_VERSION = 'v1'
const API_BASE_URL = config.backendUrl.replace(/\/+$/, '')
const DEFAULT_MCP_SSE_ENDPOINT = `${API_BASE_URL}/api/mcp/sse`
const DEFAULT_POST_CALL_WEBHOOK_ENDPOINT = `${API_BASE_URL}/api/webhook/agent/elevenlabs`

const DEFAULT_DATA_COLLECTION_SCHEMA = [
  {
    key: 'customer_name',
    type: 'string',
    description: "The caller's full name",
    required: false,
  },
  {
    key: 'customer_phone',
    type: 'string',
    description: "The caller's phone number",
    required: false,
  },
  {
    key: 'customer_email',
    type: 'string',
    description: "The caller's email address",
    required: false,
  },
  {
    key: 'service_needed',
    type: 'string',
    description: 'The type of service the caller is requesting',
    required: false,
  },
  {
    key: 'customer_address',
    type: 'string',
    description: "The caller's service address",
    required: false,
  },
  {
    key: 'resolution_status',
    type: 'enum',
    required: true,
  },
  {
    key: 'follow_up_status',
    type: 'enum',
    required: true,
  },
  {
    key: 'customer_sentiment',
    type: 'enum',
    required: true,
  },
  {
    key: 'agent_notes',
    type: 'string',
    required: false,
  },
] as const

const DEFAULT_EVALUATION_CRITERIA = [
  {
    id: 'accuracy',
    name: 'Accuracy',
    type: 'quality',
    conversation_goal: 'Provide accurate policy and service information.',
  },
  {
    id: 'empathy',
    name: 'Empathy',
    type: 'quality',
    conversation_goal: 'Maintain clear and professional customer empathy.',
  },
  {
    id: 'booking_quality',
    name: 'Booking quality',
    type: 'outcome',
    conversation_goal:
      'Collect required fields before scheduling or transferring service.',
  },
  {
    id: 'escalation_quality',
    name: 'Escalation quality',
    type: 'safety',
    conversation_goal:
      'Escalate safety-critical and low-confidence requests correctly.',
  },
] as const

const DEFAULT_BASELINE_TESTS = [
  'greeting_response',
  'knowledge_base_read',
  'intent_detection',
  'workflow_node_transition',
] as const

const DEFAULT_CORE_TAB_PROFILE = {
  agent: {
    prompt: {
      llm: 'gpt-4o',
      temperature: 0.7,
      max_tokens: 1024,
    },
    language: 'en',
    voice: {
      ranges: {
        stability: [0.55, 0.85] as const,
        similarity_boost: [0.65, 0.9] as const,
        speed: [0.95, 1.08] as const,
      },
    },
  },
  workflow: {
    fallback_behavior: 'fallback_general_information',
    max_branch_depth: 4,
  },
  branches: {
    low_confidence_threshold: 0.65,
    escalate_on_low_confidence: true,
  },
  knowledge_base: {
    firecrawl: {
      enabled: true,
      max_pages: 200,
      default_excludes: [
        '/privacy',
        '/terms',
        '/careers',
        '/wp-admin',
        '/cart',
        '/checkout',
      ],
    },
    ingest: {
      strategy: 'urls',
      allow_owner_manual_additions: false,
    },
  },
  tools: {
    system_tools: [
      { name: 'end_call', enabled: true },
      { name: 'transfer_to_number', enabled: false },
      { name: 'language_detection', enabled: true },
    ],
    mcp: {
      enabled: true,
      endpoint: DEFAULT_MCP_SSE_ENDPOINT,
      approval_policy: 'auto_for_safe_tools',
    },
  },
  tests: {
    block_activation_on_failures: true,
    run_schedule: {
      development: 'on_change',
      daily: '0 6 * * *',
    },
  },
  security: {
    auth_token_enabled: true,
    allowed_origins: ['https://app.revcenter.ai'],
    webhook_signing_required: true,
  },
  advanced: {
    call_limits: {
      max_concurrent: 10,
      daily_cap: 1000,
    },
    conversation: {
      max_duration_seconds: 3600,
      silence_end_call_timeout: 30,
      turn_timeout: 10,
      text_only_mode: false,
    },
    privacy: {
      recording_retention_days: 90,
    },
    webhooks: {
      post_call_url: DEFAULT_POST_CALL_WEBHOOK_ENDPOINT,
      events: ['call.ended', 'transcript.ready'],
    },
  },
} as const

const COMMON_CUSTOMER_REQUEST_WORKFLOW = {
  defaults: {
    fallback_node: 'fallback_general_information',
    escalate_on_low_confidence: true,
    low_confidence_threshold: 0.65,
    max_hops_before_handoff: 4,
  },
  request_types: [
    {
      id: 'safety_or_life_emergency',
      entry_node: 'triage_safety_emergency',
      fallback_node: 'route_live_dispatch',
      escalation_required: true,
    },
    {
      id: 'urgent_service_outage_or_incident',
      entry_node: 'triage_urgent_service',
      fallback_node: 'schedule_priority_service',
      escalation_required: true,
    },
    {
      id: 'routine_repair_or_service_booking',
      entry_node: 'collect_service_intake',
      fallback_node: 'schedule_standard_service',
      escalation_required: false,
    },
    {
      id: 'pricing_quote_plan_inquiry',
      entry_node: 'pricing_quote_information',
      fallback_node: 'route_estimate_queue',
      escalation_required: false,
    },
    {
      id: 'reschedule_or_cancel',
      entry_node: 'appointment_change_flow',
      fallback_node: 'route_dispatch_queue',
      escalation_required: false,
    },
    {
      id: 'warranty_or_dispute',
      entry_node: 'warranty_dispute_flow',
      fallback_node: 'route_service_manager',
      escalation_required: true,
    },
    {
      id: 'human_handoff_request',
      entry_node: 'human_handoff',
      fallback_node: 'human_handoff',
      escalation_required: true,
    },
    {
      id: 'out_of_scope_request',
      entry_node: 'out_of_scope_response',
      fallback_node: 'fallback_general_information',
      escalation_required: false,
    },
  ],
  nodes: [
    {
      id: 'triage_safety_emergency',
      type: 'triage',
      required_fields: [
        'service_address',
        'callback_phone',
        'urgency_level',
        'escalation_reason',
      ],
      allowed_tools: [],
      next: {
        on_success: 'route_live_dispatch',
        on_failure: 'route_live_dispatch',
      },
    },
    {
      id: 'triage_urgent_service',
      type: 'triage',
      required_fields: [
        'service_address',
        'callback_phone',
        'urgency_level',
        'issue_summary',
      ],
      allowed_tools: ['lookup_customer'],
      next: {
        on_success: 'schedule_priority_service',
        on_failure: 'route_dispatch_queue',
      },
    },
    {
      id: 'collect_service_intake',
      type: 'discovery',
      required_fields: [
        'service_type',
        'service_address',
        'callback_phone',
        'issue_summary',
      ],
      allowed_tools: ['lookup_customer'],
      next: {
        on_success: 'schedule_standard_service',
        on_failure: 'fallback_general_information',
      },
    },
    {
      id: 'schedule_priority_service',
      type: 'booking',
      required_fields: [
        'service_type',
        'service_address',
        'preferred_time_window',
      ],
      allowed_tools: ['book_appointment', 'create_task'],
      next: {
        on_success: 'end_call_success',
        on_failure: 'route_dispatch_queue',
      },
    },
    {
      id: 'schedule_standard_service',
      type: 'booking',
      required_fields: [
        'service_type',
        'service_address',
        'preferred_time_window',
      ],
      allowed_tools: ['book_appointment', 'create_task'],
      next: {
        on_success: 'end_call_success',
        on_failure: 'route_dispatch_queue',
      },
    },
    {
      id: 'pricing_quote_information',
      type: 'information',
      required_fields: ['service_type'],
      allowed_tools: ['lookup_customer'],
      next: {
        on_success: 'route_estimate_queue',
        on_failure: 'route_service_manager',
      },
    },
    {
      id: 'appointment_change_flow',
      type: 'schedule_change',
      required_fields: ['callback_phone'],
      allowed_tools: ['lookup_customer', 'create_task'],
      next: {
        on_success: 'end_call_success',
        on_failure: 'route_dispatch_queue',
      },
    },
    {
      id: 'warranty_dispute_flow',
      type: 'escalation',
      required_fields: [
        'service_address',
        'callback_phone',
        'escalation_reason',
      ],
      allowed_tools: ['lookup_customer', 'create_task'],
      next: {
        on_success: 'route_service_manager',
        on_failure: 'route_service_manager',
      },
    },
    {
      id: 'human_handoff',
      type: 'handoff',
      required_fields: ['escalation_reason'],
      allowed_tools: ['create_task'],
      next: {
        on_success: 'end_call_handoff',
        on_failure: 'end_call_handoff',
      },
    },
    {
      id: 'out_of_scope_response',
      type: 'fallback',
      required_fields: [],
      allowed_tools: [],
      next: {
        on_success: 'end_call_no_action',
        on_failure: 'fallback_general_information',
      },
    },
    {
      id: 'fallback_general_information',
      type: 'fallback',
      required_fields: [],
      allowed_tools: [],
      next: {
        on_success: 'end_call_no_action',
        on_failure: 'route_service_manager',
      },
    },
    {
      id: 'route_live_dispatch',
      type: 'escalation',
      required_fields: ['escalation_reason'],
      allowed_tools: ['create_task'],
      next: {
        on_success: 'end_call_handoff',
        on_failure: 'end_call_handoff',
      },
    },
    {
      id: 'route_dispatch_queue',
      type: 'queue',
      required_fields: ['escalation_reason'],
      allowed_tools: ['create_task'],
      next: {
        on_success: 'end_call_handoff',
        on_failure: 'end_call_handoff',
      },
    },
    {
      id: 'route_estimate_queue',
      type: 'queue',
      required_fields: ['service_type', 'callback_phone'],
      allowed_tools: ['create_task'],
      next: {
        on_success: 'end_call_success',
        on_failure: 'route_service_manager',
      },
    },
    {
      id: 'route_service_manager',
      type: 'escalation',
      required_fields: ['escalation_reason'],
      allowed_tools: ['create_task'],
      next: {
        on_success: 'end_call_handoff',
        on_failure: 'end_call_handoff',
      },
    },
    {
      id: 'end_call_success',
      type: 'terminal',
      required_fields: [],
      allowed_tools: [],
    },
    {
      id: 'end_call_handoff',
      type: 'terminal',
      required_fields: [],
      allowed_tools: [],
    },
    {
      id: 'end_call_no_action',
      type: 'terminal',
      required_fields: [],
      allowed_tools: [],
    },
  ],
} as const

export type CoreProvisioningStepId =
  | 'apply_core_tabs_profile'
  | 'ingest_knowledge_sources'
  | 'attach_webhooks_and_mcp'
  | 'register_baseline_tests'

export interface KnowledgeSourceManifestEntry {
  source: string
  normalizedUrl: string
  status: 'pending' | 'skipped'
  reason?: 'duplicate' | 'invalid_url' | 'excluded_path'
}

export interface KnowledgeSourceManifest {
  entries: KnowledgeSourceManifestEntry[]
  ingestibleSources: string[]
}

export interface WorkflowValidationResult {
  requiredRoutesPresent: boolean
  missingIntentRoutes: string[]
}

export interface CoreTabProvisioningUpdateParams {
  llmModel: string
  temperature: number
  maxTokens: number
  language: string
  stability: number
  similarityBoost: number
  speed: number
  dataCollection: Record<string, unknown>
  evaluationCriteria: Array<Record<string, unknown>>
  toolIds: string[]
  builtInTools: string[]
  knowledgeBase: Record<string, unknown>
  workflow: Record<string, unknown>
  security: {
    authTokenEnabled: boolean
    allowedOrigins: string[]
  }
  callLimits: {
    maxConcurrent: number
    dailyCap: number
  }
  privacy: {
    recordingRetention: string
  }
  webhooks: {
    postCallUrl: string
    events: string[]
  }
  conversation: {
    maxDurationSeconds: number
    silenceEndCallTimeout: number
    turnTimeout: number
    textOnlyMode: boolean
  }
}

export interface CoreTabProvisioningPlan {
  profileRef: string
  profileVersion: string
  workflowRef: string
  workflowVersion: string
  updateParams: CoreTabProvisioningUpdateParams
  knowledgeManifest: KnowledgeSourceManifest
  workflowValidation: WorkflowValidationResult
  mcpDefaults: {
    enabled: boolean
    endpoint: string
    approvalPolicy: string
  }
  tests: {
    baselineSuite: string[]
    blockActivationOnFailures: boolean
    runSchedule: {
      development: string
      daily: string
    }
  }
  webhookSigningRequired: boolean
}

export interface ProvisioningStepEvidence {
  stepId: CoreProvisioningStepId
  status: 'completed' | 'failed' | 'skipped'
  startedAt: string
  completedAt: string
  details: Record<string, unknown>
}

export interface CoreTabProvisioningEvidence {
  profileRef: string
  profileVersion: string
  workflowRef: string
  workflowVersion: string
  generatedAt: string
  workflowValidation: WorkflowValidationResult
  knowledgeManifest: KnowledgeSourceManifest
  tests: CoreTabProvisioningPlan['tests']
  mcpDefaults: CoreTabProvisioningPlan['mcpDefaults']
  webhookSigningRequired: boolean
  steps: ProvisioningStepEvidence[]
  errors: Array<{
    stepId: CoreProvisioningStepId
    message: string
    at: string
  }>
}

interface BuildCoreTabProvisioningPlanInput {
  website?: string
  knowledgeSources?: string[]
  transferNumber?: string
}

const midpoint = (range: readonly [number, number]) =>
  Number(((range[0] + range[1]) / 2).toFixed(3))

const normalizeUrl = (value: string): string | null => {
  try {
    const parsed = new URL(value)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null
    }
    const normalizedPath = parsed.pathname.replace(/\/$/, '') || '/'
    parsed.pathname = normalizedPath
    parsed.hash = ''
    return parsed.toString()
  } catch {
    return null
  }
}

const isExcludedPath = (url: string, excludes: readonly string[]) => {
  const parsed = new URL(url)
  return excludes.some((blockedPath) => parsed.pathname.startsWith(blockedPath))
}

const buildKnowledgeSourceManifest = (
  website?: string,
  knowledgeSources: string[] = [],
): KnowledgeSourceManifest => {
  const rawSources = [...(website ? [website] : []), ...knowledgeSources].map(
    (item) => item.trim(),
  )

  const entries: KnowledgeSourceManifestEntry[] = []
  const dedupe = new Set<string>()

  for (const source of rawSources) {
    if (!source) {
      continue
    }

    const normalizedUrl = normalizeUrl(source)

    if (!normalizedUrl) {
      entries.push({
        source,
        normalizedUrl: source,
        status: 'skipped',
        reason: 'invalid_url',
      })
      continue
    }

    if (
      isExcludedPath(
        normalizedUrl,
        DEFAULT_CORE_TAB_PROFILE.knowledge_base.firecrawl.default_excludes,
      )
    ) {
      entries.push({
        source,
        normalizedUrl,
        status: 'skipped',
        reason: 'excluded_path',
      })
      continue
    }

    if (dedupe.has(normalizedUrl)) {
      entries.push({
        source,
        normalizedUrl,
        status: 'skipped',
        reason: 'duplicate',
      })
      continue
    }

    dedupe.add(normalizedUrl)
    entries.push({
      source,
      normalizedUrl,
      status: 'pending',
    })
  }

  return {
    entries,
    ingestibleSources: entries
      .filter((entry) => entry.status === 'pending')
      .map((entry) => entry.normalizedUrl),
  }
}

const inferToolIdsFromWorkflowNodes = () => {
  const builtInToolNames = new Set<string>(
    DEFAULT_CORE_TAB_PROFILE.tools.system_tools.map((tool) => tool.name),
  )
  const resolvedToolIds = new Set<string>()

  for (const node of COMMON_CUSTOMER_REQUEST_WORKFLOW.nodes) {
    for (const tool of node.allowed_tools) {
      if (!builtInToolNames.has(tool)) {
        resolvedToolIds.add(tool)
      }
    }
  }

  return [...resolvedToolIds]
}

export const validateWorkflowDefinition = (): WorkflowValidationResult => {
  const nodeIds = new Set(
    COMMON_CUSTOMER_REQUEST_WORKFLOW.nodes.map((n) => n.id),
  )
  const missingIntentRoutes: string[] = []

  for (const requestType of COMMON_CUSTOMER_REQUEST_WORKFLOW.request_types) {
    if (!nodeIds.has(requestType.entry_node)) {
      missingIntentRoutes.push(`${requestType.id}:entry_node`)
    }
    if (!nodeIds.has(requestType.fallback_node)) {
      missingIntentRoutes.push(`${requestType.id}:fallback_node`)
    }
  }

  if (!nodeIds.has(DEFAULT_CORE_TAB_PROFILE.workflow.fallback_behavior)) {
    missingIntentRoutes.push('defaults:fallback_behavior')
  }

  return {
    requiredRoutesPresent: missingIntentRoutes.length === 0,
    missingIntentRoutes,
  }
}

export const buildCoreTabProvisioningPlan = (
  input: BuildCoreTabProvisioningPlanInput,
): CoreTabProvisioningPlan => {
  const workflowValidation = validateWorkflowDefinition()
  const knowledgeManifest = buildKnowledgeSourceManifest(
    input.website,
    input.knowledgeSources,
  )

  const transferEnabled = Boolean(input.transferNumber?.trim())
  const builtInTools = DEFAULT_CORE_TAB_PROFILE.tools.system_tools.reduce<
    string[]
  >((acc, tool) => {
    if (tool.name === 'transfer_to_number' && transferEnabled) {
      acc.push(tool.name)
      return acc
    }
    if (tool.enabled) {
      acc.push(tool.name)
    }
    return acc
  }, [])

  const updateParams: CoreTabProvisioningUpdateParams = {
    llmModel: DEFAULT_CORE_TAB_PROFILE.agent.prompt.llm,
    temperature: DEFAULT_CORE_TAB_PROFILE.agent.prompt.temperature,
    maxTokens: DEFAULT_CORE_TAB_PROFILE.agent.prompt.max_tokens,
    language: DEFAULT_CORE_TAB_PROFILE.agent.language,
    stability: midpoint(DEFAULT_CORE_TAB_PROFILE.agent.voice.ranges.stability),
    similarityBoost: midpoint(
      DEFAULT_CORE_TAB_PROFILE.agent.voice.ranges.similarity_boost,
    ),
    speed: midpoint(DEFAULT_CORE_TAB_PROFILE.agent.voice.ranges.speed),
    dataCollection: {
      schema: DEFAULT_DATA_COLLECTION_SCHEMA,
      schema_version: 'v1',
    },
    evaluationCriteria: [...DEFAULT_EVALUATION_CRITERIA],
    toolIds: inferToolIdsFromWorkflowNodes(),
    builtInTools,
    knowledgeBase: {
      rag_enabled: true,
      firecrawl: {
        enabled: DEFAULT_CORE_TAB_PROFILE.knowledge_base.firecrawl.enabled,
        max_pages: DEFAULT_CORE_TAB_PROFILE.knowledge_base.firecrawl.max_pages,
        default_excludes:
          DEFAULT_CORE_TAB_PROFILE.knowledge_base.firecrawl.default_excludes,
      },
      ingest: {
        strategy: DEFAULT_CORE_TAB_PROFILE.knowledge_base.ingest.strategy,
        allow_owner_manual_additions:
          DEFAULT_CORE_TAB_PROFILE.knowledge_base.ingest
            .allow_owner_manual_additions,
      },
      source_manifest: knowledgeManifest.entries,
    },
    workflow: {
      defaults: COMMON_CUSTOMER_REQUEST_WORKFLOW.defaults,
      request_types: COMMON_CUSTOMER_REQUEST_WORKFLOW.request_types,
      nodes: COMMON_CUSTOMER_REQUEST_WORKFLOW.nodes,
      branches: {
        low_confidence_threshold:
          DEFAULT_CORE_TAB_PROFILE.branches.low_confidence_threshold,
        escalate_on_low_confidence:
          DEFAULT_CORE_TAB_PROFILE.branches.escalate_on_low_confidence,
      },
      fallback_behavior: DEFAULT_CORE_TAB_PROFILE.workflow.fallback_behavior,
      max_branch_depth: DEFAULT_CORE_TAB_PROFILE.workflow.max_branch_depth,
    },
    security: {
      authTokenEnabled: DEFAULT_CORE_TAB_PROFILE.security.auth_token_enabled,
      allowedOrigins: [...DEFAULT_CORE_TAB_PROFILE.security.allowed_origins],
    },
    callLimits: {
      maxConcurrent:
        DEFAULT_CORE_TAB_PROFILE.advanced.call_limits.max_concurrent,
      dailyCap: DEFAULT_CORE_TAB_PROFILE.advanced.call_limits.daily_cap,
    },
    privacy: {
      recordingRetention: String(
        DEFAULT_CORE_TAB_PROFILE.advanced.privacy.recording_retention_days,
      ),
    },
    webhooks: {
      postCallUrl: DEFAULT_CORE_TAB_PROFILE.advanced.webhooks.post_call_url,
      events: [...DEFAULT_CORE_TAB_PROFILE.advanced.webhooks.events],
    },
    conversation: {
      maxDurationSeconds:
        DEFAULT_CORE_TAB_PROFILE.advanced.conversation.max_duration_seconds,
      silenceEndCallTimeout:
        DEFAULT_CORE_TAB_PROFILE.advanced.conversation.silence_end_call_timeout,
      turnTimeout: DEFAULT_CORE_TAB_PROFILE.advanced.conversation.turn_timeout,
      textOnlyMode:
        DEFAULT_CORE_TAB_PROFILE.advanced.conversation.text_only_mode,
    },
  }

  return {
    profileRef: CORE_TABS_PROFILE_REF,
    profileVersion: CORE_TABS_PROFILE_VERSION,
    workflowRef: WORKFLOW_PROFILE_REF,
    workflowVersion: WORKFLOW_PROFILE_VERSION,
    updateParams,
    knowledgeManifest,
    workflowValidation,
    mcpDefaults: {
      enabled: DEFAULT_CORE_TAB_PROFILE.tools.mcp.enabled,
      endpoint: DEFAULT_CORE_TAB_PROFILE.tools.mcp.endpoint,
      approvalPolicy: DEFAULT_CORE_TAB_PROFILE.tools.mcp.approval_policy,
    },
    tests: {
      baselineSuite: [...DEFAULT_BASELINE_TESTS],
      blockActivationOnFailures:
        DEFAULT_CORE_TAB_PROFILE.tests.block_activation_on_failures,
      runSchedule: {
        development: DEFAULT_CORE_TAB_PROFILE.tests.run_schedule.development,
        daily: DEFAULT_CORE_TAB_PROFILE.tests.run_schedule.daily,
      },
    },
    webhookSigningRequired:
      DEFAULT_CORE_TAB_PROFILE.security.webhook_signing_required,
  }
}

export const createCoreTabProvisioningEvidence = (
  plan: CoreTabProvisioningPlan,
  generatedAt: Date = new Date(),
): CoreTabProvisioningEvidence => ({
  profileRef: plan.profileRef,
  profileVersion: plan.profileVersion,
  workflowRef: plan.workflowRef,
  workflowVersion: plan.workflowVersion,
  generatedAt: generatedAt.toISOString(),
  workflowValidation: plan.workflowValidation,
  knowledgeManifest: plan.knowledgeManifest,
  tests: plan.tests,
  mcpDefaults: plan.mcpDefaults,
  webhookSigningRequired: plan.webhookSigningRequired,
  steps: [],
  errors: [],
})

export const generateProvisioningSecret = (prefix: string = ''): string => {
  const bytes = randomBytes(32)
  return `${prefix}${bytes.toString('hex')}`
}
