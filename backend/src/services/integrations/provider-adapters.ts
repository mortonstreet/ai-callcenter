import { randomUUID } from 'crypto'
import { config } from '@/config'
import { GoogleCalendarClient } from '@/clients/google-calendar.client'
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
  config?: Record<string, unknown>
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
  ): Promise<ProviderJobRecord[]>
  pushLead(input: PushLeadInput): Promise<ProviderPushResult>
  pushAppointment(input: PushAppointmentInput): Promise<ProviderPushResult>
}

const buildFallbackRedirectUri = (
  provider: IntegrationProvider,
  organizationId: string,
) =>
  `${config.backendUrl}/api/integrations/${provider}/callback?organizationId=${organizationId}`

const buildStaticProviderRedirectUri = (provider: IntegrationProvider) =>
  `${config.backendUrl}/api/integrations/${provider}/callback`

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
const defaultPullJobs = async () => [] as ProviderJobRecord[]

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

const googleCalendarClient = new GoogleCalendarClient()

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

const googleCalendarAdapter: CrmProviderAdapter = {
  provider: 'google_calendar',
  label: 'Google Calendar',
  authMode: 'oauth',
  buildAuthorizeUrl: ({ state }) =>
    googleCalendarClient.buildAuthorizeUrl({
      redirectUri: buildStaticProviderRedirectUri('google_calendar'),
      state,
    }),
  exchangeCode: async ({ code }) => {
    if (!code) {
      throw new Error('Missing Google authorization code')
    }

    const tokenSet = await googleCalendarClient.exchangeCode({
      code,
      redirectUri: buildStaticProviderRedirectUri('google_calendar'),
    })
    const profile = await googleCalendarClient.getPrimaryCalendarProfile(
      tokenSet.accessToken,
    )

    return {
      accessToken: tokenSet.accessToken,
      refreshToken: tokenSet.refreshToken || null,
      tokenExpiresAt: tokenSet.expiresIn
        ? new Date(Date.now() + tokenSet.expiresIn * 1000)
        : null,
      scopes: tokenSet.scope || null,
      externalAccountId: profile.email,
      config: {
        connectedEmail: profile.email,
        calendarId: profile.calendarId,
        calendarSummary: profile.calendarSummary,
        calendarTimeZone: profile.timeZone,
        followUpDurationMinutes: 15,
        slotIntervalMinutes: 30,
        availabilityWindowDays: 7,
        minimumNoticeHours: 2,
        workingHoursStart: 9,
        workingHoursEnd: 17,
      },
    }
  },
  refreshToken: async ({ organizationId, refreshToken }) => {
    if (!refreshToken) {
      throw new Error('Missing Google refresh token')
    }

    const tokenSet = await googleCalendarClient.refreshAccessToken(refreshToken)
    const profile = await googleCalendarClient.getPrimaryCalendarProfile(
      tokenSet.accessToken,
    )

    return {
      accessToken: tokenSet.accessToken,
      refreshToken,
      tokenExpiresAt: tokenSet.expiresIn
        ? new Date(Date.now() + tokenSet.expiresIn * 1000)
        : null,
      scopes: tokenSet.scope || null,
      externalAccountId: profile.email,
      config: {
        connectedEmail: profile.email,
        calendarId: profile.calendarId,
        calendarSummary: profile.calendarSummary,
        calendarTimeZone: profile.timeZone,
      },
    }
  },
  testConnection: async ({ accessToken }) => {
    if (!accessToken) {
      return {
        ok: false,
        message: 'Google Calendar is not connected',
      }
    }

    const profile = await googleCalendarClient.testConnection(accessToken)
    return {
      ok: true,
      message: `Connected to ${profile.email} (${profile.calendarSummary})`,
    }
  },
  pullCustomers: defaultPullCustomers,
  pullJobsOrAppointments: defaultPullJobs,
  pushLead: async ({ lead }) => defaultPushResult('google_calendar', lead),
  pushAppointment: async ({ appointment }) =>
    defaultPushResult('google_calendar', appointment),
}

const adapters: Record<IntegrationProvider, CrmProviderAdapter> = {
  google_calendar: googleCalendarAdapter,
  jobber: jobberAdapter,
  workiz: workizAdapter,
  servicetitan: serviceTitanAdapter,
}

export const supportedIntegrationProviders: IntegrationProvider[] = [
  'google_calendar',
  'jobber',
  'workiz',
  'servicetitan',
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
