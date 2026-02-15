import { Job, Worker } from 'bullmq'
import { config } from '@/config'
import logger from '@/lib/logger'
import Sentry from '@/lib/sentry'
import { setRequestContext } from '@/lib/context'
import { getRedis } from '@/lib/redis'
import { getQueueConnection } from '@/queues/connection'
import { getDeadLetterQueue, getQueue, queueRegistry } from '@/queues'
import { QueueMetricsEmitter } from '@/queues/metrics'
import {
  ALL_QUEUE_NAMES,
  QueueJobPayload,
  QueueName,
  QUEUE_NAMES,
  READY_ENROLLMENT_JOB_ID,
  READY_ENROLLMENT_JOB_NAME,
  ReadyEnrollmentJobPayload,
} from '@/types/queues'

const IDEMPOTENCY_LOCK_TTL_SECONDS = 24 * 60 * 60
const READY_ENROLLMENT_REPEAT_MS = 60 * 1000
const WORKER_HEARTBEAT_PREFIX = 'revcenter:worker:heartbeat'

const queueConcurrencyByName: Record<QueueName, number> = {
  campaign_voice: config.queues.concurrency.campaignVoice,
  campaign_sms: config.queues.concurrency.campaignSms,
  campaign_email: config.queues.concurrency.campaignEmail,
  integration_sync: config.queues.concurrency.integrationSync,
  webhook_ingest: config.queues.concurrency.webhookIngest,
}

export interface WorkerRuntimeHealth {
  started: boolean
  startedAt: string | null
  lastHeartbeatAt: string | null
  queueWorkerCount: number
  queues: Awaited<ReturnType<QueueMetricsEmitter['getSnapshots']>>
}

export class WorkerRuntime {
  private readonly workers = new Map<QueueName, Worker<QueueJobPayload>>()
  private readonly metrics = new QueueMetricsEmitter(queueRegistry)
  private startedAt: string | null = null
  private lastHeartbeatAt: string | null = null
  private heartbeatTimer: NodeJS.Timeout | null = null

  async start() {
    if (this.startedAt) {
      logger.info(
        'Worker runtime already started; skipping duplicate start call',
      )
      return
    }

    await this.registerRecurringJobs()
    await this.startWorkers()
    this.metrics.start()
    this.startHeartbeatLoop()

    this.startedAt = new Date().toISOString()
    logger.info(
      {
        deployEnv: config.deployEnv,
        queues: ALL_QUEUE_NAMES,
      },
      'Worker runtime started',
    )
  }

  async stop() {
    this.metrics.stop()

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }

    await Promise.all(
      [...this.workers.values()].map(async (worker) => {
        try {
          await worker.close()
        } catch (error) {
          logger.error({ error }, 'Failed to close worker cleanly')
        }
      }),
    )

    this.workers.clear()
    this.startedAt = null
  }

  async getHealth(): Promise<WorkerRuntimeHealth> {
    return {
      started: this.startedAt !== null,
      startedAt: this.startedAt,
      lastHeartbeatAt: this.lastHeartbeatAt,
      queueWorkerCount: this.workers.size,
      queues: await this.metrics.getSnapshots(),
    }
  }

  private async startWorkers() {
    await Promise.all(
      ALL_QUEUE_NAMES.map(async (queueName) => {
        const worker = new Worker<QueueJobPayload>(
          queueName,
          async (job) => this.processJob(queueName, job),
          {
            connection: getQueueConnection(),
            concurrency:
              queueConcurrencyByName[queueName] ||
              config.queues.defaultConcurrency,
          },
        )

        worker.on('completed', (job) => {
          this.metrics.recordProcessed(queueName, getJobLatency(job))
        })

        worker.on('failed', async (job, error) => {
          if (!job) return

          const attempts = Number(job.opts.attempts || 1)
          this.metrics.recordFailed(queueName, job.attemptsMade, attempts)

          if (job.attemptsMade >= attempts) {
            await this.moveToDeadLetterQueue(queueName, job, error)
          }
        })

        worker.on('error', (error) => {
          logger.error({ error, queueName }, 'Worker process error')
          Sentry.captureException(error, {
            tags: {
              scope: 'worker',
              queue: queueName,
            },
          })
        })

        await worker.waitUntilReady()
        this.workers.set(queueName, worker)
      }),
    )
  }

  private async processJob(queueName: QueueName, job: Job<QueueJobPayload>) {
    setRequestContext('requestId', `worker-${job.id}`)
    setRequestContext('jobId', String(job.id))

    try {
      const isDuplicate = await this.isDuplicateJob(queueName, job)
      if (isDuplicate) {
        logger.warn(
          {
            queueName,
            jobId: job.id,
            idempotencyKey: job.data.idempotencyKey,
          },
          'Skipping duplicate idempotent job',
        )
        return { skipped: true }
      }

      switch (queueName) {
        case QUEUE_NAMES.CAMPAIGN_VOICE:
          return this.handleCampaignVoiceJob(job)
        case QUEUE_NAMES.CAMPAIGN_SMS:
          return this.handleCampaignSmsJob(job)
        case QUEUE_NAMES.CAMPAIGN_EMAIL:
          return this.handleCampaignEmailJob(job)
        case QUEUE_NAMES.INTEGRATION_SYNC:
          return this.handleIntegrationSyncJob(job)
        case QUEUE_NAMES.WEBHOOK_INGEST:
          return this.handleWebhookIngestJob(job)
        default:
          throw new Error(`Unhandled queue name: ${queueName}`)
      }
    } catch (error) {
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
        },
        extra: {
          jobId: job.id,
          payload: job.data,
        },
      })

      throw error
    }
  }

  private async handleCampaignVoiceJob(job: Job<QueueJobPayload>) {
    if (job.name === READY_ENROLLMENT_JOB_NAME) {
      return this.handleReadyEnrollmentScan(
        job as Job<ReadyEnrollmentJobPayload>,
      )
    }

    logger.info(
      {
        queueName: QUEUE_NAMES.CAMPAIGN_VOICE,
        jobId: job.id,
        jobName: job.name,
        organizationId: job.data.organizationId,
      },
      'Processed voice campaign job',
    )

    return { processed: true }
  }

  private async handleCampaignSmsJob(job: Job<QueueJobPayload>) {
    logger.info(
      {
        queueName: QUEUE_NAMES.CAMPAIGN_SMS,
        jobId: job.id,
        jobName: job.name,
        organizationId: job.data.organizationId,
      },
      'Processed SMS campaign job',
    )

    return { processed: true }
  }

  private async handleCampaignEmailJob(job: Job<QueueJobPayload>) {
    logger.info(
      {
        queueName: QUEUE_NAMES.CAMPAIGN_EMAIL,
        jobId: job.id,
        jobName: job.name,
        organizationId: job.data.organizationId,
      },
      'Processed email campaign job',
    )

    return { processed: true }
  }

  private async handleIntegrationSyncJob(job: Job<QueueJobPayload>) {
    logger.info(
      {
        queueName: QUEUE_NAMES.INTEGRATION_SYNC,
        jobId: job.id,
        jobName: job.name,
        organizationId: job.data.organizationId,
      },
      'Processed integration sync job',
    )

    return { processed: true }
  }

  private async handleWebhookIngestJob(job: Job<QueueJobPayload>) {
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

  private async handleReadyEnrollmentScan(
    job: Job<ReadyEnrollmentJobPayload>,
  ): Promise<{ processed: boolean }> {
    logger.info(
      {
        queueName: QUEUE_NAMES.CAMPAIGN_VOICE,
        jobId: job.id,
        jobName: job.name,
        requestedAt: job.data.requestedAt,
      },
      'Processed ready-enrollment scheduler job',
    )

    return { processed: true }
  }

  private async registerRecurringJobs() {
    const campaignVoiceQueue = getQueue(QUEUE_NAMES.CAMPAIGN_VOICE)
    const repeatableJobs = await campaignVoiceQueue.getRepeatableJobs()

    for (const repeatableJob of repeatableJobs) {
      if (
        repeatableJob.name === READY_ENROLLMENT_JOB_NAME &&
        repeatableJob.id !== READY_ENROLLMENT_JOB_ID
      ) {
        await campaignVoiceQueue.removeRepeatableByKey(repeatableJob.key)
      }
    }

    await campaignVoiceQueue.add(
      READY_ENROLLMENT_JOB_NAME,
      {
        requestedAt: new Date().toISOString(),
      },
      {
        jobId: READY_ENROLLMENT_JOB_ID,
        repeat: {
          every: READY_ENROLLMENT_REPEAT_MS,
        },
        attempts: 1,
        removeOnComplete: true,
        removeOnFail: 100,
      },
    )
  }

  private async startHeartbeatLoop() {
    await this.publishHeartbeat()

    this.heartbeatTimer = setInterval(() => {
      void this.publishHeartbeat()
    }, config.worker.heartbeatIntervalMs)

    this.heartbeatTimer.unref?.()
  }

  private async publishHeartbeat() {
    const heartbeatKey = `${WORKER_HEARTBEAT_PREFIX}:${config.deployEnv}`
    const heartbeatAt = new Date().toISOString()

    await getRedis().set(
      heartbeatKey,
      JSON.stringify({
        heartbeatAt,
        pid: process.pid,
        deployEnv: config.deployEnv,
      }),
      'EX',
      Math.max(1, Math.floor(config.worker.heartbeatTtlMs / 1000)),
    )

    this.lastHeartbeatAt = heartbeatAt
  }

  private async isDuplicateJob(
    queueName: QueueName,
    job: Job<QueueJobPayload>,
  ) {
    const idempotencyKey = job.data.idempotencyKey
    if (!idempotencyKey) return false

    const redisKey = `revcenter:idempotency:${queueName}:${idempotencyKey}`
    const lockResult = await getRedis().set(
      redisKey,
      JSON.stringify({ jobId: job.id, at: new Date().toISOString() }),
      'EX',
      IDEMPOTENCY_LOCK_TTL_SECONDS,
      'NX',
    )

    return lockResult !== 'OK'
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
