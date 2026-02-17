import { createHash } from 'crypto'
import {
  AgentProfileV1,
  getAgentProfileV1,
  resolveVoiceSelection,
  stripVolatileIntentFields,
  WizardIntentProfileV1,
} from '@/services/agent-profile.service'

interface PromptFragment {
  id: string
  title: string
  content: string
}

export interface CompiledPromptResult {
  systemPrompt: string
  fragmentIds: string[]
  promptProfileVersion: string
  configProfileVersion: string
}

export interface CompiledGreetingResult {
  firstMessage: string
  mode: 'generated' | 'custom'
}

export interface CompiledAgentProvisioningResult {
  systemPrompt: string
  firstMessage: string
  voice: {
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
  fragmentIds: string[]
  promptProfileVersion: string
  configProfileVersion: string
  profileHash: string
}

const SECTION_ORDER: Array<{ id: string; title: string }> = [
  { id: 'industry', title: 'Industry Context' },
  { id: 'use_case', title: 'Use Case Context' },
  { id: 'services', title: 'Services' },
  { id: 'discovery_questions', title: 'Discovery Questions' },
  { id: 'objective', title: 'Primary Objective' },
  { id: 'policy_blocks', title: 'Policy Blocks' },
  { id: 'tool_rules', title: 'Tool Rules' },
  { id: 'escalation_rules', title: 'Escalation Rules' },
]

const toSha256 = (input: string): string =>
  createHash('sha256').update(input).digest('hex')

const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(',')}]`
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(
    ([keyA], [keyB]) => keyA.localeCompare(keyB),
  )

  return `{${entries
    .map(
      ([key, entryValue]) =>
        `${JSON.stringify(key)}:${stableStringify(entryValue)}`,
    )
    .join(',')}}`
}

const useCaseLabel = (useCase: string): string =>
  useCase
    .split('_')
    .filter(Boolean)
    .map((segment) => segment[0].toUpperCase() + segment.slice(1))
    .join(' ')

const listAsBullets = (items: string[]): string =>
  items.map((item) => `- ${item}`).join('\n')

const interpolateTemplate = (
  template: string,
  replacements: Record<string, string>,
): string =>
  template.replace(/<([a-zA-Z0-9_]+)>/g, (match, key) => {
    return replacements[key] || match
  })

const buildBaseTemplateReplacements = (
  intentProfile: WizardIntentProfileV1,
  profile: AgentProfileV1,
): Record<string, string> => {
  const workflowIntentDirectives = profile.workflow.requestTypes.slice(0, 3)
  const requiredFields = profile.workflow.requiredDiscoveryFields.slice(0, 3)
  const enabledTools = profile.defaults.tools.enabledSystemTools.slice(0, 2)
  const languages =
    intentProfile.routing.languages.length > 0
      ? intentProfile.routing.languages.join(', ')
      : profile.language

  return {
    prompt_version: profile.promptProfileVersion,
    industry_slug: intentProfile.business.industry,
    agent_name: intentProfile.business.agentName,
    company_name: intentProfile.business.companyName,
    industry_label: intentProfile.business.industryLabel,
    service_list:
      intentProfile.services.length > 0
        ? intentProfile.services.join(', ')
        : 'General caller support and routing',
    service_area_policy:
      'Handle supported service areas only and escalate unsupported locations.',
    hours_policy: intentProfile.routing.businessTimezone
      ? `Operate using ${intentProfile.routing.businessTimezone} business hours.`
      : 'Operate using configured business hours and dispatch policies.',
    language_policy: `Primary language policy: ${languages}.`,
    safety_trigger_1: 'Any immediate safety hazard or life-critical concern',
    safety_trigger_2:
      'Caller reports fire, gas, electrical, or structural danger',
    safety_trigger_3: 'Caller requests urgent emergency escalation',
    emergency_escalation_target:
      intentProfile.routing.transferNumber || 'live dispatch team',
    intent_1:
      workflowIntentDirectives[0]?.id || 'routine_repair_or_service_booking',
    workflow_node_1:
      workflowIntentDirectives[0]?.entryNode || 'collect_service_intake',
    intent_2: workflowIntentDirectives[1]?.id || 'pricing_quote_plan_inquiry',
    workflow_node_2:
      workflowIntentDirectives[1]?.entryNode || 'pricing_quote_information',
    intent_3: workflowIntentDirectives[2]?.id || 'human_handoff_request',
    workflow_node_3: workflowIntentDirectives[2]?.entryNode || 'human_handoff',
    fallback_node: profile.workflow.fallbackNode,
    tool_name_1: enabledTools[0] || 'end_call',
    use_case_1: 'complete safe terminal actions when policy allows',
    tool_name_2: enabledTools[1] || 'language_detection',
    use_case_2: 'assist language routing and response handling',
    required_field_1: requiredFields[0] || 'service_type',
    required_field_2: requiredFields[1] || 'service_address',
    required_field_3: requiredFields[2] || 'callback_phone',
    kb_source_category_1: 'Approved website pages and policy documents',
    kb_source_category_2: 'Uploaded service and operations documents',
    target_intent_accuracy: '>= 95%',
    target_booking_completeness: '>= 90%',
    target_escalation_quality: '>= 95%',
    target_compliance: '100% critical policy adherence',
  }
}

const buildFragments = (
  intentProfile: WizardIntentProfileV1,
  profile: AgentProfileV1,
): PromptFragment[] => {
  const baseTemplate = interpolateTemplate(
    profile.promptTemplate,
    buildBaseTemplateReplacements(intentProfile, profile),
  ).trim()

  const fragmentsById: Record<string, PromptFragment> = {
    industry: {
      id: 'industry',
      title: 'Industry Context',
      content: `Industry: ${intentProfile.business.industryLabel} (${intentProfile.business.industry}).`,
    },
    use_case: {
      id: 'use_case',
      title: 'Use Case Context',
      content: `Primary use case: ${useCaseLabel(intentProfile.business.useCase)}.`,
    },
    services: {
      id: 'services',
      title: 'Services',
      content:
        intentProfile.services.length > 0
          ? listAsBullets(intentProfile.services)
          : '- General service handling and caller triage.',
    },
    discovery_questions: {
      id: 'discovery_questions',
      title: 'Discovery Questions',
      content:
        intentProfile.discoveryQuestions.length > 0
          ? listAsBullets(intentProfile.discoveryQuestions)
          : '- What service do you need help with today?\n- What is the service address?\n- What is the best callback number?',
    },
    objective: {
      id: 'objective',
      title: 'Primary Objective',
      content: intentProfile.business.mainObjective,
    },
    policy_blocks: {
      id: 'policy_blocks',
      title: 'Policy Blocks',
      content: `Security: auth_token_enabled=${profile.defaults.security.authTokenEnabled}, webhook_signing_required=${profile.defaults.security.webhookSigningRequired}, allowed_origins=${profile.defaults.security.allowedOrigins.join(', ') || 'none'}.\nAdvanced: max_concurrent=${profile.defaults.advanced.maxConcurrent}, daily_cap=${profile.defaults.advanced.dailyCap}, max_duration_seconds=${profile.defaults.advanced.maxDurationSeconds}, silence_timeout=${profile.defaults.advanced.silenceEndCallTimeout}, turn_timeout=${profile.defaults.advanced.turnTimeout}.\nAnalysis defaults owner: data_collection=${profile.defaults.analysis.dataCollectionOwner}, evaluation=${profile.defaults.analysis.evaluationOwner}.`,
    },
    tool_rules: {
      id: 'tool_rules',
      title: 'Tool Rules',
      content: `Allowed system tools:\n${listAsBullets(profile.defaults.tools.enabledSystemTools)}\nApproval policy: ${profile.defaults.tools.approvalPolicy}.\nTool usage constraints:\n- Do not call tools when required fields are missing.\n- Validate tool output before confirming outcomes.\n- Escalate on conflicting or incomplete tool responses.`,
    },
    escalation_rules: {
      id: 'escalation_rules',
      title: 'Escalation Rules',
      content: `Escalate on low confidence: ${profile.workflow.escalateOnLowConfidence} (threshold=${profile.workflow.lowConfidenceThreshold}).\nFallback workflow node: ${profile.workflow.fallbackNode}.\nTransfer target: ${intentProfile.routing.transferNumber || 'not configured'}.\nTimezone policy: ${intentProfile.routing.businessTimezone || 'default business timezone'}.`,
    },
  }

  const orderedFragments = SECTION_ORDER.map(
    ({ id }) => fragmentsById[id],
  ).filter(Boolean)

  return [
    {
      id: 'base_template',
      title: 'Base Template',
      content: baseTemplate,
    },
    ...orderedFragments,
  ]
}

export const compileSystemPrompt = (
  intentProfile: WizardIntentProfileV1,
  profile: AgentProfileV1 = getAgentProfileV1(),
): CompiledPromptResult => {
  const fragments = buildFragments(intentProfile, profile)
  const [baseFragment, ...remainingFragments] = fragments

  const systemPrompt = [
    baseFragment.content.trim(),
    ...remainingFragments.map(
      (fragment) => `## ${fragment.title}\n${fragment.content.trim()}`,
    ),
  ]
    .join('\n\n')
    .trim()

  return {
    systemPrompt,
    fragmentIds: fragments.map((fragment) => fragment.id),
    promptProfileVersion: profile.promptProfileVersion,
    configProfileVersion: profile.configProfileVersion,
  }
}

export const compileGreeting = (
  intentProfile: WizardIntentProfileV1,
): CompiledGreetingResult => {
  if (
    intentProfile.greeting.mode === 'custom' &&
    intentProfile.greeting.customText
  ) {
    return {
      firstMessage: intentProfile.greeting.customText.slice(0, 280),
      mode: 'custom',
    }
  }

  const generated = `Hi, thanks for calling ${intentProfile.business.companyName}. I'm ${intentProfile.business.agentName}, your ${intentProfile.business.industryLabel.toLowerCase()} assistant. How can I help you today?`

  return {
    firstMessage: generated.slice(0, 280),
    mode: 'generated',
  }
}

export const compileAgentProvisioning = (params: {
  intentProfile: WizardIntentProfileV1
  profile?: AgentProfileV1
  availableVoiceIds?: string[]
}): CompiledAgentProvisioningResult => {
  const profile = params.profile || getAgentProfileV1()
  const prompt = compileSystemPrompt(params.intentProfile, profile)
  const greeting = compileGreeting(params.intentProfile)
  const voice = resolveVoiceSelection({
    intentProfile: params.intentProfile,
    profile,
    availableVoiceIds: params.availableVoiceIds,
  })

  const hashPayload = {
    profileVersion: profile.profileVersion,
    promptProfileVersion: prompt.promptProfileVersion,
    configProfileVersion: prompt.configProfileVersion,
    fragmentIds: prompt.fragmentIds,
    systemPrompt: prompt.systemPrompt,
    firstMessage: greeting.firstMessage,
    voice,
    intentProfile: stripVolatileIntentFields(params.intentProfile),
  }

  return {
    systemPrompt: prompt.systemPrompt,
    firstMessage: greeting.firstMessage,
    voice,
    fragmentIds: prompt.fragmentIds,
    promptProfileVersion: prompt.promptProfileVersion,
    configProfileVersion: prompt.configProfileVersion,
    profileHash: toSha256(stableStringify(hashPayload)),
  }
}
