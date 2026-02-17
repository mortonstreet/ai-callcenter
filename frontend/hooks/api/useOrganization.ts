/* eslint-disable @typescript-eslint/no-explicit-any */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { organization, useActiveOrganization, useSession } from '@/lib/auth-client';
import { QUERY_KEYS } from '@/lib/config';
import { get, post } from '@/lib/api';
import { toast } from 'sonner';
import { WizardInputV2 } from '@/lib/wizard-v2';

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

  type OnboardingQualification = {
    teamSize?: string;
    monthlyLeadVolume?: string;
    rolloutTimeline?: string;
    notes?: string;
  };

  type OnboardingProvisioningStatus = {
    organization: {
      id: string;
      name: string;
      planType: string;
      lifecycleStatus: string;
      provisioningStatus: string;
    };
    latestJob: {
      id: string;
      status: string;
      idempotencyKey: string;
      correlationId: string;
      lifecycleTarget: string | null;
      attempts: number;
      errorMessage: string | null;
      queuedAt: string | null;
      startedAt: string | null;
      completedAt: string | null;
      createdAt: string | null;
      updatedAt: string | null;
    } | null;
    events: Array<{
      id: string;
      level: string;
      eventType: string;
      message: string;
      correlationId: string;
      metadata: unknown | null;
      createdAt: string | null;
    }>;
    canRetry: boolean;
    nextAction: 'workspace_ready' | 'payment_required' | 'retry_available' | 'provisioning';
  };

  return useMutation({
    mutationFn: async (params: {
      name: string;
      domain?: string;
      wizard_input_v2: WizardInputV2;
    }) => {
      const { idempotencyKey, ...payload } = params;
      return await post<{ data: { organizationId: string; idempotent: boolean; provisioning: OnboardingProvisioningStatus } }>(
        '/organization/onboarding',
        { ...payload, idempotencyKey },
        idempotencyKey
          ? {
              headers: {
                'x-idempotency-key': idempotencyKey,
              },
            }
          : undefined,
      );
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.organizations() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.onboardingProvisioningStatus() });

      const nextAction = result?.data?.provisioning?.nextAction;
      if (nextAction === 'payment_required') {
        toast.info('Onboarding submitted. Payment verification is required before workspace activation.');
      } else if (nextAction === 'retry_available') {
        toast.warning('Onboarding submitted, but provisioning failed. You can retry from the provisioning status page.');
      } else {
        toast.success('Onboarding submitted. Provisioning is now in progress.');
      }
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to onboard organization');
    },
  });
}

export function useOnboardingProvisioningStatus(
  organizationId?: string,
  options?: {
    enabled?: boolean;
    refetchInterval?: number | false;
  },
) {
  return useQuery({
    queryKey: QUERY_KEYS.onboardingProvisioningStatus(organizationId),
    queryFn: async () => {
      const query = organizationId
        ? `?organizationId=${encodeURIComponent(organizationId)}`
        : '';
      return get<{ data: any }>(
        `/organization/onboarding/provisioning-status${query}`,
      );
    },
    enabled: options?.enabled,
    refetchInterval: options?.refetchInterval,
  });
}

export function useRetryOnboardingProvisioning() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params?: { organizationId?: string }) => {
      return post<{ data: any }>(
        '/organization/onboarding/provisioning/retry',
        params?.organizationId ? { organizationId: params.organizationId } : {},
      );
    },
    onSuccess: (_result, variables) => {
      toast.success('Provisioning retry submitted.');
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.onboardingProvisioningStatus(
          variables?.organizationId,
        ),
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.organizations() });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to retry provisioning');
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

export type ActiveOrganizationRole = "admin" | "owner" | "member" | null;

export function useCurrentOrganizationRole(): ActiveOrganizationRole {
  const { data: session } = useSession();
  const { data: membersData } = useListOrganizationMembers();
  const members = membersData?.data?.members || [];
  const user = session?.user;

  const currentUserMember = members.find((m: any) => m.userId === user?.id);
  const role = currentUserMember?.role;

  if (role === "admin" || role === "owner" || role === "member") {
    return role;
  }

  return null;
}

/**
 * Check if current user is admin or owner of the active organization
 */
export function useIsAdminOrOwner() {
  const role = useCurrentOrganizationRole();
  return role === "admin" || role === "owner";
}
