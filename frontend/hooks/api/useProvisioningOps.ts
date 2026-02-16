import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { get, post } from "@/lib/api";

export type QueueName =
  | "campaign_voice"
  | "campaign_sms"
  | "campaign_email"
  | "integration_sync"
  | "webhook_ingest";

export interface TransitionAuditEvent {
  id: string;
  organizationId: string;
  domain: "lifecycle" | "billing" | "provisioning";
  fromState: string;
  toState: string;
  source: "api" | "worker" | "admin" | "system";
  reason: string | null;
  correlationId: string | null;
  actorUserId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface ProvisioningDeadLetterJob {
  queueName: QueueName;
  deadLetterJobId: string;
  deadLetterJobName: string;
  originalJobName: string;
  organizationId: string | null;
  correlationId: string | null;
  failedJobId: string | null;
  failedAt: string | null;
  deadLetteredAt: string | null;
  attemptsMade: number | null;
  maxAttempts: number | null;
  errorMessage: string | null;
  payload: Record<string, unknown>;
}

export interface QueueRetryPolicy {
  attempts: number;
  backoffDelayMs: number;
  removeOnComplete: number;
  removeOnFail: number;
}

export interface RetryPolicySummary {
  default: QueueRetryPolicy;
  queue: Partial<Record<QueueName, QueueRetryPolicy>>;
  criticalJobs: Record<string, QueueRetryPolicy>;
}

interface ProvisioningFailureParams {
  queueName?: QueueName;
  organizationId?: string;
  limit?: number;
}

interface TransitionParams {
  organizationId?: string;
  correlationId?: string;
  domain?: "lifecycle" | "billing" | "provisioning";
  limit?: number;
}

export interface ReplayProvisioningFailureResult {
  queueName: QueueName;
  deadLetterJobId: string;
  replayJobId: string;
  originalJobName: string;
  organizationId: string | null;
  correlationId: string | null;
}

export function useAdminProvisioningFailures(params?: ProvisioningFailureParams) {
  return useQuery({
    queryKey: ["admin", "operations", "provisioning", "failures", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.queueName) searchParams.set("queueName", params.queueName);
      if (params?.organizationId)
        searchParams.set("organizationId", params.organizationId);
      if (params?.limit) searchParams.set("limit", String(params.limit));

      const qs = searchParams.toString();
      return get<{
        data: ProvisioningDeadLetterJob[];
        policies: RetryPolicySummary;
      }>(`/admin/operations/provisioning/failures${qs ? `?${qs}` : ""}`);
    },
  });
}

export function useAdminLifecycleTransitions(params?: TransitionParams) {
  return useQuery({
    queryKey: ["admin", "operations", "transitions", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.organizationId)
        searchParams.set("organizationId", params.organizationId);
      if (params?.correlationId)
        searchParams.set("correlationId", params.correlationId);
      if (params?.domain) searchParams.set("domain", params.domain);
      if (params?.limit) searchParams.set("limit", String(params.limit));

      const qs = searchParams.toString();
      return get<{ data: TransitionAuditEvent[] }>(
        `/admin/operations/lifecycle-transitions${qs ? `?${qs}` : ""}`,
      );
    },
  });
}

export function useAdminReplayProvisioningFailure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      queueName: QueueName;
      deadLetterJobId: string;
      reason?: string;
    }) => {
      return post<{
        success: boolean;
        data: ReplayProvisioningFailureResult;
      }>(
        `/admin/operations/provisioning/failures/${input.queueName}/${input.deadLetterJobId}/replay`,
        {
          reason: input.reason,
        },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "operations", "provisioning", "failures"],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "operations", "transitions"],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "operations", "metrics"],
      });
    },
  });
}
