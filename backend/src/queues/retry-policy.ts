import { QueueName, QUEUE_NAMES } from '@/types/queues'

export const PROVISIONING_RETRY_JOB_NAMES = [
  'agent-provision-retry',
  'agent-update-retry',
] as const

type ProvisioningRetryJobName = (typeof PROVISIONING_RETRY_JOB_NAMES)[number]

export interface QueueRetryPolicy {
  attempts: number
  backoffDelayMs: number
  removeOnComplete: number
  removeOnFail: number
}

export const DEFAULT_QUEUE_RETRY_POLICY: QueueRetryPolicy = {
  attempts: 5,
  backoffDelayMs: 2000,
  removeOnComplete: 500,
  removeOnFail: 500,
}

const QUEUE_RETRY_POLICIES: Partial<Record<QueueName, QueueRetryPolicy>> = {
  [QUEUE_NAMES.INTEGRATION_SYNC]: {
    attempts: 4,
    backoffDelayMs: 5000,
    removeOnComplete: 500,
    removeOnFail: 500,
  },
  [QUEUE_NAMES.WEBHOOK_INGEST]: {
    attempts: 4,
    backoffDelayMs: 3000,
    removeOnComplete: 500,
    removeOnFail: 500,
  },
}

const CRITICAL_JOB_RETRY_POLICIES: Partial<
  Record<
    `${QueueName}:${ProvisioningRetryJobName}`,
    QueueRetryPolicy
  >
> = {
  [`${QUEUE_NAMES.INTEGRATION_SYNC}:agent-provision-retry`]: {
    attempts: 6,
    backoffDelayMs: 10_000,
    removeOnComplete: 1000,
    removeOnFail: 1000,
  },
  [`${QUEUE_NAMES.INTEGRATION_SYNC}:agent-update-retry`]: {
    attempts: 5,
    backoffDelayMs: 7500,
    removeOnComplete: 1000,
    removeOnFail: 1000,
  },
}

const buildQueueJobKey = (queueName: QueueName, jobName: string) => {
  return `${queueName}:${jobName}` as const
}

export const isProvisioningRetryJobName = (
  value: unknown,
): value is ProvisioningRetryJobName => {
  return (
    value === 'agent-provision-retry' || value === 'agent-update-retry'
  )
}

export const resolveQueueRetryPolicy = (
  queueName: QueueName,
  jobName?: string,
): QueueRetryPolicy => {
  if (jobName) {
    const explicit = CRITICAL_JOB_RETRY_POLICIES[
      buildQueueJobKey(queueName, jobName) as keyof typeof CRITICAL_JOB_RETRY_POLICIES
    ]
    if (explicit) {
      return explicit
    }
  }

  const queuePolicy = QUEUE_RETRY_POLICIES[queueName]
  if (queuePolicy) {
    return queuePolicy
  }

  return DEFAULT_QUEUE_RETRY_POLICY
}

export const listQueueRetryPolicies = () => {
  return {
    default: DEFAULT_QUEUE_RETRY_POLICY,
    queue: QUEUE_RETRY_POLICIES,
    criticalJobs: CRITICAL_JOB_RETRY_POLICIES,
  }
}
