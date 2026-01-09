import { betterAuth, Session } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { prisma_OnlyForBetterAuth } from '@/lib/db'
import { organization } from 'better-auth/plugins'
import { buildInvitationLink } from '@/utils/invitation.utils'
import {
  sendResetPasswordEmail,
  sendVerificationEmail,
  sendOrganizationInvitation,
} from '@/clients/email.client'
import { stripe } from '@better-auth/stripe'
import logger from '@/lib/logger'
import {
  getLastActiveOrganization,
  getOrganizationMember,
  updateUserLastActiveOrganizationId,
} from '@/repositories/auth.repository'
import { stripeClient } from '@/lib/stripe'
import { STRIPE_PLANS } from '@shared/types/src/stripe'
import { config } from '@/config'
import { scrypt, randomBytes, timingSafeEqual, ScryptOptions } from 'crypto'

// Supabase scrypt parameters
const SCRYPT_N = 16384
const SCRYPT_R = 8
const SCRYPT_P = 1
const SCRYPT_KEYLEN = 64

// Promisified scrypt with options support
function scryptAsync(
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, options, (err, derivedKey) => {
      if (err) reject(err)
      else resolve(derivedKey)
    })
  })
}

// Hash password using scrypt (Supabase-compatible format)
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const derivedKey = await scryptAsync(password, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  })
  return `$scrypt$N=${SCRYPT_N},r=${SCRYPT_R},p=${SCRYPT_P}$${salt.toString('base64')}$${derivedKey.toString('base64')}`
}

// Verify password against Supabase scrypt hash
async function verifyPassword(data: {
  password: string
  hash: string
}): Promise<boolean> {
  const { password, hash } = data

  // Parse Supabase scrypt format: $scrypt$N=16384,r=8,p=1$<salt>$<hash>
  const parts = hash.split('$')
  if (parts.length !== 5 || parts[1] !== 'scrypt') {
    logger.error('Invalid scrypt hash format')
    return false
  }

  const params = parts[2].split(',').reduce(
    (acc, param) => {
      const [key, value] = param.split('=')
      acc[key] = parseInt(value, 10)
      return acc
    },
    {} as Record<string, number>,
  )

  const salt = Buffer.from(parts[3], 'base64')
  const storedKey = Buffer.from(parts[4], 'base64')

  const derivedKey = await scryptAsync(password, salt, storedKey.length, {
    N: params.N,
    r: params.r,
    p: params.p,
  })

  return timingSafeEqual(storedKey, derivedKey)
}

export const auth = betterAuth({
  database: prismaAdapter(prisma_OnlyForBetterAuth, {
    provider: 'postgresql',
  }),
  trustedOrigins: config.trustedOrigins,
  baseURL: config.backendUrl,
  basePath: '/api/auth',
  user: {
    additionalFields: {
      isAdmin: {
        type: 'boolean',
        input: false,
      },
    },
  },
  advanced: {
    crossSubDomainCookies: {
      enabled: config.nodeEnv === 'production',
      domain: '.revcenter.ai', // Allows cookies across revcenter.ai and api.revcenter.ai
    },
    defaultCookieAttributes: {
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
    },
  },
  databaseHooks: {
    session: {
      create: {
        before: async (data, _context) => {
          const activeOrganizationId = await getLastActiveOrganization(
            data.userId,
          )
          logger.info(`Active organization ID: ${activeOrganizationId}`)
          return {
            data: {
              ...data,
              activeOrganizationId: activeOrganizationId,
            },
          }
        },
      },
      update: {
        after: async (data) => {
          const session = data as Session & { activeOrganizationId: string }
          const activeOrganizationId = session.activeOrganizationId
          await updateUserLastActiveOrganizationId(
            data.userId,
            activeOrganizationId,
          )
        },
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    password: {
      hash: hashPassword,
      verify: verifyPassword,
    },
    sendResetPassword: async ({ user, url }) => {
      await sendResetPasswordEmail(user.email, url)
    },
    // Uncomment to enable invite-only signups:
    // signUp: {
    //   enabled: false, // Disables direct signup - users must be invited
    // },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail(user.email, url)
    },
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
  },
  socialProviders: {
    google: {
      clientId: config.providers.google.clientId,
      clientSecret: config.providers.google.clientSecret,
    },
  },
  plugins: [
    organization({
      async sendInvitationEmail(data) {
        const inviteLink = buildInvitationLink(data.id, data.email)
        await sendOrganizationInvitation({
          email: data.email,
          invitedByUsername: data.inviter.user.name,
          invitedByEmail: data.inviter.user.email,
          teamName: data.organization.name,
          inviteLink,
        })
      },
    }),
    stripe({
      stripeClient,
      stripeWebhookSecret: config.stripe.webhookSecret,
      createCustomerOnSignUp: true,
      subscription: {
        enabled: true,
        authorizeReference: async ({ user, referenceId, action }) => {
          const member = await getOrganizationMember(referenceId, user.id)
          return member?.role === 'owner' || member?.role === 'admin'
        },
        getCheckoutSessionParams: async () => {
          return {
            params: {
              allow_promotion_codes: true,
            },
          }
        },
        organization: {
          enabled: true,
        },
        plans: STRIPE_PLANS,
      },
    }),
  ],
})
