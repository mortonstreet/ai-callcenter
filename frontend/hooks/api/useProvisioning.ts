import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { get, post } from '@/lib/api'
import { QUERY_KEYS } from '@/lib/config'
import { useEffectiveOrganization } from '@/lib/admin-store'
import {
  ProvisioningStatusResponse,
  ProvisioningStepsResponse,
} from '@/lib/shared-types'
import { toast } from 'sonner'

const POLLABLE_STATUSES = new Set(['queued', 'running', 'retrying'])

export function useLatestProvisioningByAgent(agentId?: string) {
  const activeOrganization = useEffectiveOrganization()

  return useQuery<ProvisioningStatusResponse>({
    queryKey: QUERY_KEYS.provisioningLatest(
      activeOrganization?.data?.id,
      agentId,
    ),
    queryFn: async () => {
      if (!agentId) {
        throw new Error('Agent ID is required')
      }
      return await get<ProvisioningStatusResponse>(
        `/provisioning/agent/${agentId}/latest`,
      )
    },
    enabled: Boolean(activeOrganization?.data?.id && agentId),
  })
}

export function useProvisioningStatus(jobId?: string) {
  const activeOrganization = useEffectiveOrganization()

  return useQuery<ProvisioningStatusResponse>({
    queryKey: QUERY_KEYS.provisioningJob(jobId),
    queryFn: async () => {
      if (!jobId) {
        throw new Error('Provisioning job ID is required')
      }
      return await get<ProvisioningStatusResponse>(`/provisioning/${jobId}`)
    },
    enabled: Boolean(activeOrganization?.data?.id && jobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status && POLLABLE_STATUSES.has(status) ? 5000 : false
    },
  })
}

export function useProvisioningSteps(jobId?: string) {
  const activeOrganization = useEffectiveOrganization()

  return useQuery<ProvisioningStepsResponse>({
    queryKey: QUERY_KEYS.provisioningSteps(jobId),
    queryFn: async () => {
      if (!jobId) {
        throw new Error('Provisioning job ID is required')
      }
      return await get<ProvisioningStepsResponse>(
        `/provisioning/${jobId}/steps`,
      )
    },
    enabled: Boolean(activeOrganization?.data?.id && jobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status && POLLABLE_STATUSES.has(status) ? 5000 : false
    },
  })
}

export function useRetryProvisioningJob(jobId?: string) {
  const activeOrganization = useEffectiveOrganization()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (note?: string) => {
      if (!jobId) {
        throw new Error('Provisioning job ID is required')
      }
      return await post<ProvisioningStatusResponse>(
        `/provisioning/${jobId}/retry`,
        note ? { note } : undefined,
      )
    },
    onSuccess: (response) => {
      if (response?.agentId) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.provisioningLatest(
            activeOrganization?.data?.id,
            response.agentId,
          ),
        })
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.agent(
            activeOrganization?.data?.id,
            response.agentId,
          ),
        })
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.agents(activeOrganization?.data?.id),
        })
        queryClient.invalidateQueries({
          queryKey: [
            'agent-health',
            activeOrganization?.data?.id,
            response.agentId,
          ],
        })
      }
      if (response?.jobId) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.provisioningJob(response.jobId),
        })
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.provisioningSteps(response.jobId),
        })
      }
      toast.success('Provisioning retry queued')
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to queue provisioning retry'
      toast.error(message)
    },
  })
}
