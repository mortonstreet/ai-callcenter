import { randomUUID } from 'crypto'
import {
  IntegrationConnectionView,
  IntegrationProvider,
  IntegrationSyncDirection,
  IntegrationSyncJobView,
} from '@shared/types/src/requests/integrations'

const supportedProviders: IntegrationProvider[] = [
  'jobber',
  'workiz',
  'servicetitan',
]

const integrations = new Map<string, IntegrationConnectionView>()
const syncJobs = new Map<string, IntegrationSyncJobView>()

const integrationKey = (
  organizationId: string,
  provider: IntegrationProvider,
) => `${organizationId}:${provider}`

const nowIso = () => new Date().toISOString()

const createDefaultIntegration = (
  organizationId: string,
  provider: IntegrationProvider,
): IntegrationConnectionView => ({
  organizationId,
  provider,
  status: 'disconnected',
  connectedById: null,
  connectedAt: null,
  updatedAt: nowIso(),
  lastSyncAt: null,
  lastError: null,
  config: {},
})

const getOrCreateIntegration = (
  organizationId: string,
  provider: IntegrationProvider,
) => {
  const key = integrationKey(organizationId, provider)
  const existing = integrations.get(key)
  if (existing) {
    return existing
  }
  const created = createDefaultIntegration(organizationId, provider)
  integrations.set(key, created)
  return created
}

export const listIntegrations = (
  organizationId: string,
): IntegrationConnectionView[] => {
  return supportedProviders.map((provider) =>
    getOrCreateIntegration(organizationId, provider),
  )
}

export const getIntegrationStatus = (
  organizationId: string,
  provider: IntegrationProvider,
): IntegrationConnectionView => {
  return getOrCreateIntegration(organizationId, provider)
}

export const connectIntegration = (
  organizationId: string,
  provider: IntegrationProvider,
  userId: string,
  redirectUri?: string,
) => {
  const integration = getOrCreateIntegration(organizationId, provider)
  const now = nowIso()

  integration.status = 'connected'
  integration.connectedById = userId
  integration.connectedAt = integration.connectedAt || now
  integration.updatedAt = now
  integration.lastError = null

  integrations.set(integrationKey(organizationId, provider), integration)

  return {
    integration,
    authorizeUrl:
      redirectUri ||
      `/api/integrations/${provider}/callback?organizationId=${organizationId}&state=${randomUUID()}`,
  }
}

export const completeIntegrationCallback = (
  organizationId: string,
  provider: IntegrationProvider,
  hasCode: boolean,
) => {
  const integration = getOrCreateIntegration(organizationId, provider)
  integration.updatedAt = nowIso()
  integration.status = hasCode ? 'connected' : 'error'
  integration.lastError = hasCode ? null : 'Missing authorization code'
  integrations.set(integrationKey(organizationId, provider), integration)
  return integration
}

export const updateIntegrationConfig = (
  organizationId: string,
  provider: IntegrationProvider,
  config: Record<string, unknown>,
) => {
  const integration = getOrCreateIntegration(organizationId, provider)
  integration.config = {
    ...integration.config,
    ...config,
  }
  integration.updatedAt = nowIso()
  integrations.set(integrationKey(organizationId, provider), integration)
  return integration
}

export const testIntegrationConnection = (
  organizationId: string,
  provider: IntegrationProvider,
) => {
  const integration = getOrCreateIntegration(organizationId, provider)
  const ok = integration.status === 'connected'
  return {
    ok,
    message: ok
      ? `${provider} connection is healthy`
      : `${provider} is not connected`,
    integration,
  }
}

export const disconnectIntegration = (
  organizationId: string,
  provider: IntegrationProvider,
) => {
  const integration = getOrCreateIntegration(organizationId, provider)
  integration.status = 'disconnected'
  integration.connectedById = null
  integration.connectedAt = null
  integration.updatedAt = nowIso()
  integration.lastError = null
  integrations.set(integrationKey(organizationId, provider), integration)
  return integration
}

export const startSyncJob = (
  organizationId: string,
  provider: IntegrationProvider,
  direction: IntegrationSyncDirection,
) => {
  const integration = getOrCreateIntegration(organizationId, provider)
  const now = nowIso()

  const job: IntegrationSyncJobView = {
    id: randomUUID(),
    organizationId,
    provider,
    direction,
    status: 'completed',
    recordsProcessed: Math.floor(Math.random() * 50) + 1,
    errorSummary: null,
    createdAt: now,
    startedAt: now,
    completedAt: nowIso(),
  }

  syncJobs.set(job.id, job)

  integration.lastSyncAt = job.completedAt
  integration.updatedAt = nowIso()
  integration.status = 'connected'
  integration.lastError = null
  integrations.set(integrationKey(organizationId, provider), integration)

  return job
}

export const listSyncJobs = (
  organizationId: string,
  provider: IntegrationProvider,
) => {
  return Array.from(syncJobs.values())
    .filter(
      (job) =>
        job.organizationId === organizationId && job.provider === provider,
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export const getSyncJob = (
  organizationId: string,
  provider: IntegrationProvider,
  jobId: string,
) => {
  const job = syncJobs.get(jobId)
  if (!job) {
    return null
  }
  if (job.organizationId !== organizationId || job.provider !== provider) {
    return null
  }
  return job
}
