import express from 'express'
import { config } from '@/config'
import logger from '@/lib/logger'
import Sentry from '@/lib/sentry'
import { closeAllQueues } from '@/queues'
import { workerRuntime } from '@/queues/workers'

const healthApp = express()
let shuttingDown = false

healthApp.get('/worker/health', async (_req, res) => {
  try {
    const health = await workerRuntime.getHealth()

    res.json({
      status: 'ok',
      service: 'revcenter-worker',
      deployEnv: config.deployEnv,
      uptimeSeconds: Math.round(process.uptime()),
      ...health,
    })
  } catch (error) {
    logger.error({ error }, 'Worker health endpoint failed')

    res.status(500).json({
      status: 'error',
      message: 'Worker health check failed',
    })
  }
})

const startWorker = async () => {
  await workerRuntime.start()

  const healthServer = healthApp.listen(
    config.worker.healthPort,
    '0.0.0.0',
    () => {
      logger.info(
        {
          healthPort: config.worker.healthPort,
          deployEnv: config.deployEnv,
        },
        'Worker process started',
      )
    },
  )

  const shutdown = async (signal: string) => {
    if (shuttingDown) {
      return
    }

    shuttingDown = true
    logger.info({ signal }, 'Shutting down worker process')

    try {
      await workerRuntime.stop()
      await closeAllQueues()
      await new Promise<void>((resolve, reject) => {
        healthServer.close((error) => {
          if (error) return reject(error)
          resolve()
        })
      })
      process.exit(0)
    } catch (error) {
      logger.error({ error, signal }, 'Worker shutdown failed')
      process.exit(1)
    }
  }

  process.on('SIGINT', () => {
    void shutdown('SIGINT')
  })

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM')
  })
}

startWorker().catch((error) => {
  logger.error({ error }, 'Worker bootstrap failed')
  Sentry.captureException(error)
  process.exit(1)
})
