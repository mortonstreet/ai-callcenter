import { getRedis } from '@/lib/redis'
import logger from '@/lib/logger'

export interface RateLimitOptions {
  windowSeconds: number
  maxRequests: number
  keyGenerator: (req: any) => string
  message?: string
  onLimitReached?: (req: any, res: any, rateLimitInfo: any) => void
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

type MemoryRateLimitEntry = {
  id: string
  timestamp: number
}

const memoryRateLimitStore = new Map<string, MemoryRateLimitEntry[]>()
let loggedRedisFallback = false

const pruneMemoryEntries = (
  key: string,
  windowStart: number,
): MemoryRateLimitEntry[] => {
  const existing = memoryRateLimitStore.get(key) || []
  const active = existing.filter((entry) => entry.timestamp > windowStart)
  if (active.length === 0) {
    memoryRateLimitStore.delete(key)
  } else {
    memoryRateLimitStore.set(key, active)
  }
  return active
}

const removeMemoryEntry = (key: string, entryId: string) => {
  const existing = memoryRateLimitStore.get(key)
  if (!existing) return
  const filtered = existing.filter((entry) => entry.id !== entryId)
  if (filtered.length === 0) {
    memoryRateLimitStore.delete(key)
    return
  }
  memoryRateLimitStore.set(key, filtered)
}

const shouldSkipCount = (options: RateLimitOptions, statusCode: number) => {
  return (
    (options.skipSuccessfulRequests && statusCode < 400) ||
    (options.skipFailedRequests && statusCode >= 400)
  )
}

const setRateLimitHeaders = (
  res: any,
  options: RateLimitOptions,
  now: number,
  currentRequests: number,
) => {
  res.set({
    'X-RateLimit-Limit': options.maxRequests.toString(),
    'X-RateLimit-Remaining': Math.max(
      0,
      options.maxRequests - currentRequests - 1,
    ).toString(),
    'X-RateLimit-Reset': new Date(
      now + options.windowSeconds * 1000,
    ).toISOString(),
  })
}

const sendRateLimitExceeded = (input: {
  req: any
  res: any
  options: RateLimitOptions
  currentRequests: number
  now: number
  oldestTimestamp: number
}) => {
  const retryAfter = Math.max(
    1,
    Math.ceil(
      (input.options.windowSeconds * 1000 -
        (input.now - input.oldestTimestamp)) /
        1000,
    ),
  )

  const rateLimitInfo = {
    limit: input.options.maxRequests,
    current: input.currentRequests,
    remaining: 0,
    resetTime: new Date(input.now + retryAfter * 1000),
    retryAfter,
  }

  if (input.options.onLimitReached) {
    return input.options.onLimitReached(input.req, input.res, rateLimitInfo)
  }

  return input.res.status(429).json({
    error: 'Rate limit exceeded',
    message:
      input.options.message ||
      `Too many requests. Please try again in ${retryAfter} seconds.`,
    retryAfter,
    limit: input.options.maxRequests,
    windowSeconds: input.options.windowSeconds,
  })
}

export class RedisRateLimiter {
  /**
   * Creates a flexible Redis-based rate limiter
   * @param options Configuration options
   */
  static create(options: RateLimitOptions) {
    return async (req: any, res: any, next: any) => {
      const key = `rate_limit:${options.keyGenerator(req)}`
      const now = Date.now()
      const windowStart = now - options.windowSeconds * 1000
      const requestEntryId = `${now}-${Math.random()}`

      const applyInMemoryLimit = () => {
        const activeEntries = pruneMemoryEntries(key, windowStart)
        const currentRequests = activeEntries.length

        if (currentRequests >= options.maxRequests) {
          logger.info(`Rate limit exceeded for key: ${key}`)
          const oldestTimestamp = activeEntries[0]?.timestamp || now
          return sendRateLimitExceeded({
            req,
            res,
            options,
            currentRequests,
            now,
            oldestTimestamp,
          })
        }

        memoryRateLimitStore.set(key, [
          ...activeEntries,
          { id: requestEntryId, timestamp: now },
        ])

        setRateLimitHeaders(res, options, now, currentRequests)

        const originalEnd = res.end
        res.end = function (...args: any[]) {
          if (shouldSkipCount(options, res.statusCode)) {
            removeMemoryEntry(key, requestEntryId)
          }
          originalEnd.apply(res, args)
        }

        next()
      }

      try {
        const redis = getRedis()
        if (!redis) {
          if (!loggedRedisFallback) {
            loggedRedisFallback = true
            logger.warn(
              'Redis unavailable for rate limiter; using in-memory fallback',
            )
          }
          return applyInMemoryLimit()
        }
        loggedRedisFallback = false

        // Use Redis pipeline for atomic operations
        const pipeline = redis.pipeline()

        // Remove old entries outside the window
        pipeline.zremrangebyscore(key, '-inf', windowStart)

        // Count current requests in window
        pipeline.zcard(key)

        // Add current request
        pipeline.zadd(key, now, requestEntryId)

        // Set expiration
        pipeline.expire(key, options.windowSeconds)

        const results = await pipeline.exec()
        const currentRequests = (results?.[1]?.[1] as number) || 0

        // Check if limit exceeded
        if (currentRequests >= options.maxRequests) {
          logger.info(`Rate limit exceeded for key: ${key}`)
          // Get the oldest request to calculate retry time
          const oldestRequest = await redis.zrange(key, 0, 0, 'WITHSCORES')
          const oldestTimestamp =
            oldestRequest.length > 1 ? parseFloat(oldestRequest[1]) : now
          return sendRateLimitExceeded({
            req,
            res,
            options,
            currentRequests,
            now,
            oldestTimestamp,
          })
        }

        // Add rate limit info to response headers
        setRateLimitHeaders(res, options, now, currentRequests)

        // Store original end function to conditionally count requests
        const originalEnd = res.end
        res.end = function (...args: any[]) {
          // Remove the request from count if it should be skipped
          if (shouldSkipCount(options, res.statusCode)) {
            redis.zrem(key, requestEntryId).catch((error) => {
              logger.warn(
                { error, key },
                'Failed to remove skipped request from rate limiter',
              )
            })
          }

          originalEnd.apply(res, args)
        }

        next()
      } catch (error) {
        logger.warn(
          { error, key },
          'Rate limit check failed; using in-memory fallback',
        )
        applyInMemoryLimit()
      }
    }
  }

  /**
   * Pre-built rate limiters for common use cases
   */
  static presets = {
    // Per-user rate limiting
    perUser: (windowSeconds: number = 60, maxRequests: number = 1) =>
      RedisRateLimiter.create({
        windowSeconds,
        maxRequests,
        keyGenerator: (req) => `user:${req.user?.id || 'anonymous'}`,
        message: `You can only make ${maxRequests} request(s) per ${windowSeconds} seconds`,
      }),

    // Per-IP rate limiting
    perIP: (windowSeconds: number = 60, maxRequests: number = 10) =>
      RedisRateLimiter.create({
        windowSeconds,
        maxRequests,
        keyGenerator: (req) => `ip:${req.ip || req.connection.remoteAddress}`,
        message: `Too many requests from this IP. Limit: ${maxRequests} per ${windowSeconds} seconds`,
      }),

    // Per-endpoint rate limiting
    perEndpoint: (windowSeconds: number = 60, maxRequests: number = 100) =>
      RedisRateLimiter.create({
        windowSeconds,
        maxRequests,
        keyGenerator: (req) =>
          `endpoint:${req.method}:${req.route?.path || req.path}`,
        message: `This endpoint is temporarily overloaded. Please try again later.`,
      }),

    // Combined user + endpoint
    perUserEndpoint: (windowSeconds: number = 60, maxRequests: number = 5) =>
      RedisRateLimiter.create({
        windowSeconds,
        maxRequests,
        keyGenerator: (req) =>
          `user_endpoint:${req.user?.id}:${req.route?.path || req.path}`,
        message: `You're making too many requests to this endpoint`,
      }),
  }
}
