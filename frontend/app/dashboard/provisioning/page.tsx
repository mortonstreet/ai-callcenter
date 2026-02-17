'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react'
import { useAgents } from '@/hooks/api/useAgent'
import { useCurrentOrganizationRole } from '@/hooks/api/useOrganization'
import {
  useLatestProvisioningByAgent,
  useProvisioningStatus,
  useProvisioningSteps,
  useRetryProvisioningJob,
} from '@/hooks/api/useProvisioning'
import {
  ProvisioningJobStatus,
  ProvisioningReadiness,
  ProvisioningStepStatus,
} from '@/lib/shared-types'

const STATUS_STYLES: Record<ProvisioningJobStatus, string> = {
  queued: 'bg-slate-100 text-slate-700',
  running: 'bg-blue-100 text-blue-800',
  retrying: 'bg-amber-100 text-amber-800',
  failed: 'bg-red-100 text-red-800',
  completed: 'bg-green-100 text-green-800',
  blocked_manual: 'bg-purple-100 text-purple-800',
}

const STEP_STYLES: Record<ProvisioningStepStatus, string> = {
  pending: 'bg-slate-100 text-slate-700',
  running: 'bg-blue-100 text-blue-800',
  failed: 'bg-red-100 text-red-800',
  completed: 'bg-green-100 text-green-800',
  skipped: 'bg-zinc-100 text-zinc-700',
}

const READINESS_STYLES: Record<ProvisioningReadiness, string> = {
  healthy: 'bg-green-100 text-green-800',
  degraded: 'bg-amber-100 text-amber-800',
  blocked: 'bg-red-100 text-red-800',
}

const RUNNING_STATUSES = new Set<ProvisioningJobStatus>([
  'queued',
  'running',
  'retrying',
])

const formatDateTime = (value: string | null) => {
  if (!value) return 'pending'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'pending'
  return parsed.toLocaleString()
}

export default function DashboardProvisioningPage() {
  const role = useCurrentOrganizationRole()
  const canRetry = role === 'admin' || role === 'owner'

  const {
    data: agents,
    isLoading: agentsLoading,
    error: agentsError,
  } = useAgents()

  const latestAgent = useMemo(() => {
    if (!agents || agents.length === 0) return null
    return [...agents].sort((a, b) => {
      const left = new Date(a.createdAt).getTime()
      const right = new Date(b.createdAt).getTime()
      return right - left
    })[0]
  }, [agents])

  const latestProvisioningQuery = useLatestProvisioningByAgent(latestAgent?.id)
  const jobId = latestProvisioningQuery.data?.jobId
  const provisioningStatusQuery = useProvisioningStatus(jobId)
  const provisioningStepsQuery = useProvisioningSteps(jobId)
  const retryProvisioningMutation = useRetryProvisioningJob(jobId)

  const provisioningStatus =
    provisioningStatusQuery.data || latestProvisioningQuery.data || null
  const steps =
    provisioningStepsQuery.data?.steps || provisioningStatus?.steps || []
  const isLoading =
    agentsLoading ||
    latestProvisioningQuery.isLoading ||
    (Boolean(jobId) && provisioningStatusQuery.isLoading)

  if (agentsError) {
    return (
      <div className="max-w-4xl mx-auto p-6 md:p-8">
        <h1 className="text-2xl font-semibold text-foreground">
          Provisioning status
        </h1>
        <p className="text-sm text-red-700 mt-2">
          Failed to load provisioning context.
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6 md:p-8">
        <h1 className="text-2xl font-semibold text-foreground">
          Provisioning status
        </h1>
        <div className="mt-6 flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading provisioning timeline...
        </div>
      </div>
    )
  }

  if (!latestAgent) {
    return (
      <div className="max-w-4xl mx-auto p-6 md:p-8">
        <h1 className="text-2xl font-semibold text-foreground">
          Provisioning status
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          No agents were found for this organization yet.
        </p>
      </div>
    )
  }

  if (!provisioningStatus) {
    return (
      <div className="max-w-4xl mx-auto p-6 md:p-8">
        <h1 className="text-2xl font-semibold text-foreground">
          Provisioning status
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Provisioning status is not available yet.
        </p>
      </div>
    )
  }

  const retryDisabled =
    !canRetry ||
    !provisioningStatus.retry.eligible ||
    retryProvisioningMutation.isPending

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Provisioning status
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Track setup progress, diagnose failures, and retry recoverable steps.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[provisioningStatus.status]}`}
          >
            {provisioningStatus.status}
          </span>
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-medium ${READINESS_STYLES[provisioningStatus.readiness]}`}
          >
            readiness: {provisioningStatus.readiness}
          </span>
          <span className="text-xs text-muted-foreground">
            job <span className="font-mono">{provisioningStatus.jobId}</span>
          </span>
          {RUNNING_STATUSES.has(provisioningStatus.status) && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              polling
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Started
            </p>
            <p className="text-sm text-foreground mt-1">
              {formatDateTime(provisioningStatus.startedAt)}
            </p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Updated
            </p>
            <p className="text-sm text-foreground mt-1">
              {formatDateTime(provisioningStatus.updatedAt)}
            </p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Retry Count
            </p>
            <p className="text-sm text-foreground mt-1">
              {provisioningStatus.retry.retryCount} /{' '}
              {provisioningStatus.retry.maxRetries}
            </p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Correlation ID
            </p>
            <p className="text-sm font-mono text-foreground mt-1 break-all">
              {provisioningStatus.correlationId}
            </p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Rollout Cohort
            </p>
            <p className="text-sm text-foreground mt-1">
              {provisioningStatus.rollout.cohort}
              {provisioningStatus.rollout.canary ? ' (canary)' : ''}
            </p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Feature Flag
            </p>
            <p className="text-sm text-foreground mt-1">
              {provisioningStatus.rollout.featureEnabled
                ? 'enabled'
                : 'disabled'}
              {provisioningStatus.rollout.paused ? ' - paused' : ''}
            </p>
          </div>
        </div>
      </div>

      {(provisioningStatus.lastError ||
        provisioningStatus.status === 'blocked_manual') && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-700 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900">
                {provisioningStatus.status === 'blocked_manual'
                  ? 'Provisioning is blocked'
                  : 'Provisioning failed on a retryable step'}
              </p>
              <p className="text-sm text-red-800 mt-1">
                {provisioningStatus.lastError?.message ||
                  provisioningStatus.retry.recommendedAction}
              </p>
              {provisioningStatus.lastError?.code && (
                <p className="text-xs text-red-700 mt-2 font-mono">
                  {provisioningStatus.lastError.code}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => retryProvisioningMutation.mutate(undefined)}
              disabled={retryDisabled}
              className="inline-flex items-center gap-2 rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-60"
            >
              <RotateCcw className="h-4 w-4" />
              {retryProvisioningMutation.isPending
                ? 'Queueing retry...'
                : 'Retry provisioning'}
            </button>
            {!canRetry && (
              <span className="inline-flex items-center gap-1 text-xs text-red-800">
                <ShieldAlert className="h-3.5 w-3.5" />
                Admin or owner role required to retry.
              </span>
            )}
            {canRetry && !provisioningStatus.retry.eligible && (
              <span className="text-xs text-red-800">
                {provisioningStatus.retry.recommendedAction}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Step timeline</h2>
        <div className="space-y-2">
          {steps.map((step) => (
            <div
              key={step.id}
              className="rounded-lg border border-border px-3 py-2 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
            >
              <div>
                <p className="text-sm font-medium text-foreground">
                  {step.order}. {step.name}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  attempt {step.attempt} • started{' '}
                  {formatDateTime(step.startedAt)}
                </p>
                {step.errorMessage && (
                  <p className="text-xs text-red-700 mt-1">
                    {step.errorMessage}
                  </p>
                )}
                {step.remediationAction && (
                  <p className="text-xs text-amber-700 mt-1">
                    {step.remediationAction}
                  </p>
                )}
              </div>
              <span
                className={`w-fit px-2.5 py-1 rounded-full text-xs font-medium ${STEP_STYLES[step.status]}`}
              >
                {step.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-foreground">
          Remediation links
        </h2>
        <div className="flex flex-wrap gap-3">
          {provisioningStatus.links.agentHealth ? (
            <Link
              href={provisioningStatus.links.agentHealth}
              className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
            >
              <CheckCircle2 className="h-4 w-4" />
              Agent health details
            </Link>
          ) : null}
          {provisioningStatus.links.recentLogs ? (
            <Link
              href={provisioningStatus.links.recentLogs}
              className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
            >
              View related logs
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  )
}
