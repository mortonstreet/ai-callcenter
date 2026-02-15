import { Job, Worker } from 'bullmq'
import { config } from '@/config'
import { setRequestContext } from '@/lib/context'
import logger from '@/lib/logger'
import Sentry from '@/lib/sentry'
import { getDeadLetterQueue } from '@/queues'
import {
  ALL_QUEUE_NAMES,
  QueueJobPayload,
  QueueName,
  QUEUE_NAMES,
} from '@/types/queues'
import {
  IntegrationSyncQueuePayload,
  processQueuedIntegrationSyncJob,
} from '@/services/integration-contract.service'
import { supportedIntegrationProviders } from '@/services/integrations/provider-adapters'

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

const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === 'string' && value.trim().length > 0
}

export class WorkerRuntime {
  private readonly workers = new Map<QueueName, Worker<QueueJobPayload>>()

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

        worker.on('failed', async (job, error) => {
          if (!job) return

          const attempts = Number(job.opts.attempts || 1)
          if (job.attemptsMade >= attempts) {
            await this.moveToDeadLetterQueue(queueName, job, error)
          }
        })

        worker.on('error', (error) => {
          logger.error({ error, queueName }, 'Queue worker failed')
          Sentry.captureException(error, {
            tags: { scope: 'worker', queue: queueName },
          })
        })

        await worker.waitUntilReady()
        this.workers.set(queueName, worker)
      }),
    )

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
  }

  private async processJob(queueName: QueueName, job: Job<QueueJobPayload>) {
    setRequestContext('requestId', `worker-${String(job.id)}`)
    setRequestContext('jobId', String(job.id))

    switch (queueName) {
      case QUEUE_NAMES.INTEGRATION_SYNC:
        return this.handleIntegrationSyncJob(job)
      case QUEUE_NAMES.CAMPAIGN_VOICE:
      case QUEUE_NAMES.CAMPAIGN_SMS:
      case QUEUE_NAMES.CAMPAIGN_EMAIL:
      case QUEUE_NAMES.WEBHOOK_INGEST:
        logger.info(
          {
            queueName,
            jobId: job.id,
            jobName: job.name,
            organizationId: job.data.organizationId,
          },
          'Processed queue job',
        )
        return { processed: true }
      default:
        throw new Error(`Unhandled queue name: ${queueName}`)
    }
  }

  private async handleIntegrationSyncJob(job: Job<QueueJobPayload>) {
    const {
      integrationJobId,
      organizationId,
      provider,
      direction,
      correlationId,
    } = job.data

    if (
      !isNonEmptyString(integrationJobId) ||
      !isNonEmptyString(organizationId) ||
      !isNonEmptyString(provider) ||
      !isNonEmptyString(direction)
    ) {
      throw new Error('Invalid integration sync queue payload')
    }

    if (
      !supportedIntegrationProviders.includes(
        provider as (typeof supportedIntegrationProviders)[number],
      )
    ) {
      throw new Error(`Unsupported integration provider: ${provider}`)
    }

    if (direction !== 'pull' && direction !== 'push') {
      throw new Error(`Unsupported integration sync direction: ${direction}`)
    }

    return processQueuedIntegrationSyncJob({
      integrationJobId,
      organizationId,
      provider,
      direction,
      correlationId: isNonEmptyString(correlationId)
        ? correlationId
        : undefined,
    } as IntegrationSyncQueuePayload)
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

export const workerRuntime = new WorkerRuntime()
