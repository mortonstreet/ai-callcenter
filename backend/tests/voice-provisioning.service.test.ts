import assert from 'node:assert/strict'
import test from 'node:test'
import {
  OrganizationVoiceState,
  ResolveAdvancedVoiceProvisioningInput,
  VoiceProvisioningDependencies,
  resolveAdvancedVoiceProvisioningWithDependencies,
} from '../src/services/voice-provisioning.service'

const createBaseOrganizationState = (): OrganizationVoiceState => ({
  id: 'org_1',
  metadata: null,
  provisionedVoiceId: null,
  voiceProvisioningStatus: 'not_started',
  voiceTrainingStatus: 'not_requested',
  voiceProvisioningError: null,
  voicePromptSeed: null,
  voiceProvisionedAt: null,
})

const createInput = (): ResolveAdvancedVoiceProvisioningInput => ({
  organizationId: 'org_1',
  companyName: 'Acme Services',
  industry: 'hvac',
  useCase: 'customer_support',
  services: ['install', 'maintenance'],
  mainGoal: 'book more same-day calls',
  trainingAssets: [
    {
      url: 'https://assets.example.com/voice-1.wav',
      name: 'voice-1.wav',
      mimeType: 'audio/wav',
    },
  ],
})

test('resolves advanced voice provisioning success path for first agent', async () => {
  const persistedStatuses: string[] = []
  let createdVoiceCalls = 0
  let trainingCalls = 0
  let organizationState = createBaseOrganizationState()

  const dependencies: VoiceProvisioningDependencies = {
    loadOrganizationVoiceState: async () => organizationState,
    countOrganizationAgents: async () => 0,
    persistOrganizationVoiceState: async (_organization, patch) => {
      persistedStatuses.push(`${patch.provisioningStatus}:${patch.trainingStatus}`)
      organizationState = {
        ...organizationState,
        provisionedVoiceId: patch.voiceId ?? null,
        voiceProvisioningStatus: patch.provisioningStatus,
        voiceTrainingStatus: patch.trainingStatus,
        voiceProvisioningError: patch.error ?? null,
        voicePromptSeed: patch.promptSeed,
        voiceProvisionedAt: patch.setProvisionedAt
          ? new Date()
          : organizationState.voiceProvisionedAt,
      }
      return organizationState
    },
    toVoiceSamples: async () => [
      {
        filename: 'voice-1.wav',
        contentType: 'audio/wav',
        content: Buffer.from('sample-audio'),
      },
    ],
    createCustomVoice: async () => {
      createdVoiceCalls += 1
      return { voice_id: 'voice_custom_abc' }
    },
    trainCustomVoice: async () => {
      trainingCalls += 1
      return { voice_id: 'voice_custom_abc' }
    },
  }

  const result = await resolveAdvancedVoiceProvisioningWithDependencies(
    createInput(),
    dependencies,
  )

  assert.equal(result.voiceId, 'voice_custom_abc')
  assert.equal(result.voiceProvisioningStatus, 'completed')
  assert.equal(result.voiceTrainingStatus, 'completed')
  assert.equal(result.degradedReason, null)
  assert.equal(createdVoiceCalls, 1)
  assert.equal(trainingCalls, 1)
  assert.deepEqual(persistedStatuses, ['running:running', 'completed:completed'])
})

test('falls back gracefully when voice provisioning fails', async () => {
  const persistedStatuses: string[] = []
  let organizationState = createBaseOrganizationState()

  const dependencies: VoiceProvisioningDependencies = {
    loadOrganizationVoiceState: async () => organizationState,
    countOrganizationAgents: async () => 0,
    persistOrganizationVoiceState: async (_organization, patch) => {
      persistedStatuses.push(`${patch.provisioningStatus}:${patch.trainingStatus}`)
      organizationState = {
        ...organizationState,
        provisionedVoiceId: patch.voiceId ?? null,
        voiceProvisioningStatus: patch.provisioningStatus,
        voiceTrainingStatus: patch.trainingStatus,
        voiceProvisioningError: patch.error ?? null,
        voicePromptSeed: patch.promptSeed,
      }
      return organizationState
    },
    toVoiceSamples: async () => [],
    createCustomVoice: async () => {
      throw new Error('provider_unavailable')
    },
    trainCustomVoice: async () => ({ voice_id: 'unused' }),
  }

  const result = await resolveAdvancedVoiceProvisioningWithDependencies(
    createInput(),
    dependencies,
  )

  assert.equal(result.voiceId, null)
  assert.equal(result.voiceProvisioningStatus, 'fallback')
  assert.equal(result.voiceTrainingStatus, 'failed')
  assert.equal(result.degradedReason, 'voice_provisioning_failed')
  assert.deepEqual(persistedStatuses, ['running:running', 'fallback:failed'])
})
