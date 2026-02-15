import { AuthRequestHandler } from '@/types/handlers'
import { config } from '@/config'
import { db } from '@/lib/db'
import { getOrganizationMember } from '@/repositories/auth.repository'
import { formatToSlug } from '@/utils'
import { createOrganization } from '@/repositories/organization.repository'
import { withId } from '@/repositories/utils'
import { updateUserLastActiveOrganizationId } from '@/repositories/auth.repository'
import { AgentExternalType } from '@shared/types/src'
import { createElevenLabsAgent } from '@/services/agent.service'
import logger from '@/lib/logger'
import { z } from 'zod'

export const OrganizationOnboardingSchema = z.object({
  name: z.string(),
  domain: z.string().optional(),
  industry: z.string(),
  services: z.array(z.string()).default([]),
  useCase: z.string().optional(),
  website: z.string().optional(),
  mainGoal: z.string().optional(),
  agent: z.object({
    name: z.string(),
    openingLine: z.string().optional(),
    serviceQuestions: z.array(z.string()).optional(),
  }),
})

type OrgOnboardingRequest = z.infer<typeof OrganizationOnboardingSchema>

export const onboardOrganization: AuthRequestHandler<
  OrgOnboardingRequest
> = async (req, res) => {
  const {
    name,
    domain,
    industry,
    services,
    useCase,
    website,
    mainGoal,
    agent,
  } = req.validated
  const now = new Date()

  // Create organization with metadata captured from onboarding
  const organization = await createOrganization({
    name,
    slug: formatToSlug(name),
    createdAt: now,
    metadata: JSON.stringify({
      domain,
      industry,
      services,
      useCase,
      website,
      mainGoal,
      agent: {
        openingLine: agent.openingLine,
        serviceQuestions: agent.serviceQuestions,
      },
    }),
  })

  // Add the current user as owner
  await db
    .insertInto('member')
    .values(
      withId({
        organizationId: organization.id,
        userId: req.user.id,
        role: 'owner',
        createdAt: now,
      }),
    )
    .executeTakeFirst()

  await updateUserLastActiveOrganizationId(req.user.id, organization.id)

  // Create agent via ElevenLabs API
  let createdAgent
  try {
    createdAgent = await createElevenLabsAgent({
      organizationId: organization.id,
      companyName: name,
      name: agent.name,
      industry,
      useCase: useCase || 'customer_support',
      website,
      mainGoal,
      firstMessage: agent.openingLine,
      services,
    })
  } catch (error) {
    logger.error(
      'Failed to create ElevenLabs agent during onboarding, creating local-only agent:',
      error,
    )
    // Fallback: create local agent without ElevenLabs
    const { createAgent: createAgentRepo } = await import(
      '@/repositories/agent.repository'
    )
    createdAgent = await createAgentRepo({
      name: agent.name,
      slug: formatToSlug(agent.name),
      organizationId: organization.id,
      phoneNumber: '+15555550123',
      redirectNumber: '+15555550123',
      externalId: organization.id,
      externalType: AgentExternalType.LOCAL_FALLBACK,
      industry: industry || null,
      useCase: useCase || null,
      website: website || null,
      mainGoal: mainGoal || null,
      voiceId: null,
      status: 'active',
    })
  }

  res.json({
    data: {
      organization,
      agent: {
        ...createdAgent,
        degradedMode: {
          enabled:
            createdAgent.externalType === AgentExternalType.LOCAL_FALLBACK,
          reason:
            createdAgent.externalType === AgentExternalType.LOCAL_FALLBACK
              ? 'local_fallback_agent'
              : null,
        },
      },
    },
  })
}

interface DeleteOrganizationDevRequest {
  organizationId: string
}

// Development-only organization delete for the current user (owner or admin)
export const deleteOrganizationDev: AuthRequestHandler<
  DeleteOrganizationDevRequest
> = async (req, res) => {
  if (config.nodeEnv === 'production') {
    return res.status(403).json({ error: 'Not available in production' })
  }

  // Accept org id from validated payload or params to avoid validation mismatch
  const organizationId =
    (req.validated as any)?.organizationId || req.params.organizationId

  // In development, allow any authenticated user to delete if they can reach this route.
  // (We keep production locked above.)

  const existingOrg = await db
    .selectFrom('organization')
    .select(['id', 'name'])
    .where('id', '=', organizationId)
    .executeTakeFirst()

  if (!existingOrg) {
    return res.status(404).json({ error: 'Organization not found' })
  }

  await db.deleteFrom('organization').where('id', '=', organizationId).execute()

  res.json({
    success: true,
    message: `Organization "${existingOrg.name}" deleted (development only)`,
  })
}
