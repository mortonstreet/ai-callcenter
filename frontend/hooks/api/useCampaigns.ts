import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { del, get, patch, post } from '@/lib/api'
import { QUERY_KEYS } from '@/lib/config'
import { useEffectiveOrganization } from '@/lib/admin-store'

export type CampaignChannel = 'voice' | 'sms' | 'email'
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'failed'
export type CampaignEnrollmentStatus =
  | 'active'
  | 'paused'
  | 'completed'
  | 'replied'
  | 'unsubscribed'
  | 'failed'

export interface CampaignStep {
  id: string
  channel: CampaignChannel
  offsetMinutes: number
  template: string
  skipIfReplied: boolean
  skipIfBooked: boolean
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface Campaign {
  id: string
  organizationId: string
  name: string
  description: string | null
  status: CampaignStatus
  channels: CampaignChannel[]
  allowMemberEnrollment: boolean
  createdAt: string
  updatedAt: string
  activatedAt: string | null
  pausedAt: string | null
  steps: CampaignStep[]
}

export interface CampaignEnrollment {
  id: string
  leadId: string
  status: CampaignEnrollmentStatus
  source: 'manual' | 'list'
  sourceId: string | null
  contact: {
    name?: string
    phone?: string
    email?: string
  }
  createdAt: string
  updatedAt: string
}

export interface CampaignStats {
  campaignId: string
  organizationId: string
  totals: {
    enrollments: number
    activeEnrollments: number
    replied: number
    unsubscribed: number
    failed: number
  }
  channelMix: Record<CampaignChannel, number>
  updatedAt: string
}

export interface CampaignEvent {
  id: string
  campaignId: string
  organizationId: string
  type: string
  createdAt: string
  details: Record<string, unknown>
}

const withOrgQuery = (path: string, organizationId: string, extra?: Record<string, string>) => {
  const params = new URLSearchParams({ organizationId })
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value) {
        params.set(key, value)
      }
    }
  }
  return `${path}?${params.toString()}`
}

interface UseCampaignsOptions {
  status?: CampaignStatus
  channel?: CampaignChannel
}

export function useCampaigns(options: UseCampaignsOptions = {}) {
  const activeOrganization = useEffectiveOrganization()
  const organizationId = activeOrganization?.data?.id

  return useQuery<{ data: Campaign[] }>({
    queryKey: QUERY_KEYS.campaigns(organizationId, options.channel),
    queryFn: async () => {
      if (!organizationId) throw new Error('No active organization')
      return get(
        withOrgQuery('/campaigns', organizationId, {
          ...(options.status ? { status: options.status } : {}),
          ...(options.channel ? { channel: options.channel } : {}),
        }),
      )
    },
    enabled: Boolean(organizationId),
  })
}

export function useCampaign(campaignId: string) {
  const activeOrganization = useEffectiveOrganization()
  const organizationId = activeOrganization?.data?.id

  return useQuery<{ data: Campaign }>({
    queryKey: QUERY_KEYS.campaign(organizationId, campaignId),
    queryFn: async () => {
      if (!organizationId) throw new Error('No active organization')
      return get(withOrgQuery(`/campaigns/${campaignId}`, organizationId))
    },
    enabled: Boolean(organizationId && campaignId),
  })
}

export function useCreateCampaign() {
  const queryClient = useQueryClient()
  const activeOrganization = useEffectiveOrganization()
  const organizationId = activeOrganization?.data?.id

  return useMutation<
    { data: Campaign },
    Error,
    {
      name: string
      description?: string
      channels: CampaignChannel[]
      allowMemberEnrollment?: boolean
    }
  >({
    mutationFn: async (input) => {
      if (!organizationId) throw new Error('No active organization')
      return post('/campaigns', {
        organizationId,
        ...input,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.campaigns(organizationId) })
    },
  })
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient()
  const activeOrganization = useEffectiveOrganization()
  const organizationId = activeOrganization?.data?.id

  return useMutation<
    { data: Campaign },
    Error,
    {
      campaignId: string
      name?: string
      description?: string
      channels?: CampaignChannel[]
      allowMemberEnrollment?: boolean
    }
  >({
    mutationFn: async ({ campaignId, ...updates }) => {
      if (!organizationId) throw new Error('No active organization')
      return patch(`/campaigns/${campaignId}`, {
        organizationId,
        ...updates,
      })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.campaigns(organizationId) })
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.campaign(organizationId, variables.campaignId),
      })
    },
  })
}

export function useDeleteCampaign() {
  const queryClient = useQueryClient()
  const activeOrganization = useEffectiveOrganization()
  const organizationId = activeOrganization?.data?.id

  return useMutation<{ success: boolean; data: Campaign }, Error, string>({
    mutationFn: async (campaignId) => {
      if (!organizationId) throw new Error('No active organization')
      return del(withOrgQuery(`/campaigns/${campaignId}`, organizationId))
    },
    onSuccess: (_, campaignId) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.campaigns(organizationId) })
      queryClient.removeQueries({
        queryKey: QUERY_KEYS.campaign(organizationId, campaignId),
      })
    },
  })
}

export function useActivateCampaign() {
  const queryClient = useQueryClient()
  const activeOrganization = useEffectiveOrganization()
  const organizationId = activeOrganization?.data?.id

  return useMutation<{ data: Campaign }, Error, string>({
    mutationFn: async (campaignId) => {
      if (!organizationId) throw new Error('No active organization')
      return post(`/campaigns/${campaignId}/activate`, { organizationId })
    },
    onSuccess: (_, campaignId) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.campaigns(organizationId) })
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.campaign(organizationId, campaignId),
      })
    },
  })
}

export function usePauseCampaign() {
  const queryClient = useQueryClient()
  const activeOrganization = useEffectiveOrganization()
  const organizationId = activeOrganization?.data?.id

  return useMutation<{ data: Campaign }, Error, string>({
    mutationFn: async (campaignId) => {
      if (!organizationId) throw new Error('No active organization')
      return post(`/campaigns/${campaignId}/pause`, { organizationId })
    },
    onSuccess: (_, campaignId) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.campaigns(organizationId) })
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.campaign(organizationId, campaignId),
      })
    },
  })
}

export function useCreateCampaignStep() {
  const queryClient = useQueryClient()
  const activeOrganization = useEffectiveOrganization()
  const organizationId = activeOrganization?.data?.id

  return useMutation<
    { data: CampaignStep },
    Error,
    {
      campaignId: string
      channel: CampaignChannel
      offsetMinutes: number
      template: string
      skipIfReplied?: boolean
      skipIfBooked?: boolean
      metadata?: Record<string, unknown>
    }
  >({
    mutationFn: async ({ campaignId, ...input }) => {
      if (!organizationId) throw new Error('No active organization')
      return post(`/campaigns/${campaignId}/steps`, {
        organizationId,
        ...input,
      })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.campaign(organizationId, variables.campaignId),
      })
    },
  })
}

export function useUpdateCampaignStep() {
  const queryClient = useQueryClient()
  const activeOrganization = useEffectiveOrganization()
  const organizationId = activeOrganization?.data?.id

  return useMutation<
    { data: CampaignStep },
    Error,
    {
      campaignId: string
      stepId: string
      channel?: CampaignChannel
      offsetMinutes?: number
      template?: string
      skipIfReplied?: boolean
      skipIfBooked?: boolean
      metadata?: Record<string, unknown>
    }
  >({
    mutationFn: async ({ campaignId, stepId, ...input }) => {
      if (!organizationId) throw new Error('No active organization')
      return patch(`/campaigns/${campaignId}/steps/${stepId}`, {
        organizationId,
        ...input,
      })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.campaign(organizationId, variables.campaignId),
      })
    },
  })
}

export function useDeleteCampaignStep() {
  const queryClient = useQueryClient()
  const activeOrganization = useEffectiveOrganization()
  const organizationId = activeOrganization?.data?.id

  return useMutation<
    { success: boolean },
    Error,
    { campaignId: string; stepId: string }
  >({
    mutationFn: async ({ campaignId, stepId }) => {
      if (!organizationId) throw new Error('No active organization')
      return del(
        withOrgQuery(`/campaigns/${campaignId}/steps/${stepId}`, organizationId),
      )
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.campaign(organizationId, variables.campaignId),
      })
    },
  })
}

export function useCampaignEnrollments(campaignId: string) {
  const activeOrganization = useEffectiveOrganization()
  const organizationId = activeOrganization?.data?.id

  return useQuery<{ data: CampaignEnrollment[] }>({
    queryKey: QUERY_KEYS.campaignEnrollments(organizationId, campaignId),
    queryFn: async () => {
      if (!organizationId) throw new Error('No active organization')
      return get(withOrgQuery(`/campaigns/${campaignId}/enrollments`, organizationId))
    },
    enabled: Boolean(organizationId && campaignId),
  })
}

export function useCreateCampaignEnrollment() {
  const queryClient = useQueryClient()
  const activeOrganization = useEffectiveOrganization()
  const organizationId = activeOrganization?.data?.id

  return useMutation<
    { data: CampaignEnrollment },
    Error,
    {
      campaignId: string
      leadId: string
      contact: {
        name?: string
        phone?: string
        email?: string
      }
    }
  >({
    mutationFn: async ({ campaignId, ...input }) => {
      if (!organizationId) throw new Error('No active organization')
      return post(`/campaigns/${campaignId}/enrollments`, {
        organizationId,
        ...input,
      })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.campaignEnrollments(organizationId, variables.campaignId),
      })
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.campaignStats(organizationId, variables.campaignId),
      })
    },
  })
}

export function useCreateCampaignEnrollmentsFromList() {
  const queryClient = useQueryClient()
  const activeOrganization = useEffectiveOrganization()
  const organizationId = activeOrganization?.data?.id

  return useMutation<
    { data: CampaignEnrollment[] },
    Error,
    {
      campaignId: string
      listId: string
      leadIds?: string[]
    }
  >({
    mutationFn: async ({ campaignId, listId, leadIds }) => {
      if (!organizationId) throw new Error('No active organization')
      return post(`/campaigns/${campaignId}/enrollments/from-list`, {
        organizationId,
        listId,
        leadIds,
      })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.campaignEnrollments(organizationId, variables.campaignId),
      })
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.campaignStats(organizationId, variables.campaignId),
      })
    },
  })
}

export function useDeleteCampaignEnrollment() {
  const queryClient = useQueryClient()
  const activeOrganization = useEffectiveOrganization()
  const organizationId = activeOrganization?.data?.id

  return useMutation<
    { success: boolean },
    Error,
    { campaignId: string; enrollmentId: string }
  >({
    mutationFn: async ({ campaignId, enrollmentId }) => {
      if (!organizationId) throw new Error('No active organization')
      return del(
        withOrgQuery(
          `/campaigns/${campaignId}/enrollments/${enrollmentId}`,
          organizationId,
        ),
      )
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.campaignEnrollments(organizationId, variables.campaignId),
      })
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.campaignStats(organizationId, variables.campaignId),
      })
    },
  })
}

export function useCampaignStats(campaignId: string) {
  const activeOrganization = useEffectiveOrganization()
  const organizationId = activeOrganization?.data?.id

  return useQuery<{ data: CampaignStats }>({
    queryKey: QUERY_KEYS.campaignStats(organizationId, campaignId),
    queryFn: async () => {
      if (!organizationId) throw new Error('No active organization')
      return get(withOrgQuery(`/campaigns/${campaignId}/stats`, organizationId))
    },
    enabled: Boolean(organizationId && campaignId),
  })
}

export function useCampaignEvents(campaignId: string, limit: number = 100) {
  const activeOrganization = useEffectiveOrganization()
  const organizationId = activeOrganization?.data?.id

  return useQuery<{ data: CampaignEvent[] }>({
    queryKey: QUERY_KEYS.campaignEvents(organizationId, campaignId),
    queryFn: async () => {
      if (!organizationId) throw new Error('No active organization')
      return get(
        withOrgQuery(`/campaigns/${campaignId}/events`, organizationId, {
          limit: String(limit),
        }),
      )
    },
    enabled: Boolean(organizationId && campaignId),
  })
}
