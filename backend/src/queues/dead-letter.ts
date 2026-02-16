import { QueueJobPayload, QueueName } from '@/types/queues'

export const DEAD_LETTER_METADATA_KEY = '_deadLetter'

export interface DeadLetterMetadata {
  queueName: QueueName
  originalJobName: string
  failedJobId: string | null
  failedAt: string
  deadLetteredAt: string
  errorMessage: string
  attemptsMade: number
  maxAttempts: number
  correlationId: string | null
}

export type DeadLetterPayload = QueueJobPayload & {
  [DEAD_LETTER_METADATA_KEY]?: DeadLetterMetadata
}

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }
  return value as Record<string, unknown>
}

const asString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const asNumber = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null
  }
  return value
}

export const buildDeadLetterPayload = (input: {
  queueName: QueueName
  originalJobName: string
  payload: QueueJobPayload
  failedJobId: string | null
  failedAt: string
  errorMessage: string
  attemptsMade: number
  maxAttempts: number
  correlationId: string | null
}): DeadLetterPayload => {
  return {
    ...input.payload,
    failedJobId: input.failedJobId,
    failedAt: input.failedAt,
    errorMessage: input.errorMessage,
    [DEAD_LETTER_METADATA_KEY]: {
      queueName: input.queueName,
      originalJobName: input.originalJobName,
      failedJobId: input.failedJobId,
      failedAt: input.failedAt,
      deadLetteredAt: new Date().toISOString(),
      errorMessage: input.errorMessage,
      attemptsMade: input.attemptsMade,
      maxAttempts: input.maxAttempts,
      correlationId: input.correlationId,
    },
  }
}

export const extractDeadLetterMetadata = (
  payload: QueueJobPayload,
): DeadLetterMetadata | null => {
  const payloadRecord = asRecord(payload)
  if (!payloadRecord) {
    return null
  }

  const wrapped = payloadRecord[DEAD_LETTER_METADATA_KEY]
  const meta = asRecord(wrapped)

  if (!meta) {
    return null
  }

  const queueName = asString(meta.queueName)
  const originalJobName = asString(meta.originalJobName)
  const failedAt = asString(meta.failedAt)
  const deadLetteredAt = asString(meta.deadLetteredAt)
  const errorMessage = asString(meta.errorMessage)
  const attemptsMade = asNumber(meta.attemptsMade)
  const maxAttempts = asNumber(meta.maxAttempts)

  if (
    !queueName ||
    !originalJobName ||
    !failedAt ||
    !deadLetteredAt ||
    !errorMessage ||
    attemptsMade === null ||
    maxAttempts === null
  ) {
    return null
  }

  return {
    queueName: queueName as QueueName,
    originalJobName,
    failedJobId: asString(meta.failedJobId),
    failedAt,
    deadLetteredAt,
    errorMessage,
    attemptsMade,
    maxAttempts,
    correlationId: asString(meta.correlationId),
  }
}

export const stripDeadLetterEnvelope = (
  payload: QueueJobPayload,
): QueueJobPayload => {
  const base = asRecord(payload)

  if (!base) {
    return payload
  }

  const next = { ...base }
  delete next[DEAD_LETTER_METADATA_KEY]
  delete next.failedJobId
  delete next.failedAt
  delete next.errorMessage

  return next
}
