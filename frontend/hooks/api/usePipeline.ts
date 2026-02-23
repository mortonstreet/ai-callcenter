/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, patch, del } from '@/lib/api';
import { useEffectiveOrganization } from '@/lib/admin-store';

export interface PipelineStageWithStats {
  id: string;
  organizationId: string;
  label: string;
  color: string;
  sortOrder: number;
  isDefault: boolean;
  createdAt: string;
  leadCount: number;
  totalValue: number;
}

type PipelineStagesResponse = {
  data: PipelineStageWithStats[];
};

const QUERY_KEYS = {
  pipelineStages: (organizationId?: string) => ['pipelineStages', organizationId],
};

export function usePipelineStages() {
  const activeOrganization = useEffectiveOrganization();

  return useQuery<PipelineStagesResponse>({
    queryKey: QUERY_KEYS.pipelineStages(activeOrganization?.data?.id),
    queryFn: async () => {
      if (!activeOrganization?.data?.id) {
        throw new Error('No active organization');
      }
      return await get<PipelineStagesResponse>(
        `/pipeline/${activeOrganization.data.id}/stages`
      );
    },
    enabled: !!activeOrganization?.data?.id,
    refetchInterval: 15_000,
  });
}

export function useCreatePipelineStage() {
  const queryClient = useQueryClient();
  const activeOrganization = useEffectiveOrganization();

  return useMutation<
    any,
    Error,
    { label: string; color?: string; sortOrder?: number; isDefault?: boolean }
  >({
    mutationFn: async (data) => {
      if (!activeOrganization?.data?.id) {
        throw new Error('No active organization');
      }
      return await post(
        `/pipeline/${activeOrganization.data.id}/stages`,
        data,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.pipelineStages(activeOrganization?.data?.id) });
    },
  });
}

export function useUpdatePipelineStage() {
  const queryClient = useQueryClient();
  const activeOrganization = useEffectiveOrganization();

  return useMutation<
    any,
    Error,
    { id: string; label?: string; color?: string; sortOrder?: number; isDefault?: boolean }
  >({
    mutationFn: async ({ id, ...data }) => {
      if (!activeOrganization?.data?.id) {
        throw new Error('No active organization');
      }
      return await patch(
        `/pipeline/${activeOrganization.data.id}/stages/${id}`,
        data,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.pipelineStages(activeOrganization?.data?.id) });
    },
  });
}

export function useDeletePipelineStage() {
  const queryClient = useQueryClient();
  const activeOrganization = useEffectiveOrganization();

  return useMutation<{ success: boolean }, Error, string>({
    mutationFn: async (id) => {
      if (!activeOrganization?.data?.id) {
        throw new Error('No active organization');
      }
      return await del<{ success: boolean }>(
        `/pipeline/${activeOrganization.data.id}/stages/${id}`,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.pipelineStages(activeOrganization?.data?.id) });
    },
  });
}

export function useReorderPipelineStages() {
  const queryClient = useQueryClient();
  const activeOrganization = useEffectiveOrganization();

  return useMutation<
    PipelineStagesResponse,
    Error,
    { stages: { id: string; sortOrder: number }[] }
  >({
    mutationFn: async (data) => {
      if (!activeOrganization?.data?.id) {
        throw new Error('No active organization');
      }
      return await post<PipelineStagesResponse>(
        `/pipeline/${activeOrganization.data.id}/stages/reorder`,
        data,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.pipelineStages(activeOrganization?.data?.id) });
    },
  });
}

export function useMoveLead() {
  const queryClient = useQueryClient();
  const activeOrganization = useEffectiveOrganization();

  return useMutation<any, Error, { id: string; pipelineStageId: string }>({
    mutationFn: async ({ id, pipelineStageId }) => {
      if (!activeOrganization?.data?.id) {
        throw new Error('No active organization');
      }
      return await post(
        `/pipeline/${activeOrganization.data.id}/leads/${id}/move`,
        { pipelineStageId },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.pipelineStages(activeOrganization?.data?.id) });
      queryClient.invalidateQueries({ queryKey: ['taskInstances'] });
    },
  });
}
