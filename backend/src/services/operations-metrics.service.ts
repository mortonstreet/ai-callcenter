import { QueueName, QUEUE_NAMES } from '@/types/queues'
import type { ProvisioningStatusResponse } from '@/services/provisioning-status.service'

const SAMPLE_LIMIT = 240
const SLOW_QUERY_THRESHOLD_MS = 400
const WIZARD_STUCK_THRESHOLD_MS = 15 * 60 * 1000

type RouteMetric = {
  count: number
  errors: number
  totalDurationMs: number
  maxDurationMs: number
  recentDurationsMs: number[]
  lastStatusCode: number
  lastSeenAt: string
}

type QueueMetric = {
  processed: number
  failed: number
  totalLatencyMs: number
  maxLatencyMs: number
  recentLatenciesMs: number[]
  lastSeenAt: string | null
}

type IntegrationMetric = {
  success: number
  failure: number
}

type CampaignChannelMetric = {
  success: number
  failure: number
  blockedByCompliance: number
}

type DbPoolSnapshot = {
  total: number
  idle: number
  waiting: number
  max: number
}

const nowIso = () => new Date().toISOString()

const sortedPercentile = (values: number[], percentile: number): number => {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((percentile / 100) * sorted.length) - 1),
  )
  return sorted[index]
}

const pushSample = (target: number[], value: number) => {
  target.push(value)
  if (target.length > SAMPLE_LIMIT) {
    target.splice(0, target.length - SAMPLE_LIMIT)
  }
}

const routeMetrics = new Map<string, RouteMetric>()

const queueMetrics: Record<QueueName, QueueMetric> = {
  [QUEUE_NAMES.CAMPAIGN_VOICE]: {
    processed: 0,
    failed: 0,
    totalLatencyMs: 0,
    maxLatencyMs: 0,
    recentLatenciesMs: [],
    lastSeenAt: null,
  },
  [QUEUE_NAMES.CAMPAIGN_SMS]: {
    processed: 0,
    failed: 0,
    totalLatencyMs: 0,
    maxLatencyMs: 0,
    recentLatenciesMs: [],
    lastSeenAt: null,
  },
  [QUEUE_NAMES.CAMPAIGN_EMAIL]: {
    processed: 0,
    failed: 0,
    totalLatencyMs: 0,
    maxLatencyMs: 0,
    recentLatenciesMs: [],
    lastSeenAt: null,
  },
  [QUEUE_NAMES.INTEGRATION_SYNC]: {
    processed: 0,
    failed: 0,
    totalLatencyMs: 0,
    maxLatencyMs: 0,
    recentLatenciesMs: [],
    lastSeenAt: null,
  },
  [QUEUE_NAMES.WEBHOOK_INGEST]: {
    processed: 0,
    failed: 0,
    totalLatencyMs: 0,
    maxLatencyMs: 0,
    recentLatenciesMs: [],
    lastSeenAt: null,
  },
}

const integrationMetrics = new Map<string, IntegrationMetric>()

const campaignMetrics: Record<
  'sms' | 'voice' | 'email',
  CampaignChannelMetric
> = {
  sms: { success: 0, failure: 0, blockedByCompliance: 0 },
  voice: { success: 0, failure: 0, blockedByCompliance: 0 },
  email: { success: 0, failure: 0, blockedByCompliance: 0 },
}

const wizardProvisioningJobs = new Map<string, ProvisioningStatusResponse>()

const state = {
  startedAt: nowIso(),
  api: {
    totalRequests: 0,
    totalErrors: 0,
  },
  db: {
    slowQueries: 0,
    queryErrors: 0,
    lastSlowQueries: [] as Array<{
      durationMs: number
      queryPreview: string
      occurredAt: string
    }>,
    pool: {
      total: 0,
      idle: 0,
      waiting: 0,
      max: 0,
    } as DbPoolSnapshot,
  },
  redis: {
    commandErrors: 0,
    commandTimeouts: 0,
    lastErrorAt: null as string | null,
    lastTimeoutAt: null as string | null,
  },
}

const getOrCreateRouteMetric = (key: string): RouteMetric => {
  const current = routeMetrics.get(key)
  if (current) {
    return current
  }

  const created: RouteMetric = {
    count: 0,
    errors: 0,
    totalDurationMs: 0,
    maxDurationMs: 0,
    recentDurationsMs: [],
    lastStatusCode: 200,
    lastSeenAt: nowIso(),
  }

  routeMetrics.set(key, created)
  return created
}

export const recordApiRequestMetric = (input: {
  method: string
  route: string
  statusCode: number
  durationMs: number
}) => {
  const key = `${input.method.toUpperCase()} ${input.route}`
  const metric = getOrCreateRouteMetric(key)

  metric.count += 1
  metric.totalDurationMs += input.durationMs
  metric.maxDurationMs = Math.max(metric.maxDurationMs, input.durationMs)
  metric.lastStatusCode = input.statusCode
  metric.lastSeenAt = nowIso()
  pushSample(metric.recentDurationsMs, input.durationMs)

  state.api.totalRequests += 1
  if (input.statusCode >= 400) {
    metric.errors += 1
    state.api.totalErrors += 1
  }
}

export const recordDbQueryMetric = (input: {
  durationMs: number
  queryText?: string
  errored?: boolean
}) => {
  if (input.errored) {
    state.db.queryErrors += 1
  }

  if (input.durationMs < SLOW_QUERY_THRESHOLD_MS) {
    return
  }

  state.db.slowQueries += 1
  state.db.lastSlowQueries.push({
    durationMs: input.durationMs,
    queryPreview: (input.queryText || '').slice(0, 240),
    occurredAt: nowIso(),
  })

  if (state.db.lastSlowQueries.length > 40) {
    state.db.lastSlowQueries.splice(0, state.db.lastSlowQueries.length - 40)
  }
}

export const updateDbPoolMetric = (snapshot: DbPoolSnapshot) => {
  state.db.pool = snapshot
}

export const recordRedisCommandErrorMetric = () => {
  state.redis.commandErrors += 1
  state.redis.lastErrorAt = nowIso()
}

export const recordRedisTimeoutMetric = () => {
  state.redis.commandTimeouts += 1
  state.redis.lastTimeoutAt = nowIso()
}

export const recordQueueJobMetric = (input: {
  queueName: QueueName
  success: boolean
  latencyMs: number
}) => {
  const metric = queueMetrics[input.queueName]
  if (!metric) return

  metric.lastSeenAt = nowIso()
  metric.totalLatencyMs += input.latencyMs
  metric.maxLatencyMs = Math.max(metric.maxLatencyMs, input.latencyMs)
  pushSample(metric.recentLatenciesMs, input.latencyMs)

  if (input.success) {
    metric.processed += 1
  } else {
    metric.failed += 1
  }
}

export const recordIntegrationSyncMetric = (input: {
  provider: string
  success: boolean
}) => {
  const key = input.provider.trim().toLowerCase() || 'unknown'
  const current = integrationMetrics.get(key) || { success: 0, failure: 0 }
  if (input.success) {
    current.success += 1
  } else {
    current.failure += 1
  }
  integrationMetrics.set(key, current)
}

export const recordCampaignSendMetric = (input: {
  channel: 'sms' | 'voice' | 'email'
  outcome: 'success' | 'failure' | 'blockedByCompliance'
}) => {
  const metric = campaignMetrics[input.channel]
  metric[input.outcome] += 1
}

export const recordWizardProvisioningJobMetric = (
  job: ProvisioningStatusResponse,
) => {
  wizardProvisioningJobs.set(job.jobId, {
    ...job,
    steps: job.steps.map((step) => ({ ...step })),
    retry: { ...job.retry },
    rollout: { ...job.rollout },
    links: { ...job.links },
    lastError: job.lastError ? { ...job.lastError } : null,
  })
}

const summarizeRouteMetric = (metric: RouteMetric) => {
  const p95Ms = sortedPercentile(metric.recentDurationsMs, 95)
  const avgMs = metric.count > 0 ? metric.totalDurationMs / metric.count : 0

  return {
    count: metric.count,
    errors: metric.errors,
    errorRate: metric.count > 0 ? metric.errors / metric.count : 0,
    avgLatencyMs: Number(avgMs.toFixed(2)),
    p95LatencyMs: Number(p95Ms.toFixed(2)),
    maxLatencyMs: Number(metric.maxDurationMs.toFixed(2)),
    lastStatusCode: metric.lastStatusCode,
    lastSeenAt: metric.lastSeenAt,
  }
}

const summarizeQueueMetric = (metric: QueueMetric) => {
  const processedTotal = metric.processed + metric.failed
  const avgMs = processedTotal > 0 ? metric.totalLatencyMs / processedTotal : 0

  return {
    processed: metric.processed,
    failed: metric.failed,
    failureRate: processedTotal > 0 ? metric.failed / processedTotal : 0,
    avgLatencyMs: Number(avgMs.toFixed(2)),
    p95LatencyMs: Number(
      sortedPercentile(metric.recentLatenciesMs, 95).toFixed(2),
    ),
    maxLatencyMs: Number(metric.maxLatencyMs.toFixed(2)),
    lastSeenAt: metric.lastSeenAt,
  }
}

const parseIsoTime = (value: string | null | undefined): number | null => {
  if (!value) return null
  const parsed = new Date(value).getTime()
  return Number.isFinite(parsed) ? parsed : null
}

const summarizeWizardProvisioningMetrics = () => {
  const jobs = [...wizardProvisioningJobs.values()]
  const now = Date.now()
  const statusCounts: Record<string, number> = {
    queued: 0,
    running: 0,
    retrying: 0,
    failed: 0,
    completed: 0,
    blocked_manual: 0,
  }
  const readinessCounts: Record<'healthy' | 'degraded' | 'blocked', number> = {
    healthy: 0,
    degraded: 0,
    blocked: 0,
  }
  const stepFailures: Record<string, number> = {}
  const retryDistribution: Record<string, number> = {}
  const repeatedDegradedRetriesByStep: Record<string, number> = {}
  const completionLatenciesMs: number[] = []
  const stuckRunningJobs: Array<{
    jobId: string
    status: string
    minutesRunning: number
    lastUpdatedAt: string
  }> = []

  for (const job of jobs) {
    statusCounts[job.status] = (statusCounts[job.status] || 0) + 1
    readinessCounts[job.readiness] += 1

    const retryCountBucket = String(Math.max(0, job.retry.retryCount || 0))
    retryDistribution[retryCountBucket] =
      (retryDistribution[retryCountBucket] || 0) + 1

    const startedAt = parseIsoTime(job.startedAt)
    const completedAt = parseIsoTime(job.completedAt)
    if (startedAt && completedAt && completedAt >= startedAt) {
      completionLatenciesMs.push(completedAt - startedAt)
    }

    if (
      (job.status === 'running' ||
        job.status === 'retrying' ||
        job.status === 'queued') &&
      startedAt &&
      now - startedAt >= WIZARD_STUCK_THRESHOLD_MS
    ) {
      stuckRunningJobs.push({
        jobId: job.jobId,
        status: job.status,
        minutesRunning: Number(((now - startedAt) / 60000).toFixed(1)),
        lastUpdatedAt: job.updatedAt,
      })
    }

    for (const step of job.steps) {
      if (step.status === 'failed') {
        stepFailures[step.id] = (stepFailures[step.id] || 0) + 1
      }

      if (
        job.readiness === 'degraded' &&
        job.retry.retryCount >= 2 &&
        (step.status === 'failed' || step.status === 'running')
      ) {
        repeatedDegradedRetriesByStep[step.id] =
          (repeatedDegradedRetriesByStep[step.id] || 0) + 1
      }
    }
  }

  const totalJobs = jobs.length
  const blockedActivations = readinessCounts.blocked
  const avgLatencyMs =
    completionLatenciesMs.length > 0
      ? completionLatenciesMs.reduce((acc, value) => acc + value, 0) /
        completionLatenciesMs.length
      : 0

  return {
    totalJobs,
    statusCounts,
    completionLatencyMs: {
      count: completionLatenciesMs.length,
      avg: Number(avgLatencyMs.toFixed(2)),
      p95: Number(sortedPercentile(completionLatenciesMs, 95).toFixed(2)),
      max: Number(Math.max(0, ...completionLatenciesMs).toFixed(2)),
    },
    stepFailureRate:
      totalJobs > 0
        ? Number(
            (
              Object.values(stepFailures).reduce(
                (acc, value) => acc + value,
                0,
              ) / totalJobs
            ).toFixed(4),
          )
        : 0,
    stepFailures,
    retryDistribution,
    readiness: {
      ...readinessCounts,
      healthyRate:
        totalJobs > 0
          ? Number((readinessCounts.healthy / totalJobs).toFixed(4))
          : 0,
      degradedRate:
        totalJobs > 0
          ? Number((readinessCounts.degraded / totalJobs).toFixed(4))
          : 0,
      blockedRate:
        totalJobs > 0
          ? Number((readinessCounts.blocked / totalJobs).toFixed(4))
          : 0,
    },
    blockedActivations,
    stuckRunningJobs,
    repeatedDegradedRetriesByStep,
  }
}

export const getOperationsMetricsSnapshot = () => {
  const routes = Object.fromEntries(
    [...routeMetrics.entries()].map(([key, metric]) => [
      key,
      summarizeRouteMetric(metric),
    ]),
  )

  const queues = {
    [QUEUE_NAMES.CAMPAIGN_VOICE]: summarizeQueueMetric(
      queueMetrics[QUEUE_NAMES.CAMPAIGN_VOICE],
    ),
    [QUEUE_NAMES.CAMPAIGN_SMS]: summarizeQueueMetric(
      queueMetrics[QUEUE_NAMES.CAMPAIGN_SMS],
    ),
    [QUEUE_NAMES.CAMPAIGN_EMAIL]: summarizeQueueMetric(
      queueMetrics[QUEUE_NAMES.CAMPAIGN_EMAIL],
    ),
    [QUEUE_NAMES.INTEGRATION_SYNC]: summarizeQueueMetric(
      queueMetrics[QUEUE_NAMES.INTEGRATION_SYNC],
    ),
    [QUEUE_NAMES.WEBHOOK_INGEST]: summarizeQueueMetric(
      queueMetrics[QUEUE_NAMES.WEBHOOK_INGEST],
    ),
  }

  const integrationByProvider = Object.fromEntries(
    [...integrationMetrics.entries()].map(([provider, metric]) => [
      provider,
      metric,
    ]),
  )

  const integrationTotals = [...integrationMetrics.values()].reduce(
    (acc, item) => {
      acc.success += item.success
      acc.failure += item.failure
      return acc
    },
    { success: 0, failure: 0 },
  )

  return {
    generatedAt: nowIso(),
    startedAt: state.startedAt,
    api: {
      totalRequests: state.api.totalRequests,
      totalErrors: state.api.totalErrors,
      errorRate:
        state.api.totalRequests > 0
          ? state.api.totalErrors / state.api.totalRequests
          : 0,
      routes,
    },
    db: {
      slowQueries: state.db.slowQueries,
      queryErrors: state.db.queryErrors,
      pool: state.db.pool,
      lastSlowQueries: state.db.lastSlowQueries,
    },
    redis: {
      commandErrors: state.redis.commandErrors,
      commandTimeouts: state.redis.commandTimeouts,
      lastErrorAt: state.redis.lastErrorAt,
      lastTimeoutAt: state.redis.lastTimeoutAt,
    },
    queues,
    integrations: {
      totals: integrationTotals,
      byProvider: integrationByProvider,
    },
    campaigns: {
      byChannel: campaignMetrics,
    },
    wizardProvisioning: summarizeWizardProvisioningMetrics(),
  }
}
