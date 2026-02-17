import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildWizardIntentProfileV1,
  getAgentProfileV1,
  resolveVoiceSelection,
} from '../src/services/agent-profile.service'
import { compileAgentProvisioning } from '../src/services/prompt-compiler.service'
import { CreateElevenLabsAgentSchema } from '@shared/types/src'

const buildIntent = () =>
  buildWizardIntentProfileV1({
    companyName: 'Northside HVAC',
    agentName: 'Northside Dispatch',
    industry: 'hvac',
    useCase: 'customer_support',
    mainObjective: 'Book urgent service calls and collect complete intake data.',
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

test('prompt compiler is deterministic and preserves fragment order', () => {
  const first = compileAgentProvisioning({
    intentProfile: buildIntent(),
  })
  const second = compileAgentProvisioning({
    intentProfile: buildIntent(),
  })

  assert.equal(first.systemPrompt, second.systemPrompt)
  assert.equal(first.profileHash, second.profileHash)
  assert.deepEqual(first.fragmentIds, [
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
})

test('voice resolver uses selected voice when curated and falls back deterministically', () => {
  const profile = getAgentProfileV1()
  const selectedVoiceId = profile.voice.defaultVoiceId

  const selectedIntent = buildWizardIntentProfileV1({
    companyName: 'Northside HVAC',
    agentName: 'Northside Dispatch',
    industry: 'hvac',
    useCase: 'customer_support',
    mainObjective: 'Book urgent service calls.',
    services: ['AC repair'],
    voiceId: selectedVoiceId,
    greetingMode: 'generated',
  })

  const selected = resolveVoiceSelection({
    profile,
    intentProfile: selectedIntent,
  })
  assert.equal(selected.voiceId, selectedVoiceId)
  assert.equal(selected.source, 'selected')

  const missingIntent = buildWizardIntentProfileV1({
    companyName: 'Northside HVAC',
    agentName: 'Northside Dispatch',
    industry: 'hvac',
    useCase: 'customer_support',
    mainObjective: 'Book urgent service calls.',
    services: ['AC repair'],
    greetingMode: 'generated',
  })

  const fallback = resolveVoiceSelection({
    profile,
    intentProfile: missingIntent,
  })
  assert.equal(fallback.source, 'fallback')
  assert.equal(fallback.reason, 'missing_selection')
  assert.equal(fallback.voiceId, profile.voice.defaultVoiceId)
})

test('greeting compiler supports generated and custom modes', () => {
  const generated = compileAgentProvisioning({
    intentProfile: buildWizardIntentProfileV1({
      companyName: 'Northside HVAC',
      agentName: 'Northside Dispatch',
      industry: 'hvac',
      useCase: 'customer_support',
      mainObjective: 'Book urgent service calls.',
      services: ['AC repair'],
      greetingMode: 'generated',
    }),
  })

  assert.match(generated.firstMessage, /thanks for calling/i)

  const custom = compileAgentProvisioning({
    intentProfile: buildWizardIntentProfileV1({
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

  assert.equal(
    custom.firstMessage,
    'Thanks for calling Northside HVAC, how can I help?',
  )
})

test('wizard create schema rejects raw systemPrompt injection', () => {
  assert.throws(() =>
    CreateElevenLabsAgentSchema.parse({
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
})

test('compiler emits metadata and hash changes when objective changes', () => {
  const baseline = compileAgentProvisioning({
    intentProfile: buildIntent(),
  })

  const changedIntent = buildWizardIntentProfileV1({
    companyName: 'Northside HVAC',
    agentName: 'Northside Dispatch',
    industry: 'hvac',
    useCase: 'customer_support',
    mainObjective: 'Focus on escalation before booking.',
    services: ['AC repair', 'Heating repair'],
    discoveryQuestions: ['What is the service address?'],
    greetingMode: 'generated',
  })

  const changed = compileAgentProvisioning({
    intentProfile: changedIntent,
  })

  assert.equal(typeof baseline.promptProfileVersion, 'string')
  assert.equal(typeof baseline.configProfileVersion, 'string')
  assert.ok(baseline.profileHash.length > 10)
  assert.notEqual(baseline.profileHash, changed.profileHash)
})
