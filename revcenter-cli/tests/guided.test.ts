import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildGuidedRunDirectory,
  buildGuidedWizardPayload,
  defaultAgentNameFromIndustry,
  defaultAgentNameFromOrganization,
  mergePromptValues,
  splitPromptList,
} from '../src/guided'

test('splitPromptList normalizes comma and newline separated values', () => {
  assert.deepEqual(
    splitPromptList('AC repair, Heating\nAC repair\n Emergency dispatch '),
    ['AC repair', 'Heating', 'Emergency dispatch'],
  )
})

test('mergePromptValues preserves suggested prompts containing commas', () => {
  assert.deepEqual(
    mergePromptValues(
      ['Is the system not turning on, or is airflow weak?'],
      ['What type of unit do you have?'],
    ),
    [
      'Is the system not turning on, or is airflow weak?',
      'What type of unit do you have?',
    ],
  )
})

test('defaultAgentNameFromOrganization derives a service desk label', () => {
  assert.equal(
    defaultAgentNameFromOrganization('Northwind HVAC'),
    'Northwind HVAC Service Desk',
  )
})

test('defaultAgentNameFromIndustry derives a front desk label', () => {
  assert.equal(defaultAgentNameFromIndustry('HVAC'), 'HVAC Front Desk')
})

test('buildGuidedWizardPayload creates a wizard-safe payload', () => {
  const payload = buildGuidedWizardPayload({
    organizationName: 'Northwind HVAC',
    industry: 'hvac',
    useCase: 'customer_support',
    services: ['Repairs', 'Installations'],
    discoveryQuestions: ['What issue are you calling about?'],
    mainObjective: 'Book qualified service visits.',
    knowledgeSources: ['https://northwind.example.com/docs'],
    agentName: 'Northwind HVAC Service Desk',
    greetingMode: 'custom',
    customGreeting: 'Thanks for calling Northwind HVAC. How can I help?',
    voiceId: 'voice_demo_123',
    transferNumber: '+14155550199',
    businessTimezone: 'America/Los_Angeles',
    languages: ['en', 'es'],
  })

  assert.deepEqual(payload, {
    name: 'Northwind HVAC',
    industry: 'hvac',
    useCase: 'customer_support',
    services: ['Repairs', 'Installations'],
    discoveryQuestions: ['What issue are you calling about?'],
    mainObjective: 'Book qualified service visits.',
    knowledgeSources: ['https://northwind.example.com/docs'],
    voiceSelection: {
      voiceId: 'voice_demo_123',
    },
    greeting: {
      mode: 'custom',
      customText: 'Thanks for calling Northwind HVAC. How can I help?',
    },
    routing: {
      transferNumber: '+14155550199',
      businessTimezone: 'America/Los_Angeles',
      languages: ['en', 'es'],
    },
    agentName: 'Northwind HVAC Service Desk',
  })
})

test('buildGuidedRunDirectory uses a deterministic UTC timestamped run folder', () => {
  const runDir = buildGuidedRunDirectory({
    name: 'Northwind HVAC',
    outputRoot: 'runs',
    now: new Date('2026-03-06T22:15:04.000Z'),
  })

  assert.equal(runDir, 'runs/20260306-221504-northwind-hvac')
})
