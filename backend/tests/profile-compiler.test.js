'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
const strict_1 = require('node:assert/strict')
const node_test_1 = require('node:test')
const agent_profile_service_1 = require('../src/services/agent-profile.service')
const prompt_compiler_service_1 = require('../src/services/prompt-compiler.service')
const src_1 = require('@shared/types/src')
const buildIntent = () =>
  (0, agent_profile_service_1.buildWizardIntentProfileV1)({
    companyName: 'Northside HVAC',
    agentName: 'Northside Dispatch',
    industry: 'hvac',
    useCase: 'customer_support',
    mainObjective:
      'Book urgent service calls and collect complete intake data.',
    services: ['AC repair', 'Heating repair'],
    discoveryQuestions: [
      'What is the service address?',
      'What is the best callback number?',
    ],
    knowledgeSources: ['https://northside.example.com'],
    greetingMode: 'generated',
    transferNumber: '+15550001111',
    businessTimezone: 'America/Chicago',
    languages: ['en'],
  })
;(0, node_test_1.default)(
  'prompt compiler is deterministic and preserves fragment order',
  () => {
    const first = (0, prompt_compiler_service_1.compileAgentProvisioning)({
      intentProfile: buildIntent(),
    })
    const second = (0, prompt_compiler_service_1.compileAgentProvisioning)({
      intentProfile: buildIntent(),
    })
    strict_1.default.equal(first.systemPrompt, second.systemPrompt)
    strict_1.default.equal(first.profileHash, second.profileHash)
    strict_1.default.deepEqual(first.fragmentIds, [
      'base_template',
      'industry',
      'use_case',
      'services',
      'discovery_questions',
      'objective',
      'policy_blocks',
      'tool_rules',
      'escalation_rules',
    ])
  },
)
;(0, node_test_1.default)(
  'voice resolver uses selected voice when curated and falls back deterministically',
  () => {
    const profile = (0, agent_profile_service_1.getAgentProfileV1)()
    const selectedVoiceId = profile.voice.defaultVoiceId
    const selectedIntent = (0,
    agent_profile_service_1.buildWizardIntentProfileV1)({
      companyName: 'Northside HVAC',
      agentName: 'Northside Dispatch',
      industry: 'hvac',
      useCase: 'customer_support',
      mainObjective: 'Book urgent service calls.',
      services: ['AC repair'],
      voiceId: selectedVoiceId,
      greetingMode: 'generated',
    })
    const selected = (0, agent_profile_service_1.resolveVoiceSelection)({
      profile,
      intentProfile: selectedIntent,
    })
    strict_1.default.equal(selected.voiceId, selectedVoiceId)
    strict_1.default.equal(selected.source, 'selected')
    const missingIntent = (0,
    agent_profile_service_1.buildWizardIntentProfileV1)({
      companyName: 'Northside HVAC',
      agentName: 'Northside Dispatch',
      industry: 'hvac',
      useCase: 'customer_support',
      mainObjective: 'Book urgent service calls.',
      services: ['AC repair'],
      greetingMode: 'generated',
    })
    const fallback = (0, agent_profile_service_1.resolveVoiceSelection)({
      profile,
      intentProfile: missingIntent,
    })
    strict_1.default.equal(fallback.source, 'fallback')
    strict_1.default.equal(fallback.reason, 'missing_selection')
    strict_1.default.equal(fallback.voiceId, profile.voice.defaultVoiceId)
  },
)
;(0, node_test_1.default)(
  'greeting compiler supports generated and custom modes',
  () => {
    const generated = (0, prompt_compiler_service_1.compileAgentProvisioning)({
      intentProfile: (0, agent_profile_service_1.buildWizardIntentProfileV1)({
        companyName: 'Northside HVAC',
        agentName: 'Northside Dispatch',
        industry: 'hvac',
        useCase: 'customer_support',
        mainObjective: 'Book urgent service calls.',
        services: ['AC repair'],
        greetingMode: 'generated',
      }),
    })
    strict_1.default.match(generated.firstMessage, /thanks for calling/i)
    const custom = (0, prompt_compiler_service_1.compileAgentProvisioning)({
      intentProfile: (0, agent_profile_service_1.buildWizardIntentProfileV1)({
        companyName: 'Northside HVAC',
        agentName: 'Northside Dispatch',
        industry: 'hvac',
        useCase: 'customer_support',
        mainObjective: 'Book urgent service calls.',
        services: ['AC repair'],
        greetingMode: 'custom',
        customGreeting: 'Thanks for calling Northside HVAC, how can I help?',
      }),
    })
    strict_1.default.equal(
      custom.firstMessage,
      'Thanks for calling Northside HVAC, how can I help?',
    )
  },
)
;(0, node_test_1.default)(
  'wizard create schema rejects raw systemPrompt injection',
  () => {
    strict_1.default.throws(() =>
      src_1.CreateElevenLabsAgentSchema.parse({
        organizationId: 'org_1',
        wizard_input_v2: {
          agentName: 'Northside Dispatch',
          industry: 'hvac',
          useCase: 'customer_support',
          services: ['AC repair'],
          mainObjective: 'Book urgent service calls.',
          greeting: {
            mode: 'generated',
          },
        },
        systemPrompt: 'malicious override',
      }),
    )
  },
)
;(0, node_test_1.default)(
  'compiler emits metadata and hash changes when objective changes',
  () => {
    const baseline = (0, prompt_compiler_service_1.compileAgentProvisioning)({
      intentProfile: buildIntent(),
    })
    const changedIntent = (0,
    agent_profile_service_1.buildWizardIntentProfileV1)({
      companyName: 'Northside HVAC',
      agentName: 'Northside Dispatch',
      industry: 'hvac',
      useCase: 'customer_support',
      mainObjective: 'Focus on escalation before booking.',
      services: ['AC repair', 'Heating repair'],
      discoveryQuestions: ['What is the service address?'],
      greetingMode: 'generated',
    })
    const changed = (0, prompt_compiler_service_1.compileAgentProvisioning)({
      intentProfile: changedIntent,
    })
    strict_1.default.equal(typeof baseline.promptProfileVersion, 'string')
    strict_1.default.equal(typeof baseline.configProfileVersion, 'string')
    strict_1.default.ok(baseline.profileHash.length > 10)
    strict_1.default.notEqual(baseline.profileHash, changed.profileHash)
  },
)
