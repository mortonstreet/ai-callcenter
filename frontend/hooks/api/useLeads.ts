/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, patch, del } from '@/lib/api';
import { useEffectiveOrganization } from '@/lib/admin-store';

export interface Lead {
  id: string;
  organizationId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  normalizedPhone: string | null;
  company: string | null;
  title: string | null;
  linkedInUrl: string | null;
  website: string | null;
  customFields: unknown | null;
  pipelineStageId: string | null;
  dealValue: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface PaginatedLeadsResponse {
  data: Lead[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

const QUERY_KEYS = {
  leads: (organizationId?: string, page?: number, search?: string) =>
    ['leads', organizationId, page, search],
  lead: (organizationId?: string, id?: string) =>
    ['lead', organizationId, id],
};

export function useLeads(options: { page: number; limit?: number; search?: string }) {
  const activeOrganization = useEffectiveOrganization();

  return useQuery<PaginatedLeadsResponse>({
    queryKey: QUERY_KEYS.leads(activeOrganization?.data?.id, options.page, options.search),
    queryFn: async () => {
      if (!activeOrganization?.data?.id) throw new Error('No active organization');
      const params = new URLSearchParams();
      params.set('page', String(options.page));
      params.set('limit', String(options.limit || 25));
      if (options.search) params.set('search', options.search);
      return await get<PaginatedLeadsResponse>(
        `/leads/${activeOrganization.data.id}?${params.toString()}`
      );
    },
    enabled: !!activeOrganization?.data?.id,
  });
}

export function useLead(id: string) {
  const activeOrganization = useEffectiveOrganization();

  return useQuery<Lead>({
    queryKey: QUERY_KEYS.lead(activeOrganization?.data?.id, id),
    queryFn: async () => {
      if (!activeOrganization?.data?.id) throw new Error('No active organization');
      return await get<Lead>(`/leads/${activeOrganization.data.id}/${id}`);
    },
    enabled: !!activeOrganization?.data?.id && !!id,
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  const activeOrganization = useEffectiveOrganization();

  return useMutation<Lead, Error, {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone: string;
    company?: string;
    title?: string;
    linkedInUrl?: string;
    website?: string;
    dealValue?: number;
    pipelineStageId?: string;
  }>({
    mutationFn: async (data) => {
      if (!activeOrganization?.data?.id) throw new Error('No active organization');
      return await post<Lead>(`/leads/${activeOrganization.data.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();
  const activeOrganization = useEffectiveOrganization();

  return useMutation<Lead, Error, {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    company?: string;
    title?: string;
    linkedInUrl?: string;
    website?: string;
    dealValue?: number;
    pipelineStageId?: string | null;
  }>({
    mutationFn: async ({ id, ...data }) => {
      if (!activeOrganization?.data?.id) throw new Error('No active organization');
      return await patch<Lead>(`/leads/${activeOrganization.data.id}/${id}`, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.lead(activeOrganization?.data?.id, variables.id),
      });
    },
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();
  const activeOrganization = useEffectiveOrganization();

  return useMutation<{ success: boolean }, Error, string>({
    mutationFn: async (id) => {
      if (!activeOrganization?.data?.id) throw new Error('No active organization');
      return await del<{ success: boolean }>(`/leads/${activeOrganization.data.id}/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}
