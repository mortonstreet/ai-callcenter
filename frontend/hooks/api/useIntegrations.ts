import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { del, get, patch, post } from '@/lib/api'
import { QUERY_KEYS } from '@/lib/config'
import { useEffectiveOrganization } from '@/lib/admin-store'

export type IntegrationProvider =
  | 'jobber'
  | 'workiz'
  | 'servicetitan'
  | 'google-calendar'
export type IntegrationConnectionStatus =
  | 'connected'
  | 'disconnected'
  | 'pending'
  | 'error'
export type IntegrationSyncDirection = 'pull' | 'push'
export type IntegrationSyncStatus = 'queued' | 'running' | 'completed' | 'failed'

export interface IntegrationConnection {
  organizationId: string
  provider: IntegrationProvider
  status: IntegrationConnectionStatus
  connectedById: string | null
  connectedAt: string | null
  updatedAt: string
  lastSyncAt: string | null
  lastError: string | null
  config: Record<string, unknown>
}

export interface IntegrationSyncJob {
  id: string
  organizationId: string
  provider: IntegrationProvider
  direction: IntegrationSyncDirection
  status: IntegrationSyncStatus
  recordsProcessed: number
  errorSummary: string | null
  createdAt: string
  startedAt: string | null
  completedAt: string | null
}

const withOrgQuery = (path: string, organizationId: string) => {
  const params = new URLSearchParams({ organizationId })
  return `${path}?${params.toString()}`
}

export function useIntegrations() {
  const activeOrganization = useEffectiveOrganization()
  const organizationId = activeOrganization?.data?.id

  return useQuery<{ data: IntegrationConnection[] }>({
    queryKey: QUERY_KEYS.integrations(organizationId),
    queryFn: async () => {
      if (!organizationId) throw new Error('No active organization')
      return get(withOrgQuery('/integrations', organizationId))
    },
    enabled: Boolean(organizationId),
  })
}

export function useIntegrationStatus(provider: IntegrationProvider) {
  const activeOrganization = useEffectiveOrganization()
  const organizationId = activeOrganization?.data?.id

  return useQuery<{ data: IntegrationConnection }>({
    queryKey: QUERY_KEYS.integrationStatus(organizationId, provider),
    queryFn: async () => {
      if (!organizationId) throw new Error('No active organization')
      return get(withOrgQuery(`/integrations/${provider}/status`, organizationId))
    },
    enabled: Boolean(organizationId && provider),
  })
}

export function useConnectIntegration(provider: IntegrationProvider) {
  const queryClient = useQueryClient()
  const activeOrganization = useEffectiveOrganization()
  const organizationId = activeOrganization?.data?.id

  return useMutation<
    { data: IntegrationConnection; authorizeUrl: string },
    Error,
    { redirectUri?: string }
  >({
    mutationFn: async (input) => {
      if (!organizationId) throw new Error('No active organization')
      return post(`/integrations/${provider}/connect`, {
        organizationId,
        redirectUri: input.redirectUri,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.integrations(organizationId) })
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.integrationStatus(organizationId, provider),
      })
    },
  })
}

export function useUpdateIntegrationConfig(provider: IntegrationProvider) {
  const queryClient = useQueryClient()
  const activeOrganization = useEffectiveOrganization()
  const organizationId = activeOrganization?.data?.id

  return useMutation<
    { data: IntegrationConnection },
    Error,
    { config: Record<string, unknown> }
  >({
    mutationFn: async ({ config }) => {
      if (!organizationId) throw new Error('No active organization')
      return patch(`/integrations/${provider}/config`, {
        organizationId,
        config,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.integrations(organizationId) })
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.integrationStatus(organizationId, provider),
      })
    },
  })
}

export function useTestIntegration(provider: IntegrationProvider) {
  const activeOrganization = useEffectiveOrganization()
  const organizationId = activeOrganization?.data?.id

  return useMutation<
    { data: IntegrationConnection; result: { ok: boolean; message: string } },
    Error,
    void
  >({
    mutationFn: async () => {
      if (!organizationId) throw new Error('No active organization')
      return post(`/integrations/${provider}/test`, {
        organizationId,
      })
    },
  })
}

export function useDisconnectIntegration(provider: IntegrationProvider) {
  const queryClient = useQueryClient()
  const activeOrganization = useEffectiveOrganization()
  const organizationId = activeOrganization?.data?.id

  return useMutation<{ data: IntegrationConnection }, Error, void>({
    mutationFn: async () => {
      if (!organizationId) throw new Error('No active organization')
      return del(withOrgQuery(`/integrations/${provider}`, organizationId))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.integrations(organizationId) })
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.integrationStatus(organizationId, provider),
      })
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.integrationSyncJobs(organizationId, provider),
      })
    },
  })
}

export function useIntegrationSyncJobs(provider: IntegrationProvider) {
  const activeOrganization = useEffectiveOrganization()
  const organizationId = activeOrganization?.data?.id

  return useQuery<{ data: IntegrationSyncJob[] }>({
    queryKey: QUERY_KEYS.integrationSyncJobs(organizationId, provider),
    queryFn: async () => {
      if (!organizationId) throw new Error('No active organization')
      return get(
        withOrgQuery(`/integrations/${provider}/sync/jobs`, organizationId),
      )
    },
    enabled: Boolean(organizationId && provider),
  })
}

export function useStartPullSync(provider: IntegrationProvider) {
  const queryClient = useQueryClient()
  const activeOrganization = useEffectiveOrganization()
  const organizationId = activeOrganization?.data?.id

  return useMutation<{ data: IntegrationSyncJob }, Error, void>({
    mutationFn: async () => {
      if (!organizationId) throw new Error('No active organization')
      return post(`/integrations/${provider}/sync/pull`, {
        organizationId,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.integrationSyncJobs(organizationId, provider),
      })
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.integrationStatus(organizationId, provider),
      })
    },
  })
}

export function useStartPushSync(provider: IntegrationProvider) {
  const queryClient = useQueryClient()
  const activeOrganization = useEffectiveOrganization()
  const organizationId = activeOrganization?.data?.id

  return useMutation<{ data: IntegrationSyncJob }, Error, void>({
    mutationFn: async () => {
      if (!organizationId) throw new Error('No active organization')
      return post(`/integrations/${provider}/sync/push`, {
        organizationId,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.integrationSyncJobs(organizationId, provider),
      })
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.integrationStatus(organizationId, provider),
      })
    },
  })
}
