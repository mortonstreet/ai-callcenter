/* eslint-disable @typescript-eslint/no-explicit-any */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post, put, del } from '@/lib/api';
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

export function useCreateAgent() {
  const queryClient = useQueryClient();
  const activeOrganization = useEffectiveOrganization();

  return useMutation({
    mutationFn: async (data: { name: string; phoneNumber?: string; redirectNumber?: string }) => {
      if (!activeOrganization?.data?.id) {
        throw new Error('No active organization');
      }
      return await post(`/agent/${activeOrganization.data.id}`, {
        organizationId: activeOrganization.data.id,
        ...data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.agents(activeOrganization?.data?.id) });
      toast.success('Agent created');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to create agent');
    },
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
      // Invalidate agents query to refetch with new task
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.agents(activeOrganization?.data?.id) });
      // Invalidate tasks query for this agent
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
      // Invalidate tasks query for this agent
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks(activeOrganization?.data?.id, variables.agentId) });
      // Invalidate agents query
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
      // Invalidate tasks query for this agent
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks(activeOrganization?.data?.id, variables.agentId) });
      // Invalidate agents query
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.agents(activeOrganization?.data?.id) });
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to delete task");
    },
  });
}

