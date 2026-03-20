'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
const strict_1 = require('node:assert/strict')
const node_test_1 = require('node:test')
const wizard_v2_1 = require('../src/api/utils/wizard-v2')
const src_1 = require('@shared/types/src')
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
;(0, node_test_1.default)(
  'collectForbiddenWizardFields returns dotted paths for forbidden keys',
  () => {
    const fields = (0, wizard_v2_1.collectForbiddenWizardFields)({
      wizard_input_v2: validWizardInput,
      systemPrompt: 'forbidden',
      nested: {
        llmModel: 'gpt-4.1',
        tools: [{ systemPrompt: 'still forbidden' }],
      },
    })
    strict_1.default.deepEqual(fields, [
      'nested.llmModel',
      'nested.tools',
      'nested.tools[0].systemPrompt',
      'systemPrompt',
    ])
  },
)
;(0, node_test_1.default)(
  'CreateElevenLabsAgentSchema accepts wizard_input_v2 payload',
  () => {
    const parsed = src_1.CreateElevenLabsAgentSchema.parse({
      organizationId: 'org_123',
      idempotencyKey: 'idempotency-12345',
      wizard_input_v2: validWizardInput,
    })
    strict_1.default.equal(parsed.organizationId, 'org_123')
    strict_1.default.equal(parsed.wizard_input_v2.agentName, 'Front Desk Agent')
  },
)
;(0, node_test_1.default)(
  'CreateElevenLabsAgentSchema rejects legacy wizardInput key',
  () => {
    strict_1.default.throws(() => {
      src_1.CreateElevenLabsAgentSchema.parse({
        organizationId: 'org_123',
        wizardInput: validWizardInput,
      })
    })
  },
)
