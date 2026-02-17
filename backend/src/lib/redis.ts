import { config } from '@/config'
import Redis from 'ioredis'
import logger from '@/lib/logger'
import {
  recordRedisCommandErrorMetric,
  recordRedisTimeoutMetric,
} from '@/services/operations-metrics.service'

export const redisConfig = {
  ...(config.redis.useTLS && {
    tls: {
      rejectUnauthorized: false,
      checkServerIdentity: () => undefined,
    },
  }),
}

let _redis: Redis | null = null
let _redisErrorLogged = false

export function getRedis(): Redis | null {
  if (!_redis) {
    try {
      _redis = new Redis(config.redis.url, {
        ...redisConfig,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        retryStrategy(times) {
          // Stop retrying after 3 attempts and log once
          if (times > 3) {
            if (!_redisErrorLogged) {
              logger.warn('Redis connection failed after 3 retries - giving up. App will continue without Redis.')
              _redisErrorLogged = true
            }
            return null // stop retrying
          }
          return Math.min(times * 500, 3000)
        },
        lazyConnect: true,
      })

      _redis.on('error', (error) => {
        const message = error instanceof Error ? error.message : String(error)
        // Only log the first Redis error, suppress the spam
        if (!_redisErrorLogged) {
          logger.warn({ error: message }, 'Redis connection error - app will continue without Redis')
          _redisErrorLogged = true
        }
        recordRedisCommandErrorMetric()
        if (/timeout|timed out|etimedout/i.test(message)) {
          recordRedisTimeoutMetric()
        }
      })

      _redis.on('connect', () => {
        _redisErrorLogged = false
        logger.info('Redis connected')
      })

      // Attempt connection but don't block
      _redis.connect().catch(() => {
        // Error handled by the 'error' event listener
      })
    } catch (error) {
      if (!_redisErrorLogged) {
        logger.warn(`[Redis Lib] Redis unavailable: ${error}`)
        _redisErrorLogged = true
      }
      return null
    }
  }
  return _redis
}

export async function invalidateCache(key: string): Promise<boolean> {
  try {
    const redis = getRedis()
    if (!redis) return false
    const result = await redis.del(key)
    logger.info({ key, deleted: result > 0 }, 'Cache invalidation')
    return result > 0
  } catch (error) {
    logger.error({ key, error }, 'Cache invalidation failed')
    return false
  }
}
