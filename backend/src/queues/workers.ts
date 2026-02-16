import { Job, Worker } from 'bullmq'
import { config } from '@/config'
import { setRequestContext } from '@/lib/context'
import logger from '@/lib/logger'
import Sentry from '@/lib/sentry'
import {
  enqueueQueueJob,
  getDeadLetterQueue,
  getQueueRetryPolicies,
  queueRegistry,
} from '@/queues'
import { resolveTaxonomyFromQueue } from '@/lib/error-taxonomy'
import {
  recordCampaignSendMetric,
  recordIntegrationSyncMetric,
  recordQueueJobMetric,
} from '@/services/operations-metrics.service'
import { isSuppressed, isWithinSendWindow } from '@/services/compliance.service'
import {
  ALL_QUEUE_NAMES,
  QueueJobPayload,
  QueueName,
  QUEUE_NAMES,
} from '@/types/queues'
import {
  processQueuedIntegrationSyncJob,
  startSyncJob,
} from '@/services/integration-contract.service'
import {
  AGENT_PROVISION_RETRY_JOB_NAME,
  AGENT_UPDATE_RETRY_JOB_NAME,
  AgentProvisionRetryPayload,
  AgentUpdateRetryPayload,
  retryAgentProvision,
  retryAgentUpdateSync,
} from '@/services/agent.service'
import {
  buildDeadLetterPayload,
  extractDeadLetterMetadata,
  stripDeadLetterEnvelope,
} from './dead-letter'
import { isProvisioningRetryJobName } from './retry-policy'
import { emitTransitionAuditEvent } from '@/services/lifecycle-transition-audit.service'

const DEFAULT_QUEUE_CONCURRENCY = 5
const INTEGRATION_SYNC_CONCURRENCY = 4

const queueConnection = {
  url: config.redis.url,
  ...(config.redis.useTLS && {
    tls: {
      rejectUnauthorized: false,
    },
  }),
}

const getConcurrencyForQueue = (queueName: QueueName) => {
  if (queueName === QUEUE_NAMES.INTEGRATION_SYNC) {
    return INTEGRATION_SYNC_CONCURRENCY
  }
  return DEFAULT_QUEUE_CONCURRENCY
}

const toCampaignChannel = (
  queueName: QueueName,
): 'sms' | 'voice' | 'email' | null => {
  if (queueName === QUEUE_NAMES.CAMPAIGN_SMS) return 'sms'
  if (queueName === QUEUE_NAMES.CAMPAIGN_VOICE) return 'voice'
  if (queueName === QUEUE_NAMES.CAMPAIGN_EMAIL) return 'email'
  return null
}

const asString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const toDateSortValue = (value: string | null): number => {
  if (!value) {
    return 0
  }
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

interface WorkerQueueHealthSnapshot {
  queueName: QueueName
  depth: {
    waiting: number
    active: number
    delayed: number
    completed: number
    failed: number
  }
}

export interface WorkerRuntimeHealth {
  started: boolean
  startedAt: string | null
  lastHeartbeatAt: string | null
  queueWorkerCount: number
  queues: WorkerQueueHealthSnapshot[]
}

export interface DeadLetterQueueJobSnapshot {
  queueName: QueueName
  deadLetterJobId: string
  deadLetterJobName: string
  originalJobName: string
  organizationId: string | null
  correlationId: string | null
  failedJobId: string | null
  failedAt: string | null
  deadLetteredAt: string | null
  attemptsMade: number | null
  maxAttempts: number | null
  errorMessage: string | null
  payload: QueueJobPayload
}

interface ListDeadLetterJobsInput {
  queueName?: QueueName
  organizationId?: string
  limit?: number
}

interface ReplayDeadLetterJobInput {
  queueName: QueueName
  deadLetterJobId: string
  actorUserId?: string | null
  reason?: string
}

export interface ReplayDeadLetterJobResult {
  queueName: QueueName
  deadLetterJobId: string
  replayJobId: string
  originalJobName: string
  organizationId: string | null
  correlationId: string | null
}

const toDeadLetterSnapshot = (
  queueName: QueueName,
  job: Job<QueueJobPayload>,
): DeadLetterQueueJobSnapshot => {
  const metadata = extractDeadLetterMetadata(job.data)
  const originalPayload = stripDeadLetterEnvelope(job.data)
  const organizationId = asString(originalPayload.organizationId)

  return {
    queueName,
    deadLetterJobId: String(job.id),
    deadLetterJobName: job.name,
    originalJobName:
      metadata?.originalJobName || job.name.replace(/:dead-letter$/, ''),
    organizationId,
    correlationId:
      asString(originalPayload.correlationId) || metadata?.correlationId || null,
    failedJobId: metadata?.failedJobId || asString(job.data.failedJobId),
    failedAt: metadata?.failedAt || asString(job.data.failedAt),
    deadLetteredAt: metadata?.deadLetteredAt || null,
    attemptsMade:
      metadata?.attemptsMade ||
      (typeof job.attemptsMade === 'number' ? job.attemptsMade : null),
    maxAttempts:
      metadata?.maxAttempts ||
      (typeof job.opts.attempts === 'number' ? job.opts.attempts : null),
    errorMessage: metadata?.errorMessage || asString(job.data.errorMessage),
    payload: originalPayload,
  }
}

export class WorkerRuntime {
  private readonly workers = new Map<QueueName, Worker<QueueJobPayload>>()
  private startedAt: string | null = null
  private lastHeartbeatAt: string | null = null

  async start() {
    if (this.workers.size > 0) {
      return
    }

    await Promise.all(
      ALL_QUEUE_NAMES.map(async (queueName) => {
        const worker = new Worker<QueueJobPayload>(
          queueName,
          async (job) => this.processJob(queueName, job),
          {
            connection: queueConnection,
            concurrency: getConcurrencyForQueue(queueName),
          },
        )

        worker.on('completed', (job, result) => {
          const latency = getJobLatency(job)
          recordQueueJobMetric({
            queueName,
            success: true,
            latencyMs: latency ?? 0,
          })

          const campaignChannel = toCampaignChannel(queueName)
          if (campaignChannel) {
            if (
              result &&
              (result as { blockedByCompliance?: boolean }).blockedByCompliance
            ) {
              recordCampaignSendMetric({
                channel: campaignChannel,
                outcome: 'blockedByCompliance',
              })
            } else {
              recordCampaignSendMetric({
                channel: campaignChannel,
                outcome: 'success',
              })
            }
          }
        })

        worker.on('failed', async (job, error) => {
          if (!job) return

          const attempts = Number(job.opts.attempts || 1)
          const latency = getJobLatency(job)

          recordQueueJobMetric({
            queueName,
            success: false,
            latencyMs: latency ?? 0,
          })

          const campaignChannel = toCampaignChannel(queueName)
          if (campaignChannel) {
            recordCampaignSendMetric({
              channel: campaignChannel,
              outcome: 'failure',
            })
          }

          if (queueName === QUEUE_NAMES.INTEGRATION_SYNC) {
            recordIntegrationSyncMetric({
              provider:
                typeof job.data.provider === 'string'
                  ? job.data.provider
                  : 'unknown',
              success: false,
            })
          }

          if (job.attemptsMade >= attempts) {
            await this.moveToDeadLetterQueue(queueName, job, error, attempts)
          }
        })

        worker.on('error', (error) => {
          const taxonomy = resolveTaxonomyFromQueue(queueName)
          logger.error({ error, queueName }, 'Queue worker failed')
          Sentry.captureException(error, {
            tags: {
              scope: 'worker',
              queue: queueName,
              taxonomy,
            },
          })
        })

        await worker.waitUntilReady()
        this.workers.set(queueName, worker)
      }),
    )

    this.startedAt = new Date().toISOString()
    logger.info({ queues: ALL_QUEUE_NAMES }, 'Queue workers started')
  }

  async stop() {
    await Promise.all(
      [...this.workers.values()].map(async (worker) => {
        try {
          await worker.close()
        } catch (error) {
          logger.error({ error }, 'Failed to close queue worker')
        }
      }),
    )
    this.workers.clear()
    this.startedAt = null
    this.lastHeartbeatAt = null
  }

  async getHealth(): Promise<WorkerRuntimeHealth> {
    const queueSnapshots = await Promise.all(
      ALL_QUEUE_NAMES.map(async (queueName) => {
        const counts = await queueRegistry[queueName].getJobCounts(
          'waiting',
          'active',
          'delayed',
          'completed',
          'failed',
        )

        return {
          queueName,
          depth: {
            waiting: counts.waiting,
            active: counts.active,
            delayed: counts.delayed,
            completed: counts.completed,
            failed: counts.failed,
          },
        }
      }),
    )

    return {
      started: this.workers.size > 0,
      startedAt: this.startedAt,
      lastHeartbeatAt: this.lastHeartbeatAt,
      queueWorkerCount: this.workers.size,
      queues: queueSnapshots,
    }
  }

  getRetryPolicySummary() {
    return getQueueRetryPolicies()
  }

  async listDeadLetterJobs(
    input: ListDeadLetterJobsInput = {},
  ): Promise<DeadLetterQueueJobSnapshot[]> {
    const limit = Math.max(1, Math.min(200, input.limit || 50))
    const queueNames = input.queueName ? [input.queueName] : ALL_QUEUE_NAMES

    const jobsByQueue = await Promise.all(
      queueNames.map(async (queueName) => {
        const deadLetterQueue = getDeadLetterQueue(queueName)
        const jobs = await deadLetterQueue.getJobs(
          ['waiting', 'active', 'delayed', 'completed', 'failed'],
          0,
          limit - 1,
        )
        return jobs.map((job) => toDeadLetterSnapshot(queueName, job))
      }),
    )

    let snapshots = jobsByQueue.flat()

    const organizationId = asString(input.organizationId)
    if (organizationId) {
      snapshots = snapshots.filter(
        (snapshot) => snapshot.organizationId === organizationId,
      )
    }

    snapshots.sort((a, b) => {
      const aTime = Math.max(
        toDateSortValue(a.deadLetteredAt),
        toDateSortValue(a.failedAt),
      )
      const bTime = Math.max(
        toDateSortValue(b.deadLetteredAt),
        toDateSortValue(b.failedAt),
      )
      return bTime - aTime
    })

    return snapshots.slice(0, limit)
  }

  async replayDeadLetterJob(
    input: ReplayDeadLetterJobInput,
  ): Promise<ReplayDeadLetterJobResult | null> {
    const deadLetterQueue = getDeadLetterQueue(input.queueName)
    const deadLetterJob = await deadLetterQueue.getJob(input.deadLetterJobId)

    if (!deadLetterJob) {
      return null
    }

    const deadLetterMetadata = extractDeadLetterMetadata(deadLetterJob.data)
    const originalJobName =
      deadLetterMetadata?.originalJobName ||
      deadLetterJob.name.replace(/:dead-letter$/, '')
    const replayPayload = stripDeadLetterEnvelope(deadLetterJob.data)

    const replayedJob = await enqueueQueueJob(
      input.queueName,
      originalJobName,
      replayPayload,
      {
        jobId: `replay:${input.queueName}:${input.deadLetterJobId}:${Date.now()}`,
      },
    )

    await deadLetterJob.remove()

    const organizationId = asString(replayPayload.organizationId)
    const correlationId =
      asString(replayPayload.correlationId) ||
      deadLetterMetadata?.correlationId ||
      null

    if (organizationId && isProvisioningRetryJobName(originalJobName)) {
      await emitTransitionAuditEvent({
        organizationId,
        domain: 'provisioning',
        fromState: 'failed',
        toState: 'retry_queued',
        source: 'admin',
        actorUserId: input.actorUserId || null,
        correlationId,
        reason: input.reason || 'operator_replay',
        metadata: {
          queueName: input.queueName,
          deadLetterJobId: input.deadLetterJobId,
          replayJobId: replayedJob.id,
          originalJobName,
        },
      })
    }

    return {
      queueName: input.queueName,
      deadLetterJobId: input.deadLetterJobId,
      replayJobId: String(replayedJob.id),
      originalJobName,
      organizationId,
      correlationId,
    }
  }

  private async processJob(queueName: QueueName, job: Job<QueueJobPayload>) {
    this.lastHeartbeatAt = new Date().toISOString()
    setRequestContext('requestId', `worker-${String(job.id)}`)
    setRequestContext('jobId', String(job.id))
    setRequestContext('service', 'worker')
    setRequestContext('operation', `${queueName}:${job.name}`)
    setRequestContext(
      'organizationId',
      typeof job.data.organizationId === 'string'
        ? job.data.organizationId
        : undefined,
    )
    setRequestContext(
      'correlationId',
      typeof job.data.correlationId === 'string'
        ? job.data.correlationId
        : `worker-${job.id}`,
    )

    try {
      switch (queueName) {
        case QUEUE_NAMES.INTEGRATION_SYNC:
          return this.handleIntegrationSyncJob(job)
        case QUEUE_NAMES.CAMPAIGN_VOICE:
        case QUEUE_NAMES.CAMPAIGN_SMS:
        case QUEUE_NAMES.CAMPAIGN_EMAIL: {
          if (this.isCampaignBlockedByCompliance(queueName, job)) {
            return { processed: false, blockedByCompliance: true }
          }

          logger.info(
            {
              queueName,
              jobId: job.id,
              jobName: job.name,
              organizationId: job.data.organizationId,
            },
            'Processed campaign queue job',
          )
          return { processed: true }
        }
        case QUEUE_NAMES.WEBHOOK_INGEST:
          logger.info(
            {
              queueName,
              jobId: job.id,
              jobName: job.name,
              organizationId: job.data.organizationId,
            },
            'Processed webhook ingest job',
          )
          return { processed: true }
        default:
          throw new Error(`Unhandled queue name: ${queueName}`)
      }
    } catch (error) {
      const taxonomy = resolveTaxonomyFromQueue(queueName)
      logger.error(
        {
          queueName,
          jobId: job.id,
          jobName: job.name,
          payload: job.data,
          error,
        },
        'Queue job processing failed',
      )

      Sentry.captureException(error, {
        tags: {
          scope: 'worker',
          queue: queueName,
          job_name: job.name,
          taxonomy,
        },
        extra: {
          jobId: job.id,
          payload: job.data,
        },
      })

      throw error
    }
  }

  private isCampaignBlockedByCompliance(
    queueName: QueueName,
    job: Job<QueueJobPayload>,
  ) {
    const organizationId =
      typeof job.data.organizationId === 'string'
        ? job.data.organizationId
        : null

    if (!organizationId) {
      return false
    }

    const timezone =
      typeof job.data.timezone === 'string' ? job.data.timezone : undefined
    const sendWindowStart =
      typeof job.data.sendWindowStart === 'string'
        ? job.data.sendWindowStart
        : undefined
    const sendWindowEnd =
      typeof job.data.sendWindowEnd === 'string'
        ? job.data.sendWindowEnd
        : undefined

    if (
      !isWithinSendWindow({
        timezone,
        sendWindowStart,
        sendWindowEnd,
      })
    ) {
      logger.warn(
        {
          queueName,
          jobId: job.id,
          organizationId,
          timezone: timezone || config.timezone,
          sendWindowStart: sendWindowStart || '09:00',
          sendWindowEnd: sendWindowEnd || '20:00',
        },
        'Blocked campaign send outside local send window',
      )
      return true
    }

    if (queueName === QUEUE_NAMES.CAMPAIGN_SMS) {
      const phone =
        typeof job.data.phone === 'string'
          ? job.data.phone
          : typeof job.data.to === 'string'
            ? job.data.to
            : undefined
      const email =
        typeof job.data.email === 'string' ? job.data.email : undefined

      if (
        isSuppressed({
          organizationId,
          phone,
          email,
        })
      ) {
        logger.warn(
          {
            queueName,
            jobId: job.id,
            organizationId,
            phone: phone || null,
            email: email || null,
          },
          'Blocked SMS send due to suppression list match',
        )
        return true
      }
    }

    return false
  }

  private async handleIntegrationSyncJob(job: Job<QueueJobPayload>) {
    if (job.name === AGENT_PROVISION_RETRY_JOB_NAME) {
      const result = await retryAgentProvision(
        job.data as AgentProvisionRetryPayload,
      )
      recordIntegrationSyncMetric({
        provider: 'elevenlabs',
        success: true,
      })
      return result
    }

    if (job.name === AGENT_UPDATE_RETRY_JOB_NAME) {
      const result = await retryAgentUpdateSync(job.data as AgentUpdateRetryPayload)
      recordIntegrationSyncMetric({
        provider: 'elevenlabs',
        success: true,
      })
      return result
    }

    const organizationId =
      typeof job.data.organizationId === 'string'
        ? job.data.organizationId
        : null
    const provider =
      typeof job.data.provider === 'string' ? job.data.provider : null
    const direction =
      job.data.direction === 'pull' || job.data.direction === 'push'
        ? job.data.direction
        : 'pull'
    const correlationId = asString(job.data.correlationId)

    if (typeof job.data.integrationJobId === 'string' && provider) {
      if (!organizationId) {
        throw new Error('Integration sync queue payload is missing organizationId')
      }

      const result = await processQueuedIntegrationSyncJob({
        integrationJobId: job.data.integrationJobId,
        organizationId,
        provider: provider as Parameters<typeof startSyncJob>[1],
        direction,
        correlationId: correlationId || undefined,
      })

      recordIntegrationSyncMetric({
        provider,
        success: true,
      })

      return result
    }

    if (!organizationId || !provider) {
      throw new Error('Invalid integration sync queue payload')
    }

    const result = await startSyncJob(
      organizationId,
      provider as Parameters<typeof startSyncJob>[1],
      direction,
    )

    recordIntegrationSyncMetric({
      provider,
      success: true,
    })

    return result
  }

  private async moveToDeadLetterQueue(
    queueName: QueueName,
    job: Job<QueueJobPayload>,
    error: Error,
    maxAttempts: number,
  ) {
    const failedAt = new Date().toISOString()
    const correlationId = asString(job.data.correlationId)

    try {
      await getDeadLetterQueue(queueName).add(
        `${job.name}:dead-letter`,
        buildDeadLetterPayload({
          queueName,
          originalJobName: job.name,
          payload: job.data,
          failedJobId: job.id ? String(job.id) : null,
          failedAt,
          errorMessage: error.message,
          attemptsMade: job.attemptsMade,
          maxAttempts,
          correlationId,
        }),
        {
          attempts: 1,
          removeOnComplete: 1000,
          removeOnFail: 1000,
        },
      )

      const organizationId = asString(job.data.organizationId)
      if (
        organizationId &&
        queueName === QUEUE_NAMES.INTEGRATION_SYNC &&
        isProvisioningRetryJobName(job.name)
      ) {
        await emitTransitionAuditEvent({
          organizationId,
          domain: 'provisioning',
          fromState: 'retrying',
          toState: 'failed',
          source: 'worker',
          reason: 'retry_attempts_exhausted',
          correlationId,
          metadata: {
            queueName,
            jobName: job.name,
            jobId: job.id,
            attemptsMade: job.attemptsMade,
            maxAttempts,
            errorMessage: error.message,
          },
        })
      }
    } catch (deadLetterError) {
      logger.error(
        {
          queueName,
          jobId: job.id,
          error: deadLetterError,
        },
        'Failed to move job to dead-letter queue',
      )
    }
  }
}

const getJobLatency = (job: Job<QueueJobPayload>): number | null => {
  if (!job.finishedOn || !job.processedOn) return null
  return Math.max(0, job.finishedOn - job.processedOn)
}

export const workerRuntime = new WorkerRuntime()
