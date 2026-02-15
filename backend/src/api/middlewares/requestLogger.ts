import { Request, Response, NextFunction } from 'express'
import { v4 as uuidv4 } from 'uuid'
import logger from '@/lib/logger'
import { asyncLocalStorage } from '@/lib/context'
import Sentry from '@/lib/sentry'
import { recordApiRequestMetric } from '@/services/operations-metrics.service'

const resolveOrganizationId = (req: Request): string | undefined => {
  const validatedOrgId = req.validated?.organizationId
  if (typeof validatedOrgId === 'string' && validatedOrgId.trim().length > 0) {
    return validatedOrgId
  }

  const queryOrgId = req.query.organizationId
  if (typeof queryOrgId === 'string' && queryOrgId.trim().length > 0) {
    return queryOrgId
  }

  const bodyOrgId = req.body?.organizationId
  if (typeof bodyOrgId === 'string' && bodyOrgId.trim().length > 0) {
    return bodyOrgId
  }

  const paramOrgId = req.params.organizationId
  if (typeof paramOrgId === 'string' && paramOrgId.trim().length > 0) {
    return paramOrgId
  }

  return undefined
}

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4()
  const correlationId = (req.headers['x-correlation-id'] as string) || requestId
  const startTime = Date.now()
  const route = (req.originalUrl || req.url).split('?')[0]
  const organizationId = resolveOrganizationId(req)

  // Store context
  asyncLocalStorage.run(
    {
      requestId,
      correlationId,
      service: 'api',
      operation: `${req.method.toUpperCase()} ${route}`,
      organizationId,
      jobId: '',
      userId: '',
      sessionId: '',
    },
    () => {
      // Log request start
      Sentry.setContext('request', {
        requestId,
        correlationId,
        method: req.method,
        url: req.url,
        params: req.params,
        query: req.query,
        body: req.body,
      })
      logger.info(
        {
          req: {
            method: req.method,
            url: req.url,
            params: req.params,
            query: req.query,
            body: req.body,
          },
          route,
          service: 'api',
          organizationId: organizationId || null,
          correlationId,
        },
        'Request started',
      )

      // Log when the request completes
      res.on('finish', () => {
        const duration = Date.now() - startTime
        const refreshedOrgId = resolveOrganizationId(req)

        recordApiRequestMetric({
          method: req.method,
          route,
          statusCode: res.statusCode,
          durationMs: duration,
        })

        logger.info(
          {
            route,
            service: 'api',
            organizationId: refreshedOrgId || null,
            correlationId,
            res: {
              statusCode: res.statusCode,
              duration: `${duration}ms`,
            },
          },
          'Request completed',
        )
      })

      // Add request ID to response headers
      res.setHeader('x-request-id', requestId)
      res.setHeader('x-correlation-id', correlationId)
      next()
    },
  )
}
