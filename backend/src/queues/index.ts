import { JobsOptions, Queue } from 'bullmq'
import { config } from '@/config'
import {
  ALL_QUEUE_NAMES,
  DEAD_LETTER_QUEUE_SUFFIX,
  QueueJobPayload,
  QueueName,
} from '@/types/queues'
import {
  QueueRetryPolicy,
  listQueueRetryPolicies,
  resolveQueueRetryPolicy,
} from './retry-policy'

const queueConnection = {
  url: config.redis.url,
  ...(config.redis.useTLS && {
    tls: {
      rejectUnauthorized: false,
    },
  }),
}

const toJobOptions = (policy: QueueRetryPolicy): JobsOptions => {
  return {
    attempts: policy.attempts,
    backoff: {
      type: 'exponential',
      delay: policy.backoffDelayMs,
    },
    removeOnComplete: policy.removeOnComplete,
    removeOnFail: policy.removeOnFail,
  }
}

const createQueue = (queueName: QueueName) =>
  new Queue<QueueJobPayload>(queueName, {
    connection: queueConnection,
    defaultJobOptions: toJobOptions(resolveQueueRetryPolicy(queueName)),
  })

const createDeadLetterQueue = (name: string) =>
  new Queue<QueueJobPayload>(name, {
    connection: queueConnection,
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: 1000,
      removeOnFail: 1000,
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
  campaign_voice: createDeadLetterQueue(
    `campaign_voice_${DEAD_LETTER_QUEUE_SUFFIX}`,
  ),
  campaign_sms: createDeadLetterQueue(`campaign_sms_${DEAD_LETTER_QUEUE_SUFFIX}`),
  campaign_email: createDeadLetterQueue(
    `campaign_email_${DEAD_LETTER_QUEUE_SUFFIX}`,
  ),
  integration_sync: createDeadLetterQueue(
    `integration_sync_${DEAD_LETTER_QUEUE_SUFFIX}`,
  ),
  webhook_ingest: createDeadLetterQueue(`webhook_ingest_${DEAD_LETTER_QUEUE_SUFFIX}`),
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

  const retryPolicy = resolveQueueRetryPolicy(queueName, jobName)

  return queue.add(
    jobName,
    payload,
    {
      ...toJobOptions(retryPolicy),
      ...options,
      ...(derivedJobId ? { jobId: derivedJobId } : {}),
    },
  )
}

export const getQueueRetryPolicies = () => {
  return listQueueRetryPolicies()
}

export const closeAllQueues = async () => {
  const allQueues = [
    ...ALL_QUEUE_NAMES.map((queueName) => queueRegistry[queueName]),
    ...ALL_QUEUE_NAMES.map((queueName) => deadLetterQueueRegistry[queueName]),
  ]

  await Promise.all(allQueues.map((queue) => queue.close()))
}
