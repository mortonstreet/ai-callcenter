import { Job, Worker } from 'bullmq'
import { config } from '@/config'
import { setRequestContext } from '@/lib/context'
import logger from '@/lib/logger'
import Sentry from '@/lib/sentry'
import { getDeadLetterQueue, queueRegistry } from '@/queues'
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
import { startSyncJob } from '@/services/integration-contract.service'
import {
  AGENT_PROVISION_RETRY_JOB_NAME,
  AGENT_UPDATE_RETRY_JOB_NAME,
  retryAgentProvision,
  retryAgentUpdateSync,
} from '@/services/agent.service'
import {
  processTwilioIsvProvisioningJob,
  TWILIO_ISV_PROVISION_ORG_JOB_NAME,
} from '@/services/twilio-isv-provisioning.service'

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
            await this.moveToDeadLetterQueue(queueName, job, error)
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
      const agentId =
        typeof job.data.agentId === 'string' ? job.data.agentId : null
      const organizationId =
        typeof job.data.organizationId === 'string'
          ? job.data.organizationId
          : null
      const companyName =
        typeof job.data.companyName === 'string' ? job.data.companyName : null
      const name = typeof job.data.name === 'string' ? job.data.name : null
      const providerCorrelationKey =
        typeof job.data.providerCorrelationKey === 'string'
          ? job.data.providerCorrelationKey
          : null

      if (
        !agentId ||
        !organizationId ||
        !companyName ||
        !name ||
        !providerCorrelationKey
      ) {
        throw new Error('Invalid agent provision retry payload')
      }

      return retryAgentProvision({
        ...job.data,
        agentId,
        organizationId,
        companyName,
        name,
        providerCorrelationKey,
      })
    }

    if (job.name === AGENT_UPDATE_RETRY_JOB_NAME) {
      const agentId =
        typeof job.data.agentId === 'string' ? job.data.agentId : null
      const organizationId =
        typeof job.data.organizationId === 'string'
          ? job.data.organizationId
          : null
      const updates = job.data.updates

      if (
        !agentId ||
        !organizationId ||
        !updates ||
        typeof updates !== 'object'
      ) {
        throw new Error('Invalid agent update retry payload')
      }

      return retryAgentUpdateSync({
        ...job.data,
        agentId,
        organizationId,
        updates,
      })
    }

    if (job.name === TWILIO_ISV_PROVISION_ORG_JOB_NAME) {
      const organizationId =
        typeof job.data.organizationId === 'string'
          ? job.data.organizationId
          : null

      if (!organizationId) {
        throw new Error('Invalid Twilio ISV provisioning payload')
      }

      return processTwilioIsvProvisioningJob({
        ...job.data,
        organizationId,
        areaCode:
          typeof job.data.areaCode === 'string' ? job.data.areaCode : undefined,
      })
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

    if (!organizationId || !provider) {
      throw new Error('Invalid integration sync queue payload')
    }

    const result = startSyncJob(
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
  ) {
    try {
      await getDeadLetterQueue(queueName).add(
        `${job.name}:dead-letter`,
        {
          ...job.data,
          failedJobId: job.id,
          failedAt: new Date().toISOString(),
          errorMessage: error.message,
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
