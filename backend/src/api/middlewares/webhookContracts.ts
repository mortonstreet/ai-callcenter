import { createHmac, timingSafeEqual } from 'crypto'
import { Request, Response, NextFunction } from 'express'
import { config } from '@/config'
import { sendApiError } from '@/api/utils/error-contract'

interface ParsedWebhookBodyRequest extends Request {
  rawBodyText?: string
}

const SIGNATURE_MAX_AGE_SECONDS = 300

const safeEqual = (a: string, b: string): boolean => {
  const left = Buffer.from(a, 'utf8')
  const right = Buffer.from(b, 'utf8')
  if (left.length !== right.length) {
    return false
  }
  return timingSafeEqual(left, right)
}

export const parseSignedWebhookBody = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const parsedReq = req as ParsedWebhookBodyRequest
  const rawBody = req.body

  if (!rawBody) {
    return sendApiError(req, res, 400, {
      code: 'WEBHOOK_BODY_MISSING',
      message: 'Webhook body is required',
      userMessage: 'Webhook body missing.',
    })
  }

  const rawBodyText = Buffer.isBuffer(rawBody)
    ? rawBody.toString('utf8')
    : String(rawBody)

  parsedReq.rawBodyText = rawBodyText

  try {
    req.body = JSON.parse(rawBodyText)
    return next()
  } catch {
    return sendApiError(req, res, 400, {
      code: 'WEBHOOK_BODY_INVALID_JSON',
      message: 'Webhook body must be valid JSON',
      userMessage: 'Webhook payload is invalid.',
    })
  }
}

export const verifySignedWebhook = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const parsedReq = req as ParsedWebhookBodyRequest
  const signature = req.get('x-rev-signature')
  const timestamp = req.get('x-rev-timestamp')

  if (!signature || !timestamp) {
    return sendApiError(req, res, 401, {
      code: 'WEBHOOK_SIGNATURE_MISSING',
      message: 'Webhook signature headers are required',
      userMessage: 'Webhook signature was not provided.',
    })
  }

  const timestampNumber = Number(timestamp)
  if (!Number.isFinite(timestampNumber)) {
    return sendApiError(req, res, 401, {
      code: 'WEBHOOK_SIGNATURE_INVALID',
      message: 'Webhook timestamp is invalid',
      userMessage: 'Webhook signature is invalid.',
    })
  }

  const ageSeconds = Math.abs(Math.floor(Date.now() / 1000) - timestampNumber)
  if (ageSeconds > SIGNATURE_MAX_AGE_SECONDS) {
    return sendApiError(req, res, 401, {
      code: 'WEBHOOK_SIGNATURE_EXPIRED',
      message: 'Webhook signature timestamp is outside allowed window',
      userMessage: 'Webhook signature is expired.',
    })
  }

  const bodyText = parsedReq.rawBodyText || ''
  const expectedSignature = createHmac('sha256', config.webhookApiKey)
    .update(`${timestamp}.${bodyText}`, 'utf8')
    .digest('hex')

  if (!safeEqual(signature, expectedSignature)) {
    return sendApiError(req, res, 401, {
      code: 'WEBHOOK_SIGNATURE_INVALID',
      message: 'Webhook signature validation failed',
      userMessage: 'Webhook signature is invalid.',
    })
  }

  return next()
}
