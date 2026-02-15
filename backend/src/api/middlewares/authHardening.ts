import { Request, RequestHandler, Response } from 'express'
import { createHash, randomUUID } from 'crypto'
import {
  AUTH_ERROR_CODES,
  AuthErrorCode,
  buildAuthErrorPayload,
  normalizeAuthErrorCode,
  sendAuthError,
} from '@/api/auth-errors'
import { config } from '@/config'
import logger from '@/lib/logger'
import { getRedis } from '@/lib/redis'
import { db } from '@/lib/db'

const CALLBACK_FIELDS = [
  'callbackURL',
  'newUserCallbackURL',
  'errorCallbackURL',
] as const

const ALLOWED_CALLBACK_PATH_PREFIXES = [
  '/',
  '/dashboard',
  '/onboarding',
  '/accept-invitation',
  '/login',
  '/signup',
  '/verify',
]

const RATE_LIMIT_WINDOWS_SECONDS = {
  perIp: 60,
  perEmail: 60,
  perEmailIp: 60,
  cooldown: 30,
}

const RATE_LIMIT_MAX = {
  perIp: 10,
  perEmail: 6,
  perEmailIp: 4,
}

const MAGIC_LINK_CONSUMED_TTL_SECONDS = 60 * 30

type MemoryCounterEntry = {
  count: number
  expiresAt: number
}

const memoryCounters = new Map<string, MemoryCounterEntry>()
const memoryValues = new Map<string, number>()

let loggedRedisFallback = false

const getAuthCorrelationId = (req: Request, res: Response): string => {
  const responseRequestId = res.getHeader('x-request-id')
  const reqRequestId = req.headers['x-request-id']
  const existingCorrelationId = req.headers['x-correlation-id']

  if (typeof existingCorrelationId === 'string' && existingCorrelationId) {
    return existingCorrelationId
  }
  if (typeof responseRequestId === 'string' && responseRequestId) {
    return responseRequestId
  }
  if (typeof reqRequestId === 'string' && reqRequestId) {
    return reqRequestId
  }
  return randomUUID()
}

const logRedisFallbackOnce = (operation: string, error: unknown) => {
  if (loggedRedisFallback) return
  loggedRedisFallback = true
  logger.warn(
    { operation, error },
    '[AuthHardening] Redis unavailable; using in-memory fallback',
  )
}

const onRedisSuccess = () => {
  if (loggedRedisFallback) {
    loggedRedisFallback = false
  }
}

const nowMs = () => Date.now()

const memoryGetCounter = (key: string): MemoryCounterEntry | undefined => {
  const current = memoryCounters.get(key)
  if (!current) return undefined
  if (current.expiresAt <= nowMs()) {
    memoryCounters.delete(key)
    return undefined
  }
  return current
}

const memoryIncrementCounter = (key: string, windowSeconds: number): number => {
  const current = memoryGetCounter(key)
  if (!current) {
    memoryCounters.set(key, {
      count: 1,
      expiresAt: nowMs() + windowSeconds * 1000,
    })
    return 1
  }
  const nextCount = current.count + 1
  memoryCounters.set(key, { ...current, count: nextCount })
  return nextCount
}

const memoryGetValue = (key: string): boolean => {
  const expiresAt = memoryValues.get(key)
  if (!expiresAt) return false
  if (expiresAt <= nowMs()) {
    memoryValues.delete(key)
    return false
  }
  return true
}

const memorySetValue = (
  key: string,
  ttlSeconds: number,
  nx = false,
): boolean => {
  const exists = memoryGetValue(key)
  if (nx && exists) return false
  memoryValues.set(key, nowMs() + ttlSeconds * 1000)
  return true
}

const incrementCounter = async (
  key: string,
  windowSeconds: number,
): Promise<number> => {
  try {
    const redis = getRedis()
    const multiResult = await redis.multi().incr(key).ttl(key).exec()

    const count = Number(multiResult?.[0]?.[1] ?? 0)
    const ttl = Number(multiResult?.[1]?.[1] ?? -1)

    if (ttl < 0) {
      await redis.expire(key, windowSeconds)
    }
    onRedisSuccess()
    return count
  } catch (error) {
    logRedisFallbackOnce('incrementCounter', error)
    return memoryIncrementCounter(key, windowSeconds)
  }
}

const keyExists = async (key: string): Promise<boolean> => {
  try {
    const redis = getRedis()
    const exists = await redis.exists(key)
    onRedisSuccess()
    return exists === 1
  } catch (error) {
    logRedisFallbackOnce('keyExists', error)
    return memoryGetValue(key)
  }
}

const setKey = async (
  key: string,
  ttlSeconds: number,
  options?: { nx?: boolean },
): Promise<boolean> => {
  const nx = options?.nx ?? false
  try {
    const redis = getRedis()
    const result = nx
      ? await redis.set(key, '1', 'EX', ttlSeconds, 'NX')
      : await redis.set(key, '1', 'EX', ttlSeconds)
    onRedisSuccess()
    if (nx) return result === 'OK'
    return result === 'OK'
  } catch (error) {
    logRedisFallbackOnce('setKey', error)
    return memorySetValue(key, ttlSeconds, nx)
  }
}

const safeDecodeURIComponent = (value: string) => {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

const normalizeCallbackUrl = (candidate: string): string | null => {
  if (!candidate || typeof candidate !== 'string') return null

  const decoded = safeDecodeURIComponent(candidate.trim())
  if (!decoded) return null

  const frontendBase = new URL(config.frontendUrl)
  const parsed = new URL(decoded, frontendBase)

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return null
  }

  const allowedOrigins = new Set(
    [config.frontendUrl, ...config.trustedOrigins].map((origin) => {
      try {
        return new URL(origin).origin
      } catch {
        return ''
      }
    }),
  )

  if (!allowedOrigins.has(parsed.origin)) {
    return null
  }

  const isAllowedPath = ALLOWED_CALLBACK_PATH_PREFIXES.some(
    (prefix) =>
      parsed.pathname === prefix || parsed.pathname.startsWith(`${prefix}/`),
  )
  if (!isAllowedPath) {
    return null
  }

  if (parsed.origin === frontendBase.origin) {
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  }
  return parsed.toString()
}

const appendQueryParam = (
  url: string,
  params: Record<string, string | undefined>,
) => {
  const [base, hash = ''] = url.split('#')
  const hasQuery = base.includes('?')
  const search = Object.entries(params)
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}=${encodeURIComponent(value ?? '')}`)
    .join('&')

  if (!search) return url
  const withSearch = `${base}${hasQuery ? '&' : '?'}${search}`
  return hash ? `${withSearch}#${hash}` : withSearch
}

const extractClientIp = (req: Request) => {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim()
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0]
  }
  return req.ip || req.socket.remoteAddress || 'unknown'
}

const tokenKey = (token: string) => {
  const digest = createHash('sha256').update(token).digest('hex')
  return `auth:magic-link:consumed:${digest}`
}

const isMagicLinkSignInRequest = (req: Request) =>
  req.method === 'POST' && req.path === '/sign-in/magic-link'

const isMagicLinkVerifyRequest = (req: Request) =>
  req.method === 'GET' && req.path === '/magic-link/verify'

const isEmailSignUpRequest = (req: Request) =>
  req.method === 'POST' && req.path === '/sign-up/email'

const isAcceptInvitationRequest = (req: Request) =>
  req.method === 'POST' && req.path === '/organization/accept-invitation'

const extractInviteIdFromCallbackUrl = (
  callbackUrl: unknown,
): string | null => {
  if (typeof callbackUrl !== 'string' || callbackUrl.trim().length === 0) {
    return null
  }

  try {
    const parsed = new URL(callbackUrl, config.frontendUrl)
    const fromQuery = parsed.searchParams.get('inviteId')
    if (fromQuery) {
      return fromQuery
    }

    const acceptMatch = parsed.pathname.match(/^\/accept-invitation\/([^/]+)$/)
    if (acceptMatch?.[1]) {
      return decodeURIComponent(acceptMatch[1])
    }
  } catch {
    return null
  }

  return null
}

const findInvitationById = async (invitationId: string) =>
  db
    .selectFrom('invitation')
    .where('id', '=', invitationId)
    .select([
      'id',
      'email',
      'status',
      'expiresAt',
      'organizationId',
      'inviterId',
      'role',
      'createdAt',
    ])
    .executeTakeFirst()

const isExpired = (dateValue: Date | string) =>
  new Date(dateValue).getTime() <= Date.now()

const getInviteErrorCodeForState = (
  invitation:
    | {
        status: string
        expiresAt: Date | string
      }
    | null
    | undefined,
): AuthErrorCode => {
  if (!invitation) {
    return AUTH_ERROR_CODES.AUTH_INVITE_INVALID
  }
  if (isExpired(invitation.expiresAt)) {
    return AUTH_ERROR_CODES.AUTH_INVITE_EXPIRED
  }
  if (invitation.status !== 'pending') {
    return AUTH_ERROR_CODES.AUTH_INVITE_REPLAYED
  }
  return AUTH_ERROR_CODES.AUTH_INVITE_INVALID
}

const mapAuthCodeFromMessage = (
  message: string | undefined,
): AuthErrorCode | undefined => {
  if (!message) return undefined
  const rawFromNormalizer = normalizeAuthErrorCode(message)
  if (rawFromNormalizer) return rawFromNormalizer

  const lower = message.toLowerCase()
  if (lower.includes('recipient of the invitation')) {
    return AUTH_ERROR_CODES.AUTH_INVITE_EMAIL_MISMATCH
  }
  if (lower.includes('invitation has expired')) {
    return AUTH_ERROR_CODES.AUTH_INVITE_EXPIRED
  }
  if (lower.includes('already used') || lower.includes('already accepted')) {
    return AUTH_ERROR_CODES.AUTH_INVITE_REPLAYED
  }
  if (
    lower.includes('invitation not found') ||
    lower.includes('failed to retrieve invitation')
  ) {
    return AUTH_ERROR_CODES.AUTH_INVITE_INVALID
  }
  if (
    lower.includes('sign up is not enabled') ||
    lower.includes('signup disabled')
  ) {
    return AUTH_ERROR_CODES.AUTH_INVITE_REQUIRED
  }
  if (lower.includes('invalid token')) {
    return AUTH_ERROR_CODES.AUTH_TOKEN_INVALID
  }
  if (lower.includes('expired token')) {
    return AUTH_ERROR_CODES.AUTH_TOKEN_EXPIRED
  }
  if (lower.includes('callback') && lower.includes('url')) {
    return AUTH_ERROR_CODES.AUTH_CALLBACK_REJECTED
  }
  if (lower.includes('too many requests')) {
    return AUTH_ERROR_CODES.AUTH_RATE_LIMITED
  }
  return undefined
}

const toBuffer = (chunk: any, encoding?: BufferEncoding): Buffer => {
  if (!chunk) return Buffer.alloc(0)
  if (Buffer.isBuffer(chunk)) return chunk
  if (typeof chunk === 'string') return Buffer.from(chunk, encoding || 'utf8')
  return Buffer.from(chunk)
}

export const normalizeAuthRedirectErrors: RequestHandler = (req, res, next) => {
  const correlationId = getAuthCorrelationId(req, res)
  const originalSetHeader = res.setHeader.bind(res)

  res.setHeader = ((
    name: string,
    value: number | string | readonly string[],
  ) => {
    if (
      typeof name === 'string' &&
      name.toLowerCase() === 'location' &&
      typeof value === 'string' &&
      value.includes('error=')
    ) {
      try {
        const parsed = new URL(value, config.frontendUrl)
        const rawError = parsed.searchParams.get('error')
        const normalizedCode =
          normalizeAuthErrorCode(rawError) ||
          mapAuthCodeFromMessage(rawError || undefined)

        if (normalizedCode) {
          parsed.searchParams.set('error', normalizedCode)
        }
        if (!parsed.searchParams.get('correlationId')) {
          parsed.searchParams.set('correlationId', correlationId)
        }

        const isAbsolute = /^https?:\/\//i.test(value)
        const normalizedLocation = isAbsolute
          ? parsed.toString()
          : `${parsed.pathname}${parsed.search}${parsed.hash}`

        return originalSetHeader(name, normalizedLocation)
      } catch {
        return originalSetHeader(name, value)
      }
    }

    return originalSetHeader(name, value)
  }) as typeof res.setHeader

  next()
}

export const attachAuthCorrelationId: RequestHandler = (req, res, next) => {
  const correlationId = getAuthCorrelationId(req, res)
  req.headers['x-correlation-id'] = correlationId
  res.setHeader('x-correlation-id', correlationId)
  next()
}

export const validateAuthCallbacks: RequestHandler = (req, res, next) => {
  const correlationId = getAuthCorrelationId(req, res)
  const containers: Array<Record<string, unknown>> = []

  if (req.body && typeof req.body === 'object') {
    containers.push(req.body as Record<string, unknown>)
  }
  if (req.query && typeof req.query === 'object') {
    containers.push(req.query as Record<string, unknown>)
  }

  for (const container of containers) {
    for (const field of CALLBACK_FIELDS) {
      const value = container[field]
      if (typeof value !== 'string') continue
      const normalized = normalizeCallbackUrl(value)
      if (!normalized) {
        logger.warn(
          {
            field,
            value,
            path: req.path,
            correlationId,
          },
          '[AuthHardening] Rejected callback URL',
        )
        return sendAuthError(
          res,
          AUTH_ERROR_CODES.AUTH_CALLBACK_REJECTED,
          correlationId,
          {
            details: { field },
          },
        )
      }
      container[field] = normalized
    }
  }

  next()
}

export const enforceMagicLinkAbuseProtection: RequestHandler = async (
  req,
  res,
  next,
) => {
  if (!isMagicLinkSignInRequest(req)) {
    return next()
  }

  const correlationId = getAuthCorrelationId(req, res)
  const ip = extractClientIp(req)
  const email = String(
    (req.body as { email?: string } | undefined)?.email || '',
  )
    .trim()
    .toLowerCase()

  if (!email) {
    return next()
  }

  const perIpKey = `auth:magic-link:ip:${ip}`
  const perEmailKey = `auth:magic-link:email:${email}`
  const perEmailIpKey = `auth:magic-link:pair:${ip}:${email}`
  const cooldownKey = `auth:magic-link:cooldown:${email}`

  const hasCooldown = await keyExists(cooldownKey)
  if (hasCooldown) {
    return sendAuthError(
      res,
      AUTH_ERROR_CODES.AUTH_RATE_LIMITED,
      correlationId,
      {
        details: { scope: 'cooldown' },
      },
    )
  }

  const [ipCount, emailCount, pairCount] = await Promise.all([
    incrementCounter(perIpKey, RATE_LIMIT_WINDOWS_SECONDS.perIp),
    incrementCounter(perEmailKey, RATE_LIMIT_WINDOWS_SECONDS.perEmail),
    incrementCounter(perEmailIpKey, RATE_LIMIT_WINDOWS_SECONDS.perEmailIp),
  ])

  if (
    ipCount > RATE_LIMIT_MAX.perIp ||
    emailCount > RATE_LIMIT_MAX.perEmail ||
    pairCount > RATE_LIMIT_MAX.perEmailIp
  ) {
    logger.warn(
      {
        ip,
        email,
        ipCount,
        emailCount,
        pairCount,
        correlationId,
      },
      '[AuthHardening] Magic-link request rate limited',
    )
    return sendAuthError(res, AUTH_ERROR_CODES.AUTH_RATE_LIMITED, correlationId)
  }

  await setKey(cooldownKey, RATE_LIMIT_WINDOWS_SECONDS.cooldown)
  next()
}

const rejectMagicLinkVerify = (
  req: Request,
  res: Response,
  code: AuthErrorCode,
  correlationId: string,
) => {
  const errorCallbackURL = String(req.query.errorCallbackURL || '')
  const callbackURL = String(req.query.callbackURL || '')
  const target =
    normalizeCallbackUrl(errorCallbackURL) ||
    normalizeCallbackUrl(callbackURL) ||
    null

  if (target) {
    return res.redirect(
      302,
      appendQueryParam(target, {
        error: code,
        correlationId,
      }),
    )
  }
  return sendAuthError(res, code, correlationId)
}

export const enforceMagicLinkReplayProtection: RequestHandler = async (
  req,
  res,
  next,
) => {
  if (!isMagicLinkVerifyRequest(req)) {
    return next()
  }

  const correlationId = getAuthCorrelationId(req, res)
  const token = String(req.query.token || '').trim()
  if (!token) {
    return next()
  }

  const key = tokenKey(token)
  const isConsumed = await keyExists(key)
  if (isConsumed) {
    logger.warn(
      {
        correlationId,
        path: req.path,
      },
      '[AuthHardening] Blocked replayed magic-link token',
    )
    return rejectMagicLinkVerify(
      req,
      res,
      AUTH_ERROR_CODES.AUTH_TOKEN_CONSUMED,
      correlationId,
    )
  }

  res.on('finish', () => {
    const location = res.getHeader('location')
    const locationValue = typeof location === 'string' ? location : ''
    const redirectedWithError = /[?&]error=/.test(locationValue)

    const verifiedViaJson = res.statusCode >= 200 && res.statusCode < 300
    const verifiedViaRedirect =
      res.statusCode >= 300 && res.statusCode < 400 && !redirectedWithError

    if (!verifiedViaJson && !verifiedViaRedirect) return

    setKey(key, MAGIC_LINK_CONSUMED_TTL_SECONDS).catch((error) => {
      logger.warn(
        { error, correlationId },
        '[AuthHardening] Failed to mark magic-link token as consumed',
      )
    })
  })

  next()
}

export const enforceInviteOnlySignUpAndAcceptance: RequestHandler = async (
  req,
  res,
  next,
) => {
  const correlationId = getAuthCorrelationId(req, res)

  if (isEmailSignUpRequest(req)) {
    const body = (req.body || {}) as Record<string, unknown>
    const inviteId =
      extractInviteIdFromCallbackUrl(body.callbackURL) ||
      extractInviteIdFromCallbackUrl(body.newUserCallbackURL) ||
      extractInviteIdFromCallbackUrl(body.errorCallbackURL)

    if (!inviteId) {
      return sendAuthError(
        res,
        AUTH_ERROR_CODES.AUTH_INVITE_REQUIRED,
        correlationId,
      )
    }

    const invitation = await findInvitationById(inviteId)
    if (
      !invitation ||
      invitation.status !== 'pending' ||
      isExpired(invitation.expiresAt)
    ) {
      return sendAuthError(
        res,
        getInviteErrorCodeForState(invitation),
        correlationId,
      )
    }

    const normalizedEmail = String(body.email || '')
      .trim()
      .toLowerCase()
    if (
      !normalizedEmail ||
      normalizedEmail !== invitation.email.toLowerCase()
    ) {
      return sendAuthError(
        res,
        AUTH_ERROR_CODES.AUTH_INVITE_EMAIL_MISMATCH,
        correlationId,
      )
    }
  }

  if (isAcceptInvitationRequest(req)) {
    const invitationId = String(
      (req.body as { invitationId?: string })?.invitationId || '',
    ).trim()

    if (!invitationId) {
      return sendAuthError(
        res,
        AUTH_ERROR_CODES.AUTH_INVITE_INVALID,
        correlationId,
      )
    }

    const invitation = await findInvitationById(invitationId)
    if (
      !invitation ||
      invitation.status !== 'pending' ||
      isExpired(invitation.expiresAt)
    ) {
      return sendAuthError(
        res,
        getInviteErrorCodeForState(invitation),
        correlationId,
      )
    }
  }

  next()
}

export const normalizeAuthErrorResponses: RequestHandler = (req, res, next) => {
  const originalWriteHead = res.writeHead.bind(res)
  const originalWrite = res.write.bind(res)
  const originalEnd = res.end.bind(res)

  let shouldCapture = false
  let statusCode = 200
  const chunks: Buffer[] = []

  res.writeHead = ((code: number, ...args: any[]) => {
    statusCode = code
    if (code >= 400) {
      shouldCapture = true
      res.removeHeader('content-length')
      res.setHeader('content-type', 'application/json; charset=utf-8')
    }
    return (originalWriteHead as any)(code, ...args)
  }) as typeof res.writeHead

  res.write = ((chunk: any, ...args: any[]) => {
    if (shouldCapture) {
      const encoding =
        typeof args[0] === 'string' ? (args[0] as BufferEncoding) : undefined
      chunks.push(toBuffer(chunk, encoding))
      const callback =
        typeof args[args.length - 1] === 'function'
          ? (args[args.length - 1] as () => void)
          : null
      callback?.()
      return true
    }
    return (originalWrite as any)(chunk, ...args)
  }) as typeof res.write

  res.end = ((chunk?: any, ...args: any[]) => {
    if (!shouldCapture) {
      return (originalEnd as any)(chunk, ...args)
    }

    if (chunk) {
      const encoding =
        typeof args[0] === 'string' ? (args[0] as BufferEncoding) : undefined
      chunks.push(toBuffer(chunk, encoding))
    }

    const correlationId = getAuthCorrelationId(req, res)
    const rawBody = Buffer.concat(chunks).toString('utf8')

    let parsed: any = undefined
    if (rawBody) {
      try {
        parsed = JSON.parse(rawBody)
      } catch {
        parsed = undefined
      }
    }

    const messageFromPayload =
      parsed?.message ||
      parsed?.error?.message ||
      (typeof parsed?.error === 'string' ? parsed.error : undefined) ||
      rawBody

    let mappedCode =
      normalizeAuthErrorCode(
        parsed?.code ||
          parsed?.error?.code ||
          (typeof parsed?.error === 'string' ? parsed.error : undefined),
      ) || mapAuthCodeFromMessage(messageFromPayload)

    if (!mappedCode) {
      if (statusCode >= 500) {
        mappedCode = AUTH_ERROR_CODES.AUTH_FAILURE_TRANSIENT
      } else if (statusCode === 429) {
        mappedCode = AUTH_ERROR_CODES.AUTH_RATE_LIMITED
      }
    }

    if (!mappedCode) {
      return (originalEnd as any)(rawBody, ...args)
    }

    const payload = buildAuthErrorPayload(mappedCode, correlationId, {
      message:
        mappedCode === AUTH_ERROR_CODES.AUTH_FAILURE_TRANSIENT
          ? undefined
          : messageFromPayload,
      details: {
        statusCode,
      },
    })

    return (originalEnd as any)(JSON.stringify(payload), ...args)
  }) as typeof res.end

  next()
}

export const authHardeningMiddleware: Array<RequestHandler> = [
  attachAuthCorrelationId,
  validateAuthCallbacks,
  enforceInviteOnlySignUpAndAcceptance,
  enforceMagicLinkAbuseProtection,
  enforceMagicLinkReplayProtection,
  normalizeAuthRedirectErrors,
  normalizeAuthErrorResponses,
]
