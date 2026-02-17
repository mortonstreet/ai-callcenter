import pino from 'pino'
import { config } from '@/config'
import { getRequestContext } from '@/lib/context'

const hasBetterstack =
  config.logger.betterstackHost &&
  config.logger.betterstackHost !== 'placeholder' &&
  config.logger.betterstackToken &&
  config.logger.betterstackToken !== 'placeholder'

const productionTargets = [
  ...(hasBetterstack
    ? [
        {
          target: '@logtail/pino',
          options: {
            sourceToken: config.logger.betterstackToken,
            options: {
              endpoint: `https://${config.logger.betterstackHost}`,
              batchSize: 1,
              batchInterval: 1000,
            },
          },
          level: 'info' as const,
        },
      ]
    : []),
  {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
    level: 'info' as const,
  },
]

const transport =
  config.nodeEnv === 'development'
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
      }
    : {
        transport: {
          targets: productionTargets,
        },
      }

const baseLogger = pino({
  level: config.nodeEnv === 'development' ? 'debug' : 'info',
  ...transport,
  base: {
    env: config.nodeEnv,
  },
})

const logger = new Proxy(baseLogger, {
  get(target: any, prop: any) {
    if (typeof target[prop] === 'function') {
      return (...args: any[]) => {
        const context = getRequestContext()
        if (context) {
          const {
            requestId,
            jobId,
            userId,
            sessionId,
            organizationId,
            correlationId,
            service,
            operation,
          } = context
          const contextData = {
            requestId,
            jobId,
            userId,
            sessionId,
            organizationId,
            correlationId,
            service,
            operation,
          }

          if (args[0] && typeof args[0] === 'object') {
            args[0] = { ...args[0], ...contextData }
          } else {
            args.unshift(contextData)
          }
        }
        return target[prop](...args)
      }
    }
    return target[prop]
  },
})

export default logger
