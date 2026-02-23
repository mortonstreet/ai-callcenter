import { Express, Request, Response, NextFunction } from 'express'
import passport from 'passport'
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt'
import { createHash, createHmac } from 'crypto'
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

export const withBetterAuth = async (
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

  if (!session.user.isAdmin) {
    const activeOrganizationId =
      (session as any).session?.activeOrganizationId ||
      (session as any).activeOrganizationId ||
      null

    const lifecycleSnapshot =
      await resolveOrganizationLifecycleSnapshot(activeOrganizationId)
    const requestPath = `${req.baseUrl || ''}${req.path || ''}`.replace(
      /\/{2,}/g,
      '/',
    )
    const lifecycleDecision = evaluateApiLifecycleGate(
      requestPath,
      lifecycleSnapshot,
    )

    if (!lifecycleDecision.allowed) {
      return sendApiError(req, res, 403, {
        code: 'ORG_LIFECYCLE_BLOCKED',
        message:
          lifecycleDecision.reason ||
          'Organization lifecycle gate blocked access',
        userMessage:
          'Complete the required organization setup step before continuing.',
        details: {
          requestPath,
          requiredPath: lifecycleDecision.requiredPath,
          lifecycleStatus: lifecycleSnapshot.lifecycleStatus,
          planType: lifecycleSnapshot.planType,
          provisioningStatus: lifecycleSnapshot.provisioningStatus,
        },
      })
    }
  }

  next()
}

export const validateIsAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authReq = req as AuthRequest<unknown>
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

    // Parse signature header: t=1764013624,v0=62f4716d1de3d37a936730dc817c98855214d345a22cb69bb802330e6eaa2bd2
    const signatureParts = signatureHeader.split(',')
    const timestampMatch = signatureParts
      .find((p: string) => p.startsWith('t='))
      ?.split('=')[1]
    const signatureMatch = signatureParts
      .find((p: string) => p.startsWith('v0='))
      ?.split('=')[1]

    if (!timestampMatch || !signatureMatch) {
      return res.status(401).json({ error: 'Invalid signature format' })
    }

    const timestamp = timestampMatch
    const providedSignature = signatureMatch

    // Get raw body - should be a Buffer from express.raw()
    const rawBody = req.body
    if (!rawBody) {
      return res.status(400).json({ error: 'Missing request body' })
    }

    // Convert to string if it's a Buffer
    const bodyString = Buffer.isBuffer(rawBody)
      ? rawBody.toString('utf8')
      : rawBody

    // Collect candidate webhook secrets: per-agent DB secret + env/config fallback.
    // ElevenLabs generates its own signing secret at the workspace level, which may
    // differ from the locally-generated per-agent secret stored in the DB.
    const candidateSecrets: string[] = []
    const agentExternalId = extractAgentIdFromBody(bodyString)

    if (agentExternalId) {
      const agent = await findAgentByExternalId(
        agentExternalId,
        AgentExternalType.ELEVEN_LABS,
      )
      if (agent?.webhookSecret) {
        candidateSecrets.push(agent.webhookSecret)
      }
    }

    if (config.elevenLabs.webhookKey) {
      candidateSecrets.push(config.elevenLabs.webhookKey)
    }

    if (candidateSecrets.length === 0) {
      logger.error('No webhook secret available for verification')
      return res.status(500).json({ error: 'Webhook secret not configured' })
    }

    // ElevenLabs signature format: HMAC-SHA256(timestamp + "." + body)
    const signaturePayload = `${timestamp}.${bodyString}`

    // Try each candidate secret until one matches
    let signatureValid = false
    for (const secret of candidateSecrets) {
      const hmac = createHmac('sha256', secret)
      const calculatedSignature = hmac
        .update(signaturePayload, 'utf8')
        .digest('hex')
      if (providedSignature === calculatedSignature) {
        signatureValid = true
        break
      }
    }

    if (!signatureValid) {
      logger.warn('Webhook signature verification failed', {
        provided: providedSignature,
        timestamp,
        agentExternalId,
        secretsTriedCount: candidateSecrets.length,
      })
      return res.status(401).json({ error: 'Invalid signature' })
    }

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

    // Parse signature header: t=timestamp,v0=signature
    const signatureParts = signatureHeader.split(',')
    const timestampMatch = signatureParts
      .find((p: string) => p.startsWith('t='))
      ?.split('=')[1]
    const signatureMatch = signatureParts
      .find((p: string) => p.startsWith('v0='))
      ?.split('=')[1]

    if (!timestampMatch || !signatureMatch) {
      return res.status(401).json({ error: 'Invalid signature format' })
    }

    const timestamp = timestampMatch
    const providedSignature = signatureMatch

    const rawBody = req.body
    if (!rawBody) {
      return res.status(400).json({ error: 'Missing request body' })
    }

    const bodyString = Buffer.isBuffer(rawBody)
      ? rawBody.toString('utf8')
      : rawBody

    // Try to find webhook secret from database first (scalable approach)
    let webhookSecret: string | null = null
    let providerName = providerSlug
    const agentExternalId = extractAgentIdFromBody(bodyString)

    if (agentExternalId) {
      const agent = await findAgentByExternalId(agentExternalId, 'ELEVEN_LABS')
      if (agent?.webhookSecret) {
        webhookSecret = agent.webhookSecret
        providerName = agent.name
        logger.info(`Using webhook secret from agent: ${agent.name}`)
      }
    }

    // Fallback to env config provider if no database secret found
    if (!webhookSecret) {
      const provider = findProviderBySlug(providerSlug)
      if (provider) {
        webhookSecret = provider.webhookKey
        providerName = provider.name
      }
    }

    if (!webhookSecret) {
      logger.warn(`No webhook secret found for provider: ${providerSlug}`)
      return res
        .status(404)
        .json({ error: 'Unknown provider or missing webhook secret' })
    }

    // Signature format: HMAC-SHA256(timestamp + "." + body)
    const payload = `${timestamp}.${bodyString}`

    // Calculate signature using found webhook key
    const hmac = createHmac('sha256', webhookSecret)
    const calculatedSignature = hmac.update(payload, 'utf8').digest('hex')

    if (providedSignature !== calculatedSignature) {
      logger.warn(`[${providerName}] Webhook signature verification failed`, {
        provided: providedSignature,
        calculated: calculatedSignature,
        timestamp,
        agentExternalId,
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
