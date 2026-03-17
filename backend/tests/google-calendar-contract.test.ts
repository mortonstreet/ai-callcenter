import assert from 'node:assert/strict'
import test from 'node:test'
import {
  IntegrationProviderSchema,
  GetIntegrationStatusRequestSchema,
} from '@shared/types/src/requests/integrations'
import { compileSystemPrompt } from '../src/services/prompt-compiler.service'
import { buildWizardIntentProfileV1 } from '../src/services/agent-profile.service'
import {
  buildCandidateSlots,
  normalizeGoogleCalendarConfig,
  parseExactRequestedDateTime,
} from '../src/services/google-calendar.service'

test('integration provider schema accepts google calendar', () => {
  const provider = IntegrationProviderSchema.parse('google_calendar')
  assert.equal(provider, 'google_calendar')

  const request = GetIntegrationStatusRequestSchema.parse({
    organizationId: 'org_123',
    provider: 'google_calendar',
  })
  assert.equal(request.provider, 'google_calendar')
})

test('default prompt instructs agent to use calendar tools for follow-up calls', () => {
  const intentProfile = buildWizardIntentProfileV1({
    companyName: 'Northwind HVAC',
    agentName: 'Ava',
    industry: 'hvac',
    useCase: 'customer_support',
    services: ['AC repair', 'seasonal tune-up'],
    mainObjective: 'Qualify callers and schedule follow-up calls',
  })

  const compiled = compileSystemPrompt(intentProfile)

  assert.match(compiled.systemPrompt, /get-follow-up-slots/)
  assert.match(compiled.systemPrompt, /schedule-follow-up-call/)
  assert.match(compiled.systemPrompt, /follow-up call/i)
})

test('google calendar config normalization and slot generation use safe defaults', () => {
  const config = normalizeGoogleCalendarConfig({
    connectedEmail: 'owner@example.com',
    workingHoursStart: 8,
    workingHoursEnd: 12,
    slotIntervalMinutes: 30,
  })

  assert.equal(config.connectedEmail, 'owner@example.com')
  assert.equal(config.followUpDurationMinutes, 15)
  assert.equal(config.workingHoursStart, 8)
  assert.equal(config.workingHoursEnd, 12)

  const now = new Date(2026, 2, 16, 8, 0, 0, 0)
  const startDate = new Date(2026, 2, 17, 0, 0, 0, 0)
  const slots = buildCandidateSlots({
    startDate,
    now,
    daysAhead: 0,
    durationMinutes: 15,
    slotIntervalMinutes: 30,
    minimumNoticeHours: 1,
    workingHoursStart: 9,
    workingHoursEnd: 11,
    preferredTimeframe: 'morning',
  })

  assert.ok(slots.length > 0)
  assert.equal(slots[0].start.getHours(), 9)
})

test('default prompt tells agent to verify exact requested times', () => {
  const intentProfile = buildWizardIntentProfileV1({
    companyName: 'Northwind HVAC',
    agentName: 'Ava',
    industry: 'hvac',
    useCase: 'customer_support',
    services: ['AC repair'],
    mainObjective: 'Schedule qualified follow-up calls',
  })

  const compiled = compileSystemPrompt(intentProfile)

  assert.match(compiled.systemPrompt, /check-follow-up-time/)
  assert.match(compiled.systemPrompt, /Never confirm an exact requested time/i)
})

test('parses exact requested natural language times with timezone aliases', () => {
  const parsed = parseExactRequestedDateTime({
    requestedTime: 'tomorrow at 9pm EST',
    now: new Date('2026-03-16T12:00:00.000Z'),
  })

  assert.ok(parsed)
  assert.equal(parsed?.timeZone, 'America/New_York')
  assert.equal(parsed?.start.toISOString(), '2026-03-18T01:00:00.000Z')
})
