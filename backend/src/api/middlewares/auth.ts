import { Express, Request, Response, NextFunction } from 'express'
import passport from 'passport'
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt'
import { createHmac } from 'crypto'
import { config } from '@/config'
import logger from '@/lib/logger'
import { findById } from '@/repositories/user.repository'
import { fromNodeHeaders } from 'better-auth/node'
import { auth } from '@/lib/better-auth'
import { isMemberOfOrganization } from '@/services/user.service'
import { AuthRequest } from '@/types/handlers'
import { findMember } from '@/repositories/organization.repository'
import { OrganizationRole } from '@shared/types/src'

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
    return res.status(401).json({ error: 'Unauthorized' })
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
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // attach to req so handlers can use it
  ;(req as any).user = session.user
  ;(req as any).session = session

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
    return res.status(401).json({ error: 'Unauthorized' })
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
    return res.status(401).json({ error: 'Unauthorized' })
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
      return res.status(401).json({ error: 'Unauthorized' })
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
      return res.status(401).json({ error: 'Unauthorized' })
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

    // ElevenLabs signature format: HMAC-SHA256(timestamp + "." + body)
    const payload = `${timestamp}.${bodyString}`

    // Calculate HMAC signature
    const hmac = createHmac('sha256', config.elevenLabs.webhookKey)
    const calculatedSignature = hmac.update(payload, 'utf8').digest('hex')

    // Compare signatures
    if (providedSignature !== calculatedSignature) {
      logger.warn('Webhook signature verification failed', {
        provided: providedSignature,
        calculated: calculatedSignature,
        timestamp,
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
