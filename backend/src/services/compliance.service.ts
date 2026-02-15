import { config } from '@/config'

export interface SuppressionEntry {
  key: string
  organizationId: string
  channel: 'sms' | 'email'
  value: string
  reason: string | null
  createdAt: string
}

const suppressionStore = new Map<string, SuppressionEntry>()

const nowIso = () => new Date().toISOString()

const normalizePhone = (phone: string): string | null => {
  const digits = phone.replace(/\D/g, '')
  if (!digits) return null
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return `+${digits}`
}

const normalizeEmail = (email: string): string | null => {
  const value = email.trim().toLowerCase()
  return value.length > 0 ? value : null
}

const buildSuppressionKey = (
  organizationId: string,
  channel: 'sms' | 'email',
  normalizedValue: string,
) => `${organizationId}:${channel}:${normalizedValue}`

const parseTimeToMinutes = (value: string): number | null => {
  const match = value.match(/^(\d{2}):(\d{2})$/)
  if (!match) return null
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
  return hour * 60 + minute
}

const getMinutesInTimezone = (at: Date, timezone: string): number => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  const parts = formatter.formatToParts(at)
  const hour = Number(parts.find((part) => part.type === 'hour')?.value || '0')
  const minute = Number(
    parts.find((part) => part.type === 'minute')?.value || '0',
  )
  return hour * 60 + minute
}

export const addSuppression = (input: {
  organizationId: string
  phone?: string
  email?: string
  reason?: string
}): SuppressionEntry | null => {
  const phone = input.phone ? normalizePhone(input.phone) : null
  const email = input.email ? normalizeEmail(input.email) : null

  if (!phone && !email) {
    return null
  }

  const channel: 'sms' | 'email' = phone ? 'sms' : 'email'
  const value = phone || email || ''
  const key = buildSuppressionKey(input.organizationId, channel, value)

  const entry: SuppressionEntry = {
    key,
    organizationId: input.organizationId,
    channel,
    value,
    reason: input.reason || null,
    createdAt: nowIso(),
  }

  suppressionStore.set(key, entry)
  return entry
}

export const removeSuppression = (input: {
  organizationId: string
  phone?: string
  email?: string
}) => {
  const phone = input.phone ? normalizePhone(input.phone) : null
  const email = input.email ? normalizeEmail(input.email) : null

  if (!phone && !email) {
    return false
  }

  const channel: 'sms' | 'email' = phone ? 'sms' : 'email'
  const value = phone || email || ''
  const key = buildSuppressionKey(input.organizationId, channel, value)
  return suppressionStore.delete(key)
}

export const isSuppressed = (input: {
  organizationId: string
  phone?: string
  email?: string
}): boolean => {
  const phone = input.phone ? normalizePhone(input.phone) : null
  const email = input.email ? normalizeEmail(input.email) : null

  if (phone) {
    const key = buildSuppressionKey(input.organizationId, 'sms', phone)
    if (suppressionStore.has(key)) return true
  }

  if (email) {
    const key = buildSuppressionKey(input.organizationId, 'email', email)
    if (suppressionStore.has(key)) return true
  }

  return false
}

export const listSuppressions = (
  organizationId: string,
): SuppressionEntry[] => {
  return [...suppressionStore.values()].filter(
    (entry) => entry.organizationId === organizationId,
  )
}

export const isWithinSendWindow = (input: {
  timezone?: string
  sendWindowStart?: string
  sendWindowEnd?: string
  at?: Date
}): boolean => {
  const timezone = input.timezone || config.timezone
  const sendWindowStart = input.sendWindowStart || '09:00'
  const sendWindowEnd = input.sendWindowEnd || '20:00'

  const startMinutes = parseTimeToMinutes(sendWindowStart)
  const endMinutes = parseTimeToMinutes(sendWindowEnd)

  if (startMinutes === null || endMinutes === null) {
    return true
  }

  const currentMinutes = getMinutesInTimezone(input.at || new Date(), timezone)

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes
  }

  // Overnight window (e.g. 22:00-06:00)
  return currentMinutes >= startMinutes || currentMinutes <= endMinutes
}
