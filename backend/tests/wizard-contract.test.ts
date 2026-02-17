import assert from 'node:assert/strict'
import test from 'node:test'
import { collectForbiddenWizardFields } from '../src/api/utils/wizard-v2'
import { CreateElevenLabsAgentSchema } from '@shared/types/src'

const validWizardInput = {
  agentName: 'Front Desk Agent',
  industry: 'hvac',
  useCase: 'customer_support',
  services: ['AC repair'],
  discoveryQuestions: ['What issue are you seeing?'],
  mainObjective: 'Book service appointments quickly.',
  knowledgeSources: ['https://example.com'],
  voiceSelection: {
    voiceId: 'voice_1',
  },
  greeting: {
    mode: 'generated',
  },
  routing: {
    transferNumber: '+14155550123',
    businessTimezone: 'America/Chicago',
    languages: ['English'],
  },
}

test('collectForbiddenWizardFields returns dotted paths for forbidden keys', () => {
  const fields = collectForbiddenWizardFields({
    wizard_input_v2: validWizardInput,
    systemPrompt: 'forbidden',
    nested: {
      llmModel: 'gpt-4.1',
      tools: [{ systemPrompt: 'still forbidden' }],
    },
  })

  assert.deepEqual(fields, [
    'nested.llmModel',
    'nested.tools',
    'nested.tools[0].systemPrompt',
    'systemPrompt',
  ])
})

test('CreateElevenLabsAgentSchema accepts wizard_input_v2 payload', () => {
  const parsed = CreateElevenLabsAgentSchema.parse({
    organizationId: 'org_123',
    idempotencyKey: 'idempotency-12345',
    wizard_input_v2: validWizardInput,
  })

  assert.equal(parsed.organizationId, 'org_123')
  assert.equal(parsed.wizard_input_v2.agentName, 'Front Desk Agent')
})

test('CreateElevenLabsAgentSchema rejects legacy wizardInput key', () => {
  assert.throws(() => {
    CreateElevenLabsAgentSchema.parse({
      organizationId: 'org_123',
      wizardInput: validWizardInput,
    })
  })
})
