import assert from 'node:assert/strict'
import test from 'node:test'
import {
  OrganizationVoiceState,
  VoiceProvisioningDependencies,
  resolveAdvancedVoiceProvisioningWithDependencies,
} from '../src/services/voice-provisioning.service'

test('first-agent provisioning produces an attachable voice id', async () => {
  const organizationState: OrganizationVoiceState = {
    id: 'org_1',
    metadata: null,
    provisionedVoiceId: null,
    voiceProvisioningStatus: 'not_started',
    voiceTrainingStatus: 'not_requested',
    voiceProvisioningError: null,
    voicePromptSeed: null,
    voiceProvisionedAt: null,
  }

  const dependencies: VoiceProvisioningDependencies = {
    loadOrganizationVoiceState: async () => organizationState,
    countOrganizationAgents: async () => 0,
    persistOrganizationVoiceState: async (_organization, patch) => ({
      ...organizationState,
      provisionedVoiceId: patch.voiceId ?? null,
      voiceProvisioningStatus: patch.provisioningStatus,
      voiceTrainingStatus: patch.trainingStatus,
      voiceProvisioningError: patch.error ?? null,
      voicePromptSeed: patch.promptSeed,
      voiceProvisionedAt: patch.setProvisionedAt ? new Date() : null,
    }),
    toVoiceSamples: async () => [
      {
        filename: 'sample.wav',
        contentType: 'audio/wav',
        content: Buffer.from('sample-audio'),
      },
    ],
    createCustomVoice: async () => ({ voice_id: 'voice_custom_777' }),
    trainCustomVoice: async () => ({ voice_id: 'voice_custom_777' }),
  }

  const provisioning = await resolveAdvancedVoiceProvisioningWithDependencies(
    {
      organizationId: 'org_1',
      companyName: 'Acme Services',
      industry: 'hvac',
      useCase: 'customer_support',
      services: ['install', 'maintenance'],
      mainGoal: 'book more calls',
      trainingAssets: [
        {
          url: 'https://assets.example.com/voice.wav',
        },
      ],
    },
    dependencies,
  )

  const firstAgentPayload = {
    voiceId: provisioning.voiceId,
    promptSeed: provisioning.promptSeed,
  }

  assert.equal(firstAgentPayload.voiceId, 'voice_custom_777')
  assert.equal(firstAgentPayload.promptSeed.includes('Acme Services'), true)
})
