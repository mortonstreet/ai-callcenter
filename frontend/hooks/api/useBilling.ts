import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { get, post } from "@/lib/api";
import { QUERY_KEYS } from "@/lib/config";
import { useActiveOrganization } from "@/lib/auth-client";

export type BillingOffer = "metered_monthly" | "enterprise_quarterly";

type BillingSummaryResponse = {
  data: {
    organizationId: string;
    organizationName: string;
    lifecycleStatus: string;
    planType: "paid" | "demo";
    provisioningStatus: string;
    checkoutRequired: boolean;
    demoBypassApproved: boolean;
    offer: BillingOffer;
    entitlementState: string | null;
    subscriptionStatus: string | null;
    periodStart: string | null;
    periodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    publishableKeyConfigured: boolean;
  };
};

type CheckoutSessionResponse = {
  data: {
    mode: "checkout" | "demo_bypass";
    offer: BillingOffer;
    checkoutSessionId?: string;
    url: string | null;
    reason?: string;
  };
};

type PortalSessionResponse = {
  data: {
    portalSessionId: string;
    url: string;
  };
};

export function useBillingSummary() {
  const activeOrganization = useActiveOrganization();
  const organizationId = activeOrganization?.data?.id;

  return useQuery({
    queryKey: QUERY_KEYS.billingSummary(organizationId),
    queryFn: async () => {
      const query = organizationId
        ? `?organizationId=${encodeURIComponent(organizationId)}`
        : "";
      return await get<BillingSummaryResponse>(`/billing/summary${query}`);
    },
    enabled: !!organizationId,
  });
}

export function useCreateCheckoutSession() {
  const queryClient = useQueryClient();
  const activeOrganization = useActiveOrganization();
  const organizationId = activeOrganization?.data?.id;

  return useMutation({
    mutationFn: async (input?: { offer?: BillingOffer; seats?: number }) => {
      return await post<CheckoutSessionResponse>("/billing/checkout-session", {
        organizationId,
        offer: input?.offer || "metered_monthly",
        seats: input?.seats,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.billingSummary(organizationId),
      });
    },
  });
}

export function useCreatePortalSession() {
  const queryClient = useQueryClient();
  const activeOrganization = useActiveOrganization();
  const organizationId = activeOrganization?.data?.id;

  return useMutation({
    mutationFn: async () => {
      return await post<PortalSessionResponse>("/billing/portal-session", {
        organizationId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.billingSummary(organizationId),
      });
    },
  });
}
