import { decryptSecret, encryptSecret } from '@/lib/encryption'
import { config as appConfig } from '@/config'
import * as integrationRepository from '@/repositories/integration.repository'
import {
  getIntegrationProviderAdapter,
  ProviderConnectionInput,
} from '@/services/integrations/provider-adapters'
import { GoogleCalendarClient } from '@/clients/google-calendar.client'

const TOKEN_EXPIRY_SKEW_MS = 30 * 1000
const googleCalendarClient = new GoogleCalendarClient()

export interface GoogleCalendarConfig {
  connectedEmail: string | null
  calendarId: string
  calendarSummary: string | null
  calendarTimeZone: string | null
  followUpDurationMinutes: number
  slotIntervalMinutes: number
  availabilityWindowDays: number
  minimumNoticeHours: number
  workingHoursStart: number
  workingHoursEnd: number
}

export interface FollowUpSlot {
  startAt: string
  endAt: string
  label: string
}

export interface ExactFollowUpAvailabilityResult {
  available: boolean
  requestedStartAt: string
  requestedEndAt: string
  requestedLabel: string
  reason: string | null
  alternatives: FollowUpSlot[]
  connectedEmail: string | null
  calendarSummary: string | null
  calendarTimeZone: string | null
}

const DEFAULT_CONFIG: GoogleCalendarConfig = {
  connectedEmail: null,
  calendarId: 'primary',
  calendarSummary: null,
  calendarTimeZone: null,
  followUpDurationMinutes: 15,
  slotIntervalMinutes: 30,
  availabilityWindowDays: 7,
  minimumNoticeHours: 2,
  workingHoursStart: 9,
  workingHoursEnd: 17,
}

const TIMEZONE_ALIASES: Record<string, string> = {
  est: 'America/New_York',
  edt: 'America/New_York',
  et: 'America/New_York',
  cst: 'America/Chicago',
  cdt: 'America/Chicago',
  ct: 'America/Chicago',
  mst: 'America/Denver',
  mdt: 'America/Denver',
  mt: 'America/Denver',
  pst: 'America/Los_Angeles',
  pdt: 'America/Los_Angeles',
  pt: 'America/Los_Angeles',
  utc: 'UTC',
  gmt: 'UTC',
}

const toRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }
  return value as Record<string, unknown>
}

const toNumber = (value: unknown, fallback: number) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }
  return fallback
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const isTokenExpired = (value?: Date | string | null) => {
  if (!value) {
    return false
  }
  const expiresAt = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(expiresAt.getTime())) {
    return false
  }
  return expiresAt.getTime() <= Date.now() + TOKEN_EXPIRY_SKEW_MS
}

export const normalizeGoogleCalendarConfig = (
  rawConfig: unknown,
): GoogleCalendarConfig => {
  const config = toRecord(rawConfig)

  return {
    connectedEmail:
      typeof config.connectedEmail === 'string' ? config.connectedEmail : null,
    calendarId:
      typeof config.calendarId === 'string' && config.calendarId.trim()
        ? config.calendarId
        : DEFAULT_CONFIG.calendarId,
    calendarSummary:
      typeof config.calendarSummary === 'string'
        ? config.calendarSummary
        : null,
    calendarTimeZone:
      typeof config.calendarTimeZone === 'string'
        ? config.calendarTimeZone
        : null,
    followUpDurationMinutes: clamp(
      toNumber(
        config.followUpDurationMinutes,
        DEFAULT_CONFIG.followUpDurationMinutes,
      ),
      10,
      120,
    ),
    slotIntervalMinutes: clamp(
      toNumber(config.slotIntervalMinutes, DEFAULT_CONFIG.slotIntervalMinutes),
      10,
      120,
    ),
    availabilityWindowDays: clamp(
      toNumber(
        config.availabilityWindowDays,
        DEFAULT_CONFIG.availabilityWindowDays,
      ),
      1,
      30,
    ),
    minimumNoticeHours: clamp(
      toNumber(config.minimumNoticeHours, DEFAULT_CONFIG.minimumNoticeHours),
      0,
      72,
    ),
    workingHoursStart: clamp(
      toNumber(config.workingHoursStart, DEFAULT_CONFIG.workingHoursStart),
      0,
      23,
    ),
    workingHoursEnd: clamp(
      toNumber(config.workingHoursEnd, DEFAULT_CONFIG.workingHoursEnd),
      1,
      24,
    ),
  }
}

const getTimePreference = (
  input?: string,
): 'morning' | 'afternoon' | 'evening' | null => {
  if (!input) {
    return null
  }

  const normalized = input.trim().toLowerCase()
  if (normalized.includes('morning')) return 'morning'
  if (normalized.includes('afternoon')) return 'afternoon'
  if (normalized.includes('evening')) return 'evening'
  return null
}

const getNextWeekday = (weekday: number, from: Date) => {
  const result = new Date(from)
  const delta = (weekday + 7 - result.getDay()) % 7 || 7
  result.setDate(result.getDate() + delta)
  result.setHours(0, 0, 0, 0)
  return result
}

const parsePreferredDate = (input?: string, now = new Date()): Date | null => {
  if (!input) {
    return null
  }

  const normalized = input.trim().toLowerCase()
  if (!normalized) {
    return null
  }

  if (normalized === 'today') {
    const result = new Date(now)
    result.setHours(0, 0, 0, 0)
    return result
  }

  if (normalized === 'tomorrow') {
    const result = new Date(now)
    result.setDate(result.getDate() + 1)
    result.setHours(0, 0, 0, 0)
    return result
  }

  const weekdayMap: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  }

  for (const [label, weekday] of Object.entries(weekdayMap)) {
    if (normalized.includes(label)) {
      return getNextWeekday(weekday, now)
    }
  }

  const parsed = new Date(input)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  parsed.setHours(0, 0, 0, 0)
  return parsed
}

const resolveTimeZone = (
  explicitTimeZone?: string,
  fallbackTimeZone?: string | null,
): string => {
  if (explicitTimeZone?.trim()) {
    const normalized = explicitTimeZone.trim().toLowerCase()
    return TIMEZONE_ALIASES[normalized] || explicitTimeZone.trim()
  }

  if (fallbackTimeZone?.trim()) {
    return fallbackTimeZone.trim()
  }

  return appConfig.timezone
}

const getDateTimeFormatterParts = (date: Date, timeZone: string) => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  return formatter.formatToParts(date).reduce<Record<string, string>>(
    (acc, part) => {
      if (part.type !== 'literal') {
        acc[part.type] = part.value
      }
      return acc
    },
    {},
  )
}

const zonedDateTimeToUtc = (input: {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  timeZone: string
}) => {
  const utcGuess = Date.UTC(
    input.year,
    input.month - 1,
    input.day,
    input.hour,
    input.minute,
    0,
    0,
  )
  const parts = getDateTimeFormatterParts(new Date(utcGuess), input.timeZone)
  const asIfUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
    0,
  )

  return new Date(utcGuess - (asIfUtc - utcGuess))
}

const extractDateDescriptor = (input: string) => {
  const normalized = input.trim().toLowerCase()

  if (normalized.includes('tomorrow')) {
    return 'tomorrow'
  }

  if (normalized.includes('today')) {
    return 'today'
  }

  const isoMatch = normalized.match(/\b(\d{4}-\d{2}-\d{2})\b/)
  if (isoMatch?.[1]) {
    return isoMatch[1]
  }

  const weekdayMatch = normalized.match(
    /\b(?:next\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/,
  )
  if (weekdayMatch?.[1]) {
    return normalized.includes('next ') ? `next ${weekdayMatch[1]}` : weekdayMatch[1]
  }

  return null
}

const parseHourAndMinute = (input: string) => {
  const normalized = input.trim().toLowerCase()
  const amPmMatch = normalized.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/)

  if (amPmMatch) {
    let hour = Number(amPmMatch[1])
    const minute = Number(amPmMatch[2] || '0')
    const meridiem = amPmMatch[3]

    if (meridiem === 'pm' && hour !== 12) {
      hour += 12
    }
    if (meridiem === 'am' && hour === 12) {
      hour = 0
    }

    return { hour, minute }
  }

  const twentyFourHourMatch = normalized.match(/\b(\d{1,2}):(\d{2})\b/)
  if (twentyFourHourMatch) {
    return {
      hour: Number(twentyFourHourMatch[1]),
      minute: Number(twentyFourHourMatch[2]),
    }
  }

  return null
}

export const parseExactRequestedDateTime = (input: {
  requestedTime: string
  timeZone?: string
  fallbackTimeZone?: string | null
  now?: Date
}) => {
  const now = input.now || new Date()
  const requestedTime = input.requestedTime.trim()

  if (!requestedTime) {
    return null
  }

  const timezoneMatch = requestedTime
    .toLowerCase()
    .match(/\b(est|edt|et|cst|cdt|ct|mst|mdt|mt|pst|pdt|pt|utc|gmt)\b/)
  const timeZone = resolveTimeZone(
    input.timeZone || timezoneMatch?.[1],
    input.fallbackTimeZone,
  )

  const dateDescriptor = extractDateDescriptor(requestedTime)
  const timeParts = parseHourAndMinute(requestedTime)

  if (!dateDescriptor || !timeParts) {
    return null
  }

  const baseDate = parsePreferredDate(dateDescriptor, now)
  if (!baseDate) {
    return null
  }

  const zonedStart = zonedDateTimeToUtc({
    year: baseDate.getFullYear(),
    month: baseDate.getMonth() + 1,
    day: baseDate.getDate(),
    hour: timeParts.hour,
    minute: timeParts.minute,
    timeZone,
  })

  return {
    start: zonedStart,
    timeZone,
  }
}

const getHourInTimeZone = (date: Date, timeZone: string) => {
  const parts = getDateTimeFormatterParts(date, timeZone)
  return Number(parts.hour)
}

const formatSlotLabel = (value: Date) =>
  value.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

const overlapsBusy = (
  startTime: Date,
  endTime: Date,
  busyWindows: Array<{ start: Date; end: Date }>,
) =>
  busyWindows.some((window) => startTime < window.end && endTime > window.start)

export const buildCandidateSlots = (input: {
  startDate: Date
  now: Date
  daysAhead: number
  durationMinutes: number
  slotIntervalMinutes: number
  minimumNoticeHours: number
  workingHoursStart: number
  workingHoursEnd: number
  preferredTimeframe?: string
}) => {
  const slots: Array<{ start: Date; end: Date }> = []
  const earliestAllowed = new Date(
    input.now.getTime() + input.minimumNoticeHours * 60 * 60 * 1000,
  )
  const preference = getTimePreference(input.preferredTimeframe)

  for (let dayOffset = 0; dayOffset <= input.daysAhead; dayOffset += 1) {
    const currentDay = new Date(input.startDate)
    currentDay.setDate(currentDay.getDate() + dayOffset)
    currentDay.setHours(0, 0, 0, 0)

    for (
      let hour = input.workingHoursStart;
      hour < input.workingHoursEnd;
      hour += 1
    ) {
      for (let minute = 0; minute < 60; minute += input.slotIntervalMinutes) {
        const start = new Date(currentDay)
        start.setHours(hour, minute, 0, 0)
        const end = new Date(
          start.getTime() + input.durationMinutes * 60 * 1000,
        )
        const workdayEnd = new Date(currentDay)
        workdayEnd.setHours(input.workingHoursEnd, 0, 0, 0)

        if (end > workdayEnd) {
          continue
        }

        if (end <= earliestAllowed) {
          continue
        }

        if (
          preference === 'morning' &&
          (start.getHours() < 8 || start.getHours() >= 12)
        ) {
          continue
        }

        if (
          preference === 'afternoon' &&
          (start.getHours() < 12 || start.getHours() >= 17)
        ) {
          continue
        }

        if (
          preference === 'evening' &&
          (start.getHours() < 17 || start.getHours() >= 20)
        ) {
          continue
        }

        slots.push({ start, end })
      }
    }
  }

  return slots
}

const getAuthorizedGoogleCalendarConnection = async (
  organizationId: string,
) => {
  const integration =
    await integrationRepository.findIntegrationByOrganizationAndProvider(
      organizationId,
      'google_calendar',
    )

  if (!integration || integration.status !== 'connected') {
    throw new Error('Google Calendar is not connected for this organization')
  }

  let accessToken = decryptSecret(integration.accessToken)
  const refreshToken = decryptSecret(integration.refreshToken)
  const adapter = getIntegrationProviderAdapter('google_calendar')
  let effectiveConfig = toRecord(integration.config)
  let effectiveExternalAccountId = integration.externalAccountId || null

  if (!accessToken) {
    throw new Error('Google Calendar access token is missing')
  }

  if (isTokenExpired(integration.tokenExpiresAt) && refreshToken) {
    const refreshed = await adapter.refreshToken({
      organizationId,
      refreshToken,
    })

    accessToken = refreshed.accessToken
    effectiveConfig = {
      ...effectiveConfig,
      ...(refreshed.config || {}),
    }
    effectiveExternalAccountId =
      refreshed.externalAccountId || effectiveExternalAccountId

    await integrationRepository.updateIntegration(integration.id, {
      accessToken: encryptSecret(refreshed.accessToken),
      refreshToken: encryptSecret(refreshed.refreshToken || refreshToken),
      tokenExpiresAt: refreshed.tokenExpiresAt || null,
      scopes: refreshed.scopes || integration.scopes,
      externalAccountId:
        refreshed.externalAccountId || integration.externalAccountId || null,
      status: 'connected',
      lastSyncStatus: integration.lastSyncStatus,
      lastSyncMessage: null,
      lastSyncAt: integration.lastSyncAt,
      createdByUserId: integration.createdByUserId,
      displayName: integration.displayName,
      config: {
        ...effectiveConfig,
      },
    })
  }

  const normalizedConfig = normalizeGoogleCalendarConfig(effectiveConfig)

  const connection: ProviderConnectionInput = {
    organizationId,
    accessToken,
    refreshToken,
    externalAccountId: effectiveExternalAccountId,
    config: {
      ...effectiveConfig,
      ...normalizedConfig,
    },
  }

  return {
    integration,
    connection,
    config: normalizeGoogleCalendarConfig(connection.config),
  }
}

export const listGoogleCalendarFollowUpSlots = async (input: {
  organizationId: string
  preferredDate?: string
  preferredTimeframe?: string
  durationMinutes?: number
  maxSlots?: number
}) => {
  const { connection, config } = await getAuthorizedGoogleCalendarConnection(
    input.organizationId,
  )

  const now = new Date()
  const startDate = parsePreferredDate(input.preferredDate, now) || now
  const durationMinutes = clamp(
    input.durationMinutes || config.followUpDurationMinutes,
    10,
    120,
  )

  const candidateSlots = buildCandidateSlots({
    startDate,
    now,
    daysAhead: config.availabilityWindowDays,
    durationMinutes,
    slotIntervalMinutes: config.slotIntervalMinutes,
    minimumNoticeHours: config.minimumNoticeHours,
    workingHoursStart: config.workingHoursStart,
    workingHoursEnd: config.workingHoursEnd,
    preferredTimeframe: input.preferredTimeframe,
  })

  const timeMin = new Date(
    now.getTime() + config.minimumNoticeHours * 60 * 60 * 1000,
  )
  const timeMax =
    candidateSlots[candidateSlots.length - 1]?.end ||
    new Date(
      now.getTime() + config.availabilityWindowDays * 24 * 60 * 60 * 1000,
    )

  const freeBusy = await googleCalendarClient.queryFreeBusy({
    accessToken: connection.accessToken || '',
    calendarId: config.calendarId,
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    timeZone: config.calendarTimeZone || undefined,
  })

  const busyWindows = (freeBusy.calendars?.[config.calendarId]?.busy || []).map(
    (window) => ({
      start: new Date(window.start),
      end: new Date(window.end),
    }),
  )

  const availableSlots: FollowUpSlot[] = candidateSlots
    .filter((slot) => !overlapsBusy(slot.start, slot.end, busyWindows))
    .slice(0, input.maxSlots || 5)
    .map((slot) => ({
      startAt: slot.start.toISOString(),
      endAt: slot.end.toISOString(),
      label: formatSlotLabel(slot.start),
    }))

  return {
    connectedEmail: config.connectedEmail,
    calendarSummary: config.calendarSummary,
    calendarTimeZone: config.calendarTimeZone,
    slots: availableSlots,
  }
}

export const checkGoogleCalendarExactFollowUpAvailability = async (input: {
  organizationId: string
  requestedTime: string
  timeZone?: string
  durationMinutes?: number
}) => {
  const { connection, config } = await getAuthorizedGoogleCalendarConnection(
    input.organizationId,
  )

  const durationMinutes = clamp(
    input.durationMinutes || config.followUpDurationMinutes,
    10,
    120,
  )
  const parsed = parseExactRequestedDateTime({
    requestedTime: input.requestedTime,
    timeZone: input.timeZone,
    fallbackTimeZone: config.calendarTimeZone,
  })

  if (!parsed) {
    throw new Error(
      'Could not parse the requested time. Use a phrase like "tomorrow at 3pm ET" or an ISO timestamp.',
    )
  }

  const start = parsed.start
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000)
  const localHour = getHourInTimeZone(start, parsed.timeZone)
  const now = new Date()

  let reason: string | null = null

  if (
    localHour < config.workingHoursStart ||
    localHour >= config.workingHoursEnd
  ) {
    reason = 'Outside the configured follow-up call hours'
  } else if (
    start.getTime() <
    now.getTime() + config.minimumNoticeHours * 60 * 60 * 1000
  ) {
    reason = 'Does not meet the minimum notice window'
  } else {
    const freeBusy = await googleCalendarClient.queryFreeBusy({
      accessToken: connection.accessToken || '',
      calendarId: config.calendarId,
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      timeZone: config.calendarTimeZone || parsed.timeZone,
    })

    const busyWindows = (freeBusy.calendars?.[config.calendarId]?.busy || []).map(
      (window) => ({
        start: new Date(window.start),
        end: new Date(window.end),
      }),
    )

    if (overlapsBusy(start, end, busyWindows)) {
      reason = 'The connected Google Calendar is already booked at that time'
    }
  }

  const requestedDateLabel = start.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: parsed.timeZone,
    timeZoneName: 'short',
  })

  const alternativesResult = await listGoogleCalendarFollowUpSlots({
    organizationId: input.organizationId,
    preferredDate: start.toISOString().slice(0, 10),
    preferredTimeframe:
      localHour < 12 ? 'morning' : localHour < 17 ? 'afternoon' : 'evening',
    durationMinutes,
    maxSlots: 3,
  })

  return {
    available: reason === null,
    requestedStartAt: start.toISOString(),
    requestedEndAt: end.toISOString(),
    requestedLabel: requestedDateLabel,
    reason,
    alternatives: alternativesResult.slots,
    connectedEmail: config.connectedEmail,
    calendarSummary: config.calendarSummary,
    calendarTimeZone: config.calendarTimeZone,
  } satisfies ExactFollowUpAvailabilityResult
}

export const scheduleGoogleCalendarFollowUpCall = async (input: {
  organizationId: string
  customerName: string
  customerPhone: string
  customerEmail?: string
  scheduledStartTime: string
  durationMinutes?: number
  serviceType?: string
  notes?: string
  conversationId?: string
}) => {
  const { connection, config } = await getAuthorizedGoogleCalendarConnection(
    input.organizationId,
  )

  const start = new Date(input.scheduledStartTime)
  if (Number.isNaN(start.getTime())) {
    throw new Error('scheduledStartTime must be a valid ISO timestamp')
  }

  const durationMinutes = clamp(
    input.durationMinutes || config.followUpDurationMinutes,
    10,
    120,
  )
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000)

  const description = [
    'RevCenter scheduled follow-up call',
    '',
    `Customer: ${input.customerName}`,
    `Phone: ${input.customerPhone}`,
    input.customerEmail ? `Email: ${input.customerEmail}` : null,
    input.serviceType ? `Service: ${input.serviceType}` : null,
    input.conversationId ? `Conversation ID: ${input.conversationId}` : null,
    input.notes ? `Notes: ${input.notes}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  const event = await googleCalendarClient.createEvent({
    accessToken: connection.accessToken || '',
    calendarId: config.calendarId,
    summary: `Follow-up call: ${input.customerName}`,
    description,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    timeZone: config.calendarTimeZone,
    attendees: input.customerEmail ? [{ email: input.customerEmail }] : [],
  })

  return {
    eventId: event.id,
    status: event.status || 'confirmed',
    htmlLink: event.htmlLink || null,
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    connectedEmail: config.connectedEmail,
    calendarSummary: config.calendarSummary,
  }
}
