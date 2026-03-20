import path from 'path'

export interface GuidedWizardAnswers {
  organizationName?: string
  industry: string
  useCase: string
  services: string[]
  discoveryQuestions: string[]
  mainObjective: string
  knowledgeSources: string[]
  agentName: string
  greetingMode: 'generated' | 'custom'
  customGreeting?: string
  voiceId?: string
  transferNumber?: string
  businessTimezone?: string
  languages: string[]
}

const normalizeString = (value: string | undefined) => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

const uniqueNonEmpty = (values: string[]) => {
  const seen = new Set<string>()
  const normalized: string[] = []

  for (const value of values) {
    const trimmed = normalizeString(value)
    if (!trimmed || seen.has(trimmed)) {
      continue
    }
    seen.add(trimmed)
    normalized.push(trimmed)
  }

  return normalized
}

export const splitPromptList = (value: string) =>
  uniqueNonEmpty(value.split(/[\n,]+/g))

export const mergePromptValues = (...groups: string[][]) =>
  uniqueNonEmpty(groups.flat())

export const defaultAgentNameFromOrganization = (organizationName: string) =>
  `${organizationName.trim()} Service Desk`

export const defaultAgentNameFromIndustry = (industryLabel: string) =>
  `${industryLabel.trim()} Front Desk`

export const buildGuidedWizardPayload = (answers: GuidedWizardAnswers) => {
  const knowledgeSources = uniqueNonEmpty(answers.knowledgeSources)
  const discoveryQuestions = uniqueNonEmpty(answers.discoveryQuestions)
  const languages = uniqueNonEmpty(answers.languages)

  return {
    ...(normalizeString(answers.organizationName)
      ? { name: normalizeString(answers.organizationName) }
      : {}),
    industry: answers.industry.trim(),
    useCase: answers.useCase.trim(),
    services: uniqueNonEmpty(answers.services),
    ...(discoveryQuestions.length > 0 ? { discoveryQuestions } : {}),
    mainObjective: answers.mainObjective.trim(),
    ...(knowledgeSources.length > 0 ? { knowledgeSources } : {}),
    ...(normalizeString(answers.voiceId)
      ? {
          voiceSelection: {
            voiceId: normalizeString(answers.voiceId),
          },
        }
      : {}),
    greeting:
      answers.greetingMode === 'custom' && normalizeString(answers.customGreeting)
        ? {
            mode: 'custom' as const,
            customText: normalizeString(answers.customGreeting),
          }
        : {
            mode: 'generated' as const,
          },
    ...(normalizeString(answers.transferNumber) ||
    normalizeString(answers.businessTimezone) ||
    languages.length > 0
      ? {
          routing: {
            ...(normalizeString(answers.transferNumber)
              ? { transferNumber: normalizeString(answers.transferNumber) }
              : {}),
            ...(normalizeString(answers.businessTimezone)
              ? { businessTimezone: normalizeString(answers.businessTimezone) }
              : {}),
            ...(languages.length > 0 ? { languages } : {}),
          },
        }
      : {}),
    agentName: answers.agentName.trim(),
  }
}

const pad = (value: number) => String(value).padStart(2, '0')

const formatUtcTimestamp = (value: Date) =>
  [
    value.getUTCFullYear(),
    pad(value.getUTCMonth() + 1),
    pad(value.getUTCDate()),
  ].join('') +
  '-' +
  [pad(value.getUTCHours()), pad(value.getUTCMinutes()), pad(value.getUTCSeconds())].join('')

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'wizard-run'

export const buildGuidedRunDirectory = (input: {
  name: string
  outputRoot: string
  now?: Date
}) => {
  const runId = `${formatUtcTimestamp(input.now || new Date())}-${slugify(
    input.name,
  )}`

  return path.join(input.outputRoot, runId)
}
