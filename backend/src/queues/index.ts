import { JobsOptions, Queue } from 'bullmq'
import { config } from '@/config'
import {
  ALL_QUEUE_NAMES,
  DEAD_LETTER_QUEUE_SUFFIX,
  QueueJobPayload,
  QueueName,
} from '@/types/queues'

const DEFAULT_ATTEMPTS = 5
const DEFAULT_BACKOFF_DELAY_MS = 2000

const queueConnection = {
  url: config.redis.url,
  ...(config.redis.useTLS && {
    tls: {
      rejectUnauthorized: false,
    },
  }),
}

const createQueue = (name: string) =>
  new Queue<QueueJobPayload>(name, {
    connection: queueConnection,
    defaultJobOptions: {
      attempts: DEFAULT_ATTEMPTS,
      backoff: {
        type: 'exponential',
        delay: DEFAULT_BACKOFF_DELAY_MS,
      },
      removeOnComplete: 500,
      removeOnFail: 500,
    },
  })

export const queueRegistry: Record<QueueName, Queue<QueueJobPayload>> = {
  campaign_voice: createQueue('campaign_voice'),
  campaign_sms: createQueue('campaign_sms'),
  campaign_email: createQueue('campaign_email'),
  integration_sync: createQueue('integration_sync'),
  webhook_ingest: createQueue('webhook_ingest'),
}

export const deadLetterQueueRegistry: Record<
  QueueName,
  Queue<QueueJobPayload>
> = {
  campaign_voice: createQueue(`campaign_voice_${DEAD_LETTER_QUEUE_SUFFIX}`),
  campaign_sms: createQueue(`campaign_sms_${DEAD_LETTER_QUEUE_SUFFIX}`),
  campaign_email: createQueue(`campaign_email_${DEAD_LETTER_QUEUE_SUFFIX}`),
  integration_sync: createQueue(`integration_sync_${DEAD_LETTER_QUEUE_SUFFIX}`),
  webhook_ingest: createQueue(`webhook_ingest_${DEAD_LETTER_QUEUE_SUFFIX}`),
}

export const getQueue = (queueName: QueueName): Queue<QueueJobPayload> => {
  return queueRegistry[queueName]
}

export const getDeadLetterQueue = (
  queueName: QueueName,
): Queue<QueueJobPayload> => {
  return deadLetterQueueRegistry[queueName]
}

export const enqueueQueueJob = async (
  queueName: QueueName,
  jobName: string,
  payload: QueueJobPayload,
  options: JobsOptions = {},
) => {
  const queue = getQueue(queueName)
  const derivedJobId =
    payload.idempotencyKey && !options.jobId
      ? `${jobName}:${payload.idempotencyKey}`
      : undefined

  return queue.add(jobName, payload, {
    attempts: DEFAULT_ATTEMPTS,
    backoff: {
      type: 'exponential',
      delay: DEFAULT_BACKOFF_DELAY_MS,
    },
    removeOnComplete: 500,
    removeOnFail: 500,
    ...options,
    ...(derivedJobId ? { jobId: derivedJobId } : {}),
  })
}

export const closeAllQueues = async () => {
  const allQueues = [
    ...ALL_QUEUE_NAMES.map((queueName) => queueRegistry[queueName]),
    ...ALL_QUEUE_NAMES.map((queueName) => deadLetterQueueRegistry[queueName]),
  ]

  await Promise.all(allQueues.map((queue) => queue.close()))
}
