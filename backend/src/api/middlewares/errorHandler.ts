import { Request, Response, NextFunction } from 'express'
import Sentry from '@/lib/sentry'
import logger from '@/lib/logger'
import { ZodError } from 'zod'
import { StatusCodes } from 'http-status-codes'
import { config } from '@/config'
import { getCorrelationId } from '@/api/utils/error-contract'
import { resolveTaxonomyFromRequest } from '@/lib/error-taxonomy'
import { createErrorLog } from '@/repositories/governance.repository'

interface ErrorWithStatus extends Error {
  status?: number
  statusCode?: number
}

export const errorHandler = (
  err: ErrorWithStatus,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const statusCode =
    err.status ||
    err.statusCode ||
    (err instanceof ZodError
      ? StatusCodes.BAD_REQUEST
      : StatusCodes.INTERNAL_SERVER_ERROR)

  const errorDetails = {
    name: err.name,
    message: err.message,
    stack: err.stack,
    status: statusCode,
    ...(err instanceof ZodError ? { validation: err.issues } : {}),
  }

  const correlationId = getCorrelationId(req, res)
  const taxonomy = resolveTaxonomyFromRequest(req)

  logger.error(
    {
      taxonomy,
      correlationId,
      err: errorDetails,
      req: {
        id: req.headers['x-request-id'],
        method: req.method,
        url: req.originalUrl || req.url,
        params: req.params,
        query: req.query,
        body: req.body,
        headers: {
          'user-agent': req.get('user-agent'),
          'x-request-id': req.get('x-request-id'),
          'x-correlation-id': req.get('x-correlation-id') || correlationId,
          authorization: req.get('authorization') ? '[REDACTED]' : undefined,
        },
      },
    },
    `Request failed: ${err.message}`,
  )

  const isValidationError = err instanceof ZodError
  const isProd = config.nodeEnv === 'production'
  const code = isValidationError
    ? 'VALIDATION_FAILED'
    : statusCode >= 500
      ? 'INTERNAL_SERVER_ERROR'
      : err.name || 'REQUEST_FAILED'

  const sentryEventId = Sentry.captureException(err, {
    tags: {
      taxonomy,
      service: 'api',
      correlationId,
    },
  })

  if (statusCode >= 400) {
    const organizationId =
      typeof req.validated?.organizationId === 'string'
        ? req.validated.organizationId
        : typeof req.body?.organizationId === 'string'
          ? req.body.organizationId
          : typeof req.query.organizationId === 'string'
            ? req.query.organizationId
            : null

    createErrorLog({
      organizationId,
      source: taxonomy,
      severity: statusCode >= 500 ? 'critical' : 'error',
      code,
      message: err.message,
      updatedAt: new Date(),
      context: {
        correlationId,
        route: req.originalUrl || req.url,
        method: req.method,
        statusCode,
        sentryEventId,
      },
    }).catch((persistError) => {
      logger.warn(
        { persistError, correlationId, taxonomy },
        'Failed to persist error log entry',
      )
    })
  }

  res.status(statusCode).json({
    status: 'error',
    error: code,
    code,
    message: isValidationError ? 'Validation failed' : err.message,
    correlationId,
    ...(isValidationError ? { details: err.issues } : {}),
    ...(!isProd && !isValidationError ? { stack: err.stack } : {}),
  })
}
