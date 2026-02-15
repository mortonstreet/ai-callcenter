import { workerRuntime } from '@/queues/workers'
import logger from '@/lib/logger'

const startWorker = async () => {
  await workerRuntime.start()
}

const shutdown = async (signal: string) => {
  logger.info({ signal }, 'Shutting down worker runtime')
  await workerRuntime.stop()
  process.exit(0)
}

startWorker().catch((error) => {
  logger.error({ error }, 'Failed to start worker runtime')
  process.exit(1)
})

process.on('SIGTERM', () => {
  void shutdown('SIGTERM')
})

process.on('SIGINT', () => {
  void shutdown('SIGINT')
})
