"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  useAdminLifecycleTransitions,
  useAdminProvisioningFailures,
  useAdminReplayProvisioningFailure,
  type ProvisioningDeadLetterJob,
} from "@/hooks/api/useProvisioningOps";
import {
  Activity,
  AlertCircle,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";

const DEFAULT_QUEUE = "integration_sync";

const formatTime = (value: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

export default function ProvisioningOpsTab() {
  const [organizationId, setOrganizationId] = useState("");
  const [replayReason, setReplayReason] = useState("operator_replay");

  const params = useMemo(
    () => ({
      queueName: DEFAULT_QUEUE as const,
      organizationId: organizationId.trim() || undefined,
      limit: 50,
    }),
    [organizationId],
  );

  const { data: failuresData, isLoading: failuresLoading } =
    useAdminProvisioningFailures(params);
  const { data: transitionsData, isLoading: transitionsLoading } =
    useAdminLifecycleTransitions({
      domain: "provisioning",
      organizationId: organizationId.trim() || undefined,
      limit: 40,
    });
  const replayMutation = useAdminReplayProvisioningFailure();

  const failures = failuresData?.data || [];
  const transitions = transitionsData?.data || [];
  const policies = failuresData?.policies;

  const handleReplay = (job: ProvisioningDeadLetterJob) => {
    replayMutation.mutate(
      {
        queueName: job.queueName,
        deadLetterJobId: job.deadLetterJobId,
        reason: replayReason.trim() || "operator_replay",
      },
      {
        onSuccess: (response) => {
          toast.success(
            `Replayed ${response.data.originalJobName} as ${response.data.replayJobId}`,
          );
        },
        onError: () => {
          toast.error("Replay failed");
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground mb-1">
            Provisioning DLQ jobs
          </p>
          <p className="text-2xl font-semibold text-foreground">
            {failuresLoading ? "..." : failures.length}
          </p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground mb-1">
            Default max attempts
          </p>
          <p className="text-2xl font-semibold text-foreground">
            {policies?.default?.attempts ?? "—"}
          </p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground mb-1">
            Provision retry policy
          </p>
          <p className="text-sm text-foreground">
            {policies?.criticalJobs?.["integration_sync:agent-provision-retry"]
              ?.attempts ?? "—"}{" "}
            attempts /{" "}
            {policies?.criticalJobs?.["integration_sync:agent-provision-retry"]
              ?.backoffDelayMs ?? "—"}
            ms
          </p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={organizationId}
              onChange={(event) => setOrganizationId(event.target.value)}
              placeholder="Filter by organization ID (optional)"
              className="w-full md:w-96 px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground whitespace-nowrap">
              Replay reason
            </label>
            <input
              type="text"
              value={replayReason}
              onChange={(event) => setReplayReason(event.target.value)}
              className="w-full md:w-56 px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {failuresLoading ? (
          <div className="text-center py-10 text-muted-foreground">
            Loading provisioning failures...
          </div>
        ) : failures.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <ShieldCheck className="h-10 w-10 mx-auto mb-2 text-green-600" />
            No provisioning failures in dead-letter queue
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 font-medium text-foreground/80">
                    Job
                  </th>
                  <th className="text-left py-2 px-3 font-medium text-foreground/80">
                    Organization
                  </th>
                  <th className="text-left py-2 px-3 font-medium text-foreground/80">
                    Attempts
                  </th>
                  <th className="text-left py-2 px-3 font-medium text-foreground/80">
                    Error
                  </th>
                  <th className="text-left py-2 px-3 font-medium text-foreground/80">
                    Correlation
                  </th>
                  <th className="text-left py-2 px-3 font-medium text-foreground/80">
                    Failed At
                  </th>
                  <th className="text-left py-2 px-3 font-medium text-foreground/80">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {failures.map((job) => (
                  <tr
                    key={job.deadLetterJobId}
                    className="border-b border-border/50 hover:bg-muted transition"
                  >
                    <td className="py-2 px-3 text-foreground font-mono text-xs">
                      {job.originalJobName}
                    </td>
                    <td className="py-2 px-3 text-muted-foreground font-mono text-xs">
                      {job.organizationId || "—"}
                    </td>
                    <td className="py-2 px-3 text-muted-foreground">
                      {job.attemptsMade ?? "—"} / {job.maxAttempts ?? "—"}
                    </td>
                    <td className="py-2 px-3 text-muted-foreground max-w-sm truncate">
                      {job.errorMessage || "Unknown queue failure"}
                    </td>
                    <td className="py-2 px-3 text-muted-foreground font-mono text-xs">
                      {job.correlationId || "—"}
                    </td>
                    <td className="py-2 px-3 text-muted-foreground whitespace-nowrap">
                      {formatTime(job.deadLetteredAt || job.failedAt)}
                    </td>
                    <td className="py-2 px-3">
                      <button
                        onClick={() => handleReplay(job)}
                        disabled={replayMutation.isPending}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded border border-border hover:bg-accent disabled:opacity-50"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Replay
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-card rounded-xl border border-border p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Recent Provisioning Transitions
        </h3>

        {transitionsLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading transitions...
          </div>
        ) : transitions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
            No provisioning transitions captured
          </div>
        ) : (
          <div className="space-y-2">
            {transitions.map((event) => (
              <div
                key={event.id}
                className="border border-border rounded-lg px-3 py-2 bg-background"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{event.fromState}</span> →{" "}
                    <span className="font-medium">{event.toState}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatTime(event.createdAt)}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  org: {event.organizationId} | source: {event.source} |
                  correlation: {event.correlationId || "—"}
                </p>
                {event.reason && (
                  <p className="text-xs text-muted-foreground mt-1">
                    reason: {event.reason}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
