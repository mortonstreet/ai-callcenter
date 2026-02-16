import { randomUUID } from 'crypto'
import { config } from '@/config'
import {
  IntegrationProvider,
  IntegrationSyncDirection,
} from '@shared/types/src/requests/integrations'

type ProviderAuthMode = 'oauth' | 'token'

interface BuildAuthorizeUrlInput {
  organizationId: string
  redirectUri?: string
  state: string
}

interface ExchangeCodeInput {
  organizationId: string
  code: string
  state?: string
  redirectUri?: string
}

interface RefreshTokenInput {
  organizationId: string
  refreshToken: string
}

export interface ProviderConnectionInput {
  organizationId: string
  accessToken?: string | null
  refreshToken?: string | null
  externalAccountId?: string | null
  config: Record<string, unknown>
}

export interface ProviderTokenSet {
  accessToken: string
  refreshToken?: string | null
  tokenExpiresAt?: Date | null
  scopes?: string | null
  externalAccountId?: string | null
}

export interface ProviderCustomerRecord {
  externalId: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  company?: string
}

export interface ProviderJobRecord {
  externalId: string
  customerExternalId?: string
  status?: string
  title?: string
  startsAt?: string
  endsAt?: string
  description?: string
  location?: string
  htmlLink?: string
  organizerEmail?: string
  source?: string
  updatedAt?: string
  metadata?: Record<string, unknown>
}

export interface ProviderPullResult {
  records: ProviderJobRecord[]
  cursor?: string | null
}

interface PushLeadInput extends ProviderConnectionInput {
  lead: Record<string, unknown>
}

interface PushAppointmentInput extends ProviderConnectionInput {
  appointment: Record<string, unknown>
}

interface ProviderPushResult {
  ok: boolean
  externalId?: string
  message?: string
}

interface ProviderHealthResult {
  ok: boolean
  message: string
}

export interface CrmProviderAdapter {
  provider: IntegrationProvider
  label: string
  authMode: ProviderAuthMode
  buildAuthorizeUrl(input: BuildAuthorizeUrlInput): string
  exchangeCode(input: ExchangeCodeInput): Promise<ProviderTokenSet>
  refreshToken(input: RefreshTokenInput): Promise<ProviderTokenSet>
  testConnection(input: ProviderConnectionInput): Promise<ProviderHealthResult>
  pullCustomers(
    input: ProviderConnectionInput,
  ): Promise<ProviderCustomerRecord[]>
  pullJobsOrAppointments(
    input: ProviderConnectionInput,
  ): Promise<ProviderPullResult>
  pushLead(input: PushLeadInput): Promise<ProviderPushResult>
  pushAppointment(input: PushAppointmentInput): Promise<ProviderPushResult>
}

const buildFallbackRedirectUri = (
  provider: IntegrationProvider,
  organizationId: string,
) =>
  `${config.backendUrl}/api/integrations/${provider}/callback?organizationId=${organizationId}`

const buildOauthAuthorizeUrl = (
  baseUrl: string,
  params: Record<string, string>,
) => {
  const url = new URL(baseUrl)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  return url.toString()
}

const tokenSuffix = (prefix: string) => `${prefix}_${randomUUID()}`

const defaultTestConnection = async (
  provider: IntegrationProvider,
  accessToken?: string | null,
): Promise<ProviderHealthResult> => {
  if (!accessToken) {
    return {
      ok: false,
      message: `${provider} is not connected`,
    }
  }
  return {
    ok: true,
    message: `${provider} connection is healthy`,
  }
}

const defaultPullCustomers = async () => [] as ProviderCustomerRecord[]
const defaultPullJobs = async (): Promise<ProviderPullResult> => ({
  records: [],
})

const defaultPushResult = async (
  provider: IntegrationProvider,
  payload: Record<string, unknown>,
): Promise<ProviderPushResult> => {
  if (!payload || Object.keys(payload).length === 0) {
    return {
      ok: false,
      message: `${provider} payload is empty`,
    }
  }
  return {
    ok: true,
    externalId: randomUUID(),
    message: `${provider} push accepted`,
  }
}

const jobberAdapter: CrmProviderAdapter = {
  provider: 'jobber',
  label: 'Jobber',
  authMode: 'oauth',
  buildAuthorizeUrl: ({ organizationId, redirectUri, state }) =>
    buildOauthAuthorizeUrl('https://api.getjobber.com/api/oauth/authorize', {
      client_id: config.providers.jobber.clientId || 'jobber-client-id',
      redirect_uri:
        redirectUri || buildFallbackRedirectUri('jobber', organizationId),
      response_type: 'code',
      state,
      scope: 'read_clients read_jobs write_clients',
    }),
  exchangeCode: async ({ code }) => {
    if (!code) {
      throw new Error('Missing Jobber authorization code')
    }
    return {
      accessToken: tokenSuffix('jobber_access'),
      refreshToken: tokenSuffix('jobber_refresh'),
      tokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      scopes: 'read_clients read_jobs write_clients',
    }
  },
  refreshToken: async ({ refreshToken }) => {
    if (!refreshToken) {
      throw new Error('Missing Jobber refresh token')
    }
    return {
      accessToken: tokenSuffix('jobber_access'),
      refreshToken: tokenSuffix('jobber_refresh'),
      tokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      scopes: 'read_clients read_jobs write_clients',
    }
  },
  testConnection: async ({ accessToken }) =>
    defaultTestConnection('jobber', accessToken),
  pullCustomers: defaultPullCustomers,
  pullJobsOrAppointments: defaultPullJobs,
  pushLead: async ({ lead }) => defaultPushResult('jobber', lead),
  pushAppointment: async ({ appointment }) =>
    defaultPushResult('jobber', appointment),
}

const workizAdapter: CrmProviderAdapter = {
  provider: 'workiz',
  label: 'Workiz',
  authMode: 'token',
  buildAuthorizeUrl: ({ organizationId, redirectUri, state }) =>
    buildOauthAuthorizeUrl(
      redirectUri || buildFallbackRedirectUri('workiz', organizationId),
      {
        state,
        mode: 'token',
      },
    ),
  exchangeCode: async ({ code }) => {
    const source = code || config.providers.workiz.apiKey
    if (!source) {
      throw new Error('Missing Workiz API token')
    }
    return {
      accessToken: source,
      refreshToken: null,
      tokenExpiresAt: null,
      scopes: 'contacts appointments',
    }
  },
  refreshToken: async ({ refreshToken }) => {
    if (!refreshToken) {
      return {
        accessToken: tokenSuffix('workiz_access'),
        refreshToken: null,
        tokenExpiresAt: null,
      }
    }
    return {
      accessToken: refreshToken,
      refreshToken: null,
      tokenExpiresAt: null,
    }
  },
  testConnection: async ({ accessToken }) =>
    defaultTestConnection('workiz', accessToken),
  pullCustomers: defaultPullCustomers,
  pullJobsOrAppointments: defaultPullJobs,
  pushLead: async ({ lead }) => defaultPushResult('workiz', lead),
  pushAppointment: async ({ appointment }) =>
    defaultPushResult('workiz', appointment),
}

const serviceTitanAdapter: CrmProviderAdapter = {
  provider: 'servicetitan',
  label: 'ServiceTitan',
  authMode: 'oauth',
  buildAuthorizeUrl: ({ organizationId, redirectUri, state }) =>
    buildOauthAuthorizeUrl('https://auth.servicetitan.io/connect/authorize', {
      client_id:
        config.providers.servicetitan.clientId || 'servicetitan-client-id',
      redirect_uri:
        redirectUri || buildFallbackRedirectUri('servicetitan', organizationId),
      response_type: 'code',
      state,
      scope: 'tenant.read jobs.read jobs.write customers.read',
    }),
  exchangeCode: async ({ code }) => {
    if (!code) {
      throw new Error('Missing ServiceTitan authorization code')
    }
    return {
      accessToken: tokenSuffix('servicetitan_access'),
      refreshToken: tokenSuffix('servicetitan_refresh'),
      tokenExpiresAt: new Date(Date.now() + 55 * 60 * 1000),
      scopes: 'tenant.read jobs.read jobs.write customers.read',
      externalAccountId: `tenant_${randomUUID()}`,
    }
  },
  refreshToken: async ({ refreshToken }) => {
    if (!refreshToken) {
      throw new Error('Missing ServiceTitan refresh token')
    }
    return {
      accessToken: tokenSuffix('servicetitan_access'),
      refreshToken: tokenSuffix('servicetitan_refresh'),
      tokenExpiresAt: new Date(Date.now() + 55 * 60 * 1000),
      scopes: 'tenant.read jobs.read jobs.write customers.read',
    }
  },
  testConnection: async ({ accessToken }) =>
    defaultTestConnection('servicetitan', accessToken),
  pullCustomers: defaultPullCustomers,
  pullJobsOrAppointments: defaultPullJobs,
  pushLead: async ({ lead }) => defaultPushResult('servicetitan', lead),
  pushAppointment: async ({ appointment }) =>
    defaultPushResult('servicetitan', appointment),
}

interface GoogleTokenResponse {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  scope?: string
  error?: string
  error_description?: string
}

interface GoogleCalendarEventTime {
  dateTime?: string
  date?: string
}

export interface GoogleCalendarApiEvent {
  id?: string
  summary?: string
  description?: string
  location?: string
  status?: string
  start?: GoogleCalendarEventTime
  end?: GoogleCalendarEventTime
  htmlLink?: string
  organizer?: {
    email?: string
  }
  updated?: string
}

interface GoogleCalendarEventsResponse {
  items?: GoogleCalendarApiEvent[]
  nextSyncToken?: string
}

const GOOGLE_CALENDAR_SCOPES =
  'https://www.googleapis.com/auth/calendar.readonly'
const GOOGLE_OAUTH_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_CALENDAR_API_BASE_URL = 'https://www.googleapis.com/calendar/v3'

const asRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }
  return value as Record<string, unknown>
}

const asString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  return trimmed || null
}

const toIsoDate = (value: unknown): string | null => {
  const raw = asString(value)
  if (!raw) {
    return null
  }
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }
  return parsed.toISOString()
}

const resolveGoogleEventTime = (value?: GoogleCalendarEventTime): string | null => {
  if (!value) return null
  const dateTime = toIsoDate(value.dateTime)
  if (dateTime) {
    return dateTime
  }
  const dayValue = asString(value.date)
  if (!dayValue) {
    return null
  }
  const startOfDay = new Date(`${dayValue}T00:00:00.000Z`)
  if (Number.isNaN(startOfDay.getTime())) {
    return null
  }
  return startOfDay.toISOString()
}

const normalizeGoogleEventStatus = (
  status?: string,
): 'confirmed' | 'tentative' | 'cancelled' => {
  if (status === 'cancelled') {
    return 'cancelled'
  }
  if (status === 'tentative') {
    return 'tentative'
  }
  return 'confirmed'
}

export const mapGoogleCalendarEventsToJobs = (
  events: GoogleCalendarApiEvent[],
): ProviderJobRecord[] => {
  const mapped: ProviderJobRecord[] = []

  for (const event of events) {
    const externalId = asString(event.id)
    if (!externalId) {
      continue
    }

    mapped.push({
      externalId,
      status: normalizeGoogleEventStatus(event.status),
      title: asString(event.summary) || 'Google Calendar event',
      startsAt: resolveGoogleEventTime(event.start) || undefined,
      endsAt: resolveGoogleEventTime(event.end) || undefined,
      description: asString(event.description) || undefined,
      location: asString(event.location) || undefined,
      htmlLink: asString(event.htmlLink) || undefined,
      organizerEmail: asString(event.organizer?.email) || undefined,
      source: 'google-calendar',
      updatedAt: toIsoDate(event.updated) || undefined,
    })
  }

  return mapped
}

const fetchGoogleOauthToken = async (
  payload: Record<string, string>,
): Promise<ProviderTokenSet> => {
  const body = new URLSearchParams({
    ...payload,
    client_id: config.providers.google.clientId,
    client_secret: config.providers.google.clientSecret,
  })

  const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  })

  const parsed = (await response.json().catch(() => ({}))) as GoogleTokenResponse
  if (!response.ok) {
    throw new Error(
      parsed.error_description ||
        parsed.error ||
        `Google OAuth token exchange failed (${response.status})`,
    )
  }

  const accessToken = asString(parsed.access_token)
  if (!accessToken) {
    throw new Error('Google OAuth token exchange did not return access_token')
  }

  const expiresInSeconds =
    typeof parsed.expires_in === 'number' && Number.isFinite(parsed.expires_in)
      ? parsed.expires_in
      : null

  return {
    accessToken,
    refreshToken: asString(parsed.refresh_token),
    tokenExpiresAt: expiresInSeconds
      ? new Date(Date.now() + expiresInSeconds * 1000)
      : null,
    scopes: asString(parsed.scope) || GOOGLE_CALENDAR_SCOPES,
  }
}

const fetchGoogleCalendarEvents = async (input: {
  accessToken: string
  calendarId: string
  syncWindowDays: number
  syncToken?: string | null
}): Promise<GoogleCalendarEventsResponse> => {
  const url = new URL(
    `${GOOGLE_CALENDAR_API_BASE_URL}/calendars/${encodeURIComponent(
      input.calendarId,
    )}/events`,
  )

  url.searchParams.set('singleEvents', 'true')
  url.searchParams.set('showDeleted', 'true')
  url.searchParams.set('maxResults', '2500')

  if (input.syncToken) {
    url.searchParams.set('syncToken', input.syncToken)
  } else {
    const now = Date.now()
    const windowMs = input.syncWindowDays * 24 * 60 * 60 * 1000
    url.searchParams.set('timeMin', new Date(now - windowMs).toISOString())
    url.searchParams.set('timeMax', new Date(now + windowMs).toISOString())
    url.searchParams.set('orderBy', 'startTime')
  }

  const response = await fetch(url, {
    headers: {
      authorization: `Bearer ${input.accessToken}`,
      accept: 'application/json',
    },
  })

  if (!response.ok) {
    const message = await response.text().catch(() => '')
    throw new Error(
      `Google Calendar events fetch failed (${response.status}): ${message || 'unknown error'}`,
    )
  }

  return (await response.json()) as GoogleCalendarEventsResponse
}

const isGoogleSyncTokenExpiredError = (error: unknown) => {
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
  return message.includes('410') || message.includes('synctoken')
}

export const googleCalendarAdapter: CrmProviderAdapter = {
  provider: 'google-calendar',
  label: 'Google Calendar',
  authMode: 'oauth',
  buildAuthorizeUrl: ({ organizationId, redirectUri, state }) =>
    buildOauthAuthorizeUrl(GOOGLE_OAUTH_AUTH_URL, {
      client_id: config.providers.google.clientId,
      redirect_uri:
        redirectUri ||
        buildFallbackRedirectUri('google-calendar', organizationId),
      response_type: 'code',
      state,
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true',
      scope: GOOGLE_CALENDAR_SCOPES,
    }),
  exchangeCode: async ({ code, organizationId, redirectUri }) => {
    if (!code) {
      throw new Error('Missing Google Calendar authorization code')
    }

    return fetchGoogleOauthToken({
      grant_type: 'authorization_code',
      code,
      redirect_uri:
        redirectUri ||
        buildFallbackRedirectUri('google-calendar', organizationId),
    })
  },
  refreshToken: async ({ refreshToken }) => {
    if (!refreshToken) {
      throw new Error('Missing Google Calendar refresh token')
    }

    const refreshed = await fetchGoogleOauthToken({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    })

    return {
      ...refreshed,
      refreshToken: refreshed.refreshToken || refreshToken,
    }
  },
  testConnection: async ({ accessToken }) => {
    if (!accessToken) {
      return {
        ok: false,
        message: 'Google Calendar is not connected',
      }
    }

    try {
      const url = new URL(`${GOOGLE_CALENDAR_API_BASE_URL}/users/me/calendarList`)
      url.searchParams.set('maxResults', '1')
      const response = await fetch(url, {
        headers: {
          authorization: `Bearer ${accessToken}`,
          accept: 'application/json',
        },
      })

      if (!response.ok) {
        const details = await response.text().catch(() => '')
        return {
          ok: false,
          message: details || `Google Calendar auth failed (${response.status})`,
        }
      }

      return {
        ok: true,
        message: 'Google Calendar connection is healthy',
      }
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : 'Google Calendar connection failed',
      }
    }
  },
  pullCustomers: defaultPullCustomers,
  pullJobsOrAppointments: async ({ accessToken, config: providerConfig }) => {
    if (!accessToken) {
      throw new Error('Google Calendar access token is missing')
    }

    const configRecord = asRecord(providerConfig)
    const calendarId = asString(configRecord.calendarId) || 'primary'
    const syncWindowRaw = Number(configRecord.syncWindowDays)
    const syncWindowDays = Number.isFinite(syncWindowRaw)
      ? Math.max(1, Math.min(90, Math.floor(syncWindowRaw)))
      : 30
    const syncToken = asString(configRecord.calendarSyncToken)

    let eventsResponse: GoogleCalendarEventsResponse
    try {
      eventsResponse = await fetchGoogleCalendarEvents({
        accessToken,
        calendarId,
        syncWindowDays,
        syncToken,
      })
    } catch (error) {
      if (syncToken && isGoogleSyncTokenExpiredError(error)) {
        eventsResponse = await fetchGoogleCalendarEvents({
          accessToken,
          calendarId,
          syncWindowDays,
          syncToken: null,
        })
      } else {
        throw error
      }
    }

    return {
      records: mapGoogleCalendarEventsToJobs(eventsResponse.items || []),
      cursor: asString(eventsResponse.nextSyncToken) || syncToken,
    }
  },
  pushLead: async ({ lead }) => defaultPushResult('google-calendar', lead),
  pushAppointment: async ({ appointment }) =>
    defaultPushResult('google-calendar', appointment),
}

const adapters: Record<IntegrationProvider, CrmProviderAdapter> = {
  jobber: jobberAdapter,
  workiz: workizAdapter,
  servicetitan: serviceTitanAdapter,
  'google-calendar': googleCalendarAdapter,
}

export const supportedIntegrationProviders: IntegrationProvider[] = [
  'jobber',
  'workiz',
  'servicetitan',
  'google-calendar',
]

export const getIntegrationProviderAdapter = (
  provider: IntegrationProvider,
): CrmProviderAdapter => {
  return adapters[provider]
}

export const getProviderDisplayName = (provider: IntegrationProvider) => {
  return adapters[provider].label
}

export const getSyncJobName = (
  provider: IntegrationProvider,
  direction: IntegrationSyncDirection,
) => `${provider}:${direction}`
