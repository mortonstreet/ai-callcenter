import { AuthRequestHandler } from '@/types/handlers'
import { db } from '@/lib/db'
import {
  AdminApproveDemoTenantRequest,
  AdminConvertDemoTenantRequest,
  AdminCreateAgentRequest,
  AdminCreateDemoTenantRequest,
  AdminCreateOrganizationRequest,
  AdminExtendDemoTenantRequest,
  AdminHandoffDemoTenantOwnerRequest,
  AdminListDemoTenantsRequest,
  AdminSuspendDemoTenantRequest,
} from '@shared/types/src'
import { formatToSlug } from '@/utils'
import { createOrganizationWithInvite } from '@/services/organization.service'
import { createAgent as createAgentRepo } from '@/repositories/agent.repository'
import { AgentExternalType } from '@shared/types/src'
import { createAdminAuditLog } from '@/repositories/governance.repository'
import logger from '@/lib/logger'
import {
  approveDemoTenant,
  convertDemoTenant,
  createDemoTenant,
  extendDemoTenant,
  handoffDemoTenantOwner,
  listDemoTenants,
  suspendDemoTenant,
} from '@/services/admin-demo.service'

const writeAdminAudit = async (input: {
  organizationId?: string | null
  actorUserId?: string | null
  action: string
  resourceType: string
  resourceId?: string | null
  before?: Record<string, unknown> | null
  after?: Record<string, unknown> | null
  ipAddress?: string | null
  userAgent?: string | null
}) => {
  try {
    await createAdminAuditLog({
      organizationId: input.organizationId || null,
      actorUserId: input.actorUserId || null,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId || null,
      before: input.before || null,
      after: input.after || null,
      ipAddress: input.ipAddress || null,
      userAgent: input.userAgent || null,
    })
  } catch (error) {
    logger.warn({ error, input }, 'Failed to persist admin audit log')
  }
}

const sendDemoError = (res: any, error: unknown) => {
  const message =
    error instanceof Error ? error.message : 'Demo tenant request failed'
  const normalized = message.toLowerCase()

  if (normalized.includes('not found')) {
    return res.status(404).json({ error: message })
  }

  if (
    normalized.includes('demo tenant') ||
    normalized.includes('already') ||
    normalized.includes('must') ||
    normalized.includes('valid')
  ) {
    return res.status(400).json({ error: message })
  }

  return res.status(500).json({ error: message })
}

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
    .select(['id', 'name', 'slug', 'logo', 'createdAt'])
    .orderBy('createdAt', 'desc')
    .limit(100)
    .execute()

  res.json({ data: organizations })
}

export const getAdminDemoTenants: AuthRequestHandler<
  AdminListDemoTenantsRequest
> = async (req, res) => {
  try {
    const data = await listDemoTenants({
      status: req.validated.status,
    })
    return res.json({ data })
  } catch (error) {
    return sendDemoError(res, error)
  }
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

  await writeAdminAudit({
    organizationId: organization.id,
    actorUserId: req.user.id,
    action: 'organization.created',
    resourceType: 'organization',
    resourceId: organization.id,
    after: {
      name: organization.name,
      slug: organization.slug,
      ownerEmail,
    },
    ipAddress: req.ip || null,
    userAgent: req.get('user-agent') || null,
  })

  res.json({ data: organization })
}

export const createDemoOrganization: AuthRequestHandler<
  AdminCreateDemoTenantRequest
> = async (req, res) => {
  const {
    name,
    ownerEmail,
    ownerName,
    expiresAt,
    usageLimits,
    onboarding,
    approvalNotes,
  } = req.validated

  try {
    const result = await createDemoTenant({
      name,
      ownerEmail,
      ownerName,
      actorUserId: req.user.id,
      expiresAt,
      usageLimits,
      onboarding,
      approvalNotes,
    })

    await writeAdminAudit({
      organizationId: result.organization.id,
      actorUserId: req.user.id,
      action: 'demo_tenant.created',
      resourceType: 'organization',
      resourceId: result.organization.id,
      before: null,
      after: {
        summary: result.summary,
        invitationId: result.invitation.id,
      },
      ipAddress: req.ip || null,
      userAgent: req.get('user-agent') || null,
    })

    return res.status(201).json({
      data: result.summary,
      invitationId: result.invitation.id,
    })
  } catch (error) {
    return sendDemoError(res, error)
  }
}

export const approveDemoOrganization: AuthRequestHandler<
  AdminApproveDemoTenantRequest
> = async (req, res) => {
  const { organizationId, expiresAt, usageLimits, approvalNotes } =
    req.validated

  try {
    const result = await approveDemoTenant({
      organizationId,
      actorUserId: req.user.id,
      expiresAt,
      usageLimits,
      approvalNotes,
    })

    await writeAdminAudit({
      organizationId,
      actorUserId: req.user.id,
      action: 'demo_tenant.approved',
      resourceType: 'organization',
      resourceId: organizationId,
      before: result.before,
      after: result.after,
      ipAddress: req.ip || null,
      userAgent: req.get('user-agent') || null,
    })

    return res.json({ data: result.after })
  } catch (error) {
    return sendDemoError(res, error)
  }
}

export const extendDemoOrganization: AuthRequestHandler<
  AdminExtendDemoTenantRequest
> = async (req, res) => {
  const { organizationId, expiresAt, extensionReason } = req.validated

  try {
    const result = await extendDemoTenant({
      organizationId,
      actorUserId: req.user.id,
      expiresAt,
      extensionReason,
    })

    await writeAdminAudit({
      organizationId,
      actorUserId: req.user.id,
      action: 'demo_tenant.extended',
      resourceType: 'organization',
      resourceId: organizationId,
      before: result.before,
      after: result.after,
      ipAddress: req.ip || null,
      userAgent: req.get('user-agent') || null,
    })

    return res.json({ data: result.after })
  } catch (error) {
    return sendDemoError(res, error)
  }
}

export const suspendDemoOrganization: AuthRequestHandler<
  AdminSuspendDemoTenantRequest
> = async (req, res) => {
  const { organizationId, reason } = req.validated

  try {
    const result = await suspendDemoTenant({
      organizationId,
      actorUserId: req.user.id,
      reason,
    })

    await writeAdminAudit({
      organizationId,
      actorUserId: req.user.id,
      action: 'demo_tenant.suspended',
      resourceType: 'organization',
      resourceId: organizationId,
      before: result.before,
      after: result.after,
      ipAddress: req.ip || null,
      userAgent: req.get('user-agent') || null,
    })

    return res.json({ data: result.after })
  } catch (error) {
    return sendDemoError(res, error)
  }
}

export const convertDemoOrganization: AuthRequestHandler<
  AdminConvertDemoTenantRequest
> = async (req, res) => {
  const { organizationId, reason } = req.validated

  try {
    const result = await convertDemoTenant({
      organizationId,
      actorUserId: req.user.id,
      reason,
    })

    await writeAdminAudit({
      organizationId,
      actorUserId: req.user.id,
      action: 'demo_tenant.converted',
      resourceType: 'organization',
      resourceId: organizationId,
      before: result.before,
      after: result.after,
      ipAddress: req.ip || null,
      userAgent: req.get('user-agent') || null,
    })

    return res.json({ data: result.after })
  } catch (error) {
    return sendDemoError(res, error)
  }
}

export const handoffDemoOrganizationOwner: AuthRequestHandler<
  AdminHandoffDemoTenantOwnerRequest
> = async (req, res) => {
  const { organizationId, ownerEmail, ownerName, role } = req.validated

  try {
    const result = await handoffDemoTenantOwner({
      organizationId,
      actorUserId: req.user.id,
      ownerEmail,
      ownerName,
      role,
    })

    await writeAdminAudit({
      organizationId,
      actorUserId: req.user.id,
      action: 'demo_tenant.owner_handoff',
      resourceType: 'organization',
      resourceId: organizationId,
      before: result.before,
      after: {
        ...result.after,
        ownerUserId: result.ownerUserId,
        invitationId: result.invitationId,
      },
      ipAddress: req.ip || null,
      userAgent: req.get('user-agent') || null,
    })

    return res.json({
      data: result.after,
      ownerUserId: result.ownerUserId,
      invitationId: result.invitationId,
    })
  } catch (error) {
    return sendDemoError(res, error)
  }
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
    industry: null,
    useCase: null,
    website: null,
    mainGoal: null,
    voiceId: null,
    // MCP fields - will be set later via updateAgentMcpCredentials
    mcpApiKey: null,
    webhookSecret: null,
    mcpEndpointUrl: null,
  })

  await writeAdminAudit({
    organizationId,
    actorUserId: req.user.id,
    action: 'agent.created',
    resourceType: 'agent',
    resourceId: agent.id,
    after: {
      name: agent.name,
      externalType: agent.externalType,
      organizationId: agent.organizationId,
    },
    ipAddress: req.ip || null,
    userAgent: req.get('user-agent') || null,
  })

  res.json({ data: agent })
}

// Update organization logo
interface UpdateOrganizationLogoRequest {
  organizationId: string
  logo: string // URL or base64 data
}

export const updateOrganizationLogo: AuthRequestHandler<
  UpdateOrganizationLogoRequest
> = async (req, res) => {
  const { organizationId, logo } = req.validated

  const organization = await db
    .updateTable('organization')
    .set({ logo })
    .where('id', '=', organizationId)
    .returningAll()
    .executeTakeFirst()

  if (!organization) {
    return res.status(404).json({ error: 'Organization not found' })
  }

  await writeAdminAudit({
    organizationId,
    actorUserId: req.user.id,
    action: 'organization.logo_updated',
    resourceType: 'organization',
    resourceId: organizationId,
    before: {
      logo: null,
    },
    after: {
      logo,
    },
    ipAddress: req.ip || null,
    userAgent: req.get('user-agent') || null,
  })

  res.json({ data: organization })
}

// Delete organization
interface DeleteOrganizationRequest {
  organizationId: string
}

export const deleteOrganization: AuthRequestHandler<
  DeleteOrganizationRequest
> = async (req, res) => {
  const { organizationId } = req.validated

  // Check if organization exists
  const existingOrg = await db
    .selectFrom('organization')
    .select(['id', 'name'])
    .where('id', '=', organizationId)
    .executeTakeFirst()

  if (!existingOrg) {
    return res.status(404).json({ error: 'Organization not found' })
  }

  // Delete the organization (cascading deletes will handle related records)
  await db.deleteFrom('organization').where('id', '=', organizationId).execute()

  await writeAdminAudit({
    organizationId,
    actorUserId: req.user.id,
    action: 'organization.deleted',
    resourceType: 'organization',
    resourceId: organizationId,
    before: {
      name: existingOrg.name,
    },
    after: null,
    ipAddress: req.ip || null,
    userAgent: req.get('user-agent') || null,
  })

  res.json({
    success: true,
    message: `Organization "${existingOrg.name}" deleted successfully`,
  })
}
