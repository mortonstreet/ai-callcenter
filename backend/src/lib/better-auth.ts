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
      domain: '.vaci.io', // Allows cookies across vaci.io and api.vaci.io
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
