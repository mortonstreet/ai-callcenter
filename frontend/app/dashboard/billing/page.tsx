"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  BillingOffer,
  useBillingSummary,
  useCreateCheckoutSession,
  useCreatePortalSession,
} from "@/hooks/api/useBilling";

const formatPeriod = (value: string | null) => {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleDateString();
};

export default function DashboardBillingPage() {
  const searchParams = useSearchParams();
  const checkoutResult = searchParams.get("checkout");
  const sessionId = searchParams.get("session_id");

  const { data: summaryData, isLoading } = useBillingSummary();
  const checkoutMutation = useCreateCheckoutSession();
  const portalMutation = useCreatePortalSession();
  const [hasAutoStartedCheckout, setHasAutoStartedCheckout] = useState(false);

  const summary = summaryData?.data;
  const checkoutRequired = summary?.checkoutRequired === true;
  const offer = summary?.offer || "metered_monthly";

  useEffect(() => {
    if (checkoutResult === "success") {
      toast.success("Checkout completed. Waiting for billing verification.");
    } else if (checkoutResult === "cancelled") {
      toast.error("Checkout was cancelled. Complete billing to continue.");
    }
  }, [checkoutResult]);

  const statusLabel = useMemo(() => {
    if (!summary) return "Loading";
    if (summary.checkoutRequired) return "Payment required";
    if (summary.lifecycleStatus === "suspended") return "Billing restricted";
    return "Payment verified";
  }, [summary]);

  const redirectToStripe = (url: string | null | undefined) => {
    if (!url) {
      toast.error("Stripe did not return a redirect URL.");
      return;
    }
    window.location.href = url;
  };

  const beginCheckout = (selectedOffer: BillingOffer) => {
    checkoutMutation.mutate(
      { offer: selectedOffer },
      {
        onSuccess: (response) => {
          redirectToStripe(response?.data?.url);
        },
        onError: (error) => {
          toast.error(error?.message || "Unable to start checkout session.");
        },
      },
    );
  };

  useEffect(() => {
    if (!summary || !checkoutRequired) return;
    if (hasAutoStartedCheckout) return;
    if (checkoutMutation.isPending) return;
    if (checkoutResult === "success" || checkoutResult === "cancelled") return;

    setHasAutoStartedCheckout(true);
    beginCheckout(offer);
  }, [
    summary,
    checkoutRequired,
    hasAutoStartedCheckout,
    checkoutMutation.isPending,
    checkoutResult,
    offer,
  ]);

  const openPortal = () => {
    portalMutation.mutate(undefined, {
      onSuccess: (response) => {
        redirectToStripe(response?.data?.url);
      },
      onError: (error) => {
        toast.error(error?.message || "Unable to open billing portal.");
      },
    });
  };

  if (isLoading || !summary) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-semibold text-foreground">Billing</h1>
        <p className="text-sm text-muted-foreground mt-2">Loading billing status...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Billing and entitlement</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Lifecycle access is enforced from your Stripe subscription status.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Status</span>
          <span className="text-sm font-medium text-foreground">{statusLabel}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Plan type</span>
          <span className="text-sm font-medium text-foreground">{summary.planType}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Offer</span>
          <span className="text-sm font-medium text-foreground">{summary.offer}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Subscription status</span>
          <span className="text-sm font-medium text-foreground">
            {summary.subscriptionStatus || "unknown"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Billing period</span>
          <span className="text-sm font-medium text-foreground">
            {formatPeriod(summary.periodStart)} to {formatPeriod(summary.periodEnd)}
          </span>
        </div>
      </div>

      {sessionId ? (
        <p className="text-xs text-muted-foreground">
          Last checkout session: <span className="font-mono">{sessionId}</span>
        </p>
      ) : null}

      {checkoutRequired ? (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <p className="text-sm text-muted-foreground">
            Your organization requires verified billing before full dashboard access is enabled.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => beginCheckout("metered_monthly")}
              disabled={checkoutMutation.isPending}
              className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              Start monthly metered checkout
            </button>
            <button
              onClick={() => beginCheckout("enterprise_quarterly")}
              disabled={checkoutMutation.isPending}
              className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-60"
            >
              Start enterprise quarterly checkout
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <p className="text-sm text-muted-foreground">
            Your subscription is active. Use the Stripe customer portal to manage billing.
          </p>
          <button
            onClick={openPortal}
            disabled={portalMutation.isPending}
            className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-60"
          >
            Open Stripe billing portal
          </button>
        </div>
      )}
    </div>
  );
}
