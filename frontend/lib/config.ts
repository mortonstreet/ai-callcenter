import { z } from 'zod'

const envSchema = z.object({
  API_URL: z.url().default('https://api.revcenter.ai/api'),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
})

export const env = envSchema.parse({
  API_URL: process.env.NEXT_PUBLIC_API_URL,
  NODE_ENV: process.env.NODE_ENV,
})

export const ENDPOINTS = {
  USER: {
    ACCOUNT: '/user/account',
  },
  AUTH: {
    VERIFY_EMAIL: '/auth/verify-email',
    RESET_PASSWORD: '/auth/reset-password',
    FORGOT_PASSWORD: '/auth/forget-password',
    SIGN_IN: '/auth/sign-in',
    SIGN_UP: '/auth/sign-up',
    SIGN_OUT: '/auth/sign-out',
    CHANGE_PASSWORD: '/auth/change-password',
  },
  ORGANIZATION: {
    INVITE_MEMBER: '/auth/organization/invite-member',
  },
}

export const QUERY_KEYS = {
  organizations: () => ['organizations'] as const,
  userAccount: () => ['user', 'account'] as const,
  organizationMembers: (orgId?: string) =>
    ['organization', 'members', orgId] as const,
  organizationInvitations: (orgId?: string) =>
    ['organization', 'invitations', orgId] as const,
  agents: (orgId?: string) => ['agents', orgId] as const,
  agent: (orgId?: string, agentId?: string) =>
    ['agent', orgId, agentId] as const,
  tasks: (orgId?: string, agentId?: string) =>
    ['tasks', orgId, agentId] as const,
  agentConfig: (orgId?: string, agentId?: string) =>
    ['agentConfig', orgId, agentId] as const,
  voices: (orgId?: string) => ['voices', orgId] as const,
  agentAnalytics: (
    orgId?: string,
    agentId?: string,
    startDate?: string,
    endDate?: string,
  ) => ['agentAnalytics', orgId, agentId, startDate, endDate] as const,
  agentConversations: (orgId?: string, agentId?: string) =>
    ['agentConversations', orgId, agentId] as const,
  integrations: (orgId?: string) => ['integrations', orgId] as const,
  integrationStatus: (orgId?: string, provider?: string) =>
    ['integrationStatus', orgId, provider] as const,
  integrationSyncJobs: (orgId?: string, provider?: string) =>
    ['integrationSyncJobs', orgId, provider] as const,
  campaigns: (orgId?: string, channel?: string) =>
    ['campaigns', orgId, channel] as const,
  campaign: (orgId?: string, campaignId?: string) =>
    ['campaign', orgId, campaignId] as const,
  campaignEnrollments: (orgId?: string, campaignId?: string) =>
    ['campaignEnrollments', orgId, campaignId] as const,
  campaignStats: (orgId?: string, campaignId?: string) =>
    ['campaignStats', orgId, campaignId] as const,
  campaignEvents: (orgId?: string, campaignId?: string) =>
    ['campaignEvents', orgId, campaignId] as const,
  billingSummary: (orgId?: string) => ['billingSummary', orgId] as const,
  provisioningLatest: (orgId?: string, agentId?: string) =>
    ['provisioningLatest', orgId, agentId] as const,
  provisioningJob: (jobId?: string) => ['provisioningJob', jobId] as const,
  provisioningSteps: (jobId?: string) => ['provisioningSteps', jobId] as const,
  onboardingProvisioningStatus: (organizationId?: string) =>
    ['onboardingProvisioningStatus', organizationId] as const,
}
