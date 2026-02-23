/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post } from '@/lib/api';
import { useEffectiveOrganization } from '@/lib/admin-store';
import { GetTaskInstancesRequest, PaginatedResponse, UpdateTaskInstanceStatusRequest, TaskInstanceDetailsResponse } from '@/lib/shared-types';
import { toast } from 'sonner';

const QUERY_KEYS = {
  taskInstances: (organizationId?: string, filters?: Partial<GetTaskInstancesRequest>) => 
    ['taskInstances', organizationId, filters],
  taskInstance: (organizationId?: string, id?: string) => 
    ['taskInstance', organizationId, id],
  taskInstancesAnalytics: (organizationId?: string, startDate?: string, endDate?: string) =>
    ['taskInstancesAnalytics', organizationId, startDate, endDate],
};

export interface TaskInstanceWithRelations {
  id: string;
  taskId: string;
  status: string;
  info: any;
  conversationId: string;
  callSid: string | null;
  dispatcherId: string | null;
  createdAt: string;
  updatedAt: string;
  taskName: string;
  taskFields?: any; // JSON field from task
  dispatcherName: string | null;
  dispatcherEmail: string | null;
  // Lead fields
  leadType: string | null;
  resolutionType: string | null;
  customerType: string | null;
  leadScore: number | null;
  estimatedValue: number | null;
  // Cal.com booking fields
  calcomBookingId: string | null;
  calcomEventId: number | null;
  appointmentTime: string | null;
  // Tags and pipeline
  tags: string[] | null;
  pipelineStage: string | null;
  pipelineStageId: string | null;
}

export function useTaskInstances(filters?: Partial<Omit<GetTaskInstancesRequest, 'organizationId'>>) {
  const activeOrganization = useEffectiveOrganization();
  
  return useQuery<PaginatedResponse<TaskInstanceWithRelations>>({
    queryKey: QUERY_KEYS.taskInstances(activeOrganization?.data?.id, filters),
    queryFn: async () => {
      if (!activeOrganization?.data?.id) {
        throw new Error('No active organization');
      }
      
      const params = new URLSearchParams();
      if (filters?.taskId) params.append('taskId', filters.taskId);
      if (filters?.dispatcherId) params.append('dispatcherId', filters.dispatcherId);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.search) params.append('search', filters.search);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.sortBy) params.append('sortBy', filters.sortBy);
      if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);
      
      return await get<PaginatedResponse<TaskInstanceWithRelations>>(
        `/task/${activeOrganization.data.id}/instances?${params.toString()}`
      );
    },
    enabled: !!activeOrganization?.data?.id,
    placeholderData: (previousData) => previousData, // Keep previous data while loading
    refetchInterval: 15_000,
  });
}

export function useTaskInstance(id: string) {
  const activeOrganization = useEffectiveOrganization();
  
  return useQuery<TaskInstanceDetailsResponse>({
    queryKey: QUERY_KEYS.taskInstance(activeOrganization?.data?.id, id),
    queryFn: async () => {
      if (!activeOrganization?.data?.id) {
        throw new Error('No active organization');
      }
      
      return await get<TaskInstanceDetailsResponse>(
        `/task/${activeOrganization.data.id}/instances/${id}`
      );
    },
    enabled: !!activeOrganization?.data?.id && !!id,
  });
}

export function useUpdateTaskInstanceStatus() {
  const queryClient = useQueryClient();
  const activeOrganization = useEffectiveOrganization();
  
  return useMutation({
    mutationFn: async (data: Omit<UpdateTaskInstanceStatusRequest, 'organizationId'>) => {
      if (!activeOrganization?.data?.id) {
        throw new Error('No active organization');
      }
      return await post(
        `/task/${activeOrganization.data.id}/instances/${data.id}/status`,
        { status: data.status }
      );
    },
    onSuccess: () => {
      // Invalidate all task instances queries
      queryClient.invalidateQueries({ 
        queryKey: ['taskInstances', activeOrganization?.data?.id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['taskInstance', activeOrganization?.data?.id] 
      });
      toast.success('Status updated successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update status');
    },
  });
}

export function useUpdateTaskInstancePipeline() {
  const queryClient = useQueryClient();
  const activeOrganization = useEffectiveOrganization();
  
  return useMutation({
    mutationFn: async (data: { id: string; pipelineStage: string }) => {
      if (!activeOrganization?.data?.id) {
        throw new Error('No active organization');
      }
      return await post(
        `/task/${activeOrganization.data.id}/instances/${data.id}/pipeline`,
        { pipelineStage: data.pipelineStage }
      );
    },
    onSuccess: () => {
      // Invalidate all task instances queries
      queryClient.invalidateQueries({ 
        queryKey: ['taskInstances', activeOrganization?.data?.id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['taskInstance', activeOrganization?.data?.id] 
      });
      toast.success('Pipeline stage updated');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update pipeline stage');
    },
  });
}

export function useTaskInstancesForAnalytics(startDate?: string, endDate?: string) {
  const activeOrganization = useEffectiveOrganization();
  
  return useQuery<PaginatedResponse<TaskInstanceWithRelations>>({
    queryKey: QUERY_KEYS.taskInstancesAnalytics(activeOrganization?.data?.id, startDate, endDate),
    queryFn: async () => {
      if (!activeOrganization?.data?.id) {
        throw new Error('No active organization');
      }
      
      const params = new URLSearchParams();
      params.append('limit', '1000'); // Get all for analytics
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      return await get<PaginatedResponse<TaskInstanceWithRelations>>(
        `/task/${activeOrganization.data.id}/instances?${params.toString()}`
      );
    },
    enabled: !!activeOrganization?.data?.id,
  });
}

