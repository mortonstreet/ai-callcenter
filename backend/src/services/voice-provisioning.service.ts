import {
  CreateCustomVoiceRequest,
  ElevenLabsVoiceSampleInput,
  TrainCustomVoiceRequest,
  getElevenLabsClient,
} from '@/clients/elevenlabs.client'
import { db } from '@/lib/db'
import logger from '@/lib/logger'

export const VOICE_PROVISIONING_STATUSES = [
  'not_started',
  'running',
  'completed',
  'fallback',
  'failed',
] as const

export const VOICE_TRAINING_STATUSES = [
  'not_requested',
  'running',
  'completed',
  'failed',
] as const

export type VoiceProvisioningStatus =
  (typeof VOICE_PROVISIONING_STATUSES)[number]
export type VoiceTrainingStatus = (typeof VOICE_TRAINING_STATUSES)[number]

export interface VoiceTrainingAssetInput {
  url: string
  name?: string
  mimeType?: string
}

export interface ResolveAdvancedVoiceProvisioningInput {
  organizationId: string
  companyName: string
  industry?: string
  useCase?: string
  website?: string
  mainGoal?: string
  services?: string[]
  serviceQuestions?: string[]
  explicitVoiceId?: string
  trainingAssets?: VoiceTrainingAssetInput[]
}

export interface ResolveAdvancedVoiceProvisioningResult {
  voiceId: string | null
  promptSeed: string
  voiceProvisioningStatus: VoiceProvisioningStatus
  voiceTrainingStatus: VoiceTrainingStatus
  degradedReason: 'voice_provisioning_failed' | null
}

export type OrganizationVoiceState = {
  id: string
  metadata: string | null
  provisionedVoiceId: string | null
  voiceProvisioningStatus: string
  voiceTrainingStatus: string
  voiceProvisioningError: string | null
  voicePromptSeed: string | null
  voiceProvisionedAt: Date | null
}

type PersistOrganizationVoiceStatePatch = {
  voiceId?: string | null
  provisioningStatus: VoiceProvisioningStatus
  trainingStatus: VoiceTrainingStatus
  promptSeed: string
  error?: string | null
  setProvisionedAt?: boolean
  trainingAssets?: VoiceTrainingAssetInput[]
}

const MAX_TRAINING_ASSETS = 5

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)

const normalizeString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null

const parseOrganizationMetadata = (raw: string | null): Record<string, unknown> => {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    return isRecord(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

const coerceTrainingAsset = (value: unknown): VoiceTrainingAssetInput | null => {
  if (!isRecord(value)) return null
  const url = normalizeString(value.url)
  if (!url) return null
  return {
    url,
    name: normalizeString(value.name) || undefined,
    mimeType: normalizeString(value.mimeType) || undefined,
  }
}

const collectMetadataTrainingAssets = (
  metadata: Record<string, unknown>,
): VoiceTrainingAssetInput[] => {
  const candidates = [
    metadata.voiceTrainingAssets,
    isRecord(metadata.agent) ? metadata.agent.voiceTrainingAssets : null,
    isRecord(metadata.voiceProvisioning)
      ? metadata.voiceProvisioning.trainingAssets
      : null,
  ]

  const assets: VoiceTrainingAssetInput[] = []
  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue
    for (const item of candidate) {
      const parsed = coerceTrainingAsset(item)
      if (parsed) assets.push(parsed)
      if (assets.length >= MAX_TRAINING_ASSETS) {
        return assets
      }
    }
  }

  return assets
}

const deriveFilenameFromUrl = (urlString: string, fallbackIndex: number) => {
  try {
    const url = new URL(urlString)
    const rawName = url.pathname.split('/').filter(Boolean).pop()
    if (!rawName) {
      return `voice-sample-${fallbackIndex + 1}.mp3`
    }
    return decodeURIComponent(rawName)
  } catch {
    return `voice-sample-${fallbackIndex + 1}.mp3`
  }
}

const toVoiceSamples = async (
  assets: VoiceTrainingAssetInput[],
): Promise<ElevenLabsVoiceSampleInput[]> => {
  const samples: ElevenLabsVoiceSampleInput[] = []

  for (let index = 0; index < assets.length; index += 1) {
    const asset = assets[index]
    try {
      const response = await fetch(asset.url)
      if (!response.ok) {
        logger.warn(
          {
            url: asset.url,
            status: response.status,
          },
          'Skipping voice training asset download because request failed',
        )
        continue
      }

      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      if (buffer.length === 0) {
        logger.warn(
          { url: asset.url },
          'Skipping empty voice training asset download',
        )
        continue
      }

      const filename =
        normalizeString(asset.name) || deriveFilenameFromUrl(asset.url, index)
      const contentType =
        normalizeString(asset.mimeType) ||
        normalizeString(response.headers.get('content-type')) ||
        'audio/mpeg'

      samples.push({
        filename,
        contentType,
        content: buffer,
      })
    } catch (error) {
      logger.warn(
        { error, url: asset.url },
        'Skipping voice training asset download due to network error',
      )
    }
  }

  return samples
}

const buildMetadataPatch = (
  currentMetadataRaw: string | null,
  patch: PersistOrganizationVoiceStatePatch,
) => {
  const metadata = parseOrganizationMetadata(currentMetadataRaw)
  const existingVoiceProvisioning = isRecord(metadata.voiceProvisioning)
    ? metadata.voiceProvisioning
    : {}

  const nextVoiceProvisioning = {
    ...existingVoiceProvisioning,
    status: patch.provisioningStatus,
    trainingStatus: patch.trainingStatus,
    voiceId: patch.voiceId ?? null,
    promptSeed: patch.promptSeed,
    error: patch.error ?? null,
    trainingAssets:
      patch.trainingAssets && patch.trainingAssets.length > 0
        ? patch.trainingAssets
        : existingVoiceProvisioning.trainingAssets ?? [],
    updatedAt: new Date().toISOString(),
  }

  return JSON.stringify({
    ...metadata,
    voiceProvisioning: nextVoiceProvisioning,
  })
}

const loadOrganizationVoiceState = async (
  organizationId: string,
): Promise<OrganizationVoiceState> => {
  return await db
    .selectFrom('organization')
    .where('id', '=', organizationId)
    .select([
      'id',
      'metadata',
      'provisionedVoiceId',
      'voiceProvisioningStatus',
      'voiceTrainingStatus',
      'voiceProvisioningError',
      'voicePromptSeed',
      'voiceProvisionedAt',
    ])
    .executeTakeFirstOrThrow()
}

const countOrganizationAgents = async (organizationId: string): Promise<number> => {
  const countResult = await db
    .selectFrom('agent')
    .where('organizationId', '=', organizationId)
    .select((eb) => eb.fn.countAll<number>().as('count'))
    .executeTakeFirst()

  return Number(countResult?.count || 0)
}

const persistOrganizationVoiceState = async (
  organization: OrganizationVoiceState,
  patch: PersistOrganizationVoiceStatePatch,
) => {
  const metadata = buildMetadataPatch(organization.metadata, patch)

  const updated = await db
    .updateTable('organization')
    .set({
      provisionedVoiceId: patch.voiceId ?? null,
      voiceProvisioningStatus: patch.provisioningStatus,
      voiceTrainingStatus: patch.trainingStatus,
      voiceProvisioningError: patch.error ?? null,
      voicePromptSeed: patch.promptSeed,
      voiceProvisionedAt: patch.setProvisionedAt
        ? new Date()
        : organization.voiceProvisionedAt,
      metadata,
    })
    .where('id', '=', organization.id)
    .returning([
      'id',
      'metadata',
      'provisionedVoiceId',
      'voiceProvisioningStatus',
      'voiceTrainingStatus',
      'voiceProvisioningError',
      'voicePromptSeed',
      'voiceProvisionedAt',
    ])
    .executeTakeFirstOrThrow()

  return updated
}

export const buildOnboardingPromptSeed = (input: {
  companyName: string
  industry?: string
  useCase?: string
  website?: string
  mainGoal?: string
  services?: string[]
  serviceQuestions?: string[]
}) => {
  const lines = [
    `Business context for ${input.companyName}:`,
  ]

  if (normalizeString(input.industry)) {
    lines.push(`Industry: ${input.industry?.replace(/_/g, ' ')}`)
  }
  if (normalizeString(input.useCase)) {
    lines.push(`Primary use case: ${input.useCase?.replace(/_/g, ' ')}`)
  }
  if (normalizeString(input.website)) {
    lines.push(`Website: ${input.website}`)
  }
  if (normalizeString(input.mainGoal)) {
    lines.push(`Primary business goal: ${input.mainGoal}`)
  }
  if (input.services && input.services.length > 0) {
    lines.push(`Services: ${input.services.join(', ')}`)
  }
  if (input.serviceQuestions && input.serviceQuestions.length > 0) {
    lines.push(
      `Priority service discovery questions: ${input.serviceQuestions.join(' | ')}`,
    )
  }

  lines.push(
    'Use this context to keep responses grounded in company offerings and caller intent.',
  )

  return lines.join('\n')
}

const buildCustomVoiceName = (companyName: string) =>
  `${companyName} Custom Voice`.slice(0, 62)

const buildCustomVoiceDescription = (input: {
  companyName: string
  industry?: string
  useCase?: string
}) =>
  [
    `Auto-provisioned voice profile for ${input.companyName}.`,
    input.industry ? `Industry: ${input.industry.replace(/_/g, ' ')}.` : null,
    input.useCase ? `Use case: ${input.useCase.replace(/_/g, ' ')}.` : null,
  ]
    .filter((line): line is string => !!line)
    .join(' ')

export interface VoiceProvisioningDependencies {
  loadOrganizationVoiceState: (
    organizationId: string,
  ) => Promise<OrganizationVoiceState>
  countOrganizationAgents: (organizationId: string) => Promise<number>
  persistOrganizationVoiceState: (
    organization: OrganizationVoiceState,
    patch: PersistOrganizationVoiceStatePatch,
  ) => Promise<OrganizationVoiceState>
  toVoiceSamples: (
    assets: VoiceTrainingAssetInput[],
  ) => Promise<ElevenLabsVoiceSampleInput[]>
  createCustomVoice: (
    request: CreateCustomVoiceRequest,
  ) => Promise<{ voice_id: string; [key: string]: any }>
  trainCustomVoice: (
    voiceId: string,
    request: TrainCustomVoiceRequest,
  ) => Promise<{ voice_id: string; [key: string]: any }>
}

const defaultVoiceProvisioningDependencies: VoiceProvisioningDependencies = {
  loadOrganizationVoiceState,
  countOrganizationAgents,
  persistOrganizationVoiceState,
  toVoiceSamples,
  createCustomVoice: async (request) => {
    const client = getElevenLabsClient()
    return client.createCustomVoice(request)
  },
  trainCustomVoice: async (voiceId, request) => {
    const client = getElevenLabsClient()
    return client.trainCustomVoice(voiceId, request)
  },
}

export const resolveAdvancedVoiceProvisioningWithDependencies = async (
  input: ResolveAdvancedVoiceProvisioningInput,
  dependencies: VoiceProvisioningDependencies,
): Promise<ResolveAdvancedVoiceProvisioningResult> => {
  const promptSeed = buildOnboardingPromptSeed(input)
  let organization = await dependencies.loadOrganizationVoiceState(
    input.organizationId,
  )
  const existingVoiceId = normalizeString(organization.provisionedVoiceId)
  const explicitVoiceId = normalizeString(input.explicitVoiceId)
  const agentCount = await dependencies.countOrganizationAgents(
    input.organizationId,
  )
  const firstAgentProvisioning = agentCount === 0

  if (explicitVoiceId) {
    if (firstAgentProvisioning) {
      organization = await dependencies.persistOrganizationVoiceState(
        organization,
        {
          voiceId: explicitVoiceId,
          provisioningStatus: 'completed',
          trainingStatus: 'not_requested',
          promptSeed,
        },
      )
    }

    return {
      voiceId: explicitVoiceId,
      promptSeed,
      voiceProvisioningStatus: 'completed',
      voiceTrainingStatus: 'not_requested',
      degradedReason: null,
    }
  }

  if (existingVoiceId) {
    return {
      voiceId: existingVoiceId,
      promptSeed,
      voiceProvisioningStatus: 'completed',
      voiceTrainingStatus:
        organization.voiceTrainingStatus === 'completed'
          ? 'completed'
          : 'not_requested',
      degradedReason: null,
    }
  }

  if (!firstAgentProvisioning) {
    return {
      voiceId: null,
      promptSeed,
      voiceProvisioningStatus: 'fallback',
      voiceTrainingStatus: 'not_requested',
      degradedReason: 'voice_provisioning_failed',
    }
  }

  const metadata = parseOrganizationMetadata(organization.metadata)
  const requestedAssets = [
    ...(input.trainingAssets || []),
    ...collectMetadataTrainingAssets(metadata),
  ].slice(0, MAX_TRAINING_ASSETS)

  organization = await dependencies.persistOrganizationVoiceState(
    organization,
    {
      voiceId: null,
      provisioningStatus: 'running',
      trainingStatus: requestedAssets.length > 0 ? 'running' : 'not_requested',
      promptSeed,
      error: null,
      trainingAssets: requestedAssets,
    },
  )

  try {
    const samples = await dependencies.toVoiceSamples(requestedAssets)
    const voiceName = buildCustomVoiceName(input.companyName)

    const createdVoice = await dependencies.createCustomVoice({
      name: voiceName,
      description: buildCustomVoiceDescription(input),
      labels: {
        org_id: input.organizationId,
        source: 'first_agent_automation',
      },
      samples,
    })

    const voiceId = normalizeString(createdVoice.voice_id)
    if (!voiceId) {
      throw new Error('ElevenLabs createCustomVoice did not return voice_id')
    }

    let trainingStatus: VoiceTrainingStatus = 'not_requested'
    if (samples.length > 0) {
      await dependencies.trainCustomVoice(voiceId, {
        name: voiceName,
        description: buildCustomVoiceDescription(input),
        samples,
      })
      trainingStatus = 'completed'
    }

    await dependencies.persistOrganizationVoiceState(organization, {
      voiceId,
      provisioningStatus: 'completed',
      trainingStatus,
      promptSeed,
      error: null,
      setProvisionedAt: true,
      trainingAssets: requestedAssets,
    })

    return {
      voiceId,
      promptSeed,
      voiceProvisioningStatus: 'completed',
      voiceTrainingStatus: trainingStatus,
      degradedReason: null,
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown voice provisioning error'

    logger.warn(
      {
        error,
        organizationId: input.organizationId,
      },
      'Advanced voice provisioning failed; default fallback voice will be used',
    )

    await dependencies.persistOrganizationVoiceState(organization, {
      voiceId: null,
      provisioningStatus: 'fallback',
      trainingStatus: 'failed',
      promptSeed,
      error: errorMessage,
      trainingAssets: requestedAssets,
    })

    return {
      voiceId: null,
      promptSeed,
      voiceProvisioningStatus: 'fallback',
      voiceTrainingStatus: 'failed',
      degradedReason: 'voice_provisioning_failed',
    }
  }
}

export const resolveAdvancedVoiceProvisioning = async (
  input: ResolveAdvancedVoiceProvisioningInput,
): Promise<ResolveAdvancedVoiceProvisioningResult> =>
  resolveAdvancedVoiceProvisioningWithDependencies(
    input,
    defaultVoiceProvisioningDependencies,
  )
