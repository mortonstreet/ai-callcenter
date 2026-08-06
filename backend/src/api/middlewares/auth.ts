import { Express, Request, Response, NextFunction } from 'express'
import passport from 'passport'
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt'
import { createHash, createHmac, timingSafeEqual } from 'crypto'
import { config, McpProvider } from '@/config'
import logger from '@/lib/logger'
import { findById } from '@/repositories/user.repository'
import { fromNodeHeaders } from 'better-auth/node'
import { auth } from '@/lib/better-auth'
import { isMemberOfOrganization } from '@/services/user.service'
import { AuthRequest } from '@/types/handlers'
import { findMember } from '@/repositories/organization.repository'
import { OrganizationRole, AgentExternalType } from '@shared/types/src'
import { findAgentByExternalId } from '@/repositories/agent.repository'
import { sendApiError } from '../utils/error-contract'
import { getRedis } from '@/lib/redis'
import {
  evaluateApiLifecycleGate,
  resolveOrganizationLifecycleSnapshot,
} from '@/lib/lifecycle-gates'
import {
  authenticateScopedApiKey,
  extractRevCenterApiKey,
  requiredApiScopeForMethod,
} from '@/services/api-key.service'

const WEBHOOK_REPLAY_TTL_SECONDS = 24 * 60 * 60
const replayFallbackStore = new Map<string, number>()

const nowMs = () => Date.now()

const hasReplayFallbackKey = (key: string): boolean => {
  const expiresAt = replayFallbackStore.get(key)
  if (!expiresAt) return false
  if (expiresAt <= nowMs()) {
    replayFallbackStore.delete(key)
    return false
  }
  return true
}

const setReplayFallbackKey = (key: string): boolean => {
  if (hasReplayFallbackKey(key)) {
    return false
  }
  replayFallbackStore.set(key, nowMs() + WEBHOOK_REPLAY_TTL_SECONDS * 1000)
  return true
}

const rememberReplayKey = async (key: string): Promise<boolean> => {
  try {
    const redis = getRedis()
    if (!redis) return setReplayFallbackKey(key)
    const result = await redis.set(
      key,
      '1',
      'EX',
      WEBHOOK_REPLAY_TTL_SECONDS,
      'NX',
    )
    return result === 'OK'
  } catch (error) {
    logger.warn(
      { error, key },
      'Redis unavailable for webhook replay detection; using in-memory fallback',
    )
    return setReplayFallbackKey(key)
  }
}

const extractWebhookEventIdFromBody = (bodyString: string): string | null => {
  const patterns = [
    /\"eventId\"\\s*:\\s*\"([^\"]+)\"/,
    /\"event_id\"\\s*:\\s*\"([^\"]+)\"/,
    /\"id\"\\s*:\\s*\"([^\"]+)\"/,
    /\"messageId\"\\s*:\\s*\"([^\"]+)\"/,
    /\"providerMessageId\"\\s*:\\s*\"([^\"]+)\"/,
    /\"CallSid\"\\s*:\\s*\"([^\"]+)\"/,
    /\"SmsSid\"\\s*:\\s*\"([^\"]+)\"/,
  ]

  for (const pattern of patterns) {
    const match = bodyString.match(pattern)
    if (match?.[1]?.trim()) {
      return match[1].trim()
    }
  }

  return null
}

type ParsedSignatureHeader = {
  timestamp: string
  providedSignature: string
}

type WebhookSecretCandidate = {
  secret: string
  source: 'agent' | 'provider'
}

const parseSignatureHeader = (
  signatureHeader: string,
): ParsedSignatureHeader | null => {
  const signatureParts = signatureHeader.split(',')
  const timestamp = signatureParts
    .find((part) => part.startsWith('t='))
    ?.split('=')[1]
    ?.trim()
  const providedSignature = signatureParts
    .find((part) => part.startsWith('v0='))
    ?.split('=')[1]
    ?.trim()

  if (!timestamp || !providedSignature) {
    return null
  }

  return {
    timestamp,
    providedSignature,
  }
}

const getRawBodyString = (rawBody: unknown): string | null => {
  if (Buffer.isBuffer(rawBody)) {
    return rawBody.toString('utf8')
  }

  if (typeof rawBody === 'string') {
    return rawBody
  }

  return null
}

const buildWebhookSecretCandidates = (input: {
  agentSecret?: string | null
  providerSecret?: string | null
}): WebhookSecretCandidate[] => {
  const candidates: WebhookSecretCandidate[] = []
  const seen = new Set<string>()

  const pushIfPresent = (
    secret: string | null | undefined,
    source: WebhookSecretCandidate['source'],
  ) => {
    if (!secret) return
    const normalized = secret.trim()
    if (!normalized || seen.has(normalized)) {
      return
    }
    seen.add(normalized)
    candidates.push({
      secret: normalized,
      source,
    })
  }

  pushIfPresent(input.agentSecret, 'agent')
  pushIfPresent(input.providerSecret, 'provider')

  return candidates
}

const signaturesMatch = (left: string, right: string): boolean => {
  const leftBuffer = Buffer.from(left, 'utf8')
  const rightBuffer = Buffer.from(right, 'utf8')
  if (leftBuffer.length !== rightBuffer.length) {
    return false
  }
  return timingSafeEqual(leftBuffer, rightBuffer)
}

const resolveMatchingWebhookSecret = (input: {
  timestamp: string
  bodyString: string
  providedSignature: string
  candidates: WebhookSecretCandidate[]
}) => {
  const payload = `${input.timestamp}.${input.bodyString}`

  for (const candidate of input.candidates) {
    const calculatedSignature = createHmac('sha256', candidate.secret)
      .update(payload, 'utf8')
      .digest('hex')

    if (signaturesMatch(input.providedSignature, calculatedSignature)) {
      return {
        matched: true,
        source: candidate.source,
      } as const
    }
  }

  return {
    matched: false,
    source: null,
  } as const
}

const ensureWebhookNotReplayed = async (input: {
  providerKey: string
  bodyString: string
  explicitEventId?: string | null
}) => {
  const payloadHash = createHash('sha256')
    .update(input.bodyString, 'utf8')
    .digest('hex')

  const eventId =
    input.explicitEventId || extractWebhookEventIdFromBody(input.bodyString)
  const keys = [
    `webhook:replay:${input.providerKey}:payload:${payloadHash}`,
    ...(eventId
      ? [`webhook:replay:${input.providerKey}:event:${eventId}`]
      : []),
  ]

  const writes = await Promise.all(keys.map((key) => rememberReplayKey(key)))
  const isReplay = writes.some((ok) => !ok)

  return {
    isReplay,
    payloadHash,
    eventId,
  }
}

// Helper to find provider by slug from env config
const findProviderBySlug = (slug: string): McpProvider | undefined => {
  return config.mcpProviders.find((p) => p.slug === slug)
}

// Helper to extract agent_id from raw webhook body without fully parsing
const extractAgentIdFromBody = (bodyString: string): string | null => {
  try {
    // Quick regex to extract agent_id without full JSON parse
    const match = bodyString.match(/"agent_id"\s*:\s*"([^"]+)"/)
    return match ? match[1] : null
  } catch {
    return null
  }
}

export const withAuth = passport.authenticate('jwt', { session: false })

export function initializeAuth(app: Express) {
  app.use(passport.initialize())

  passport.use(
    new JwtStrategy(
      {
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: config.jwt.secret,
      },
      async (payload, done) => {
        try {
          const user = await findById(payload.id)
          if (!user) {
            return done(null, false)
          }
          return done(null, user)
        } catch (error) {
          return done(error, false)
        }
      },
    ),
  )

  return passport
}

export const withApiKeyAuth = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const apiKey = req.headers.authorization
  if (!apiKey || apiKey !== config.webhookApiKey) {
    logger.error('Unauthorized request')
    return sendApiError(req, res, 401, {
      code: 'AUTH_UNAUTHORIZED',
      message: 'Unauthorized',
      userMessage: 'Authentication failed.',
      retryable: false,
    })
  }
  next()
}

const enforceOrganizationLifecycleGate = async (
  req: Request,
  res: Response,
  input: {
    activeOrganizationId: string | null
    isAdmin: boolean
  },
): Promise<boolean> => {
  if (input.isAdmin) return true

  if (input.activeOrganizationId) {
    const lifecycleSnapshot = await resolveOrganizationLifecycleSnapshot(
      input.activeOrganizationId,
    )
    const requestPath = `${req.baseUrl || ''}${req.path || ''}`.replace(
      /\/{2,}/g,
      '/',
    )
    const lifecycleDecision = evaluateApiLifecycleGate(
      requestPath,
      lifecycleSnapshot,
    )

    if (!lifecycleDecision.allowed) {
      const nonProductionDetails =
        config.nodeEnv === 'production'
          ? {}
          : {
              details: {
                requestPath,
                requiredPath: lifecycleDecision.requiredPath,
                lifecycleStatus: lifecycleSnapshot.lifecycleStatus,
                planType: lifecycleSnapshot.planType,
                provisioningStatus: lifecycleSnapshot.provisioningStatus,
              },
            }

      sendApiError(req, res, 403, {
        code: 'ORG_LIFECYCLE_BLOCKED',
        message:
          lifecycleDecision.reason ||
          'Organization lifecycle gate blocked access',
        userMessage:
          'Complete the required organization setup step before continuing.',
        ...nonProductionDetails,
      })
      return false
    }
  }

  return true
}

export const withBetterAuthSessionOnly = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  })

  if (!session) {
    return sendApiError(req, res, 401, {
      code: 'AUTH_UNAUTHORIZED',
      message: 'Unauthorized',
      userMessage: 'Please sign in and retry.',
      retryable: false,
    })
  }

  // attach to req so handlers can use it
  ;(req as any).user = session.user
  ;(req as any).session = session

  const activeOrganizationId =
    (session as any).session?.activeOrganizationId ||
    (session as any).activeOrganizationId ||
    null

  const allowed = await enforceOrganizationLifecycleGate(req, res, {
    activeOrganizationId,
    isAdmin: session.user.isAdmin,
  })
  if (!allowed) return

  next()
}

export const withBetterAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  })

  if (session) {
    // attach to req so handlers can use it
    ;(req as any).user = session.user
    ;(req as any).session = session

    const activeOrganizationId =
      (session as any).session?.activeOrganizationId ||
      (session as any).activeOrganizationId ||
      null

    const allowed = await enforceOrganizationLifecycleGate(req, res, {
      activeOrganizationId,
      isAdmin: session.user.isAdmin,
    })
    if (!allowed) return

    return next()
  }

  const rawApiKey = extractRevCenterApiKey(req)
  if (!rawApiKey) {
    return sendApiError(req, res, 401, {
      code: 'AUTH_UNAUTHORIZED',
      message: 'Unauthorized',
      userMessage: 'Please sign in and retry.',
      retryable: false,
    })
  }

  const apiKeyAuth = await authenticateScopedApiKey(
    rawApiKey,
    requiredApiScopeForMethod(req.method),
  )

  if (!apiKeyAuth) {
    return sendApiError(req, res, 401, {
      code: 'API_KEY_UNAUTHORIZED',
      message: 'Invalid API key',
      userMessage:
        'The API key is invalid, expired, revoked, or missing the required scope.',
      retryable: false,
    })
  }

  ;(req as any).user = apiKeyAuth.user
  ;(req as any).session = {
    id: `api-key:${apiKeyAuth.key.id}`,
    token: apiKeyAuth.key.keyPrefix,
    createdAt: apiKeyAuth.key.createdAt,
    updatedAt: apiKeyAuth.key.updatedAt,
    expiresAt:
      apiKeyAuth.key.expiresAt || new Date(Date.now() + 365 * 24 * 60 * 60_000),
    ipAddress: req.ip || null,
    userAgent: req.get('user-agent') || null,
    userId: apiKeyAuth.user.id,
    activeOrganizationId: apiKeyAuth.key.organizationId,
  }
  ;(req as any).apiKey = {
    id: apiKeyAuth.key.id,
    organizationId: apiKeyAuth.key.organizationId,
    name: apiKeyAuth.key.name,
    keyPrefix: apiKeyAuth.key.keyPrefix,
    scopes: apiKeyAuth.key.scopes,
    createdByUserId: apiKeyAuth.key.createdByUserId,
  }

  const allowed = await enforceOrganizationLifecycleGate(req, res, {
    activeOrganizationId: apiKeyAuth.key.organizationId,
    isAdmin: apiKeyAuth.user.isAdmin,
  })
  if (!allowed) return

  next()
}

export const validateIsAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authReq = req as AuthRequest<unknown>
  if (authReq.apiKey) {
    return sendApiError(req, res, 403, {
      code: 'AUTH_FORBIDDEN',
      message: 'Session admin access required',
      userMessage: 'Sign in as an admin to perform this action.',
      retryable: false,
    })
  }

  if (!authReq.user?.isAdmin) {
    return sendApiError(req, res, 403, {
      code: 'AUTH_FORBIDDEN',
      message: 'Admin access required',
      userMessage: 'Admin access is required for this action.',
      retryable: false,
    })
  }
  next()
}

export const validateMemberOfOrganization = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authReq = req as AuthRequest<{ organizationId: string }>
  const { organizationId } = req.validated

  if (authReq.apiKey) {
    if (authReq.apiKey.organizationId !== organizationId) {
      return sendApiError(req, res, 401, {
        code: 'ORG_UNAUTHORIZED',
        message: 'Unauthorized',
        userMessage: 'This API key is not authorized for that organization.',
        retryable: false,
      })
    }
    return next()
  }

  const isMember = await isMemberOfOrganization(authReq.user.id, organizationId)
  if (!isMember) {
    return sendApiError(req, res, 401, {
      code: 'ORG_UNAUTHORIZED',
      message: 'Unauthorized',
      userMessage: 'You do not have access to this organization.',
      retryable: false,
    })
  }
  next()
}

export const validateMemberOfOrganizationOrAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authReq = req as AuthRequest<{ organizationId: string }>
  const { organizationId } = req.validated

  if (authReq.apiKey) {
    if (authReq.apiKey.organizationId !== organizationId) {
      return sendApiError(req, res, 401, {
        code: 'ORG_UNAUTHORIZED',
        message: 'Unauthorized',
        userMessage: 'This API key is not authorized for that organization.',
        retryable: false,
      })
    }
    return next()
  }

  const isMember = await isMemberOfOrganization(authReq.user.id, organizationId)
  if (!isMember && !authReq.user.isAdmin) {
    return sendApiError(req, res, 401, {
      code: 'ORG_UNAUTHORIZED',
      message: 'Unauthorized',
      userMessage: 'You do not have access to this organization.',
      retryable: false,
    })
  }
  next()
}

export const validateMemberOfOrganizationIs =
  (roles: OrganizationRole[]) =>
  async (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest<{ organizationId: string }>
    const { organizationId } = req.validated

    if (authReq.apiKey) {
      if (authReq.apiKey.organizationId !== organizationId) {
        return sendApiError(req, res, 401, {
          code: 'ORG_UNAUTHORIZED',
          message: 'Unauthorized',
          userMessage: 'This API key is not authorized for that organization.',
          retryable: false,
        })
      }
      return next()
    }

    const member = await findMember(organizationId, authReq.user.id)
    if (!member || !roles.includes(member.role as OrganizationRole)) {
      return sendApiError(req, res, 401, {
        code: 'ORG_ROLE_UNAUTHORIZED',
        message: 'Unauthorized',
        userMessage: 'You do not have the required role for this organization.',
        retryable: false,
      })
    }
    next()
  }

export const validateMemberOfOrganizationIsOrAdmin =
  (roles: OrganizationRole[]) =>
  async (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest<{ organizationId: string }>
    const { organizationId } = req.validated

    if (authReq.apiKey) {
      if (authReq.apiKey.organizationId !== organizationId) {
        return sendApiError(req, res, 401, {
          code: 'ORG_UNAUTHORIZED',
          message: 'Unauthorized',
          userMessage: 'This API key is not authorized for that organization.',
          retryable: false,
        })
      }
      return next()
    }

    const member = await findMember(organizationId, authReq.user.id)
    if (
      (!member || !roles.includes(member.role as OrganizationRole)) &&
      !authReq.user.isAdmin
    ) {
      return sendApiError(req, res, 401, {
        code: 'ORG_ROLE_UNAUTHORIZED',
        message: 'Unauthorized',
        userMessage: 'You do not have the required role for this organization.',
        retryable: false,
      })
    }
    next()
  }

export const withMcpAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const apiKey = req.headers['x-api-key']
  if (!apiKey || apiKey !== config.elevenLabs.apiKey) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  next()
}

export const withElevenLabsWebhookAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Get signature header (case-insensitive)
    const signatureHeaderRaw =
      req.headers['elevenlabs-signature'] || req.headers['Elevenlabs-Signature']
    if (!signatureHeaderRaw) {
      return res.status(401).json({ error: 'Missing signature header' })
    }

    // Handle case where header might be an array
    const signatureHeader = Array.isArray(signatureHeaderRaw)
      ? signatureHeaderRaw[0]
      : signatureHeaderRaw

    const parsedSignatureHeader = parseSignatureHeader(signatureHeader)
    if (!parsedSignatureHeader) {
      return res.status(401).json({ error: 'Invalid signature format' })
    }

    const { timestamp, providedSignature } = parsedSignatureHeader

    // Get raw body - should be a Buffer from express.raw()
    const rawBody = req.body
    if (!rawBody) {
      return res.status(400).json({ error: 'Missing request body' })
    }

    const bodyString = getRawBodyString(rawBody)
    if (bodyString === null) {
      return res.status(400).json({
        error: 'Invalid body type; expected raw request body',
      })
    }

    // Try to find webhook secret from database first (scalable approach)
    let agentWebhookSecret: string | null = null
    const agentExternalId = extractAgentIdFromBody(bodyString)

    if (agentExternalId) {
      const agent = await findAgentByExternalId(
        agentExternalId,
        AgentExternalType.ELEVEN_LABS,
      )
      if (agent?.webhookSecret) {
        agentWebhookSecret = agent.webhookSecret
        logger.info(`Using webhook secret from agent: ${agent.name}`)
      }
    }

    const providerWebhookSecret = config.elevenLabs.webhookKey
    const webhookSecretCandidates = buildWebhookSecretCandidates({
      agentSecret: agentWebhookSecret,
      providerSecret: providerWebhookSecret,
    })

    if (webhookSecretCandidates.length === 0) {
      logger.error('No webhook secret available for verification')
      return res.status(500).json({ error: 'Webhook secret not configured' })
    }

    const signatureResult = resolveMatchingWebhookSecret({
      timestamp,
      bodyString,
      providedSignature,
      candidates: webhookSecretCandidates,
    })

    if (!signatureResult.matched) {
      logger.warn('Webhook signature verification failed', {
        timestamp,
        agentExternalId,
        candidateCount: webhookSecretCandidates.length,
      })
      return res.status(401).json({ error: 'Invalid signature' })
    }

    logger.info(
      {
        agentExternalId,
        secretSource: signatureResult.source,
      },
      'Webhook signature verified',
    )

    // Optional: Verify timestamp is recent (within 5 minutes) to prevent replay attacks
    const timestampNum = parseInt(timestamp, 10)
    const currentTime = Math.floor(Date.now() / 1000)
    const timeDiff = Math.abs(currentTime - timestampNum)
    if (timeDiff > 300) {
      // 5 minutes
      logger.warn('Webhook signature timestamp too old', {
        timestamp: timestampNum,
        currentTime,
        timeDiff,
      })
      return res.status(401).json({ error: 'Signature timestamp too old' })
    }

    const replayCheck = await ensureWebhookNotReplayed({
      providerKey: 'elevenlabs',
      bodyString,
    })
    if (replayCheck.isReplay) {
      logger.warn(
        {
          agentExternalId,
          payloadHash: replayCheck.payloadHash,
          eventId: replayCheck.eventId,
        },
        'Webhook replay detected and rejected',
      )
      return sendApiError(req, res, 409, {
        code: 'WEBHOOK_REPLAY_DETECTED',
        message: 'Duplicate webhook payload was rejected',
        userMessage: 'Duplicate webhook event rejected.',
        details: {
          payloadHash: replayCheck.payloadHash,
          eventId: replayCheck.eventId,
        },
      })
    }

    // Parse the body now that signature is verified
    try {
      req.body = JSON.parse(bodyString)
    } catch (parseError) {
      logger.error('Error parsing webhook body', parseError)
      return res.status(400).json({ error: 'Invalid JSON body' })
    }

    next()
  } catch (error) {
    logger.error('Error verifying webhook signature', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// Dynamic webhook auth - tries database first, falls back to env config
export const withWebhookAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const providerSlug = req.params.providerSlug

    // Get signature header (case-insensitive) - supports elevenlabs format
    const signatureHeaderRaw =
      req.headers['elevenlabs-signature'] ||
      req.headers['Elevenlabs-Signature'] ||
      req.headers['x-webhook-signature'] ||
      req.headers['X-Webhook-Signature']

    if (!signatureHeaderRaw) {
      return res.status(401).json({ error: 'Missing signature header' })
    }

    const signatureHeader = Array.isArray(signatureHeaderRaw)
      ? signatureHeaderRaw[0]
      : signatureHeaderRaw

    const parsedSignatureHeader = parseSignatureHeader(signatureHeader)
    if (!parsedSignatureHeader) {
      return res.status(401).json({ error: 'Invalid signature format' })
    }

    const { timestamp, providedSignature } = parsedSignatureHeader

    const rawBody = req.body
    if (!rawBody) {
      return res.status(400).json({ error: 'Missing request body' })
    }

    const bodyString = getRawBodyString(rawBody)
    if (bodyString === null) {
      return res.status(400).json({
        error: 'Invalid body type; expected raw request body',
      })
    }

    // Try to find webhook secret from database first (scalable approach)
    let agentWebhookSecret: string | null = null
    let providerName = providerSlug
    const agentExternalId = extractAgentIdFromBody(bodyString)

    if (agentExternalId) {
      const agent = await findAgentByExternalId(
        agentExternalId,
        AgentExternalType.ELEVEN_LABS,
      )
      if (agent?.webhookSecret) {
        agentWebhookSecret = agent.webhookSecret
        providerName = agent.name
        logger.info(`Using webhook secret from agent: ${agent.name}`)
      }
    }

    // Fallback to env config provider if no database secret found
    let providerWebhookSecret: string | null = null
    const provider = findProviderBySlug(providerSlug)
    if (provider) {
      providerWebhookSecret = provider.webhookKey
      providerName = provider.name
    }

    const webhookSecretCandidates = buildWebhookSecretCandidates({
      agentSecret: agentWebhookSecret,
      providerSecret: providerWebhookSecret,
    })

    if (webhookSecretCandidates.length === 0) {
      logger.warn(`No webhook secret found for provider: ${providerSlug}`)
      return res
        .status(404)
        .json({ error: 'Unknown provider or missing webhook secret' })
    }

    const signatureResult = resolveMatchingWebhookSecret({
      timestamp,
      bodyString,
      providedSignature,
      candidates: webhookSecretCandidates,
    })

    if (!signatureResult.matched) {
      logger.warn(`[${providerName}] Webhook signature verification failed`, {
        timestamp,
        agentExternalId,
        candidateCount: webhookSecretCandidates.length,
      })
      return res.status(401).json({ error: 'Invalid signature' })
    }

    // Verify timestamp is recent (within 5 minutes)
    const timestampNum = parseInt(timestamp, 10)
    const currentTime = Math.floor(Date.now() / 1000)
    const timeDiff = Math.abs(currentTime - timestampNum)
    if (timeDiff > 300) {
      logger.warn(`[${providerName}] Webhook signature timestamp too old`, {
        timestamp: timestampNum,
        currentTime,
        timeDiff,
      })
      return res.status(401).json({ error: 'Signature timestamp too old' })
    }

    const replayCheck = await ensureWebhookNotReplayed({
      providerKey: providerSlug || providerName || 'unknown',
      bodyString,
    })
    if (replayCheck.isReplay) {
      logger.warn(
        {
          providerSlug,
          payloadHash: replayCheck.payloadHash,
          eventId: replayCheck.eventId,
        },
        'Provider webhook replay detected and rejected',
      )
      return sendApiError(req, res, 409, {
        code: 'WEBHOOK_REPLAY_DETECTED',
        message: 'Duplicate webhook payload was rejected',
        userMessage: 'Duplicate webhook event rejected.',
        details: {
          payloadHash: replayCheck.payloadHash,
          eventId: replayCheck.eventId,
          provider: providerSlug,
        },
      })
    }

    // Parse the body now that signature is verified
    try {
      req.body = JSON.parse(bodyString)
    } catch (parseError) {
      logger.error(`[${providerName}] Error parsing webhook body`, parseError)
      return res.status(400).json({ error: 'Invalid JSON body' })
    }

    next()
  } catch (error) {
    logger.error('Error verifying webhook signature', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
