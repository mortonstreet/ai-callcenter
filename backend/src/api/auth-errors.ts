import { Response } from 'express'

export const AUTH_ERROR_CODES = {
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_TOKEN_CONSUMED: 'AUTH_TOKEN_CONSUMED',
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  AUTH_RATE_LIMITED: 'AUTH_RATE_LIMITED',
  AUTH_INVITE_REQUIRED: 'AUTH_INVITE_REQUIRED',
  AUTH_INVITE_EMAIL_MISMATCH: 'AUTH_INVITE_EMAIL_MISMATCH',
  AUTH_INVITE_INVALID: 'AUTH_INVITE_INVALID',
  AUTH_INVITE_EXPIRED: 'AUTH_INVITE_EXPIRED',
  AUTH_INVITE_REPLAYED: 'AUTH_INVITE_REPLAYED',
  AUTH_CALLBACK_REJECTED: 'AUTH_CALLBACK_REJECTED',
  AUTH_ACTIVE_ORG_INVALID: 'AUTH_ACTIVE_ORG_INVALID',
  AUTH_FAILURE_TRANSIENT: 'AUTH_FAILURE_TRANSIENT',
} as const

export type AuthErrorCode =
  (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES]

type AuthErrorMeta = {
  retryable: boolean
  status: number
  userMessage: string
}

const AUTH_ERROR_META: Record<AuthErrorCode, AuthErrorMeta> = {
  AUTH_TOKEN_EXPIRED: {
    retryable: true,
    status: 401,
    userMessage: 'This sign-in link expired. Request a new link and try again.',
  },
  AUTH_TOKEN_CONSUMED: {
    retryable: true,
    status: 409,
    userMessage:
      'This sign-in link was already used. Request a new link to continue.',
  },
  AUTH_TOKEN_INVALID: {
    retryable: true,
    status: 401,
    userMessage:
      'This sign-in link is invalid. Request a new link and try again.',
  },
  AUTH_RATE_LIMITED: {
    retryable: true,
    status: 429,
    userMessage:
      'Too many sign-in attempts. Please wait a moment before trying again.',
  },
  AUTH_INVITE_REQUIRED: {
    retryable: false,
    status: 403,
    userMessage:
      'This account must be created from an invitation link. Ask your admin to send one.',
  },
  AUTH_INVITE_EMAIL_MISMATCH: {
    retryable: false,
    status: 403,
    userMessage:
      'This invitation was sent to a different email address. Sign in with the invited email to continue.',
  },
  AUTH_INVITE_INVALID: {
    retryable: false,
    status: 404,
    userMessage:
      'This invitation is invalid or has expired. Ask your admin to send a new invitation.',
  },
  AUTH_INVITE_EXPIRED: {
    retryable: false,
    status: 410,
    userMessage:
      'This invitation has expired. Ask your admin to send a new invitation.',
  },
  AUTH_INVITE_REPLAYED: {
    retryable: false,
    status: 409,
    userMessage:
      'This invitation was already used. Ask your admin to send a new invitation if needed.',
  },
  AUTH_CALLBACK_REJECTED: {
    retryable: false,
    status: 400,
    userMessage: 'This sign-in redirect is not allowed.',
  },
  AUTH_ACTIVE_ORG_INVALID: {
    retryable: true,
    status: 409,
    userMessage:
      'Your active organization was out of date and has been recovered.',
  },
  AUTH_FAILURE_TRANSIENT: {
    retryable: true,
    status: 503,
    userMessage:
      'Authentication is temporarily unavailable. Please retry in a moment.',
  },
}

export type AuthErrorPayload = {
  code: AuthErrorCode
  retryable: boolean
  userMessage: string
  correlationId: string
  message?: string
  details?: Record<string, unknown>
}

export const buildAuthErrorPayload = (
  code: AuthErrorCode,
  correlationId: string,
  overrides?: {
    message?: string
    details?: Record<string, unknown>
    retryable?: boolean
    userMessage?: string
  },
): AuthErrorPayload => {
  const meta = AUTH_ERROR_META[code]
  return {
    code,
    retryable: overrides?.retryable ?? meta.retryable,
    userMessage: overrides?.userMessage ?? meta.userMessage,
    correlationId,
    ...(overrides?.message ? { message: overrides.message } : {}),
    ...(overrides?.details ? { details: overrides.details } : {}),
  }
}

export const authErrorStatus = (code: AuthErrorCode) =>
  AUTH_ERROR_META[code].status

export const sendAuthError = (
  res: Response,
  code: AuthErrorCode,
  correlationId: string,
  overrides?: {
    status?: number
    message?: string
    details?: Record<string, unknown>
    retryable?: boolean
    userMessage?: string
  },
) => {
  const payload = buildAuthErrorPayload(code, correlationId, overrides)
  return res.status(overrides?.status ?? authErrorStatus(code)).json(payload)
}

export const normalizeAuthErrorCode = (
  rawError: string | undefined | null,
): AuthErrorCode | undefined => {
  if (!rawError) return undefined
  const normalized = rawError.toUpperCase()

  switch (normalized) {
    case 'AUTH_TOKEN_EXPIRED':
    case 'EXPIRED_TOKEN':
      return AUTH_ERROR_CODES.AUTH_TOKEN_EXPIRED
    case 'AUTH_TOKEN_CONSUMED':
      return AUTH_ERROR_CODES.AUTH_TOKEN_CONSUMED
    case 'AUTH_TOKEN_INVALID':
    case 'INVALID_TOKEN':
      return AUTH_ERROR_CODES.AUTH_TOKEN_INVALID
    case 'AUTH_RATE_LIMITED':
    case 'TOO_MANY_REQUESTS':
      return AUTH_ERROR_CODES.AUTH_RATE_LIMITED
    case 'AUTH_CALLBACK_REJECTED':
    case 'INVALID_CALLBACK_URL':
      return AUTH_ERROR_CODES.AUTH_CALLBACK_REJECTED
    case 'AUTH_INVITE_EMAIL_MISMATCH':
    case 'YOU_ARE_NOT_THE_RECIPIENT_OF_THE_INVITATION':
      return AUTH_ERROR_CODES.AUTH_INVITE_EMAIL_MISMATCH
    case 'AUTH_INVITE_REQUIRED':
      return AUTH_ERROR_CODES.AUTH_INVITE_REQUIRED
    case 'AUTH_INVITE_INVALID':
    case 'INVITATION_NOT_FOUND':
      return AUTH_ERROR_CODES.AUTH_INVITE_INVALID
    case 'AUTH_INVITE_EXPIRED':
      return AUTH_ERROR_CODES.AUTH_INVITE_EXPIRED
    case 'AUTH_INVITE_REPLAYED':
      return AUTH_ERROR_CODES.AUTH_INVITE_REPLAYED
    case 'AUTH_ACTIVE_ORG_INVALID':
      return AUTH_ERROR_CODES.AUTH_ACTIVE_ORG_INVALID
    case 'AUTH_FAILURE_TRANSIENT':
      return AUTH_ERROR_CODES.AUTH_FAILURE_TRANSIENT
    default:
      return undefined
  }
}
