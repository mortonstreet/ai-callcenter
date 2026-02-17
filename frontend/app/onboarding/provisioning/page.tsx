"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import {
  useOnboardingProvisioningStatus,
  useRetryOnboardingProvisioning,
} from "@/hooks/api/useOrganization";
import { useSession } from "@/lib/auth-client";

const POLL_INTERVAL_MS = 4000;

type ProvisioningEvent = {
  id: string;
  level: string;
  eventType: string;
  message: string;
  correlationId: string;
  metadata: unknown | null;
  createdAt: string | null;
};

type ProvisioningStatus = {
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
    correlationId: string;
    errorMessage: string | null;
  } | null;
  events: ProvisioningEvent[];
  canRetry: boolean;
};

export default function OnboardingProvisioningPage() {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = useSession();

  const statusQuery = useOnboardingProvisioningStatus(undefined, {
    enabled: !!session,
    refetchInterval: POLL_INTERVAL_MS,
  });
  const retryMutation = useRetryOnboardingProvisioning();

  const status = statusQuery.data?.data as ProvisioningStatus | undefined;
  const lifecycleStatus = status?.organization?.lifecycleStatus;
  const provisioningStatus = status?.organization?.provisioningStatus;
  const latestJobStatus = status?.latestJob?.status;

  const statusLabel = useMemo(() => {
    if (lifecycleStatus === "payment_required") {
      return {
        title: "Payment Verification Required",
        body:
          "Your onboarding details were saved. Complete payment verification to continue provisioning.",
        tone: "text-amber-600",
      };
    }

    if (latestJobStatus === "failed" || provisioningStatus === "failed") {
      return {
        title: "Provisioning Failed",
        body:
          status?.latestJob?.errorMessage ||
          "Provisioning failed. Retry to continue setup.",
        tone: "text-red-600",
      };
    }

    if (lifecycleStatus === "workspace_active" && provisioningStatus === "completed") {
      return {
        title: "Workspace Ready",
        body: "Provisioning completed successfully. Redirecting to dashboard.",
        tone: "text-emerald-600",
      };
    }

    if (latestJobStatus === "running") {
      return {
        title: "Provisioning In Progress",
        body: "We are setting up your first workspace resources.",
        tone: "text-sky-600",
      };
    }

    return {
      title: "Provisioning Pending",
      body: "Your provisioning job is queued and will start shortly.",
      tone: "text-slate-600",
    };
  }, [
    lifecycleStatus,
    provisioningStatus,
    latestJobStatus,
    status?.latestJob?.errorMessage,
  ]);

  useEffect(() => {
    if (sessionPending) {
      return;
    }

    if (!session) {
      router.push("/login");
      return;
    }

    if (lifecycleStatus === "workspace_active" && provisioningStatus === "completed") {
      const timeout = window.setTimeout(() => {
        router.push("/dashboard");
      }, 1200);

      return () => window.clearTimeout(timeout);
    }
  }, [
    lifecycleStatus,
    provisioningStatus,
    router,
    session,
    sessionPending,
  ]);

  if (sessionPending || statusQuery.isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-sm text-muted-foreground">Loading provisioning status...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  if (statusQuery.isError) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-3">
          <p className="text-sm text-red-600">Unable to load provisioning status.</p>
          <Button variant="outline" onClick={() => statusQuery.refetch()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white px-6 py-10 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Onboarding</p>
          <h1 className="mt-2 text-3xl font-light tracking-tight text-[#1b191a] heading-serif">
            Provisioning Status
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Organization: <span className="font-medium text-foreground">{status?.organization?.name || "Unknown"}</span>
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className={`text-xl font-semibold ${statusLabel.tone}`}>{statusLabel.title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{statusLabel.body}</p>

          <div className="mt-5 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-xl border border-border/70 bg-background px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Lifecycle</p>
              <p className="mt-1 font-medium text-foreground">{lifecycleStatus || "unknown"}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Provisioning</p>
              <p className="mt-1 font-medium text-foreground">{provisioningStatus || "unknown"}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Job Status</p>
              <p className="mt-1 font-medium text-foreground">{latestJobStatus || "none"}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Correlation ID</p>
              <p className="mt-1 truncate font-mono text-xs text-foreground">
                {status?.latestJob?.correlationId || "-"}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => statusQuery.refetch()}
              loading={statusQuery.isRefetching}
            >
              Refresh
            </Button>

            {status?.canRetry && (
              <Button
                onClick={() =>
                  retryMutation.mutate({
                    organizationId: status?.organization?.id,
                  })
                }
                loading={retryMutation.isPending}
              >
                Retry Provisioning
              </Button>
            )}

            {lifecycleStatus === "workspace_active" && provisioningStatus === "completed" && (
              <Button onClick={() => router.push("/dashboard")}>Open Dashboard</Button>
            )}
          </div>
        </div>

        {Array.isArray(status?.events) && status.events.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Recent Events
            </h3>
            <div className="mt-3 space-y-3">
              {status.events.slice(0, 8).map((event) => (
                <div key={event.id} className="rounded-xl border border-border/70 bg-background px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{event.eventType}</p>
                    <p className="text-xs text-muted-foreground">{event.createdAt || ""}</p>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{event.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-sm text-muted-foreground">
          Need to change your onboarding details? <Link href="/onboarding" className="text-foreground underline">Return to onboarding</Link>
        </div>
      </div>
    </div>
  );
}
