import test from 'node:test'
import assert from 'node:assert/strict'
import {
  collectForbiddenWizardFields,
  createWizardRequestTemplate,
  createWizardRenderResponse,
  parseWizardCliRequest,
} from '../src/requests'

test('parseWizardCliRequest supports flat wizard payloads', () => {
  const parsed = parseWizardCliRequest({
    industry: 'hvac',
    useCase: 'customer_support',
    services: ['Repairs', 'Installations'],
    discoveryQuestions: ['What unit is having issues?'],
    mainObjective: 'Book qualified service calls.',
    knowledgeSources: ['https://northwind.example.com'],
    greeting: {
      mode: 'generated',
    },
    agentName: 'Northwind Dispatch',
  })

  assert.equal(parsed.startInput.name, 'Northwind Dispatch')
  assert.equal(parsed.startInput.agent.name, 'Northwind Dispatch')
  assert.equal(parsed.request.agentName, 'Northwind Dispatch')
  assert.equal(parsed.wizardInputV2.agentName, 'Northwind Dispatch')
  assert.equal(parsed.startInput.mainGoal, 'Book qualified service calls.')
  assert.equal(parsed.request.mainObjective, 'Book qualified service calls.')
  assert.deepEqual(parsed.startInput.agent.serviceQuestions, [
    'What unit is having issues?',
  ])
  assert.equal(parsed.startInput.website, 'https://northwind.example.com/')
  assert.equal(parsed.request.knowledgeSources?.[0], 'https://northwind.example.com')
})

test('parseWizardCliRequest supports nested onboarding payloads', () => {
  const parsed = parseWizardCliRequest({
    name: 'Summit Plumbing',
    wizard_input_v2: {
      agentName: 'Summit Front Desk',
      industry: 'plumbing',
      useCase: 'customer_support',
      services: ['Drain cleaning'],
      mainObjective: 'Book plumbing jobs.',
      discoveryQuestions: ['Is this issue urgent?'],
      knowledgeSources: ['https://summit.example.com/docs'],
      greeting: {
        mode: 'custom',
        customText: 'Thanks for calling Summit Plumbing. How can I help?',
      },
      voiceSelection: {
        voiceId: 'voice_demo_123',
      },
    },
  })

  assert.equal(parsed.startInput.agent.name, 'Summit Front Desk')
  assert.equal(parsed.request.agentName, 'Summit Front Desk')
  assert.equal(parsed.startInput.greeting?.mode, 'custom')
  assert.equal(parsed.request.greeting?.mode, 'custom')
  assert.equal(
    parsed.startInput.greeting?.customText,
    'Thanks for calling Summit Plumbing. How can I help?',
  )
  assert.equal(parsed.summary.voiceId, 'voice_demo_123')
  assert.equal(parsed.summary.knowledgeSourceCount, 1)
})

test('parseWizardCliRequest rejects missing required wizard fields', () => {
  assert.throws(
    () =>
      parseWizardCliRequest({
        industry: 'hvac',
        services: ['Repairs'],
        agentName: 'Dispatch',
        greeting: {
          mode: 'generated',
        },
      }),
    /mainObjective/,
  )
})

test('parseWizardCliRequest rejects forbidden wizard fields', () => {
  assert.throws(
    () =>
      parseWizardCliRequest({
        name: 'Bad Payload',
        industry: 'hvac',
        services: ['Repairs'],
        agentName: 'Dispatch',
        advanced: {
          workflow: true,
        },
      }),
    /forbidden fields: advanced, advanced\.workflow/,
  )
})

test('collectForbiddenWizardFields returns nested paths', () => {
  assert.deepEqual(
    collectForbiddenWizardFields({
      security: true,
      nested: {
        tools: ['transfer'],
      },
    }),
    ['nested.tools', 'security'],
  )
})

test('createWizardRequestTemplate returns a reusable clone', () => {
  const first = createWizardRequestTemplate()
  const second = createWizardRequestTemplate()

  first.agentName = 'Changed'

  assert.equal(second.agentName, 'Front Desk Agent')
})

test('createWizardRenderResponse builds a deterministic preview scaffold', () => {
  const parsed = parseWizardCliRequest({
    industry: 'hvac',
    services: ['Repairs'],
    useCase: 'customer_support',
    mainObjective: 'Book qualified service calls.',
    greeting: {
      mode: 'generated',
    },
    agentName: 'Northwind Dispatch',
  })

  const preview = createWizardRenderResponse(parsed)

  assert.equal(preview.normalizedRequest.agentName, 'Northwind Dispatch')
  assert.equal(preview.resolvedProfile.profileKey, 'hvac')
  assert.equal(preview.resolvedProfile.greetingMode, 'generated')
  assert.match(preview.promptPreview.compiledPromptSummary, /Use case/)
  assert.deepEqual(preview.warnings, [
    'No knowledge sources were provided.',
    'No explicit voice was selected.',
  ])
})
