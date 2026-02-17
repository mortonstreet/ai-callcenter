import { Queue } from 'bullmq'
import { config } from '@/config'
import logger from '@/lib/logger'
import Sentry from '@/lib/sentry'
import { QueueJobPayload, QueueName } from '@/types/queues'

interface QueueCounter {
  processed: number
  failed: number
  retried: number
  latencySamples: number[]
}

interface QueueDepth {
  waiting: number
  active: number
  delayed: number
  completed: number
  failed: number
}

export interface QueueMetricsSnapshot {
  queueName: QueueName
  processed: number
  failed: number
  retried: number
  failureRate: number
  averageLatencyMs: number
  p95LatencyMs: number
  depth: QueueDepth
}

const MAX_LATENCY_SAMPLES = 200
const ALERT_COOLDOWN_MS = 5 * 60 * 1000
const P0_BACKLOG_THRESHOLD = 1000
const P1_FAILURE_RATE_THRESHOLD = 0.25

export class QueueMetricsEmitter {
  private readonly counters: Record<QueueName, QueueCounter>
  private timer: NodeJS.Timeout | null = null
  private readonly lastAlertAt = new Map<string, number>()

  constructor(
    private readonly queues: Record<QueueName, Queue<QueueJobPayload>>,
  ) {
    this.counters = Object.keys(queues).reduce(
      (acc, queueName) => {
        acc[queueName as QueueName] = {
          processed: 0,
          failed: 0,
          retried: 0,
          latencySamples: [],
        }
        return acc
      },
      {} as Record<QueueName, QueueCounter>,
    )
  }

  start() {
    if (this.timer) return

    this.timer = setInterval(
      () => {
        void this.flush()
      },
      (config as any).queues?.metricsFlushIntervalMs ?? 30_000,
    )

    this.timer.unref?.()
  }

  stop() {
    if (!this.timer) return
    clearInterval(this.timer)
    this.timer = null
  }

  recordProcessed(queueName: QueueName, latencyMs: number | null) {
    const counter = this.counters[queueName]
    counter.processed += 1

    if (latencyMs !== null && Number.isFinite(latencyMs) && latencyMs >= 0) {
      counter.latencySamples.push(latencyMs)
      if (counter.latencySamples.length > MAX_LATENCY_SAMPLES) {
        counter.latencySamples.shift()
      }
    }
  }

  recordFailed(
    queueName: QueueName,
    attemptsMade: number,
    configuredAttempts: number,
  ) {
    const counter = this.counters[queueName]
    counter.failed += 1

    if (attemptsMade < configuredAttempts) {
      counter.retried += 1
    }
  }

  async flush() {
    const snapshots = await this.getSnapshots()

    for (const snapshot of snapshots) {
      logger.info(
        {
          metric: 'queue_runtime',
          queueName: snapshot.queueName,
          processed: snapshot.processed,
          failed: snapshot.failed,
          retried: snapshot.retried,
          failureRate: snapshot.failureRate,
          averageLatencyMs: snapshot.averageLatencyMs,
          p95LatencyMs: snapshot.p95LatencyMs,
          depth: snapshot.depth,
        },
        'Queue metrics snapshot',
      )

      this.maybeEmitAlerts(snapshot)
    }
  }

  async getSnapshots(): Promise<QueueMetricsSnapshot[]> {
    const snapshots: QueueMetricsSnapshot[] = []

    for (const [queueName, queue] of Object.entries(this.queues) as [
      QueueName,
      Queue<QueueJobPayload>,
    ][]) {
      const counter = this.counters[queueName]
      const queueCounts = await queue.getJobCounts(
        'waiting',
        'active',
        'delayed',
        'completed',
        'failed',
      )
      const failureDenominator = counter.processed + counter.failed
      const failureRate =
        failureDenominator > 0 ? counter.failed / failureDenominator : 0
      const averageLatencyMs = calculateAverage(counter.latencySamples)
      const p95LatencyMs = calculatePercentile(counter.latencySamples, 0.95)

      snapshots.push({
        queueName,
        processed: counter.processed,
        failed: counter.failed,
        retried: counter.retried,
        failureRate,
        averageLatencyMs,
        p95LatencyMs,
        depth: {
          waiting: queueCounts.waiting,
          active: queueCounts.active,
          delayed: queueCounts.delayed,
          completed: queueCounts.completed,
          failed: queueCounts.failed,
        },
      })
    }

    return snapshots
  }

  private maybeEmitAlerts(snapshot: QueueMetricsSnapshot) {
    const backlog = snapshot.depth.waiting + snapshot.depth.delayed

    if (backlog >= P0_BACKLOG_THRESHOLD) {
      this.emitAlert(
        'P0',
        snapshot.queueName,
        `Queue backlog is above threshold (${backlog} >= ${P0_BACKLOG_THRESHOLD})`,
        snapshot,
      )
    }

    if (
      snapshot.failureRate >= P1_FAILURE_RATE_THRESHOLD &&
      snapshot.failed > 5
    ) {
      this.emitAlert(
        'P1',
        snapshot.queueName,
        `Queue failure rate is elevated (${(snapshot.failureRate * 100).toFixed(2)}%)`,
        snapshot,
      )
    }
  }

  private emitAlert(
    severity: 'P0' | 'P1',
    queueName: QueueName,
    message: string,
    snapshot: QueueMetricsSnapshot,
  ) {
    const alertKey = `${severity}:${queueName}`
    const now = Date.now()
    const lastAlertAt = this.lastAlertAt.get(alertKey) || 0

    if (now - lastAlertAt < ALERT_COOLDOWN_MS) {
      return
    }

    this.lastAlertAt.set(alertKey, now)

    logger.error(
      {
        alertClass: severity,
        queueName,
        snapshot,
      },
      message,
    )

    Sentry.captureMessage(message, {
      level: severity === 'P0' ? 'fatal' : 'error',
      tags: {
        alert_class: severity,
        queue: queueName,
      },
      extra: {
        snapshot,
      },
    })
  }
}

const calculateAverage = (values: number[]): number => {
  if (values.length === 0) return 0
  return values.reduce((total, value) => total + value, 0) / values.length
}

const calculatePercentile = (values: number[], percentile: number): number => {
  if (values.length === 0) return 0

  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.max(
    0,
    Math.min(sorted.length - 1, Math.ceil(percentile * sorted.length) - 1),
  )
  return sorted[index]
}
