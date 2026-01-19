/* eslint-disable @typescript-eslint/no-explicit-any */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { organization, useActiveOrganization, useSession } from '@/lib/auth-client';
import { QUERY_KEYS } from '@/lib/config';
import { post } from '@/lib/api';
import { toast } from 'sonner';

export { useActiveOrganization };

export function useOrganizations() {
  
  return useQuery({
    queryKey: QUERY_KEYS.organizations(),
    queryFn: async () => {
      const result = await organization.list();
      return result;
    }
  });
}

/**
 * Create a new organization
 * Automatically adds to Zustand store and sets as active organization
 */
export function useCreateOrganization() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: { name: string; slug: string }) => {
      return await organization.create({
        name: params.name,
        slug: params.slug,
        keepCurrentActiveOrganization: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.organizations() });
    },
  });
}

export function useOnboardOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      name: string;
      domain?: string;
      industry: string;
      services: string[];
      agent: {
        name: string;
        openingLine?: string;
        serviceQuestions?: string[];
      };
    }) => {
      return await post<{ data: any }>('/organization/onboarding', params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.organizations() });
      toast.success('Organization onboarded');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to onboard organization');
    },
  });
}

export function useCheckSlug() {
  return useMutation({
    mutationFn: async (slug: string) => {
      return await organization.checkSlug({ slug });
    },
  });
}

export function useCancelOrganizationInvitation() {
  const queryClient = useQueryClient();
  const activeOrganization = useActiveOrganization();

  return useMutation({
    mutationFn: async (params: { invitationId: string }) => {
      return organization.cancelInvitation(params);
    },
    onSuccess: (result: any) => {
      if (result.data && activeOrganization) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.organizationInvitations(activeOrganization.data?.id) });
      }
    }
  });
}

export function useListOrganizationMembers() {
  const activeOrganization = useActiveOrganization();
  
  return useQuery({
    queryKey: QUERY_KEYS.organizationMembers(activeOrganization?.data?.id),
    queryFn: async () => {
      return await organization.listMembers();
    },
    enabled: !!activeOrganization,
  });
}

export function useListOrganizationInvitations() {  
  const activeOrganization = useActiveOrganization();
  
  return useQuery({
    queryKey: QUERY_KEYS.organizationInvitations(activeOrganization?.data?.id),
    queryFn: async () => {
      return await organization.listInvitations();
    },
    enabled: !!activeOrganization,
  });
}


/**
 * Set the active organization
 * Updates both the server and the local store
 */
export function useSetActiveOrganizationMutation() {
  const queryClient = useQueryClient();
  const activeOrganization = useActiveOrganization();

  return useMutation({
    mutationFn: async (params: { organizationId?: string; organizationSlug?: string }) => {
      return await organization.setActive(params);
    },
    onSuccess: (result) => {
      if (result.data) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.organizationMembers(activeOrganization?.data?.id) });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.organizationInvitations(activeOrganization?.data?.id) });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.organizations() });
      }
    },
  });
}

/**
 * Invite a member to the organization
 */
export function useInviteMember() {
  const queryClient = useQueryClient();
  const activeOrganization = useActiveOrganization();

  return useMutation({
    mutationFn: async (params: { email: string; role: "member" | "admin" | "owner"; organizationId: string }) => {
      return await organization.inviteMember({ email: params.email, role: params.role as "member" | "admin" | "owner", organizationId: params.organizationId, resend: true });
    },
    onSuccess: (result: any) => {
      if (result.data && activeOrganization) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.organizationInvitations(activeOrganization.data?.id) });
      }
    }
  });
}

export const useRemoveOrganizationMember = () => {
  const queryClient = useQueryClient();
  const activeOrganization = useActiveOrganization();

  return useMutation({
    mutationFn: async (params: { memberIdOrEmail: string }) => {
      return organization.removeMember({ memberIdOrEmail: params.memberIdOrEmail, organizationId: activeOrganization?.data?.id });
    },
    onSuccess: (result: any) => {
      if (result.data && activeOrganization) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.organizationMembers(activeOrganization.data?.id) });
      }
    }
  });
}

/**
 * Check if current user is admin or owner of the active organization
 */
export function useIsAdminOrOwner() {
  const { data: session } = useSession();
  const { data: membersData } = useListOrganizationMembers();
  const members = membersData?.data?.members || [];
  const user = session?.user;
  
  const currentUserMember = members.find((m: any) => m.userId === user?.id);
  const isAdmin = currentUserMember?.role === "admin";
  const isOwner = currentUserMember?.role === "owner";
  
  return isAdmin || isOwner;
}