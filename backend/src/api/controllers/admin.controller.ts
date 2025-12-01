import { AuthRequestHandler } from '@/types/handlers'
import { db } from '@/lib/db'
import {
  AdminCreateOrganizationRequest,
  AdminCreateAgentRequest,
} from '@shared/types/src'
import { formatToSlug } from '@/utils'
import { createOrganizationWithInvite } from '@/services/organization.service'
import { createAgent as createAgentRepo } from '@/repositories/agent.repository'
import { AgentExternalType } from '@shared/types/src'

export const getAdminStats: AuthRequestHandler<{}> = async (req, res) => {
  const [usersCount, organizationsCount] = await Promise.all([
    db
      .selectFrom('user')
      .select(db.fn.countAll().as('count'))
      .executeTakeFirst(),
    db
      .selectFrom('organization')
      .select(db.fn.countAll().as('count'))
      .executeTakeFirst(),
  ])

  res.json({
    users: Number(usersCount?.count || 0),
    organizations: Number(organizationsCount?.count || 0),
  })
}

export const getAdminUsers: AuthRequestHandler<{}> = async (req, res) => {
  const users = await db
    .selectFrom('user')
    .select(['id', 'email', 'name', 'createdAt', 'isAdmin', 'emailVerified'])
    .orderBy('createdAt', 'desc')
    .limit(100)
    .execute()

  res.json({ data: users })
}

export const getAdminOrganizations: AuthRequestHandler<{}> = async (
  req,
  res,
) => {
  const organizations = await db
    .selectFrom('organization')
    .select(['id', 'name', 'slug', 'createdAt'])
    .orderBy('createdAt', 'desc')
    .limit(100)
    .execute()

  res.json({ data: organizations })
}

export const createOrganization: AuthRequestHandler<
  AdminCreateOrganizationRequest
> = async (req, res) => {
  const { name, ownerEmail } = req.validated
  const organization = await createOrganizationWithInvite(
    req.user,
    name,
    ownerEmail,
  )

  res.json({ data: organization })
}

export const createAgent: AuthRequestHandler<AdminCreateAgentRequest> = async (
  req,
  res,
) => {
  const { organizationId, name, phoneNumber, redirectNumber, externalId } =
    req.validated

  const agent = await createAgentRepo({
    name,
    slug: formatToSlug(name),
    organizationId,
    phoneNumber,
    redirectNumber,
    externalId,
    externalType: AgentExternalType.ELEVEN_LABS,
  })

  res.json({ data: agent })
}
