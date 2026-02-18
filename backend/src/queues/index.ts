import { JobsOptions, Queue } from 'bullmq'
import Redis from 'ioredis'
import { config } from '@/config'
import logger from '@/lib/logger'
import {
  ALL_QUEUE_NAMES,
  DEAD_LETTER_QUEUE_SUFFIX,
  QueueJobPayload,
  QueueName,
} from '@/types/queues'

const DEFAULT_ATTEMPTS = 5
const DEFAULT_BACKOFF_DELAY_MS = 2000

const toSafeQueueJobId = (jobId: string): string => {
  return encodeURIComponent(jobId.trim())
}

const queueConnection = {
  url: config.redis.url,
  ...(config.redis.useTLS && {
    tls: {
      rejectUnauthorized: false,
    },
  }),
}

let _redisAvailable: boolean | null = null
let _lastRedisCheck = 0
const REDIS_CHECK_INTERVAL_MS = 60_000

const checkRedisAvailable = async (
  options: { forceCheck?: boolean } = {},
): Promise<boolean> => {
  const now = Date.now()
  if (
    !options.forceCheck &&
    _redisAvailable !== null &&
    now - _lastRedisCheck < REDIS_CHECK_INTERVAL_MS
  ) {
    return _redisAvailable
  }

  try {
    const testConn = new Redis(config.redis.url, {
      ...(config.redis.useTLS ? { tls: { rejectUnauthorized: false } } : {}),
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      lazyConnect: true,
    })
    await testConn.connect()
    await testConn.ping()
    await testConn.quit()
    _redisAvailable = true
  } catch {
    _redisAvailable = false
  }
  _lastRedisCheck = now
  return _redisAvailable
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

export class QueueUnavailableError extends Error {
  code: 'QUEUE_UNAVAILABLE'
  queueName: QueueName
  jobName: string

  constructor(input: { queueName: QueueName; jobName: string }) {
    super(
      `Queue "${input.queueName}" is unavailable; cannot enqueue job "${input.jobName}"`,
    )
    this.name = 'QueueUnavailableError'
    this.code = 'QUEUE_UNAVAILABLE'
    this.queueName = input.queueName
    this.jobName = input.jobName
  }
}

// Lazy queue registries - only created when Redis is available
let _queueRegistry: Record<QueueName, Queue<QueueJobPayload>> | null = null
let _deadLetterQueueRegistry: Record<QueueName, Queue<QueueJobPayload>> | null =
  null

const initQueues = () => {
  if (!_queueRegistry) {
    _queueRegistry = {
      campaign_voice: createQueue('campaign_voice'),
      campaign_sms: createQueue('campaign_sms'),
      campaign_email: createQueue('campaign_email'),
      integration_sync: createQueue('integration_sync'),
      webhook_ingest: createQueue('webhook_ingest'),
      onboarding_provisioning: createQueue('onboarding_provisioning'),
    }
  }
  if (!_deadLetterQueueRegistry) {
    _deadLetterQueueRegistry = {
      campaign_voice: createQueue(`campaign_voice_${DEAD_LETTER_QUEUE_SUFFIX}`),
      campaign_sms: createQueue(`campaign_sms_${DEAD_LETTER_QUEUE_SUFFIX}`),
      campaign_email: createQueue(`campaign_email_${DEAD_LETTER_QUEUE_SUFFIX}`),
      integration_sync: createQueue(
        `integration_sync_${DEAD_LETTER_QUEUE_SUFFIX}`,
      ),
      webhook_ingest: createQueue(`webhook_ingest_${DEAD_LETTER_QUEUE_SUFFIX}`),
      onboarding_provisioning: createQueue(
        `onboarding_provisioning_${DEAD_LETTER_QUEUE_SUFFIX}`,
      ),
    }
  }
  return {
    queueRegistry: _queueRegistry,
    deadLetterQueueRegistry: _deadLetterQueueRegistry,
  }
}

// Expose getter that lazily initializes (for workers/admin that need direct access)
export const getQueueRegistry = (): Record<
  QueueName,
  Queue<QueueJobPayload>
> | null => {
  return _queueRegistry
}

export const getQueue = (
  queueName: QueueName,
): Queue<QueueJobPayload> | null => {
  if (!_queueRegistry) return null
  return _queueRegistry[queueName]
}

export const getDeadLetterQueue = (
  queueName: QueueName,
): Queue<QueueJobPayload> | null => {
  if (!_deadLetterQueueRegistry) return null
  return _deadLetterQueueRegistry[queueName]
}

/**
 * Initialize queues if Redis is available. Returns true if queues were initialized.
 */
export const initQueuesIfAvailable = async (
  options: { forceCheck?: boolean } = {},
): Promise<boolean> => {
  if (_queueRegistry && _deadLetterQueueRegistry) {
    return true
  }

  const available = await checkRedisAvailable(options)
  if (available) {
    initQueues()
    logger.info('Redis available - queues initialized')
    return true
  }
  logger.warn(
    'Redis unavailable - queues will not be initialized. The app will continue without queue support.',
  )
  return false
}

export const enqueueQueueJob = async (
  queueName: QueueName,
  jobName: string,
  payload: QueueJobPayload,
  options: JobsOptions = {},
) => {
  if (!_queueRegistry) {
    await initQueuesIfAvailable()
  }

  const queue = getQueue(queueName)
  if (!queue) {
    const queueError = new QueueUnavailableError({ queueName, jobName })
    logger.error(
      { queueName, jobName },
      'Cannot enqueue job - Redis/queues not available.',
    )
    throw queueError
  }

  const explicitJobId =
    typeof options.jobId === 'string' && options.jobId.trim().length > 0
      ? toSafeQueueJobId(options.jobId)
      : undefined

  if (
    typeof options.jobId === 'string' &&
    explicitJobId &&
    explicitJobId !== options.jobId
  ) {
    logger.debug(
      {
        queueName,
        jobName,
        originalJobId: options.jobId,
        normalizedJobId: explicitJobId,
      },
      'Normalized queue job ID for BullMQ compatibility',
    )
  }

  const derivedJobId =
    payload.idempotencyKey && !explicitJobId
      ? toSafeQueueJobId(`${jobName}:${payload.idempotencyKey}`)
      : undefined

  const resolvedJobId = explicitJobId || derivedJobId

  return queue.add(jobName, payload, {
    attempts: DEFAULT_ATTEMPTS,
    backoff: {
      type: 'exponential',
      delay: DEFAULT_BACKOFF_DELAY_MS,
    },
    removeOnComplete: 500,
    removeOnFail: 500,
    ...options,
    ...(resolvedJobId ? { jobId: resolvedJobId } : {}),
  })
}

export const closeAllQueues = async () => {
  if (!_queueRegistry || !_deadLetterQueueRegistry) return

  const allQueues = [
    ...ALL_QUEUE_NAMES.map((queueName) => _queueRegistry![queueName]),
    ...ALL_QUEUE_NAMES.map((queueName) => _deadLetterQueueRegistry![queueName]),
  ]

  await Promise.all(allQueues.map((queue) => queue.close()))
}
