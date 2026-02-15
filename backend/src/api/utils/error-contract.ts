import { Request, Response } from 'express'
import { getRequestContext } from '@/lib/context'

interface SendApiErrorInput {
  code: string
  message: string
  userMessage?: string
  retryable?: boolean
  details?: unknown
}

export const getCorrelationId = (req: Request, res?: Response): string => {
  const fromResponseCorrelation = res?.getHeader('x-correlation-id')
  if (
    typeof fromResponseCorrelation === 'string' &&
    fromResponseCorrelation.length > 0
  ) {
    return fromResponseCorrelation
  }

  const fromResponse = res?.getHeader('x-request-id')
  if (typeof fromResponse === 'string' && fromResponse.length > 0) {
    return fromResponse
  }

  const fromHeaderCorrelation = req.get('x-correlation-id')
  if (fromHeaderCorrelation) {
    return fromHeaderCorrelation
  }

  const fromHeaders = req.get('x-request-id')
  if (fromHeaders) {
    return fromHeaders
  }

  const context = getRequestContext()
  const fromContext = context?.correlationId || context?.requestId
  if (fromContext) {
    return fromContext
  }

  return 'unknown'
}

export const sendApiError = (
  req: Request,
  res: Response,
  status: number,
  input: SendApiErrorInput,
) => {
  return res.status(status).json({
    error: input.code,
    code: input.code,
    message: input.message,
    userMessage: input.userMessage ?? input.message,
    retryable: input.retryable ?? false,
    correlationId: getCorrelationId(req, res),
    ...(input.details !== undefined ? { details: input.details } : {}),
  })
}
