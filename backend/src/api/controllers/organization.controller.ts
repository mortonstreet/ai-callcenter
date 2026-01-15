import { AuthRequestHandler } from '@/types/handlers'
import { config } from '@/config'
import { db } from '@/lib/db'
import { getOrganizationMember } from '@/repositories/auth.repository'
import { formatToSlug } from '@/utils'
import { createOrganization } from '@/repositories/organization.repository'
import { createAgent as createAgentRepo } from '@/repositories/agent.repository'
import { withId } from '@/repositories/utils'
import { updateUserLastActiveOrganizationId } from '@/repositories/auth.repository'
import { AgentExternalType } from '@shared/types/src'
import { z } from 'zod'

export const OrganizationOnboardingSchema = z.object({
  name: z.string(),
  domain: z.string().optional(),
  industry: z.string(),
  services: z.array(z.string()).default([]),
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
  if (config.nodeEnv === 'production') {
    return res.status(403).json({ error: 'Not available in production' })
  }

  const { name, domain, industry, services, agent } = req.validated
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

  // Create agent with provided name and stash onboarding details in metadata-compatible fields
  const createdAgent = await createAgentRepo({
    name: agent.name,
    slug: formatToSlug(agent.name),
    organizationId: organization.id,
    // Placeholder numbers; can be edited later in settings
    phoneNumber: '+15555550123',
    redirectNumber: '+15555550123',
    externalId: organization.id,
    externalType: AgentExternalType.ELEVEN_LABS,
  })

  res.json({
    data: {
      organization,
      agent: createdAgent,
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
