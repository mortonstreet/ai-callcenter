import { createHash } from 'crypto'
import fs from 'fs'
import path from 'path'
import { config } from '@/config'
import {
  WizardInputV2 as SharedWizardInputV2,
  WizardIntentProfileV1 as SharedWizardIntentProfileV1,
  WizardIntentProfileV1Schema,
} from '@shared/types/src'

export const AGENT_PROFILE_SCHEMA_VERSION = 'agent_profile_v1' as const
export const WIZARD_INTENT_SCHEMA_VERSION = 'wizard_intent_profile_v1' as const
export const WIZARD_INPUT_SCHEMA_VERSION = 'wizard_input_v2' as const
export const AGENT_PROFILE_V1_VERSION = AGENT_PROFILE_SCHEMA_VERSION
export const PROMPT_PROFILE_V1_VERSION = 'prompt_profile_v1'

export type GreetingMode = 'generated' | 'custom'

export interface BuildWizardIntentProfileInput {
  companyName: string
  agentName: string
  industry?: string
  useCase?: string
  website?: string
  mainObjective?: string
  services?: string[]
  discoveryQuestions?: string[]
  knowledgeSources?: string[]
  voiceId?: string
  greetingMode?: GreetingMode
  customGreeting?: string
  transferNumber?: string
  businessTimezone?: string
  languages?: string[]
  now?: Date
}

export interface WizardIntentProfileV1 {
  schemaVersion: typeof WIZARD_INTENT_SCHEMA_VERSION
  inputSchemaVersion: typeof WIZARD_INPUT_SCHEMA_VERSION
  generatedAt: string
  business: {
    companyName: string
    agentName: string
    industry: string
    industryLabel: string
    useCase: string
    website: string | null
    mainObjective: string
  }
  services: string[]
  discoveryQuestions: string[]
  knowledgeSources: string[]
  routing: {
    transferNumber: string | null
    businessTimezone: string | null
    languages: string[]
  }
  greeting: {
    mode: GreetingMode
    customText: string | null
  }
  voice: {
    selectedVoiceId: string | null
    fallbackVoiceId: string
  }
}

export interface AgentProfileV1 {
  profileVersion: typeof AGENT_PROFILE_SCHEMA_VERSION
  promptProfileVersion: string
  configProfileVersion: string
  sourceAssets: {
    coreTabs: {
      path: string
      sha256: string
    }
    workflow: {
      path: string
      sha256: string
    }
    promptTemplate: {
      path: string
      sha256: string
    }
  }
  llm: {
    model: string
    temperature: number
    maxTokens: number
  }
  language: string
  voice: {
    modelFamily: string
    expressiveMode: string
    ranges: {
      stability: [number, number]
      similarityBoost: [number, number]
      speed: [number, number]
    }
    tuningDefaults: {
      stability: number
      similarityBoost: number
      speed: number
    }
    curatedCatalog: Array<{
      voiceId: string
      label: string
    }>
    defaultVoiceId: string
    fallbackByIndustry: Record<string, string>
  }
  workflow: {
    fallbackNode: string
    lowConfidenceThreshold: number
    escalateOnLowConfidence: boolean
    requestTypes: Array<{
      id: string
      entryNode: string
    }>
    requiredDiscoveryFields: string[]
  }
  defaults: {
    tools: {
      enabledSystemTools: string[]
      approvalPolicy: string
    }
    analysis: {
      dataCollectionOwner: string
      evaluationOwner: string
    }
    security: {
      authTokenEnabled: boolean
      allowedOrigins: string[]
      webhookSigningRequired: boolean
    }
    advanced: {
      maxConcurrent: number
      dailyCap: number
      maxDurationSeconds: number
      silenceEndCallTimeout: number
      turnTimeout: number
      textOnlyMode: boolean
      recordingRetentionDays: number
    }
  }
  promptTemplate: string
}

export interface ResolvedVoiceConfig {
  voiceId: string
  source: 'selected' | 'fallback'
  reason:
    | 'selected'
    | 'missing_selection'
    | 'selected_not_curated'
    | 'selected_unavailable'
  modelFamily: string
  stability: number
  similarityBoost: number
  speed: number
}

export interface CuratedVoice {
  voice_id: string
  name: string
  category: string
  labels?: Record<string, string>
  preview_url?: string
}

const CORE_TABS_ASSET_PATH =
  'specs/v1/agent-factory/core-tabs/default-core-tabs-profile.v1.yaml'
const WORKFLOW_ASSET_PATH =
  'specs/v1/agent-factory/workflows/common-customer-request-workflow.v1.yaml'
const PROMPT_TEMPLATE_ASSET_PATH =
  'specs/v1/agent-factory/templates/elevenlabs-v3-system-prompt.template.md'

const DEFAULT_VOICE_ID = 'cgSgspJ2msm6clMCkdW9'

const CURATED_VOICE_CATALOG: Array<{ voiceId: string; label: string }> = [
  {
    voiceId: DEFAULT_VOICE_ID,
    label: 'Jessica',
  },
  {
    voiceId: 'EXAVITQu4vr4xnSDxMaL',
    label: 'Bella',
  },
  {
    voiceId: 'MF3mGyEYCl7XYWbV9V6O',
    label: 'Elli',
  },
  {
    voiceId: 'TX3LPaxmHKxFdv7VOQHJ',
    label: 'Liam',
  },
]

const DEFAULT_FALLBACK_BY_INDUSTRY: Record<string, string> = {
  hvac: DEFAULT_VOICE_ID,
  plumbing: DEFAULT_VOICE_ID,
  roofing: DEFAULT_VOICE_ID,
  electrical: DEFAULT_VOICE_ID,
  fire_safety: DEFAULT_VOICE_ID,
  pest_control: DEFAULT_VOICE_ID,
  garage_doors: DEFAULT_VOICE_ID,
  cleaning_services: DEFAULT_VOICE_ID,
}

const CURATED_VOICE_CATEGORIES = new Set<string>([
  'premade',
  'cloned',
  'generated',
  'professional',
])

const DEFAULT_PROMPT_TEMPLATE = `# ElevenLabs V3 System Prompt Template

## 1. Identity And Mission
You are <agent_name>, the AI voice assistant for <company_name>.
Your primary mission is to provide friendly, efficient, and professional service while qualifying callers and capturing their information for follow-up.

## 2. Operating Context
1. Industry: <industry_label>
2. Services enabled: <service_list>
3. Service area policy: <service_area_policy>
4. Hours and dispatch rules: <hours_policy>
5. Language policy: <language_policy>

## 3. Lead Capture — Required Fields
During every call, collect the following information. Ask naturally and conversationally — do not read a form.

1. full_name (REQUIRED) — Ask: "Can I get your name, please?"
2. phone_number (REQUIRED) — Ask: "What's the best number to reach you?" If caller ID is available, confirm: "I see you're calling from [number] — is that the best number for us to reach you?"
3. email (OPTIONAL) — Ask once: "Do you have an email address we can send a confirmation to?" If the caller declines, say "No problem" and move on. Do not ask again.
4. service_needed (REQUIRED) — Ask: "What service can we help you with today?" Clarify the specific issue if vague (e.g., "Is that for repair, maintenance, or a new installation?").
5. address (OPTIONAL but recommended) — Ask: "What's the service address?" If the caller prefers not to share, acknowledge and continue.
6. preferred_time_window (REQUIRED) — Ask: "When works best for you? For example, tomorrow morning or later this week?"

### Lead Capture Rules
- If the caller has already provided any of these details earlier in the conversation or via caller ID, do NOT re-ask. Instead, confirm: "Just to confirm, I have [detail] — is that correct?"
- If the caller refuses an optional field (email, address), accept gracefully and continue.
- Before ending the call, verify that all required fields (full_name, phone_number, service_needed) have been captured. If any are missing, ask politely: "Before we wrap up, I just need your [missing field] so we can get you taken care of."

## 4. Safety And Compliance
1. <safety_trigger_1>
2. <safety_trigger_2>
3. <safety_trigger_3>
Emergency escalation target: <emergency_escalation_target>

## 5. Intent Routing Directives
1. <intent_1> -> <workflow_node_1>
2. <intent_2> -> <workflow_node_2>
3. <intent_3> -> <workflow_node_3>
4. Unknown/low confidence -> <fallback_node>

## 6. Tool Usage Policy
1. <tool_name_1> for <use_case_1>
2. <tool_name_2> for <use_case_2>

## 7. End-of-Call Behavior
Before ending every call:
1. Summarize what was captured: "So I have [full_name], reaching you at [phone_number], and you need [service_needed] at [address if provided], ideally [preferred_time_window]."
2. Confirm accuracy: "Does everything sound right?"
3. Set expectations: "Great — we'll get you on the schedule and follow up to confirm your appointment. You can expect a confirmation by [text/call/email based on what was collected]."
4. Close warmly: "Thanks for calling <company_name>! We'll take great care of you."

## 8. Knowledge Grounding
1. <kb_source_category_1>
2. <kb_source_category_2>

## 9. Output Quality Targets
1. Intent routing accuracy: <target_intent_accuracy>
2. Booking completeness: <target_booking_completeness>
3. Escalation quality: <target_escalation_quality>
4. Compliance guardrails: <target_compliance>`

let cachedAgentProfile: AgentProfileV1 | null = null

const toSha256 = (input: string) =>
  createHash('sha256').update(input).digest('hex')

const resolveAssetPath = (relativePath: string): string | null => {
  const candidates = [
    path.resolve(process.cwd(), relativePath),
    path.resolve(process.cwd(), '..', relativePath),
    path.resolve(process.cwd(), '..', '..', relativePath),
  ]

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }

  return null
}

const readAssetWithFallback = (
  relativePath: string,
  fallbackContent: string,
): {
  content: string
  sha256: string
  path: string
} => {
  const resolved = resolveAssetPath(relativePath)
  if (!resolved) {
    return {
      content: fallbackContent,
      sha256: toSha256(fallbackContent),
      path: relativePath,
    }
  }

  const content = fs.readFileSync(resolved, 'utf8')
  return {
    content,
    sha256: toSha256(content),
    path: relativePath,
  }
}

const extractString = (
  source: string,
  pattern: RegExp,
  fallback: string,
): string => {
  const matched = source.match(pattern)
  if (!matched || !matched[1]) {
    return fallback
  }
  return matched[1].trim()
}

const extractNumber = (
  source: string,
  pattern: RegExp,
  fallback: number,
): number => {
  const matched = source.match(pattern)
  if (!matched || !matched[1]) {
    return fallback
  }

  const parsed = Number(matched[1])
  return Number.isFinite(parsed) ? parsed : fallback
}

const extractBoolean = (
  source: string,
  pattern: RegExp,
  fallback: boolean,
): boolean => {
  const matched = source.match(pattern)
  if (!matched || !matched[1]) {
    return fallback
  }
  return matched[1].trim() === 'true'
}

const extractNumberTuple = (
  source: string,
  pattern: RegExp,
  fallback: [number, number],
): [number, number] => {
  const matched = source.match(pattern)
  if (!matched || !matched[1] || !matched[2]) {
    return fallback
  }

  const first = Number(matched[1])
  const second = Number(matched[2])
  if (!Number.isFinite(first) || !Number.isFinite(second)) {
    return fallback
  }

  return [first, second]
}

const extractQuotedListFromBlock = (
  source: string,
  blockPattern: RegExp,
): string[] => {
  const matched = source.match(blockPattern)
  if (!matched || !matched[1]) {
    return []
  }

  return matched[1]
    .split('\n')
    .map((line) => {
      const itemMatch = line.match(/-\s*"([^"]+)"/)
      return itemMatch?.[1].trim() || ''
    })
    .filter(Boolean)
}

const extractEnabledSystemTools = (source: string): string[] => {
  const toolsBlock = source.match(/system_tools:\s*\n([\s\S]*?)\n\s*mcp:/m)
  if (!toolsBlock || !toolsBlock[1]) {
    return ['end_call', 'language_detection']
  }

  const enabledTools: string[] = []
  const entryPattern = /-\s*name:\s*"([^"]+)"\s*\n\s*enabled:\s*(true|false)/g
  let match: RegExpExecArray | null
  while ((match = entryPattern.exec(toolsBlock[1])) !== null) {
    if (match[2] === 'true') {
      enabledTools.push(match[1])
    }
  }

  return enabledTools.length > 0
    ? enabledTools
    : ['end_call', 'language_detection']
}

const extractWorkflowRequestTypes = (
  workflowSource: string,
): Array<{ id: string; entryNode: string }> => {
  const matches = workflowSource.match(
    /request_types:\s*\n([\s\S]*?)\n\s*nodes:/m,
  )
  if (!matches || !matches[1]) {
    return [
      {
        id: 'routine_repair_or_service_booking',
        entryNode: 'collect_service_intake',
      },
      {
        id: 'pricing_quote_plan_inquiry',
        entryNode: 'pricing_quote_information',
      },
      {
        id: 'human_handoff_request',
        entryNode: 'human_handoff',
      },
    ]
  }

  const requestTypes: Array<{ id: string; entryNode: string }> = []
  const entryPattern = /id:\s*"([^"]+)"[\s\S]*?entry_node:\s*"([^"]+)"/g
  let match: RegExpExecArray | null
  while ((match = entryPattern.exec(matches[1])) !== null) {
    requestTypes.push({
      id: match[1],
      entryNode: match[2],
    })
  }

  return requestTypes.length > 0
    ? requestTypes
    : [
        {
          id: 'routine_repair_or_service_booking',
          entryNode: 'collect_service_intake',
        },
      ]
}

const extractCollectIntakeFields = (workflowSource: string): string[] => {
  const block = workflowSource.match(
    /id:\s*"collect_service_intake"[\s\S]*?required_fields:\s*\n((?:\s*-\s*"[^"]+"\s*\n)+)/m,
  )
  if (!block || !block[1]) {
    return ['service_type', 'service_address', 'callback_phone']
  }

  const requiredFields = block[1]
    .split('\n')
    .map((line) => {
      const fieldMatch = line.match(/-\s*"([^"]+)"/)
      return fieldMatch?.[1].trim() || ''
    })
    .filter(Boolean)

  return requiredFields.length > 0
    ? requiredFields
    : ['service_type', 'service_address', 'callback_phone']
}

const sanitizeValue = (value?: string | null): string => value?.trim() || ''

const toSlug = (value?: string): string => {
  if (!value) {
    return ''
  }

  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

const toLabel = (value: string): string =>
  value
    .split('_')
    .filter(Boolean)
    .map((segment) => segment[0].toUpperCase() + segment.slice(1))
    .join(' ')

const normalizeStringList = (
  values: string[] | undefined,
  options: {
    toLowerCase?: boolean
  } = {},
): string[] => {
  const normalized = (values || [])
    .map((value) => sanitizeValue(value))
    .filter(Boolean)
    .map((value) => (options.toLowerCase ? value.toLowerCase() : value))

  return Array.from(new Set(normalized)).sort((a, b) => a.localeCompare(b))
}

const midpoint = (range: [number, number]): number =>
  Number(((range[0] + range[1]) / 2).toFixed(3))

const buildAgentProfileFromAssets = (): AgentProfileV1 => {
  const coreTabsAsset = readAssetWithFallback(CORE_TABS_ASSET_PATH, '')
  const workflowAsset = readAssetWithFallback(WORKFLOW_ASSET_PATH, '')
  const promptTemplateAsset = readAssetWithFallback(
    PROMPT_TEMPLATE_ASSET_PATH,
    DEFAULT_PROMPT_TEMPLATE,
  )

  const configProfileVersion = extractString(
    coreTabsAsset.content,
    /profile_version:\s*"([^"]+)"/,
    'v1',
  )

  const llmModel = extractString(
    coreTabsAsset.content,
    /\n\s*llm:\s*"([^"]+)"/,
    'gpt-4o',
  )

  const temperature = extractNumber(
    coreTabsAsset.content,
    /\n\s*temperature:\s*([0-9.]+)/,
    0.7,
  )

  const maxTokens = extractNumber(
    coreTabsAsset.content,
    /\n\s*max_tokens:\s*([0-9]+)/,
    1024,
  )

  const language = extractString(
    coreTabsAsset.content,
    /\n\s*language:\s*"([^"]+)"/,
    'en',
  )

  const stabilityRange = extractNumberTuple(
    coreTabsAsset.content,
    /stability:\s*\[([0-9.]+),\s*([0-9.]+)\]/,
    [0.55, 0.85],
  )

  const similarityBoostRange = extractNumberTuple(
    coreTabsAsset.content,
    /similarity_boost:\s*\[([0-9.]+),\s*([0-9.]+)\]/,
    [0.65, 0.9],
  )

  const speedRange = extractNumberTuple(
    coreTabsAsset.content,
    /speed:\s*\[([0-9.]+),\s*([0-9.]+)\]/,
    [0.95, 1.08],
  )

  const fallbackNode = extractString(
    workflowAsset.content,
    /fallback_node:\s*"([^"]+)"/,
    'fallback_general_information',
  )

  const lowConfidenceThreshold = extractNumber(
    workflowAsset.content,
    /low_confidence_threshold:\s*([0-9.]+)/,
    0.65,
  )

  const escalateOnLowConfidence = extractBoolean(
    workflowAsset.content,
    /escalate_on_low_confidence:\s*(true|false)/,
    true,
  )

  const workflowRequestTypes = extractWorkflowRequestTypes(
    workflowAsset.content,
  )
  const requiredDiscoveryFields = extractCollectIntakeFields(
    workflowAsset.content,
  )

  const enabledSystemTools = extractEnabledSystemTools(coreTabsAsset.content)

  const approvalPolicy = extractString(
    coreTabsAsset.content,
    /approval_policy:\s*"([^"]+)"/,
    'auto_for_safe_tools',
  )

  const dataCollectionOwner = extractString(
    coreTabsAsset.content,
    /data_collection:\s*\n\s*schema_owner:\s*"([^"]+)"/,
    'admin',
  )

  const evaluationOwner = extractString(
    coreTabsAsset.content,
    /evaluation:\s*\n\s*thresholds_owner:\s*"([^"]+)"/,
    'admin',
  )

  const authTokenEnabled = extractBoolean(
    coreTabsAsset.content,
    /auth_token_enabled:\s*(true|false)/,
    true,
  )

  const allowedOrigins = extractQuotedListFromBlock(
    coreTabsAsset.content,
    /allowed_origins:\s*\n((?:\s*-\s*"[^"]+"\s*\n?)+)/m,
  )

  const webhookSigningRequired = extractBoolean(
    coreTabsAsset.content,
    /webhook_signing_required:\s*(true|false)/,
    true,
  )

  const maxConcurrent = extractNumber(
    coreTabsAsset.content,
    /max_concurrent:\s*([0-9]+)/,
    10,
  )

  const dailyCap = extractNumber(
    coreTabsAsset.content,
    /daily_cap:\s*([0-9]+)/,
    1000,
  )

  const maxDurationSeconds = extractNumber(
    coreTabsAsset.content,
    /max_duration_seconds:\s*([0-9]+)/,
    3600,
  )

  const silenceEndCallTimeout = extractNumber(
    coreTabsAsset.content,
    /silence_end_call_timeout:\s*([0-9]+)/,
    30,
  )

  const turnTimeout = extractNumber(
    coreTabsAsset.content,
    /turn_timeout:\s*([0-9]+)/,
    10,
  )

  const textOnlyMode = extractBoolean(
    coreTabsAsset.content,
    /text_only_mode:\s*(true|false)/,
    false,
  )

  const recordingRetentionDays = extractNumber(
    coreTabsAsset.content,
    /recording_retention_days:\s*([0-9]+)/,
    90,
  )

  return {
    profileVersion: AGENT_PROFILE_SCHEMA_VERSION,
    promptProfileVersion: 'v1',
    configProfileVersion,
    sourceAssets: {
      coreTabs: {
        path: coreTabsAsset.path,
        sha256: coreTabsAsset.sha256,
      },
      workflow: {
        path: workflowAsset.path,
        sha256: workflowAsset.sha256,
      },
      promptTemplate: {
        path: promptTemplateAsset.path,
        sha256: promptTemplateAsset.sha256,
      },
    },
    llm: {
      model: llmModel,
      temperature,
      maxTokens,
    },
    language,
    voice: {
      modelFamily: 'eleven_v3',
      expressiveMode: 'balanced_professional',
      ranges: {
        stability: stabilityRange,
        similarityBoost: similarityBoostRange,
        speed: speedRange,
      },
      tuningDefaults: {
        stability: midpoint(stabilityRange),
        similarityBoost: midpoint(similarityBoostRange),
        speed: midpoint(speedRange),
      },
      curatedCatalog: CURATED_VOICE_CATALOG,
      defaultVoiceId: DEFAULT_VOICE_ID,
      fallbackByIndustry: DEFAULT_FALLBACK_BY_INDUSTRY,
    },
    workflow: {
      fallbackNode,
      lowConfidenceThreshold,
      escalateOnLowConfidence,
      requestTypes: workflowRequestTypes,
      requiredDiscoveryFields,
    },
    defaults: {
      tools: {
        enabledSystemTools,
        approvalPolicy,
      },
      analysis: {
        dataCollectionOwner,
        evaluationOwner,
      },
      security: {
        authTokenEnabled,
        allowedOrigins,
        webhookSigningRequired,
      },
      advanced: {
        maxConcurrent,
        dailyCap,
        maxDurationSeconds,
        silenceEndCallTimeout,
        turnTimeout,
        textOnlyMode,
        recordingRetentionDays,
      },
    },
    promptTemplate: promptTemplateAsset.content || DEFAULT_PROMPT_TEMPLATE,
  }
}

export const getAgentProfileV1 = (): AgentProfileV1 => {
  if (!cachedAgentProfile) {
    cachedAgentProfile = buildAgentProfileFromAssets()
  }
  return cachedAgentProfile
}

export const buildWizardIntentProfileV1 = (
  input: BuildWizardIntentProfileInput,
): WizardIntentProfileV1 => {
  const profile = getAgentProfileV1()

  const normalizedIndustry = toSlug(input.industry) || 'general_services'
  const normalizedUseCase = toSlug(input.useCase) || 'customer_support'

  const services = normalizeStringList(input.services)
  const discoveryQuestions = normalizeStringList(input.discoveryQuestions)
  const knowledgeSources = normalizeStringList(input.knowledgeSources)
  const languages = normalizeStringList(input.languages, { toLowerCase: true })

  const sanitizedGreetingText = sanitizeValue(input.customGreeting) || null
  const requestedGreetingMode = input.greetingMode || 'generated'

  const greetingMode: GreetingMode =
    requestedGreetingMode === 'custom' && sanitizedGreetingText
      ? 'custom'
      : 'generated'

  const selectedVoiceId = sanitizeValue(input.voiceId) || null

  const fallbackVoiceId =
    profile.voice.fallbackByIndustry[normalizedIndustry] ||
    profile.voice.defaultVoiceId

  return {
    schemaVersion: WIZARD_INTENT_SCHEMA_VERSION,
    inputSchemaVersion: WIZARD_INPUT_SCHEMA_VERSION,
    generatedAt: (input.now || new Date()).toISOString(),
    business: {
      companyName: sanitizeValue(input.companyName),
      agentName: sanitizeValue(input.agentName),
      industry: normalizedIndustry,
      industryLabel: toLabel(normalizedIndustry),
      useCase: normalizedUseCase,
      website: sanitizeValue(input.website) || null,
      mainObjective:
        sanitizeValue(input.mainObjective) ||
        'Resolve caller requests and capture clear next steps.',
    },
    services,
    discoveryQuestions,
    knowledgeSources,
    routing: {
      transferNumber: sanitizeValue(input.transferNumber) || null,
      businessTimezone: sanitizeValue(input.businessTimezone) || null,
      languages,
    },
    greeting: {
      mode: greetingMode,
      customText: greetingMode === 'custom' ? sanitizedGreetingText : null,
    },
    voice: {
      selectedVoiceId,
      fallbackVoiceId,
    },
  }
}

export const resolveVoiceSelection = (params: {
  intentProfile: WizardIntentProfileV1
  profile?: AgentProfileV1
  availableVoiceIds?: string[]
}): ResolvedVoiceConfig => {
  const profile = params.profile || getAgentProfileV1()

  const curatedVoiceIds = profile.voice.curatedCatalog.map(
    (voice) => voice.voiceId,
  )
  const curatedVoiceSet = new Set(curatedVoiceIds)

  const availableVoiceSet = params.availableVoiceIds?.length
    ? new Set(
        params.availableVoiceIds.filter((voiceId) =>
          curatedVoiceSet.has(voiceId),
        ),
      )
    : null

  const selectedVoiceId = params.intentProfile.voice.selectedVoiceId

  if (
    selectedVoiceId &&
    curatedVoiceSet.has(selectedVoiceId) &&
    (!availableVoiceSet || availableVoiceSet.has(selectedVoiceId))
  ) {
    return {
      voiceId: selectedVoiceId,
      source: 'selected',
      reason: 'selected',
      modelFamily: profile.voice.modelFamily,
      stability: profile.voice.tuningDefaults.stability,
      similarityBoost: profile.voice.tuningDefaults.similarityBoost,
      speed: profile.voice.tuningDefaults.speed,
    }
  }

  let fallbackVoiceId =
    profile.voice.fallbackByIndustry[params.intentProfile.business.industry] ||
    params.intentProfile.voice.fallbackVoiceId ||
    profile.voice.defaultVoiceId

  if (!curatedVoiceSet.has(fallbackVoiceId)) {
    fallbackVoiceId = profile.voice.defaultVoiceId
  }

  if (availableVoiceSet && !availableVoiceSet.has(fallbackVoiceId)) {
    fallbackVoiceId =
      curatedVoiceIds.find((voiceId) => availableVoiceSet.has(voiceId)) ||
      profile.voice.defaultVoiceId
  }

  return {
    voiceId: fallbackVoiceId,
    source: 'fallback',
    reason: selectedVoiceId
      ? availableVoiceSet
        ? 'selected_unavailable'
        : 'selected_not_curated'
      : 'missing_selection',
    modelFamily: profile.voice.modelFamily,
    stability: profile.voice.tuningDefaults.stability,
    similarityBoost: profile.voice.tuningDefaults.similarityBoost,
    speed: profile.voice.tuningDefaults.speed,
  }
}

export const stripVolatileIntentFields = (
  intentProfile: WizardIntentProfileV1,
): Omit<WizardIntentProfileV1, 'generatedAt'> => {
  const { generatedAt: _generatedAt, ...stableIntent } = intentProfile
  return stableIntent
}

const uniqueStrings = (items: string[]): string[] => {
  const deduped = new Set<string>()
  for (const value of items.map((item) => item.trim()).filter(Boolean)) {
    deduped.add(value)
  }
  return [...deduped]
}

const normalizeKnowledgeSource = (source: string): string => {
  const trimmed = source.trim()
  if (!trimmed) {
    return trimmed
  }

  try {
    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`
    const parsed = new URL(withProtocol)
    parsed.hash = ''
    const normalizedPath = parsed.pathname.replace(/\/+$/, '') || '/'
    return `${parsed.protocol}//${parsed.host}${normalizedPath}`
  } catch {
    return trimmed.toLowerCase()
  }
}

export const normalizeWizardInput = (
  input: SharedWizardInputV2,
): SharedWizardInputV2 => {
  return {
    agentName: input.agentName.trim(),
    industry: input.industry.trim(),
    useCase: input.useCase.trim(),
    services: uniqueStrings(input.services),
    discoveryQuestions: uniqueStrings(input.discoveryQuestions ?? []),
    mainObjective: input.mainObjective.trim(),
    knowledgeSources: uniqueStrings(input.knowledgeSources ?? []),
    voiceSelection: input.voiceSelection?.voiceId
      ? { voiceId: input.voiceSelection.voiceId.trim() }
      : undefined,
    greeting: {
      mode: input.greeting.mode,
      customText: input.greeting.customText?.trim(),
    },
    routing: input.routing
      ? {
          transferNumber: input.routing.transferNumber?.trim(),
          businessTimezone: input.routing.businessTimezone?.trim(),
          languages: uniqueStrings(input.routing.languages ?? []),
        }
      : undefined,
  }
}

export const filterCuratedVoices = (voices: CuratedVoice[]): CuratedVoice[] => {
  const allowList = new Set(
    getAgentProfileV1().voice.curatedCatalog.map((voice) => voice.voiceId),
  )

  return voices.filter((voice) => {
    return (
      allowList.has(voice.voice_id) ||
      CURATED_VOICE_CATEGORIES.has((voice.category || '').toLowerCase())
    )
  })
}

const resolveLegacyVoiceSelection = (
  requestedVoiceId: string | null | undefined,
  curatedVoices: CuratedVoice[],
): { voiceId: string | null; fallbackCandidate: string | null } => {
  const requested = requestedVoiceId?.trim()
  const fallbackVoiceId = getAgentProfileV1().voice.defaultVoiceId

  if (requested) {
    const found = curatedVoices.some((voice) => voice.voice_id === requested)
    if (found) {
      return {
        voiceId: requested,
        fallbackCandidate: fallbackVoiceId,
      }
    }
  }

  return {
    voiceId: null,
    fallbackCandidate: fallbackVoiceId,
  }
}

const resolveKnowledgeSourceType = (source: string): 'url' | 'doc' => {
  try {
    const withProtocol = /^https?:\/\//i.test(source)
      ? source
      : `https://${source}`
    new URL(withProtocol)
    return 'url'
  } catch {
    return 'doc'
  }
}

export const buildWizardIntentProfile = (
  input: SharedWizardInputV2,
  curatedVoices: CuratedVoice[],
): SharedWizardIntentProfileV1 => {
  const normalized = normalizeWizardInput(input)
  const voice = resolveLegacyVoiceSelection(
    normalized.voiceSelection?.voiceId,
    curatedVoices,
  )

  const profile: SharedWizardIntentProfileV1 = {
    normalizedBusinessContext: {
      agentName: normalized.agentName,
      industry: normalized.industry,
      useCase: normalized.useCase,
      mainObjective: normalized.mainObjective,
    },
    selectedServices: normalized.services,
    selectedQuestions: normalized.discoveryQuestions ?? [],
    routingRules: {
      transferNumber: normalized.routing?.transferNumber ?? null,
      businessTimezone: normalized.routing?.businessTimezone ?? null,
      languages: normalized.routing?.languages ?? [],
    },
    knowledgeSourceManifest: (normalized.knowledgeSources ?? []).map(
      (source) => ({
        source,
        sourceType: resolveKnowledgeSourceType(source),
      }),
    ),
    selectedVoice: voice,
    inputSchemaVersion: 'wizard_input_v2',
    generatedAt: new Date().toISOString(),
  }

  return WizardIntentProfileV1Schema.parse(profile)
}

export interface CompiledPrompt {
  systemPrompt: string
  firstMessage: string
  fragmentIds: string[]
}

export const compilePromptAndGreeting = (
  profile: SharedWizardIntentProfileV1,
  input: SharedWizardInputV2,
): CompiledPrompt => {
  const fragmentIds = [
    'base.identity',
    'industry.context',
    'services.selection',
    'discovery.questions',
    'objective',
    'policy.blocks',
    'tool.rules',
    'escalation.rules',
  ]

  const lines: string[] = [
    `You are ${profile.normalizedBusinessContext.agentName}, the AI voice assistant for this business.`,
    `Your primary mission is to provide friendly, efficient, and professional service while qualifying callers and capturing their information for follow-up.`,
    `Industry: ${profile.normalizedBusinessContext.industry.replace(/_/g, ' ')}.`,
    `Use case: ${profile.normalizedBusinessContext.useCase.replace(/_/g, ' ')}.`,
    `Primary objective: ${profile.normalizedBusinessContext.mainObjective}.`,
    `Enabled services: ${profile.selectedServices.length > 0 ? profile.selectedServices.join(', ') : 'None provided'}.`,
  ]

  if (profile.selectedQuestions.length > 0) {
    lines.push('Discovery questions to prioritize:')
    for (const question of profile.selectedQuestions) {
      lines.push(`- ${question}`)
    }
  }

  lines.push(
    'Lead Capture — Required Fields:',
    'During every call, collect the following information naturally and conversationally.',
    '1. full_name (REQUIRED) — "Can I get your name, please?"',
    '2. phone_number (REQUIRED) — "What\'s the best number to reach you?" If caller ID is available, confirm instead of re-asking.',
    '3. email (OPTIONAL) — Ask once: "Do you have an email we can send a confirmation to?" Accept refusal gracefully.',
    '4. service_needed (REQUIRED) — "What service can we help you with today?" Clarify if vague.',
    '5. address (OPTIONAL but recommended) — "What\'s the service address?"',
    '6. preferred_time_window (REQUIRED) — "When works best for you? For example, tomorrow morning or later this week?"',
    'Lead Capture Rules:',
    '- Do NOT re-ask for info the caller already provided or that is available via caller ID. Confirm instead.',
    '- If the caller refuses an optional field, accept and continue.',
    '- Before ending, verify all required fields (full_name, phone_number, service_needed) are captured. If any are missing, ask politely.',
    'End-of-Call Behavior:',
    '- Summarize captured info back to the caller (name, phone, service, preferred time).',
    '- Confirm accuracy: "Does everything sound right?"',
    '- Set expectations: "We\'ll follow up to confirm your appointment."',
    '- Close warmly.',
    'Policy constraints:',
    '- Keep responses concise and professional.',
    '- Confirm critical routing details before escalation.',
    '- Never fabricate pricing, ETA, or policy claims.',
    '- Escalate when user requests a human operator.',
    'Tool rules:',
    '- Use baseline tools only when required inputs are present.',
    '- Verify tool outputs before confirming actions.',
  )

  if (profile.routingRules.transferNumber) {
    lines.push(
      `Escalation route: transfer to ${profile.routingRules.transferNumber} when required.`,
    )
  }

  const generatedGreeting = `Hi, thanks for calling ${profile.normalizedBusinessContext.agentName}. I can help with ${profile.selectedServices[0] || 'your request'} today. How can I help?`

  const firstMessage =
    input.greeting.mode === 'custom' && input.greeting.customText?.trim()
      ? input.greeting.customText.trim()
      : generatedGreeting

  return {
    systemPrompt: lines.join('\n'),
    firstMessage,
    fragmentIds,
  }
}

export const computeProfileHash = (input: {
  intentProfile: SharedWizardIntentProfileV1
  systemPrompt: string
  firstMessage: string
  voiceId: string
  configProfileVersion?: string
  promptProfileVersion?: string
}) => {
  const digest = createHash('sha256')
    .update(
      JSON.stringify({
        intentProfile: input.intentProfile,
        systemPrompt: input.systemPrompt,
        firstMessage: input.firstMessage,
        voiceId: input.voiceId,
        configProfileVersion:
          input.configProfileVersion || AGENT_PROFILE_V1_VERSION,
        promptProfileVersion:
          input.promptProfileVersion || PROMPT_PROFILE_V1_VERSION,
      }),
    )
    .digest('hex')

  return digest
}

const API_BASE_URL = config.backendUrl.replace(/\/+$/, '')
const DEFAULT_MCP_SSE_ENDPOINT = `${API_BASE_URL}/api/mcp/sse`
const DEFAULT_POST_CALL_WEBHOOK_ENDPOINT = `${API_BASE_URL}/api/webhook/agent/elevenlabs`

const profile = getAgentProfileV1()

export const agentProfileV1 = {
  configProfileVersion: AGENT_PROFILE_V1_VERSION,
  promptProfileVersion: PROMPT_PROFILE_V1_VERSION,
  llm: {
    model: profile.llm.model,
    temperature: profile.llm.temperature,
    maxTokens: profile.llm.maxTokens,
  },
  voice: {
    modelFamily: profile.voice.modelFamily,
    expressiveMode: profile.voice.expressiveMode,
    defaultVoiceId: profile.voice.defaultVoiceId,
    stability: profile.voice.tuningDefaults.stability,
    similarityBoost: profile.voice.tuningDefaults.similarityBoost,
    speed: profile.voice.tuningDefaults.speed,
  },
  workflow: {
    fallbackNode: profile.workflow.fallbackNode,
    lowConfidenceThreshold: profile.workflow.lowConfidenceThreshold,
    requiredIntents: profile.workflow.requestTypes.map((request) => request.id),
  },
  tools: {
    baselineSystemTools: profile.defaults.tools.enabledSystemTools,
    mcpEndpoint: DEFAULT_MCP_SSE_ENDPOINT,
    mcpApprovalPolicy: profile.defaults.tools.approvalPolicy,
  },
  security: {
    postCallWebhookUrl: DEFAULT_POST_CALL_WEBHOOK_ENDPOINT,
    webhookEvents: ['post_call_transcription', 'post_call_audio'],
    authTokenEnabled: profile.defaults.security.authTokenEnabled,
    allowedOrigins: profile.defaults.security.allowedOrigins,
  },
  advanced: {
    maxConcurrent: profile.defaults.advanced.maxConcurrent,
    dailyCap: profile.defaults.advanced.dailyCap,
    maxDurationSeconds: profile.defaults.advanced.maxDurationSeconds,
    silenceEndCallTimeout: profile.defaults.advanced.silenceEndCallTimeout,
    turnTimeout: profile.defaults.advanced.turnTimeout,
  },
  tests: {
    baseline: [
      'greeting.default',
      'intent.routing',
      'tool.dry_run',
      'webhook.signature',
      'knowledge.retrieval',
    ],
  },
}
