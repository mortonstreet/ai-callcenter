/* eslint-disable @typescript-eslint/no-explicit-any */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post, put, patch, del } from '@/lib/api';
import { QUERY_KEYS } from '@/lib/config';
import { useEffectiveOrganization } from '@/lib/admin-store';
import { DBAgent, CreateTaskRequest, UpdateTaskRequest, DBTask } from '@/lib/shared-types';
import { toast } from 'sonner';

/**
 * Get all agents for the active organization
 */
export function useAgents() {
  const activeOrganization = useEffectiveOrganization();

  return useQuery<DBAgent[]>({
    queryKey: QUERY_KEYS.agents(activeOrganization?.data?.id),
    queryFn: async () => {
      if (!activeOrganization?.data?.id) {
        throw new Error('No active organization');
      }
      return await get<DBAgent[]>(`/agent/${activeOrganization.data.id}`);
    },
    enabled: !!activeOrganization?.data?.id,
  });
}

/**
 * Get a single agent by ID
 */
export function useAgent(agentId: string) {
  const activeOrganization = useEffectiveOrganization();

  return useQuery<DBAgent>({
    queryKey: QUERY_KEYS.agent(activeOrganization?.data?.id, agentId),
    queryFn: async () => {
      if (!activeOrganization?.data?.id) {
        throw new Error('No active organization');
      }
      return await get<DBAgent>(`/agent/${activeOrganization.data.id}/${agentId}`);
    },
    enabled: !!activeOrganization?.data?.id && !!agentId,
  });
}

/**
 * Create a new task for an agent
 */
export function useCreateTask() {
  const queryClient = useQueryClient();
  const activeOrganization = useEffectiveOrganization();

  return useMutation({
    mutationFn: async (data: Omit<CreateTaskRequest, 'organizationId'>) => {
      if (!activeOrganization?.data?.id) {
        throw new Error('No active organization');
      }
      return await post(`/agent/${activeOrganization.data.id}/task`, {
        ...data,
        organizationId: activeOrganization.data.id,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.agents(activeOrganization?.data?.id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks(activeOrganization?.data?.id, variables.agentId) });
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to create task");
    },
  });
}

/**
 * Get all tasks for an agent
 */
export function useTasks(agentId: string) {
  const activeOrganization = useEffectiveOrganization();

  return useQuery<DBTask[]>({
    queryKey: QUERY_KEYS.tasks(activeOrganization?.data?.id, agentId),
    queryFn: async () => {
      if (!activeOrganization?.data?.id) {
        throw new Error('No active organization');
      }
      if (!agentId) {
        throw new Error('Agent ID is required');
      }
      return await get<DBTask[]>(`/agent/${activeOrganization.data.id}/${agentId}/tasks`);
    },
    enabled: !!activeOrganization?.data?.id && !!agentId,
  });
}

/**
 * Update a task
 */
export function useUpdateTask() {
  const queryClient = useQueryClient();
  const activeOrganization = useEffectiveOrganization();

  return useMutation({
    mutationFn: async (data: Omit<UpdateTaskRequest, 'organizationId'>) => {
      if (!activeOrganization?.data?.id) {
        throw new Error('No active organization');
      }
      return await put(`/agent/${activeOrganization.data.id}/task/${data.id}`, {
        ...data,
        organizationId: activeOrganization.data.id,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks(activeOrganization?.data?.id, variables.agentId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.agents(activeOrganization?.data?.id) });
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to update task");
    },
  });
}

/**
 * Delete a task
 */
export function useDeleteTask() {
  const queryClient = useQueryClient();
  const activeOrganization = useEffectiveOrganization();

  return useMutation({
    mutationFn: async (data: { id: string; agentId: string }) => {
      if (!activeOrganization?.data?.id) {
        throw new Error('No active organization');
      }
      return await del(`/agent/${activeOrganization.data.id}/task/${data.id}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks(activeOrganization?.data?.id, variables.agentId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.agents(activeOrganization?.data?.id) });
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to delete task");
    },
  });
}

// ===== ElevenLabs Agent Hooks =====

/**
 * Create an ElevenLabs agent
 */
export function useCreateElevenLabsAgent() {
  const queryClient = useQueryClient();
  const activeOrganization = useEffectiveOrganization();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      industry?: string;
      useCase?: string;
      website?: string;
      mainGoal?: string;
      voiceId?: string;
      firstMessage?: string;
      systemPrompt?: string;
    }) => {
      if (!activeOrganization?.data?.id) {
        throw new Error('No active organization');
      }
      return await post<DBAgent>(`/agent/${activeOrganization.data.id}/create-agent`, {
        ...data,
        organizationId: activeOrganization.data.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.agents(activeOrganization?.data?.id) });
      toast.success('Agent created successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to create agent');
    },
  });
}

/**
 * Update an ElevenLabs agent (admin/owner full access)
 */
export function useUpdateElevenLabsAgent() {
  const queryClient = useQueryClient();
  const activeOrganization = useEffectiveOrganization();

  return useMutation({
    mutationFn: async (data: { id: string } & Record<string, any>) => {
      if (!activeOrganization?.data?.id) {
        throw new Error('No active organization');
      }
      return await patch<DBAgent>(`/agent/${activeOrganization.data.id}/${data.id}/update-agent`, {
        ...data,
        organizationId: activeOrganization.data.id,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.agents(activeOrganization?.data?.id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.agent(activeOrganization?.data?.id, variables.id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.agentConfig(activeOrganization?.data?.id, variables.id) });
      toast.success('Agent updated successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update agent');
    },
  });
}

/**
 * Delete an ElevenLabs agent
 */
export function useDeleteElevenLabsAgent() {
  const queryClient = useQueryClient();
  const activeOrganization = useEffectiveOrganization();

  return useMutation({
    mutationFn: async (agentId: string) => {
      if (!activeOrganization?.data?.id) {
        throw new Error('No active organization');
      }
      return await del(`/agent/${activeOrganization.data.id}/${agentId}/delete-agent`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.agents(activeOrganization?.data?.id) });
      toast.success('Agent deleted');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to delete agent');
    },
  });
}

/**
 * Get full ElevenLabs agent configuration
 */
export function useAgentConfig(agentId: string) {
  const activeOrganization = useEffectiveOrganization();

  return useQuery<any>({
    queryKey: QUERY_KEYS.agentConfig(activeOrganization?.data?.id, agentId),
    queryFn: async () => {
      if (!activeOrganization?.data?.id) {
        throw new Error('No active organization');
      }
      return await get(`/agent/${activeOrganization.data.id}/${agentId}/config`);
    },
    enabled: !!activeOrganization?.data?.id && !!agentId,
  });
}

/**
 * List available ElevenLabs voices
 */
export function useVoices() {
  return useQuery<{ voices: Array<{ voice_id: string; name: string; category: string; preview_url?: string }> }>({
    queryKey: QUERY_KEYS.voices(),
    queryFn: async () => {
      return await get('/agent/voices');
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

/**
 * Get agent analytics
 */
export function useAgentAnalytics(agentId: string, startDate?: string, endDate?: string) {
  const activeOrganization = useEffectiveOrganization();

  return useQuery<any>({
    queryKey: QUERY_KEYS.agentAnalytics(activeOrganization?.data?.id, agentId, startDate, endDate),
    queryFn: async () => {
      if (!activeOrganization?.data?.id) {
        throw new Error('No active organization');
      }
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const qs = params.toString() ? `?${params.toString()}` : '';
      return await get(`/agent/${activeOrganization.data.id}/${agentId}/analytics${qs}`);
    },
    enabled: !!activeOrganization?.data?.id && !!agentId,
  });
}

/**
 * Get agent conversations list
 */
export function useAgentConversations(agentId: string) {
  const activeOrganization = useEffectiveOrganization();

  return useQuery<any>({
    queryKey: QUERY_KEYS.agentConversations(activeOrganization?.data?.id, agentId),
    queryFn: async () => {
      if (!activeOrganization?.data?.id) {
        throw new Error('No active organization');
      }
      return await get(`/agent/${activeOrganization.data.id}/${agentId}/conversations`);
    },
    enabled: !!activeOrganization?.data?.id && !!agentId,
  });
}
