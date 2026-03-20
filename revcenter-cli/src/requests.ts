import {
  WIZARD_FORBIDDEN_FIELD_KEYS,
  wizardAgentRequestSchema,
  wizardInputV2Schema,
  wizardRenderResponseSchema,
  type WizardAgentRequest,
  type WizardInputV2,
  type WizardRenderResponse,
  type WizardRequestSummary,
} from './contracts'

export interface CliWizardStartInput {
  name: string
  domain?: string
  industry: string
  services: string[]
  useCase?: string
  website?: string
  knowledgeSources?: string[]
  mainGoal?: string
  voiceSelection?: {
    voiceId?: string
  }
  greeting?: {
    mode?: 'generated' | 'custom'
    customText?: string
  }
  routing?: {
    transferNumber?: string
    businessTimezone?: string
    languages?: string[]
  }
  agent: {
    name: string
    openingLine?: string
    serviceQuestions?: string[]
  }
}

export interface ParsedWizardCliRequest {
  request: WizardAgentRequest
  wizardInputV2: WizardInputV2
  startInput: CliWizardStartInput
  summary: WizardRequestSummary
}

const WIZARD_AGENT_TEMPLATE = {
  industry: 'hvac',
  useCase: 'customer_support',
  services: [
    'AC repair',
    'Heating repair',
    'Seasonal maintenance',
    'Ductless mini split',
  ],
  discoveryQuestions: [],
  mainObjective:
    'Book qualified service calls and route urgent customer issues correctly.',
  knowledgeSources: [],
  voiceSelection: {},
  greeting: {
    mode: 'generated',
  },
  routing: {
    businessTimezone: 'America/Los_Angeles',
    languages: ['en'],
  },
  agentName: 'Front Desk Agent',
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const asRecord = (value: unknown): Record<string, unknown> =>
  isRecord(value) ? value : {}

const normalizeString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return []
  }

  const normalized = value
    .map((entry) => normalizeString(entry))
    .filter((entry): entry is string => Boolean(entry))

  return [...new Set(normalized)]
}

const firstDefinedString = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    const normalized = normalizeString(value)
    if (normalized) {
      return normalized
    }
  }

  return undefined
}

const firstHttpUrl = (...values: string[]): string | undefined => {
  for (const value of values) {
    try {
      const candidate = new URL(value)
      if (candidate.protocol === 'http:' || candidate.protocol === 'https:') {
        return candidate.toString()
      }
    } catch {
      continue
    }
  }

  return undefined
}

const withUndefinedIfEmpty = <T extends Record<string, unknown>>(
  value: T,
): T | undefined => {
  return Object.values(value).some((entry) => {
    if (Array.isArray(entry)) {
      return entry.length > 0
    }
    return entry !== undefined && entry !== null
  })
    ? value
    : undefined
}

const collectForbiddenWizardFieldsAtPath = (
  value: unknown,
  currentPath: string,
  fields: Set<string>,
) => {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      const nextPath = currentPath ? `${currentPath}[${index}]` : `[${index}]`
      collectForbiddenWizardFieldsAtPath(entry, nextPath, fields)
    })
    return
  }

  if (!isRecord(value)) {
    return
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    const nextPath = currentPath ? `${currentPath}.${key}` : key
    if (WIZARD_FORBIDDEN_FIELD_KEYS.has(key)) {
      fields.add(nextPath)
    }
    collectForbiddenWizardFieldsAtPath(nestedValue, nextPath, fields)
  }
}

export const collectForbiddenWizardFields = (payload: unknown): string[] => {
  const fields = new Set<string>()
  collectForbiddenWizardFieldsAtPath(payload, '', fields)
  return [...fields].sort((left, right) => left.localeCompare(right))
}

export const createWizardRequestTemplate = () => {
  return JSON.parse(
    JSON.stringify(WIZARD_AGENT_TEMPLATE),
  ) as typeof WIZARD_AGENT_TEMPLATE
}

export const parseWizardCliRequest = (
  payload: unknown,
): ParsedWizardCliRequest => {
  const forbiddenFields = collectForbiddenWizardFields(payload)
  if (forbiddenFields.length > 0) {
    throw new Error(
      `Wizard input contains forbidden fields: ${forbiddenFields.join(', ')}`,
    )
  }

  if (!isRecord(payload)) {
    throw new Error('Wizard input must be a JSON object.')
  }

  const root = payload as Record<string, unknown>
  const wizardRoot = isRecord(root.wizard_input_v2)
    ? (root.wizard_input_v2 as Record<string, unknown>)
    : root
  const agent = asRecord(root.agent)
  const greeting = asRecord(wizardRoot.greeting)
  const routing = asRecord(wizardRoot.routing)
  const voiceSelection = asRecord(wizardRoot.voiceSelection)

  const organizationName = firstDefinedString(
    root.name,
    root.companyName,
    root.organizationName,
    asRecord(root.organization).name,
  )

  const agentName = firstDefinedString(
    wizardRoot.agentName,
    root.agentName,
    agent.name,
  )
  if (!agentName) {
    throw new Error(
      'Wizard input requires `agentName` or `agent.name` for the agent.',
    )
  }

  const industry = firstDefinedString(wizardRoot.industry, root.industry)
  if (!industry) {
    throw new Error('Wizard input requires `industry`.')
  }

  const services = normalizeStringArray(wizardRoot.services ?? root.services)
  if (services.length === 0) {
    throw new Error('Wizard input requires at least one entry in `services`.')
  }

  const discoveryQuestions = normalizeStringArray(
    wizardRoot.discoveryQuestions ?? root.discoveryQuestions ?? agent.serviceQuestions,
  )
  const knowledgeSources = normalizeStringArray(
    wizardRoot.knowledgeSources ?? root.knowledgeSources,
  )
  const explicitWebsite = firstDefinedString(root.website)
  const websiteFromKnowledgeSources = firstHttpUrl(...knowledgeSources)
  const website = firstHttpUrl(
    explicitWebsite || '',
    websiteFromKnowledgeSources || '',
  )

  const greetingModeRaw = firstDefinedString(
    greeting.mode,
    wizardRoot.greetingMode,
    root.greetingMode,
  )
  const greetingText = firstDefinedString(
    greeting.customText,
    wizardRoot.customGreeting,
    root.customGreeting,
    root.firstMessage,
    agent.openingLine,
  )
  const greetingMode: 'generated' | 'custom' =
    greetingModeRaw === 'custom' && greetingText ? 'custom' : 'generated'

  const useCase =
    firstDefinedString(
      wizardRoot.useCase,
      root.useCase,
      root.primaryUseCase,
    ) ||
    'customer_support'
  const mainGoal = firstDefinedString(
    wizardRoot.mainObjective,
    root.mainGoal,
    root.mainObjective,
  )
  if (!mainGoal) {
    throw new Error('Wizard input requires `mainObjective`.')
  }
  const transferNumber = firstDefinedString(
    routing.transferNumber,
    root.transferNumber,
  )
  const businessTimezone = firstDefinedString(
    routing.businessTimezone,
    root.businessTimezone,
  )
  const languages = normalizeStringArray(routing.languages)
  const voiceId = firstDefinedString(
    voiceSelection.voiceId,
    wizardRoot.voiceId,
    root.voiceId,
  )
  const domain = firstDefinedString(root.domain)

  const mergedKnowledgeSources =
    knowledgeSources.length > 0
      ? knowledgeSources
      : website
        ? [website]
        : []

  const normalizedWizardInputV2 = wizardInputV2Schema.parse({
    agentName,
    industry,
    useCase,
    services,
    ...(discoveryQuestions.length > 0 ? { discoveryQuestions } : {}),
    mainObjective: mainGoal,
    ...(mergedKnowledgeSources.length > 0 ? { knowledgeSources: mergedKnowledgeSources } : {}),
    ...(voiceId
      ? {
          voiceSelection: {
            voiceId,
          },
        }
      : {}),
    greeting: {
      mode: greetingMode,
      ...(greetingMode === 'custom' && greetingText
        ? { customText: greetingText }
        : {}),
    },
    ...(withUndefinedIfEmpty({
      transferNumber,
      businessTimezone,
      languages,
    })
      ? {
          routing: {
            ...(transferNumber ? { transferNumber } : {}),
            ...(businessTimezone ? { businessTimezone } : {}),
            ...(languages.length > 0 ? { languages } : {}),
          },
        }
      : {}),
  })

  const normalizedRequest = wizardAgentRequestSchema.parse({
    name: organizationName || agentName,
    ...(domain ? { domain } : {}),
    industry: normalizedWizardInputV2.industry,
    useCase: normalizedWizardInputV2.useCase,
    services: normalizedWizardInputV2.services,
    ...(normalizedWizardInputV2.discoveryQuestions?.length
      ? { discoveryQuestions: normalizedWizardInputV2.discoveryQuestions }
      : {}),
    ...(normalizedWizardInputV2.mainObjective
      ? { mainObjective: normalizedWizardInputV2.mainObjective }
      : {}),
    ...(mergedKnowledgeSources.length > 0
      ? { knowledgeSources: mergedKnowledgeSources }
      : {}),
    ...(voiceId
      ? {
          voiceSelection: {
            voiceId,
          },
        }
      : {}),
    ...(withUndefinedIfEmpty({
      mode: normalizedWizardInputV2.greeting.mode,
      customText:
        normalizedWizardInputV2.greeting.mode === 'custom'
          ? normalizedWizardInputV2.greeting.customText
          : undefined,
    })
      ? {
          greeting: {
            mode: normalizedWizardInputV2.greeting.mode,
            ...(normalizedWizardInputV2.greeting.mode === 'custom' &&
            normalizedWizardInputV2.greeting.customText
              ? { customText: normalizedWizardInputV2.greeting.customText }
              : {}),
          },
        }
      : {}),
    ...(withUndefinedIfEmpty({
      transferNumber,
      businessTimezone,
      languages,
    })
      ? {
          routing: {
            ...(transferNumber ? { transferNumber } : {}),
            ...(businessTimezone ? { businessTimezone } : {}),
            ...(languages.length > 0 ? { languages } : {}),
          },
        }
      : {}),
    agentName,
  })

  const startInput: CliWizardStartInput = {
    name: organizationName || agentName,
    ...(domain ? { domain } : {}),
    industry,
    services,
    ...(useCase ? { useCase } : {}),
    ...(website ? { website } : {}),
    ...(mergedKnowledgeSources.length > 0
      ? { knowledgeSources: mergedKnowledgeSources }
      : {}),
    ...(mainGoal ? { mainGoal } : {}),
    ...((voiceId
      ? {
          voiceSelection: {
            voiceId,
          },
        }
      : {}) as Partial<CliWizardStartInput>),
    ...(withUndefinedIfEmpty({
      mode: greetingMode,
      customText: greetingMode === 'custom' ? greetingText : undefined,
    })
      ? {
          greeting: {
            mode: greetingMode,
            ...(greetingMode === 'custom' && greetingText
              ? { customText: greetingText }
              : {}),
          },
        }
      : {}),
    ...(withUndefinedIfEmpty({
      transferNumber,
      businessTimezone,
      languages,
    })
      ? {
          routing: {
            ...(transferNumber ? { transferNumber } : {}),
            ...(businessTimezone ? { businessTimezone } : {}),
            ...(languages.length > 0 ? { languages } : {}),
          },
        }
      : {}),
    agent: {
      name: agentName,
      ...(greetingText ? { openingLine: greetingText } : {}),
      ...(discoveryQuestions.length > 0
        ? { serviceQuestions: discoveryQuestions }
        : {}),
    },
  }

  return {
    request: normalizedRequest,
    wizardInputV2: normalizedWizardInputV2,
    startInput,
    summary: {
      organizationName: organizationName || agentName,
      agentName,
      industry,
      useCase,
      serviceCount: services.length,
      knowledgeSourceCount: mergedKnowledgeSources.length,
      hasCustomGreeting: greetingMode === 'custom',
      voiceId: voiceId || null,
    },
  }
}

export const createWizardRenderResponse = (
  parsed: ParsedWizardCliRequest,
): WizardRenderResponse => {
  return createWizardRenderResponseFromRequest(parsed.request, parsed.summary)
}

export const buildWizardRequestSummary = (
  request: WizardAgentRequest,
): WizardRequestSummary => ({
  organizationName: request.name,
  agentName: request.agentName,
  industry: request.industry,
  useCase: request.useCase,
  serviceCount: request.services.length,
  knowledgeSourceCount: request.knowledgeSources?.length || 0,
  hasCustomGreeting: request.greeting?.mode === 'custom',
  voiceId: request.voiceSelection?.voiceId || null,
})

export const createWizardRenderResponseFromRequest = (
  request: WizardAgentRequest,
  summary = buildWizardRequestSummary(request),
): WizardRenderResponse => {
  const compiledPromptSummaryParts = [
    `Use case ${summary.useCase}`,
    `${summary.serviceCount} service area(s)`,
    request.mainObjective
      ? `goal: ${request.mainObjective}`
      : 'goal not provided',
  ]

  const warnings: string[] = []
  if ((request.knowledgeSources || []).length === 0) {
    warnings.push('No knowledge sources were provided.')
  }
  if (!request.voiceSelection?.voiceId) {
    warnings.push('No explicit voice was selected.')
  }

  return wizardRenderResponseSchema.parse({
    normalizedRequest: request,
    summary,
    resolvedProfile: {
      profileKey: request.industry,
      profileVersion: null,
      selectedVoiceId: summary.voiceId,
      greetingMode: request.greeting?.mode || 'generated',
    },
    promptPreview: {
      compiledPromptSummary: compiledPromptSummaryParts.join('; '),
      knowledgeSourceCount: summary.knowledgeSourceCount,
    },
    warnings,
  })
}
