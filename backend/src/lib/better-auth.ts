import { betterAuth, Session } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { prisma_OnlyForBetterAuth, db } from '@/lib/db'
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
    user: {
      create: {
        before: async (user) => {
          // Enforce invite-only signup: check if a valid invitation exists for this email
          const invitation = await db
            .selectFrom('invitation')
            .where('email', '=', user.email)
            .where('status', '=', 'pending')
            .where('expiresAt', '>', new Date())
            .selectAll()
            .executeTakeFirst()

          if (!invitation) {
            throw new Error(
              'Signup requires a valid invitation. Please contact an administrator.',
            )
          }

          return { data: user }
        },
      },
    },
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
    organization: {
      create: {
        before: async (
          _org: { name: string; slug: string },
          context: { context?: { session?: { user?: { id: string } } } },
        ) => {
          // Only platform admins can create organizations
          const userId = context?.context?.session?.user?.id
          if (!userId) {
            throw new Error(
              'Authentication required to create an organization.',
            )
          }
          const user = await db
            .selectFrom('user')
            .where('id', '=', userId)
            .select('isAdmin')
            .executeTakeFirst()

          if (!user?.isAdmin) {
            throw new Error('Only administrators can create organizations.')
          }
          return { data: _org }
        },
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      await sendResetPasswordEmail(user.email, url)
    },
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
    ...(stripeClient
      ? [
          stripe({
            stripeClient,
            stripeWebhookSecret: config.stripe.webhookSecret!,
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
        ]
      : []),
  ],
})
