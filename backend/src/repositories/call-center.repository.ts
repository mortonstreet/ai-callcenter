import { db } from '@/lib/db'
import { withId } from './utils'

// ─── Twilio Config ───

export const findTwilioConfig = async (organizationId: string) => {
  return await db
    .selectFrom('twilio_config')
    .where('organizationId', '=', organizationId)
    .selectAll()
    .executeTakeFirst()
}

export const findTwilioConfigByPhoneNumber = async (phoneNumber: string) => {
  // Extract only digits from the input
  const inputDigits = phoneNumber.replace(/\D/g, '')

  // Get the last 10 digits (strip country code if present)
  const last10 = inputDigits.length >= 10 ? inputDigits.slice(-10) : inputDigits

  // Fetch all configs and compare by extracted digits, since the DB may store
  // numbers in any format: "(917) 675-3976", "+19176753976", "9176753976", etc.
  const configs = await db
    .selectFrom('twilio_config')
    .where('phoneNumber', 'is not', null)
    .selectAll()
    .execute()

  return configs.find((c) => {
    if (!c.phoneNumber) return false
    const dbDigits = c.phoneNumber.replace(/\D/g, '')
    const dbLast10 = dbDigits.length >= 10 ? dbDigits.slice(-10) : dbDigits
    return dbLast10 === last10
  })
}

export const upsertTwilioConfig = async (
  organizationId: string,
  data: {
    accountSid?: string
    authToken?: string
    phoneNumber?: string
    phoneNumberSid?: string
    apiKeySid?: string
    apiKeySecret?: string
    twimlAppSid?: string
    twilioSubaccountSid?: string
    twilioSubaccountFriendlyName?: string
    isIsvManaged?: boolean
    provisioningStatus?: string
    provisioningError?: string | null
    provisioningAttemptCount?: number
    lastProvisioningAttemptAt?: Date | null
    provisionedAt?: Date | null
    autoRecord?: boolean
  },
) => {
  const existing = await findTwilioConfig(organizationId)

  if (existing) {
    const updateData: Record<string, any> = { updatedAt: new Date() }
    if (data.accountSid !== undefined) updateData.accountSid = data.accountSid
    if (data.authToken !== undefined) updateData.authToken = data.authToken
    if (data.phoneNumber !== undefined)
      updateData.phoneNumber = data.phoneNumber
    if (data.phoneNumberSid !== undefined)
      updateData.phoneNumberSid = data.phoneNumberSid
    if (data.apiKeySid !== undefined) updateData.apiKeySid = data.apiKeySid
    if (data.apiKeySecret !== undefined)
      updateData.apiKeySecret = data.apiKeySecret
    if (data.twimlAppSid !== undefined)
      updateData.twimlAppSid = data.twimlAppSid
    if (data.twilioSubaccountSid !== undefined)
      updateData.twilioSubaccountSid = data.twilioSubaccountSid
    if (data.twilioSubaccountFriendlyName !== undefined) {
      updateData.twilioSubaccountFriendlyName =
        data.twilioSubaccountFriendlyName
    }
    if (data.isIsvManaged !== undefined)
      updateData.isIsvManaged = data.isIsvManaged
    if (data.provisioningStatus !== undefined)
      updateData.provisioningStatus = data.provisioningStatus
    if (data.provisioningError !== undefined)
      updateData.provisioningError = data.provisioningError
    if (data.provisioningAttemptCount !== undefined)
      updateData.provisioningAttemptCount = data.provisioningAttemptCount
    if (data.lastProvisioningAttemptAt !== undefined) {
      updateData.lastProvisioningAttemptAt = data.lastProvisioningAttemptAt
    }
    if (data.provisionedAt !== undefined)
      updateData.provisionedAt = data.provisionedAt
    if (data.autoRecord !== undefined) updateData.autoRecord = data.autoRecord

    return await db
      .updateTable('twilio_config')
      .set(updateData)
      .where('id', '=', existing.id)
      .returningAll()
      .executeTakeFirstOrThrow()
  }

  return await db
    .insertInto('twilio_config')
    .values(
      withId({
        organizationId,
        accountSid: data.accountSid || null,
        authToken: data.authToken || null,
        phoneNumber: data.phoneNumber || null,
        phoneNumberSid: data.phoneNumberSid || null,
        apiKeySid: data.apiKeySid || null,
        apiKeySecret: data.apiKeySecret || null,
        twimlAppSid: data.twimlAppSid || null,
        twilioSubaccountSid: data.twilioSubaccountSid || null,
        twilioSubaccountFriendlyName: data.twilioSubaccountFriendlyName || null,
        isIsvManaged: data.isIsvManaged ?? false,
        provisioningStatus: data.provisioningStatus || 'pending',
        provisioningError: data.provisioningError || null,
        provisioningAttemptCount: data.provisioningAttemptCount || 0,
        lastProvisioningAttemptAt: data.lastProvisioningAttemptAt || null,
        provisionedAt: data.provisionedAt || null,
        autoRecord: data.autoRecord ?? true,
        updatedAt: new Date(),
      }),
    )
    .returningAll()
    .executeTakeFirstOrThrow()
}

// ─── Call Dispositions ───

export const findDispositions = async (organizationId: string) => {
  return await db
    .selectFrom('call_disposition')
    .where('organizationId', '=', organizationId)
    .orderBy('sortOrder', 'asc')
    .selectAll()
    .execute()
}

export const createDisposition = async (data: {
  organizationId: string
  label: string
  color?: string
  sortOrder?: number
  isDefault?: boolean
}) => {
  return await db
    .insertInto('call_disposition')
    .values(
      withId({
        organizationId: data.organizationId,
        label: data.label,
        color: data.color || '#6B7280',
        sortOrder: data.sortOrder ?? 0,
        isDefault: data.isDefault ?? false,
      }),
    )
    .returningAll()
    .executeTakeFirstOrThrow()
}

export const updateDisposition = async (
  id: string,
  data: { label?: string; color?: string; sortOrder?: number },
) => {
  const updateData: Record<string, any> = {}
  if (data.label !== undefined) updateData.label = data.label
  if (data.color !== undefined) updateData.color = data.color
  if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder

  return await db
    .updateTable('call_disposition')
    .set(updateData)
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirstOrThrow()
}

export const deleteDisposition = async (id: string) => {
  return await db
    .deleteFrom('call_disposition')
    .where('id', '=', id)
    .executeTakeFirst()
}

export const createDefaultDispositions = async (organizationId: string) => {
  const defaults = [
    { label: 'Booked', color: '#22c55e', sortOrder: 0, isDefault: true },
    { label: 'Follow Up', color: '#3b82f6', sortOrder: 1, isDefault: false },
    {
      label: 'Not Interested',
      color: '#6b7280',
      sortOrder: 2,
      isDefault: false,
    },
    { label: 'No Answer', color: '#eab308', sortOrder: 3, isDefault: false },
    { label: 'Voicemail', color: '#8b5cf6', sortOrder: 4, isDefault: false },
    { label: 'Wrong Number', color: '#ef4444', sortOrder: 5, isDefault: false },
  ]

  for (const d of defaults) {
    await createDisposition({ organizationId, ...d })
  }
}

// ─── Call Logs ───

export const createCallLog = async (data: {
  organizationId: string
  userId?: string
  callSid?: string
  direction: string
  fromNumber: string
  toNumber: string
  status?: string
}) => {
  return await db
    .insertInto('call_log')
    .values(
      withId({
        organizationId: data.organizationId,
        userId: data.userId || null,
        callSid: data.callSid || null,
        direction: data.direction,
        fromNumber: data.fromNumber,
        toNumber: data.toNumber,
        status: data.status || 'initiated',
        duration: 0,
        recordingUrl: null,
        recordingSid: null,
        outcome: null,
        notes: null,
        dispositionId: null,
        leadId: null,
        endedAt: null,
        updatedAt: new Date(),
      }),
    )
    .returningAll()
    .executeTakeFirstOrThrow()
}

export const findCallLogs = async (
  organizationId: string,
  params?: {
    direction?: string
    limit?: number
    page?: number
  },
) => {
  const limit = params?.limit || 50
  const page = params?.page || 1
  const offset = (page - 1) * limit

  let query = db
    .selectFrom('call_log')
    .where('organizationId', '=', organizationId)
    .orderBy('startedAt', 'desc')

  if (params?.direction) {
    query = query.where('direction', '=', params.direction)
  }

  const [data, countResult] = await Promise.all([
    query.selectAll().limit(limit).offset(offset).execute(),
    db
      .selectFrom('call_log')
      .where('organizationId', '=', organizationId)
      .select(db.fn.count('id').as('count'))
      .executeTakeFirst(),
  ])

  return {
    data,
    total: Number(countResult?.count || 0),
  }
}

export const updateCallLogByCallSid = async (
  callSid: string,
  data: {
    status?: string
    duration?: number
    recordingUrl?: string
    recordingSid?: string
    outcome?: string
    notes?: string
    endedAt?: Date
  },
) => {
  const updateData: Record<string, any> = { updatedAt: new Date() }
  if (data.status !== undefined) updateData.status = data.status
  if (data.duration !== undefined) updateData.duration = data.duration
  if (data.recordingUrl !== undefined)
    updateData.recordingUrl = data.recordingUrl
  if (data.recordingSid !== undefined)
    updateData.recordingSid = data.recordingSid
  if (data.outcome !== undefined) updateData.outcome = data.outcome
  if (data.notes !== undefined) updateData.notes = data.notes
  if (data.endedAt !== undefined) updateData.endedAt = data.endedAt

  return await db
    .updateTable('call_log')
    .set(updateData)
    .where('callSid', '=', callSid)
    .returningAll()
    .executeTakeFirst()
}

export const findCallLogByCallSid = async (callSid: string) => {
  return await db
    .selectFrom('call_log')
    .where('callSid', '=', callSid)
    .selectAll()
    .executeTakeFirst()
}
