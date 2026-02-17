import { Job, UnrecoverableError, Worker } from 'bullmq'
import { config } from '@/config'
import { setRequestContext } from '@/lib/context'
import logger from '@/lib/logger'
import Sentry from '@/lib/sentry'
import {
  getDeadLetterQueue,
  getQueueRegistry,
  initQueuesIfAvailable,
} from '@/queues'
import { resolveTaxonomyFromQueue } from '@/lib/error-taxonomy'
import {
  recordCampaignSendMetric,
  recordIntegrationSyncMetric,
  recordQueueJobMetric,
} from '@/services/operations-metrics.service'
import { isSuppressed, isWithinSendWindow } from '@/services/compliance.service'
import {
  AGENT_PROVISION_RETRY_JOB_NAME,
  AGENT_UPDATE_RETRY_JOB_NAME,
  retryAgentProvision,
  retryAgentUpdateSync,
} from '@/services/agent.service'
import {
  ELEVENLABS_WEBHOOK_RETRY_JOB_NAME,
  processElevenLabsConversationWebhook,
} from '@/services/agent-webhook.service'
import {
  AGENT_PROVISIONING_ORCHESTRATOR_JOB_NAME,
  processProvisioningOrchestrationJob,
} from '@/services/provisioning-orchestrator.service'
import {
  ALL_QUEUE_NAMES,
  QueueJobPayload,
  QueueName,
  QUEUE_NAMES,
} from '@/types/queues'
import { processQueuedIntegrationSyncJob } from '@/services/integration-contract.service'

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

interface QueueFailureClassification {
  recoverable: boolean
  code: string
  message: string
}

const classifyQueueFailure = (
  error: Error,
  fallbackCode: string,
): QueueFailureClassification => {
  const candidate = error as Error & { code?: string; cause?: unknown }
  const code =
    typeof candidate.code === 'string' && candidate.code.trim().length > 0
      ? candidate.code
      : fallbackCode

  const message =
    typeof candidate.message === 'string' && candidate.message.trim().length > 0
      ? candidate.message
      : 'Unknown queue worker failure'

  return {
    recoverable: !(error instanceof UnrecoverableError),
    code,
    message,
  }
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

export class WorkerRuntime {
  private readonly workers = new Map<QueueName, Worker<QueueJobPayload>>()
  private startedAt: string | null = null
  private lastHeartbeatAt: string | null = null

  async start() {
    if (this.workers.size > 0) {
      return
    }

    // Ensure queues are initialized before starting workers
    const queuesReady = await initQueuesIfAvailable()
    if (!queuesReady) {
      logger.warn('Redis unavailable - queue workers will not start')
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
          const classification = classifyQueueFailure(
            error,
            `queue_${queueName}_job_failed`,
          )

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

          if (!classification.recoverable || job.attemptsMade >= attempts) {
            await this.moveToDeadLetterQueue(queueName, job, error, {
              attemptsAllowed: attempts,
              attemptsMade: job.attemptsMade,
              classification,
            })
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
    const queueRegistry = getQueueRegistry()

    if (!queueRegistry) {
      return {
        started: false,
        startedAt: null,
        lastHeartbeatAt: null,
        queueWorkerCount: 0,
        queues: [],
      }
    }

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
          return this.handleWebhookIngestJob(job)
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
    if (job.name === AGENT_PROVISIONING_ORCHESTRATOR_JOB_NAME) {
      const provisioningJobId =
        typeof job.data.provisioningJobId === 'string'
          ? job.data.provisioningJobId
          : null

      if (!provisioningJobId) {
        throw new UnrecoverableError(
          'Invalid provisioning orchestrator queue payload',
        )
      }

      return processProvisioningOrchestrationJob({
        provisioningJobId,
        organizationId:
          typeof job.data.organizationId === 'string'
            ? job.data.organizationId
            : '',
        agentId: typeof job.data.agentId === 'string' ? job.data.agentId : '',
        correlationId:
          typeof job.data.correlationId === 'string'
            ? job.data.correlationId
            : `${job.id}`,
        idempotencyKey:
          typeof job.data.idempotencyKey === 'string'
            ? job.data.idempotencyKey
            : undefined,
      })
    }

    if (job.name === AGENT_PROVISION_RETRY_JOB_NAME) {
      const payload = job.data as any
      if (
        typeof payload.agentId !== 'string' ||
        typeof payload.organizationId !== 'string' ||
        typeof payload.providerCorrelationKey !== 'string'
      ) {
        throw new UnrecoverableError('Invalid agent provision retry payload')
      }
      return retryAgentProvision(payload)
    }

    if (job.name === AGENT_UPDATE_RETRY_JOB_NAME) {
      const payload = job.data as any
      if (
        typeof payload.agentId !== 'string' ||
        typeof payload.organizationId !== 'string' ||
        typeof payload.updates !== 'object'
      ) {
        throw new UnrecoverableError('Invalid agent update retry payload')
      }
      return retryAgentUpdateSync(payload)
    }

    const integrationJobId =
      typeof job.data.integrationJobId === 'string'
        ? job.data.integrationJobId
        : null
    const organizationId =
      typeof job.data.organizationId === 'string'
        ? job.data.organizationId
        : null
    const provider =
      typeof job.data.provider === 'string' ? job.data.provider : null

    if (!integrationJobId || !organizationId || !provider) {
      throw new UnrecoverableError('Invalid integration sync queue payload')
    }

    const direction =
      job.data.direction === 'pull' || job.data.direction === 'push'
        ? job.data.direction
        : 'pull'

    const result = await processQueuedIntegrationSyncJob({
      integrationJobId,
      organizationId,
      provider: provider as Parameters<
        typeof processQueuedIntegrationSyncJob
      >[0]['provider'],
      direction,
      correlationId:
        typeof job.data.correlationId === 'string'
          ? job.data.correlationId
          : undefined,
    })

    recordIntegrationSyncMetric({
      provider,
      success: true,
    })

    return result
  }

  private async handleWebhookIngestJob(job: Job<QueueJobPayload>) {
    if (job.name === ELEVENLABS_WEBHOOK_RETRY_JOB_NAME) {
      const webhookPayload = job.data.webhookPayload
      if (!webhookPayload || typeof webhookPayload !== 'object') {
        throw new UnrecoverableError('Invalid webhook retry payload')
      }
      const result = await processElevenLabsConversationWebhook(
        webhookPayload as any,
      )
      return {
        processed: true,
        recordingId: result.recording.id,
      }
    }

    logger.info(
      {
        queueName: QUEUE_NAMES.WEBHOOK_INGEST,
        jobId: job.id,
        jobName: job.name,
        organizationId: job.data.organizationId,
      },
      'Processed webhook ingest job',
    )

    return { processed: true }
  }

  private async moveToDeadLetterQueue(
    queueName: QueueName,
    job: Job<QueueJobPayload>,
    error: Error,
    metadata: {
      attemptsAllowed: number
      attemptsMade: number
      classification: QueueFailureClassification
    },
  ) {
    try {
      const dlq = getDeadLetterQueue(queueName)
      if (!dlq) {
        logger.warn(
          { queueName, jobId: job.id },
          'Dead letter queue not available',
        )
        return
      }
      await dlq.add(
        `${job.name}:dead-letter`,
        {
          ...job.data,
          failedJobId: job.id,
          failedAt: new Date().toISOString(),
          errorMessage: error.message,
          errorCode: metadata.classification.code,
          recoverable: metadata.classification.recoverable,
          attemptsAllowed: metadata.attemptsAllowed,
          attemptsMade: metadata.attemptsMade,
          queueName,
          jobName: job.name,
        },
        {
          attempts: 1,
          removeOnComplete: 1000,
          removeOnFail: 1000,
        },
      )
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
