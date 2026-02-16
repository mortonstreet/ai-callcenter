import { randomUUID } from 'crypto'
import { DBIntegration, DBIntegrationSyncJob, DBLead } from '@shared/db/src'
import {
  GoogleCalendarProjectionEventView,
  IntegrationConnectionStatus,
  IntegrationConnectionView,
  IntegrationProvider,
  IntegrationSyncDirection,
  IntegrationSyncJobView,
  IntegrationSyncStatus,
} from '@shared/types/src/requests/integrations'
import { encryptSecret, decryptSecret } from '@/lib/encryption'
import logger from '@/lib/logger'
import { enqueueQueueJob } from '@/queues'
import * as integrationRepository from '@/repositories/integration.repository'
import * as leadRepository from '@/repositories/lead.repository'
import {
  getIntegrationProviderAdapter,
  getProviderDisplayName,
  getSyncJobName,
  ProviderConnectionInput,
  ProviderCustomerRecord,
  ProviderJobRecord,
  supportedIntegrationProviders,
} from '@/services/integrations/provider-adapters'
import { QUEUE_NAMES } from '@/types/queues'

const INTERNAL_CONFIG_KEYS = new Set(['oauthState'])
const TOKEN_EXPIRY_SKEW_MS = 30 * 1000
const GOOGLE_CALENDAR_PROVIDER: IntegrationProvider = 'google-calendar'
const MAX_PROJECTED_GOOGLE_CALENDAR_EVENTS = 500

export interface IntegrationSyncQueuePayload {
  integrationJobId: string
  organizationId: string
  provider: IntegrationProvider
  direction: IntegrationSyncDirection
  correlationId?: string
}

interface IntegrationServiceErrorInput {
  status: number
  code: string
  message: string
  userMessage: string
  details?: unknown
}

export class IntegrationServiceError extends Error {
  status: number
  code: string
  userMessage: string
  details?: unknown

  constructor(input: IntegrationServiceErrorInput) {
    super(input.message)
    this.name = 'IntegrationServiceError'
    this.status = input.status
    this.code = input.code
    this.userMessage = input.userMessage
    this.details = input.details
  }
}

const nowIso = () => new Date().toISOString()

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const toConfigRecord = (value: unknown): Record<string, unknown> => {
  if (!isObject(value)) {
    return {}
  }
  return value
}

const sanitizeConfigForView = (
  config: Record<string, unknown>,
): Record<string, unknown> => {
  return Object.fromEntries(
    Object.entries(config).filter(([key]) => !INTERNAL_CONFIG_KEYS.has(key)),
  )
}

const resolveConnectionStatus = (
  value?: string | null,
): IntegrationConnectionStatus => {
  if (
    value === 'connected' ||
    value === 'disconnected' ||
    value === 'pending' ||
    value === 'error'
  ) {
    return value
  }
  return 'disconnected'
}

const resolveSyncStatus = (value?: string | null): IntegrationSyncStatus => {
  if (
    value === 'queued' ||
    value === 'running' ||
    value === 'completed' ||
    value === 'failed'
  ) {
    return value
  }
  return 'queued'
}

const toDate = (value?: string | Date | null): Date | null => {
  if (!value) return null
  if (value instanceof Date) return value
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }
  return parsed
}

const toIso = (value?: string | Date | null): string | null => {
  const parsed = toDate(value)
  return parsed ? parsed.toISOString() : null
}

const getLastError = (integration: DBIntegration): string | null => {
  if (integration.lastSyncStatus === 'failed') {
    return integration.lastSyncMessage || 'Most recent sync failed'
  }
  if (integration.status === 'error') {
    return integration.lastSyncMessage || 'Integration is in an error state'
  }
  return null
}

const toIntegrationView = (
  organizationId: string,
  provider: IntegrationProvider,
  integration?: DBIntegration,
): IntegrationConnectionView => {
  if (!integration) {
    return {
      organizationId,
      provider,
      status: 'disconnected',
      connectedById: null,
      connectedAt: null,
      updatedAt: nowIso(),
      lastSyncAt: null,
      lastError: null,
      config: {},
    }
  }

  const status = resolveConnectionStatus(integration.status)
  const connectedAt =
    status === 'disconnected' ? null : toIso(integration.createdAt)

  return {
    organizationId,
    provider,
    status,
    connectedById: integration.createdByUserId || null,
    connectedAt,
    updatedAt: toIso(integration.updatedAt) || nowIso(),
    lastSyncAt: toIso(integration.lastSyncAt),
    lastError: getLastError(integration),
    config: sanitizeConfigForView(toConfigRecord(integration.config)),
  }
}

const resolveSyncDirection = (
  job: DBIntegrationSyncJob,
): IntegrationSyncDirection => {
  const payload = toConfigRecord(job.payload)
  if (payload.direction === 'pull' || payload.direction === 'push') {
    return payload.direction
  }
  if (job.jobType === 'pull' || job.jobType === 'push') {
    return job.jobType
  }
  return 'pull'
}

const toSyncJobView = (job: DBIntegrationSyncJob): IntegrationSyncJobView => {
  return {
    id: job.id,
    organizationId: job.organizationId,
    provider: job.provider as IntegrationProvider,
    direction: resolveSyncDirection(job),
    status: resolveSyncStatus(job.status),
    recordsProcessed: job.recordsSynced || 0,
    errorSummary: job.errorMessage || null,
    createdAt: toIso(job.createdAt) || nowIso(),
    startedAt: toIso(job.startedAt),
    completedAt: toIso(job.completedAt),
  }
}

const getProviderIntegration = async (
  organizationId: string,
  provider: IntegrationProvider,
) => {
  return integrationRepository.findIntegrationByOrganizationAndProvider(
    organizationId,
    provider,
  )
}

const persistIntegration = async (input: {
  organizationId: string
  provider: IntegrationProvider
  existing?: DBIntegration
  status: IntegrationConnectionStatus
  createdByUserId?: string | null
  config: Record<string, unknown>
  accessToken?: string | null
  refreshToken?: string | null
  tokenExpiresAt?: Date | null
  scopes?: string | null
  externalAccountId?: string | null
  lastSyncAt?: Date | null
  lastSyncStatus?: string | null
  lastSyncMessage?: string | null
}): Promise<DBIntegration> => {
  const payload = {
    status: input.status,
    displayName: getProviderDisplayName(input.provider),
    config: input.config,
    accessToken: input.accessToken || null,
    refreshToken: input.refreshToken || null,
    tokenExpiresAt: input.tokenExpiresAt || null,
    scopes: input.scopes || null,
    externalAccountId: input.externalAccountId || null,
    lastSyncAt: input.lastSyncAt || null,
    lastSyncStatus: input.lastSyncStatus || null,
    lastSyncMessage: input.lastSyncMessage || null,
    createdByUserId: input.createdByUserId || null,
  }

  if (input.existing) {
    const updated = await integrationRepository.updateIntegration(
      input.existing.id,
      payload,
    )

    if (!updated) {
      throw new Error(`Failed to update integration ${input.existing.id}`)
    }
    return updated
  }

  return integrationRepository.createIntegration({
    organizationId: input.organizationId,
    provider: input.provider,
    ...payload,
    updatedAt: new Date(),
  })
}

const buildProviderConnectionInput = (
  integration: DBIntegration,
): ProviderConnectionInput => {
  return {
    organizationId: integration.organizationId,
    accessToken: decryptSecret(integration.accessToken),
    refreshToken: decryptSecret(integration.refreshToken),
    externalAccountId: integration.externalAccountId || null,
    config: toConfigRecord(integration.config),
  }
}

const ensureConnectedIntegration = async (
  organizationId: string,
  provider: IntegrationProvider,
) => {
  const integration = await getProviderIntegration(organizationId, provider)
  if (
    !integration ||
    resolveConnectionStatus(integration.status) !== 'connected'
  ) {
    throw new IntegrationServiceError({
      status: 400,
      code: 'INTEGRATION_NOT_CONNECTED',
      message: `${provider} is not connected`,
      userMessage: `${getProviderDisplayName(provider)} must be connected first.`,
    })
  }
  return integration
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message
  }
  return 'Unknown integration error'
}

const buildReconnectRequiredConfig = (
  config: Record<string, unknown>,
  reason: string,
  message: string,
): Record<string, unknown> => {
  return {
    ...config,
    reconnectRequired: true,
    reconnectReason: reason,
    reconnectMessage: message,
    reconnectRequiredAt: nowIso(),
  }
}

const clearReconnectRequiredConfig = (
  config: Record<string, unknown>,
): Record<string, unknown> => {
  const next = { ...config }
  delete next.reconnectRequired
  delete next.reconnectReason
  delete next.reconnectMessage
  delete next.reconnectRequiredAt
  return next
}

const markReconnectRequiredIntegration = async (input: {
  integration: DBIntegration
  provider: IntegrationProvider
  reason: string
  message: string
}) => {
  const nextConfig = buildReconnectRequiredConfig(
    toConfigRecord(input.integration.config),
    input.reason,
    input.message,
  )

  const updated = await integrationRepository.updateIntegration(
    input.integration.id,
    {
      status: 'error',
      lastSyncStatus: 'failed',
      lastSyncMessage: input.message,
      lastSyncAt: input.integration.lastSyncAt,
      accessToken: input.integration.accessToken,
      refreshToken: input.integration.refreshToken,
      tokenExpiresAt: input.integration.tokenExpiresAt,
      scopes: input.integration.scopes,
      externalAccountId: input.integration.externalAccountId,
      config: nextConfig,
      createdByUserId: input.integration.createdByUserId,
      displayName: input.integration.displayName,
    },
  )

  return updated || input.integration
}

const isReconnectRequiredError = (
  error: unknown,
): error is IntegrationServiceError => {
  return (
    error instanceof IntegrationServiceError &&
    error.code === 'INTEGRATION_RECONNECT_REQUIRED'
  )
}

const getReconnectReasonFromError = (error: IntegrationServiceError) => {
  if (
    typeof error.details === 'object' &&
    error.details &&
    'reason' in error.details &&
    typeof (error.details as Record<string, unknown>).reason === 'string'
  ) {
    return (error.details as Record<string, unknown>).reason as string
  }
  return 'token_refresh_failed'
}

const toIsoTimestamp = (value: unknown): string | null => {
  if (typeof value !== 'string' || !value.trim()) {
    return null
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }
  return parsed.toISOString()
}

const normalizeGoogleCalendarEventStatus = (
  value?: string,
): GoogleCalendarProjectionEventView['status'] => {
  if (value === 'tentative') {
    return 'tentative'
  }
  if (value === 'cancelled') {
    return 'cancelled'
  }
  return 'confirmed'
}

const parseProjectedGoogleCalendarEvent = (
  value: unknown,
): GoogleCalendarProjectionEventView | null => {
  if (!isObject(value)) {
    return null
  }

  const id = typeof value.id === 'string' ? value.id.trim() : ''
  const startTime = toIsoTimestamp(value.startTime)
  const endTime = toIsoTimestamp(value.endTime)

  if (!id || !startTime || !endTime) {
    return null
  }

  return {
    id,
    title:
      typeof value.title === 'string' && value.title.trim()
        ? value.title
        : 'Google Calendar event',
    startTime,
    endTime,
    status: normalizeGoogleCalendarEventStatus(
      typeof value.status === 'string' ? value.status : undefined,
    ),
    description:
      typeof value.description === 'string' ? value.description : undefined,
    location: typeof value.location === 'string' ? value.location : undefined,
    htmlLink: typeof value.htmlLink === 'string' ? value.htmlLink : undefined,
    organizerEmail:
      typeof value.organizerEmail === 'string'
        ? value.organizerEmail
        : undefined,
    source: 'google-calendar',
    updatedAt:
      typeof value.updatedAt === 'string' ? value.updatedAt : undefined,
  }
}

const parseProjectedGoogleCalendarEvents = (
  config: Record<string, unknown>,
): GoogleCalendarProjectionEventView[] => {
  const events = config.calendarEvents
  if (!Array.isArray(events)) {
    return []
  }

  return events
    .map(parseProjectedGoogleCalendarEvent)
    .filter(
      (event): event is GoogleCalendarProjectionEventView => Boolean(event),
    )
}

const mergeProjectedGoogleCalendarEvents = (
  existingEvents: GoogleCalendarProjectionEventView[],
  incomingRecords: ProviderJobRecord[],
) => {
  const byId = new Map(existingEvents.map((event) => [event.id, event]))
  let recordsProcessed = 0

  for (const record of incomingRecords) {
    const id = record.externalId?.trim()
    if (!id) {
      continue
    }

    const status = normalizeGoogleCalendarEventStatus(record.status)
    if (status === 'cancelled') {
      byId.delete(id)
      recordsProcessed += 1
      continue
    }

    const startTime = toIsoTimestamp(record.startsAt)
    const endTime = toIsoTimestamp(record.endsAt || record.startsAt)
    if (!startTime || !endTime) {
      continue
    }

    const previous = byId.get(id)
    byId.set(id, {
      id,
      title: record.title || previous?.title || 'Google Calendar event',
      startTime,
      endTime,
      status,
      description: record.description || previous?.description,
      location: record.location || previous?.location,
      htmlLink: record.htmlLink || previous?.htmlLink,
      organizerEmail: record.organizerEmail || previous?.organizerEmail,
      source: 'google-calendar',
      updatedAt: record.updatedAt || previous?.updatedAt,
    })
    recordsProcessed += 1
  }

  const events = [...byId.values()]
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .slice(0, MAX_PROJECTED_GOOGLE_CALENDAR_EVENTS)

  return {
    events,
    recordsProcessed,
  }
}

const persistGoogleCalendarProjection = async (input: {
  integration: DBIntegration
  records: ProviderJobRecord[]
  cursor?: string | null
}) => {
  const currentConfig = toConfigRecord(input.integration.config)
  const merged = mergeProjectedGoogleCalendarEvents(
    parseProjectedGoogleCalendarEvents(currentConfig),
    input.records,
  )

  const nextConfig = clearReconnectRequiredConfig(currentConfig)
  nextConfig.calendarEvents = merged.events
  nextConfig.calendarLastSyncedAt = nowIso()
  if (input.cursor && input.cursor.trim()) {
    nextConfig.calendarSyncToken = input.cursor
  }

  const updated = await integrationRepository.updateIntegration(
    input.integration.id,
    {
      status: input.integration.status,
      lastSyncStatus: input.integration.lastSyncStatus,
      lastSyncMessage: input.integration.lastSyncMessage,
      lastSyncAt: input.integration.lastSyncAt,
      accessToken: input.integration.accessToken,
      refreshToken: input.integration.refreshToken,
      tokenExpiresAt: input.integration.tokenExpiresAt,
      scopes: input.integration.scopes,
      externalAccountId: input.integration.externalAccountId,
      config: nextConfig,
      createdByUserId: input.integration.createdByUserId,
      displayName: input.integration.displayName,
    },
  )

  return {
    integration: updated || input.integration,
    recordsProcessed: merged.recordsProcessed,
  }
}

const isTokenExpired = (value?: string | Date | null) => {
  const expiresAt = toDate(value)
  if (!expiresAt) {
    return false
  }
  return expiresAt.getTime() <= Date.now() + TOKEN_EXPIRY_SKEW_MS
}

const refreshTokenIfNeeded = async (
  integration: DBIntegration,
  provider: IntegrationProvider,
) => {
  if (!isTokenExpired(integration.tokenExpiresAt)) {
    return integration
  }

  const refreshToken = decryptSecret(integration.refreshToken)
  if (!refreshToken) {
    throw new IntegrationServiceError({
      status: 401,
      code: 'INTEGRATION_RECONNECT_REQUIRED',
      message: `Refresh token missing for ${provider}`,
      userMessage: `${getProviderDisplayName(provider)} credentials expired. Reconnect this integration to continue syncing.`,
      details: {
        provider,
        reason: 'refresh_token_missing',
      },
    })
  }

  const adapter = getIntegrationProviderAdapter(provider)
  let refreshed: Awaited<ReturnType<typeof adapter.refreshToken>>
  try {
    refreshed = await adapter.refreshToken({
      organizationId: integration.organizationId,
      refreshToken,
    })
  } catch (error) {
    throw new IntegrationServiceError({
      status: 401,
      code: 'INTEGRATION_RECONNECT_REQUIRED',
      message: getErrorMessage(error),
      userMessage: `${getProviderDisplayName(provider)} token refresh failed. Reconnect this integration and retry.`,
      details: {
        provider,
        reason: 'token_refresh_failed',
      },
    })
  }

  const updated = await integrationRepository.updateIntegration(
    integration.id,
    {
      accessToken: encryptSecret(refreshed.accessToken),
      refreshToken: encryptSecret(refreshed.refreshToken || refreshToken),
      tokenExpiresAt: refreshed.tokenExpiresAt || null,
      scopes: refreshed.scopes || integration.scopes,
      status: 'connected',
      lastSyncMessage: null,
      lastSyncStatus: integration.lastSyncStatus,
      externalAccountId:
        refreshed.externalAccountId || integration.externalAccountId || null,
      config: clearReconnectRequiredConfig(toConfigRecord(integration.config)),
      createdByUserId: integration.createdByUserId,
      displayName: integration.displayName,
      lastSyncAt: integration.lastSyncAt,
    },
  )

  return updated || integration
}

const normalizePhone = (phone?: string | null): string | null => {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (!digits) return null
  if (digits.length === 10) {
    return `+1${digits}`
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`
  }
  return `+${digits}`
}

const normalizeEmail = (email?: string): string | null => {
  if (!email) return null
  const cleaned = email.trim().toLowerCase()
  return cleaned || null
}

const mergeIntegrationCustomFields = (
  existing: unknown,
  provider: IntegrationProvider,
  externalId: string,
) => {
  const base = toConfigRecord(existing)
  const currentIntegration = toConfigRecord(base.integration)

  return {
    ...base,
    integration: {
      ...currentIntegration,
      provider,
      externalId,
      syncedAt: nowIso(),
    },
  }
}

const upsertCustomerLead = async (
  organizationId: string,
  provider: IntegrationProvider,
  customer: ProviderCustomerRecord,
): Promise<DBLead | null> => {
  const externalId = customer.externalId?.trim()
  if (!externalId) {
    return null
  }

  const email = normalizeEmail(customer.email)
  const normalizedPhone = normalizePhone(customer.phone)

  let existing =
    await leadRepository.findByOrganizationAndIntegrationExternalId(
      organizationId,
      provider,
      externalId,
    )

  if (!existing) {
    existing = await leadRepository.findByOrganizationAndContact(
      organizationId,
      {
        email,
        normalizedPhone,
      },
    )
  }

  const customFields = mergeIntegrationCustomFields(
    existing?.customFields,
    provider,
    externalId,
  )

  if (existing) {
    const updated = await leadRepository.update(existing.id, {
      firstName: customer.firstName || existing.firstName,
      lastName: customer.lastName || existing.lastName,
      email: email || existing.email,
      phone: customer.phone || existing.phone,
      normalizedPhone: normalizedPhone || existing.normalizedPhone,
      company: customer.company || existing.company,
      customFields,
    })
    return updated || existing
  }

  return leadRepository.create({
    organizationId,
    firstName: customer.firstName || null,
    lastName: customer.lastName || null,
    email,
    phone: customer.phone || null,
    normalizedPhone,
    company: customer.company || null,
    title: null,
    linkedInUrl: null,
    website: null,
    customFields,
    pipelineStageId: null,
    dealValue: null,
    updatedAt: new Date(),
  })
}

export const listIntegrations = async (
  organizationId: string,
): Promise<IntegrationConnectionView[]> => {
  const stored =
    await integrationRepository.listIntegrationsByOrganization(organizationId)
  const byProvider = new Map(
    stored.map((integration) => [
      integration.provider as IntegrationProvider,
      integration,
    ]),
  )

  return supportedIntegrationProviders.map((provider) =>
    toIntegrationView(organizationId, provider, byProvider.get(provider)),
  )
}

export const getIntegrationStatus = async (
  organizationId: string,
  provider: IntegrationProvider,
): Promise<IntegrationConnectionView> => {
  const integration = await getProviderIntegration(organizationId, provider)
  return toIntegrationView(organizationId, provider, integration)
}

export const connectIntegration = async (
  organizationId: string,
  provider: IntegrationProvider,
  userId: string,
  redirectUri?: string,
) => {
  const existing = await getProviderIntegration(organizationId, provider)
  const adapter = getIntegrationProviderAdapter(provider)
  const state = randomUUID()
  const authorizeUrl = adapter.buildAuthorizeUrl({
    organizationId,
    redirectUri,
    state,
  })
  const existingConfig = toConfigRecord(existing?.config)

  if (adapter.authMode === 'token') {
    const tokenSet = await adapter.exchangeCode({
      organizationId,
      code:
        typeof existingConfig.apiToken === 'string'
          ? existingConfig.apiToken
          : '',
      state,
      redirectUri,
    })
    const connected = await persistIntegration({
      organizationId,
      provider,
      existing: existing || undefined,
      status: 'connected',
      createdByUserId: userId,
      config: clearReconnectRequiredConfig(
        sanitizeConfigForView(existingConfig),
      ),
      accessToken: encryptSecret(tokenSet.accessToken),
      refreshToken: encryptSecret(tokenSet.refreshToken),
      tokenExpiresAt: tokenSet.tokenExpiresAt || null,
      scopes: tokenSet.scopes || null,
      externalAccountId: tokenSet.externalAccountId || null,
      lastSyncMessage: null,
      lastSyncStatus: existing?.lastSyncStatus || null,
      lastSyncAt: existing?.lastSyncAt ? toDate(existing.lastSyncAt) : null,
    })

    return {
      integration: toIntegrationView(organizationId, provider, connected),
      authorizeUrl,
    }
  }

  const pending = await persistIntegration({
    organizationId,
    provider,
    existing: existing || undefined,
    status: 'pending',
    createdByUserId: userId,
    config: {
      ...clearReconnectRequiredConfig(existingConfig),
      oauthState: state,
    },
    accessToken: existing?.accessToken || null,
    refreshToken: existing?.refreshToken || null,
    tokenExpiresAt: existing?.tokenExpiresAt
      ? toDate(existing.tokenExpiresAt)
      : null,
    scopes: existing?.scopes || null,
    externalAccountId: existing?.externalAccountId || null,
    lastSyncMessage: null,
    lastSyncStatus: existing?.lastSyncStatus || null,
    lastSyncAt: existing?.lastSyncAt ? toDate(existing.lastSyncAt) : null,
  })

  return {
    integration: toIntegrationView(organizationId, provider, pending),
    authorizeUrl,
  }
}

export const completeIntegrationCallback = async (
  organizationId: string,
  provider: IntegrationProvider,
  code?: string,
  state?: string,
) => {
  if (!code) {
    throw new IntegrationServiceError({
      status: 400,
      code: 'INTEGRATION_CALLBACK_MISSING_CODE',
      message: 'Authorization code is required',
      userMessage: 'Connection could not be completed. Please retry.',
    })
  }

  const existing = await getProviderIntegration(organizationId, provider)
  if (!existing) {
    throw new IntegrationServiceError({
      status: 404,
      code: 'INTEGRATION_NOT_FOUND',
      message: `${provider} integration not found`,
      userMessage: 'Start a new connection attempt and retry.',
    })
  }

  const adapter = getIntegrationProviderAdapter(provider)
  const existingConfig = toConfigRecord(existing.config)
  const expectedState =
    typeof existingConfig.oauthState === 'string'
      ? existingConfig.oauthState
      : undefined

  if (expectedState && state && expectedState !== state) {
    throw new IntegrationServiceError({
      status: 400,
      code: 'INTEGRATION_CALLBACK_STATE_MISMATCH',
      message: 'OAuth state mismatch',
      userMessage: 'Connection state expired. Please reconnect and try again.',
    })
  }

  try {
    const exchanged = await adapter.exchangeCode({
      organizationId,
      code,
      state,
    })

    const nextConfig = clearReconnectRequiredConfig({ ...existingConfig })
    delete nextConfig.oauthState

    const connected = await persistIntegration({
      organizationId,
      provider,
      existing,
      status: 'connected',
      createdByUserId: existing.createdByUserId,
      config: nextConfig,
      accessToken: encryptSecret(exchanged.accessToken),
      refreshToken: encryptSecret(exchanged.refreshToken),
      tokenExpiresAt: exchanged.tokenExpiresAt || null,
      scopes: exchanged.scopes || null,
      externalAccountId: exchanged.externalAccountId || null,
      lastSyncMessage: null,
      lastSyncStatus: existing.lastSyncStatus || null,
      lastSyncAt: existing.lastSyncAt ? toDate(existing.lastSyncAt) : null,
    })

    return toIntegrationView(organizationId, provider, connected)
  } catch (error) {
    const message = getErrorMessage(error)
    await persistIntegration({
      organizationId,
      provider,
      existing,
      status: 'error',
      createdByUserId: existing.createdByUserId,
      config: clearReconnectRequiredConfig(
        sanitizeConfigForView(existingConfig),
      ),
      accessToken: existing.accessToken,
      refreshToken: existing.refreshToken,
      tokenExpiresAt: existing.tokenExpiresAt
        ? toDate(existing.tokenExpiresAt)
        : null,
      scopes: existing.scopes,
      externalAccountId: existing.externalAccountId,
      lastSyncMessage: message,
      lastSyncStatus: 'failed',
      lastSyncAt: existing.lastSyncAt ? toDate(existing.lastSyncAt) : null,
    })

    throw new IntegrationServiceError({
      status: 400,
      code: 'INTEGRATION_CALLBACK_FAILED',
      message,
      userMessage: 'Connection failed while exchanging credentials.',
    })
  }
}

export const updateIntegrationConfig = async (
  organizationId: string,
  provider: IntegrationProvider,
  configPatch: Record<string, unknown>,
) => {
  const existing = await getProviderIntegration(organizationId, provider)
  const currentConfig = toConfigRecord(existing?.config)
  const nextConfig = {
    ...currentConfig,
    ...configPatch,
  }

  const persisted = await persistIntegration({
    organizationId,
    provider,
    existing: existing || undefined,
    status: existing
      ? resolveConnectionStatus(existing.status)
      : 'disconnected',
    createdByUserId: existing?.createdByUserId || null,
    config: nextConfig,
    accessToken: existing?.accessToken || null,
    refreshToken: existing?.refreshToken || null,
    tokenExpiresAt: existing?.tokenExpiresAt
      ? toDate(existing.tokenExpiresAt)
      : null,
    scopes: existing?.scopes || null,
    externalAccountId: existing?.externalAccountId || null,
    lastSyncMessage: existing?.lastSyncMessage || null,
    lastSyncStatus: existing?.lastSyncStatus || null,
    lastSyncAt: existing?.lastSyncAt ? toDate(existing.lastSyncAt) : null,
  })

  return toIntegrationView(organizationId, provider, persisted)
}

export const testIntegrationConnection = async (
  organizationId: string,
  provider: IntegrationProvider,
) => {
  let integration = await getProviderIntegration(organizationId, provider)
  if (!integration) {
    return {
      ok: false,
      message: `${provider} is not connected`,
      integration: toIntegrationView(organizationId, provider),
    }
  }

  try {
    integration = await refreshTokenIfNeeded(integration, provider)
  } catch (error) {
    if (isReconnectRequiredError(error)) {
      const persisted = await markReconnectRequiredIntegration({
        integration,
        provider,
        reason: getReconnectReasonFromError(error),
        message: error.userMessage,
      })

      return {
        ok: false,
        message: error.userMessage,
        integration: toIntegrationView(organizationId, provider, persisted),
      }
    }

    throw error
  }

  const adapter = getIntegrationProviderAdapter(provider)
  const connectionInput = buildProviderConnectionInput(integration)
  const result = await adapter.testConnection(connectionInput)

  const persisted = await persistIntegration({
    organizationId,
    provider,
    existing: integration,
    status: result.ok ? 'connected' : 'error',
    createdByUserId: integration.createdByUserId || null,
    config: result.ok
      ? clearReconnectRequiredConfig(toConfigRecord(integration.config))
      : toConfigRecord(integration.config),
    accessToken: integration.accessToken,
    refreshToken: integration.refreshToken,
    tokenExpiresAt: integration.tokenExpiresAt
      ? toDate(integration.tokenExpiresAt)
      : null,
    scopes: integration.scopes,
    externalAccountId: integration.externalAccountId,
    lastSyncMessage: result.ok ? null : result.message,
    lastSyncStatus: result.ok ? 'completed' : 'failed',
    lastSyncAt: integration.lastSyncAt ? toDate(integration.lastSyncAt) : null,
  })

  return {
    ok: result.ok,
    message: result.message,
    integration: toIntegrationView(organizationId, provider, persisted),
  }
}

export const disconnectIntegration = async (
  organizationId: string,
  provider: IntegrationProvider,
) => {
  const integration = await getProviderIntegration(organizationId, provider)
  if (!integration) {
    return toIntegrationView(organizationId, provider)
  }

  const config = clearReconnectRequiredConfig(
    toConfigRecord(integration.config),
  )
  delete config.oauthState

  const disconnected = await persistIntegration({
    organizationId,
    provider,
    existing: integration,
    status: 'disconnected',
    createdByUserId: integration.createdByUserId || null,
    config,
    accessToken: null,
    refreshToken: null,
    tokenExpiresAt: null,
    scopes: null,
    externalAccountId: null,
    lastSyncMessage: null,
    lastSyncStatus: null,
    lastSyncAt: integration.lastSyncAt ? toDate(integration.lastSyncAt) : null,
  })

  return toIntegrationView(organizationId, provider, disconnected)
}

export const startSyncJob = async (
  organizationId: string,
  provider: IntegrationProvider,
  direction: IntegrationSyncDirection,
) => {
  const integration = await ensureConnectedIntegration(organizationId, provider)
  const correlationId = randomUUID()
  const integrationConfig = toConfigRecord(integration.config)
  const persistedCursor =
    provider === GOOGLE_CALENDAR_PROVIDER &&
    typeof integrationConfig.calendarSyncToken === 'string' &&
    integrationConfig.calendarSyncToken.trim()
      ? integrationConfig.calendarSyncToken
      : null

  const queuedJob = await integrationRepository.createIntegrationSyncJob({
    integrationId: integration.id,
    organizationId,
    provider,
    jobType: direction,
    status: 'queued',
    startedAt: null,
    completedAt: null,
    lastCursor: persistedCursor,
    recordsSynced: 0,
    errorMessage: null,
    payload: {
      direction,
      requestedAt: nowIso(),
      correlationId,
      syncMode:
        persistedCursor && direction === 'pull' ? 'incremental' : 'backfill',
      ...(persistedCursor ? { lastCursor: persistedCursor } : {}),
    },
    updatedAt: new Date(),
  })

  await integrationRepository.createIntegrationSyncLog({
    integrationId: integration.id,
    syncJobId: queuedJob.id,
    organizationId,
    level: 'info',
    message: `Queued ${direction} sync for ${provider}`,
    metadata: { provider, direction, correlationId },
  })

  try {
    await enqueueQueueJob(
      QUEUE_NAMES.INTEGRATION_SYNC,
      getSyncJobName(provider, direction),
      {
        organizationId,
        integrationJobId: queuedJob.id,
        provider,
        direction,
        correlationId,
        idempotencyKey: `integration-sync:${queuedJob.id}`,
      },
    )
  } catch (error) {
    const message = getErrorMessage(error)
    await integrationRepository.updateIntegrationSyncJob(queuedJob.id, {
      status: 'failed',
      completedAt: new Date(),
      errorMessage: message,
      recordsSynced: 0,
      startedAt: null,
      lastCursor: null,
      payload: queuedJob.payload,
      provider,
      jobType: direction,
    })
    await integrationRepository.updateIntegration(integration.id, {
      status: 'error',
      lastSyncStatus: 'failed',
      lastSyncMessage: message,
      lastSyncAt: integration.lastSyncAt,
      accessToken: integration.accessToken,
      refreshToken: integration.refreshToken,
      tokenExpiresAt: integration.tokenExpiresAt,
      scopes: integration.scopes,
      externalAccountId: integration.externalAccountId,
      config: integration.config,
      createdByUserId: integration.createdByUserId,
      displayName: integration.displayName,
    })
    await integrationRepository.createIntegrationSyncLog({
      integrationId: integration.id,
      syncJobId: queuedJob.id,
      organizationId,
      level: 'error',
      message: `Failed to enqueue ${direction} sync for ${provider}: ${message}`,
      metadata: { provider, direction, correlationId },
    })
    throw new IntegrationServiceError({
      status: 500,
      code: 'INTEGRATION_SYNC_ENQUEUE_FAILED',
      message,
      userMessage: 'Unable to enqueue sync job. Please retry.',
    })
  }

  return toSyncJobView(queuedJob)
}

export const listSyncJobs = async (
  organizationId: string,
  provider: IntegrationProvider,
) => {
  const integration = await getProviderIntegration(organizationId, provider)
  if (!integration) {
    return []
  }

  const jobs = await integrationRepository.listIntegrationSyncJobs(
    organizationId,
    {
      integrationId: integration.id,
      provider,
      limit: 100,
    },
  )

  return jobs.map(toSyncJobView)
}

export const getSyncJob = async (
  organizationId: string,
  provider: IntegrationProvider,
  jobId: string,
) => {
  const integration = await getProviderIntegration(organizationId, provider)
  if (!integration) {
    return null
  }

  const job = await integrationRepository.findIntegrationSyncJobById(jobId)
  if (!job) {
    return null
  }

  if (
    job.organizationId !== organizationId ||
    job.integrationId !== integration.id ||
    job.provider !== provider
  ) {
    return null
  }

  return toSyncJobView(job)
}

export const processQueuedIntegrationSyncJob = async (
  payload: IntegrationSyncQueuePayload,
) => {
  const syncJob = await integrationRepository.findIntegrationSyncJobById(
    payload.integrationJobId,
  )

  if (!syncJob) {
    throw new Error(
      `Integration sync job ${payload.integrationJobId} not found`,
    )
  }

  const integration = await integrationRepository.findIntegrationById(
    syncJob.integrationId,
  )

  if (!integration) {
    throw new Error(
      `Integration ${syncJob.integrationId} not found for sync job ${syncJob.id}`,
    )
  }

  const provider = integration.provider as IntegrationProvider
  const direction = resolveSyncDirection(syncJob)
  const correlationId = payload.correlationId || syncJob.id
  const adapter = getIntegrationProviderAdapter(provider)

  await integrationRepository.updateIntegrationSyncJob(syncJob.id, {
    status: 'running',
    startedAt: new Date(),
    completedAt: null,
    recordsSynced: 0,
    errorMessage: null,
    lastCursor: syncJob.lastCursor,
    payload: {
      ...toConfigRecord(syncJob.payload),
      correlationId,
      direction,
    },
    provider,
    jobType: direction,
  })

  await integrationRepository.createIntegrationSyncLog({
    integrationId: integration.id,
    syncJobId: syncJob.id,
    organizationId: integration.organizationId,
    level: 'info',
    message: `Started ${direction} sync for ${provider}`,
    metadata: {
      correlationId,
      syncJobId: syncJob.id,
      provider,
      direction,
    },
  })

  let activeIntegration = integration
  let lastCursor =
    typeof syncJob.lastCursor === 'string' ? syncJob.lastCursor : null

  try {
    activeIntegration = await refreshTokenIfNeeded(activeIntegration, provider)
    const connectionInput = buildProviderConnectionInput(activeIntegration)
    let recordsProcessed = 0

    if (direction === 'pull') {
      const [customers, jobsOrAppointmentsResult] = await Promise.all([
        adapter.pullCustomers(connectionInput),
        adapter.pullJobsOrAppointments(connectionInput),
      ])
      const jobsOrAppointments = jobsOrAppointmentsResult.records

      if (jobsOrAppointmentsResult.cursor) {
        lastCursor = jobsOrAppointmentsResult.cursor
      }

      let upsertedLeads = 0
      for (const customer of customers) {
        const lead = await upsertCustomerLead(
          integration.organizationId,
          provider,
          customer,
        )
        if (lead) {
          upsertedLeads += 1
        }
      }

      if (provider === GOOGLE_CALENDAR_PROVIDER) {
        const projected = await persistGoogleCalendarProjection({
          integration: activeIntegration,
          records: jobsOrAppointments,
          cursor: jobsOrAppointmentsResult.cursor,
        })
        activeIntegration = projected.integration
        recordsProcessed = upsertedLeads + projected.recordsProcessed
      } else {
        recordsProcessed = upsertedLeads + jobsOrAppointments.length
      }
    } else {
      const [leadPush, appointmentPush] = await Promise.all([
        adapter.pushLead({
          ...connectionInput,
          lead: {
            syncJobId: syncJob.id,
          },
        }),
        adapter.pushAppointment({
          ...connectionInput,
          appointment: {
            syncJobId: syncJob.id,
          },
        }),
      ])

      recordsProcessed = [leadPush, appointmentPush].filter(
        (result) => result.ok,
      ).length
    }

    await integrationRepository.updateIntegrationSyncJob(syncJob.id, {
      status: 'completed',
      startedAt: toDate(syncJob.startedAt) || new Date(),
      completedAt: new Date(),
      recordsSynced: recordsProcessed,
      errorMessage: null,
      lastCursor,
      payload: {
        ...toConfigRecord(syncJob.payload),
        correlationId,
        direction,
        lastCursor,
      },
      provider,
      jobType: direction,
    })

    await integrationRepository.updateIntegration(activeIntegration.id, {
      status: 'connected',
      lastSyncStatus: 'completed',
      lastSyncMessage: null,
      lastSyncAt: new Date(),
      accessToken: activeIntegration.accessToken,
      refreshToken: activeIntegration.refreshToken,
      tokenExpiresAt: activeIntegration.tokenExpiresAt,
      scopes: activeIntegration.scopes,
      externalAccountId: activeIntegration.externalAccountId,
      config: clearReconnectRequiredConfig(
        toConfigRecord(activeIntegration.config),
      ),
      createdByUserId: activeIntegration.createdByUserId,
      displayName: activeIntegration.displayName,
    })

    await integrationRepository.createIntegrationSyncLog({
      integrationId: integration.id,
      syncJobId: syncJob.id,
      organizationId: integration.organizationId,
      level: 'info',
      message: `Completed ${direction} sync for ${provider}`,
      metadata: {
        correlationId,
        syncJobId: syncJob.id,
        provider,
        direction,
        recordsProcessed,
      },
    })

    logger.info(
      {
        provider,
        direction,
        syncJobId: syncJob.id,
        recordsProcessed,
        correlationId,
      },
      'Integration sync job completed',
    )

    return {
      processed: true,
      syncJobId: syncJob.id,
      direction,
      recordsProcessed,
      correlationId,
    }
  } catch (error) {
    const errorMessage = getErrorMessage(error)
    const reconnectRequired = isReconnectRequiredError(error)

    await integrationRepository.updateIntegrationSyncJob(syncJob.id, {
      status: 'failed',
      startedAt: toDate(syncJob.startedAt) || new Date(),
      completedAt: new Date(),
      recordsSynced: syncJob.recordsSynced || 0,
      errorMessage,
      lastCursor,
      payload: {
        ...toConfigRecord(syncJob.payload),
        correlationId,
        direction,
        lastCursor,
      },
      provider,
      jobType: direction,
    })

    if (isReconnectRequiredError(error)) {
      activeIntegration = await markReconnectRequiredIntegration({
        integration: activeIntegration,
        provider,
        reason: getReconnectReasonFromError(error),
        message: error.userMessage,
      })
    } else {
      activeIntegration =
        (await integrationRepository.updateIntegration(activeIntegration.id, {
          status: 'error',
          lastSyncStatus: 'failed',
          lastSyncMessage: errorMessage,
          lastSyncAt: activeIntegration.lastSyncAt,
          accessToken: activeIntegration.accessToken,
          refreshToken: activeIntegration.refreshToken,
          tokenExpiresAt: activeIntegration.tokenExpiresAt,
          scopes: activeIntegration.scopes,
          externalAccountId: activeIntegration.externalAccountId,
          config: toConfigRecord(activeIntegration.config),
          createdByUserId: activeIntegration.createdByUserId,
          displayName: activeIntegration.displayName,
        })) || activeIntegration
    }

    await integrationRepository.createIntegrationSyncLog({
      integrationId: integration.id,
      syncJobId: syncJob.id,
      organizationId: integration.organizationId,
      level: 'error',
      message: `Failed ${direction} sync for ${provider}: ${errorMessage}`,
      metadata: {
        correlationId,
        syncJobId: syncJob.id,
        provider,
        direction,
        reconnectRequired,
      },
    })

    logger.error(
      {
        provider,
        direction,
        syncJobId: syncJob.id,
        correlationId,
        error,
      },
      'Integration sync job failed',
    )

    throw error
  }
}
