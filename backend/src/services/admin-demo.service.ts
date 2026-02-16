import { db } from '@/lib/db'
import { formatToSlug } from '@/utils'
import {
  createInvitation as createInvitationRecord,
  createOrganization,
} from '@/repositories/organization.repository'
import { withId } from '@/repositories/utils'
import { updateUserLastActiveOrganizationId } from '@/repositories/auth.repository'
import { createInvitation as sendInvitationEmail } from '@/services/invitation.service'
import {
  DemoOnboardingProfile,
  DemoTenantStatus,
  DemoTenantSummary,
  DemoUsageLimits,
  applyDemoApproval,
  applyDemoConversion,
  applyDemoExtension,
  applyDemoOwnerHandoff,
  applyDemoSuspension,
  buildCreateDemoMetadata,
  buildDemoTenantSummary,
  isDemoTenantMetadata,
  parseOrganizationMetadata,
  resolveDemoTenantStatus,
} from './admin-demo.core'

type DemoOrganizationRow = {
  id: string
  name: string
  slug: string
  createdAt: Date
  metadata: string | null
}

const INVITATION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000

const asDate = (value: string | null | undefined): Date | null => {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const getOrganizationById = async (
  organizationId: string,
): Promise<DemoOrganizationRow> => {
  const organization = await db
    .selectFrom('organization')
    .select(['id', 'name', 'slug', 'createdAt', 'metadata'])
    .where('id', '=', organizationId)
    .executeTakeFirst()

  if (!organization) {
    throw new Error('Organization not found')
  }

  return organization
}

const persistOrganizationMetadata = async (
  organizationId: string,
  metadata: Record<string, unknown>,
): Promise<DemoOrganizationRow> => {
  const organization = await db
    .updateTable('organization')
    .set({ metadata: JSON.stringify(metadata) })
    .where('id', '=', organizationId)
    .returning(['id', 'name', 'slug', 'createdAt', 'metadata'])
    .executeTakeFirst()

  if (!organization) {
    throw new Error('Organization not found')
  }

  return organization
}

const ensureDemoTenant = (metadata: Record<string, unknown>) => {
  if (!isDemoTenantMetadata(metadata)) {
    throw new Error('Organization is not a demo tenant')
  }
}

const ensureDemoTenantNotConverted = (metadata: Record<string, unknown>) => {
  const status = resolveDemoTenantStatus(metadata)
  if (status === 'converted') {
    throw new Error('Demo tenant has already been converted to paid')
  }
}

const buildSummary = (
  organization: DemoOrganizationRow,
  metadata: Record<string, unknown>,
): DemoTenantSummary =>
  buildDemoTenantSummary({
    organizationId: organization.id,
    name: organization.name,
    slug: organization.slug,
    createdAt: organization.createdAt,
    metadata,
  })

const createOwnerInvitation = async (input: {
  organizationId: string
  organizationName: string
  ownerEmail: string
  role: 'owner' | 'admin'
  inviterId: string
}) => {
  const invitation = await createInvitationRecord({
    organizationId: input.organizationId,
    email: input.ownerEmail,
    role: input.role,
    status: 'pending',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + INVITATION_EXPIRY_MS),
    inviterId: input.inviterId,
  })

  await sendInvitationEmail(
    invitation.id,
    invitation.email,
    input.organizationName,
  )

  return invitation
}

export const listDemoTenants = async (input?: {
  status?: DemoTenantStatus
}) => {
  const organizations = await db
    .selectFrom('organization')
    .select(['id', 'name', 'slug', 'createdAt', 'metadata'])
    .orderBy('createdAt', 'desc')
    .limit(500)
    .execute()

  const summaries = organizations
    .map((organization) => {
      const metadata = parseOrganizationMetadata(organization.metadata)
      if (!isDemoTenantMetadata(metadata)) {
        return null
      }

      const summary = buildSummary(organization, metadata)
      if (input?.status && summary.status !== input.status) {
        return null
      }

      return summary
    })
    .filter((entry): entry is DemoTenantSummary => !!entry)

  return summaries
}

export const createDemoTenant = async (input: {
  name: string
  ownerEmail: string
  ownerName?: string
  actorUserId: string
  expiresAt?: string
  usageLimits?: DemoUsageLimits
  onboarding?: DemoOnboardingProfile
  approvalNotes?: string
}) => {
  const metadata = buildCreateDemoMetadata({
    ownerEmail: input.ownerEmail,
    ownerName: input.ownerName,
    actorUserId: input.actorUserId,
    expiresAt: input.expiresAt,
    usageLimits: input.usageLimits,
    onboarding: input.onboarding,
    approvalNotes: input.approvalNotes,
  })

  const organization = await createOrganization({
    name: input.name,
    slug: formatToSlug(input.name),
    createdAt: new Date(),
    metadata: JSON.stringify(metadata),
  })

  const invitation = await createOwnerInvitation({
    organizationId: organization.id,
    organizationName: organization.name,
    ownerEmail: input.ownerEmail,
    role: 'owner',
    inviterId: input.actorUserId,
  })

  return {
    organization,
    invitation,
    summary: buildSummary(organization, metadata),
  }
}

export const approveDemoTenant = async (input: {
  organizationId: string
  actorUserId: string
  expiresAt?: string
  usageLimits?: DemoUsageLimits
  approvalNotes?: string
}) => {
  const organization = await getOrganizationById(input.organizationId)
  const beforeMetadata = parseOrganizationMetadata(organization.metadata)

  ensureDemoTenant(beforeMetadata)
  ensureDemoTenantNotConverted(beforeMetadata)

  const updatedMetadata = applyDemoApproval(beforeMetadata, {
    actorUserId: input.actorUserId,
    expiresAt: input.expiresAt,
    usageLimits: input.usageLimits,
    approvalNotes: input.approvalNotes,
  })

  await persistOrganizationMetadata(organization.id, updatedMetadata)

  return {
    before: buildSummary(organization, beforeMetadata),
    after: buildSummary(organization, updatedMetadata),
  }
}

export const extendDemoTenant = async (input: {
  organizationId: string
  actorUserId: string
  expiresAt: string
  extensionReason: string
}) => {
  const organization = await getOrganizationById(input.organizationId)
  const beforeMetadata = parseOrganizationMetadata(organization.metadata)

  ensureDemoTenant(beforeMetadata)
  ensureDemoTenantNotConverted(beforeMetadata)

  const before = buildSummary(organization, beforeMetadata)
  const nextExpiry = asDate(input.expiresAt)
  if (!nextExpiry) {
    throw new Error('expiresAt must be a valid ISO date-time value')
  }

  const previousExpiry = asDate(before.expiresAt)
  if (previousExpiry && nextExpiry <= previousExpiry) {
    throw new Error('New demo expiry must be after the current expiry')
  }

  const updatedMetadata = applyDemoExtension(beforeMetadata, {
    actorUserId: input.actorUserId,
    expiresAt: input.expiresAt,
    extensionReason: input.extensionReason,
  })

  await persistOrganizationMetadata(organization.id, updatedMetadata)

  return {
    before,
    after: buildSummary(organization, updatedMetadata),
  }
}

export const suspendDemoTenant = async (input: {
  organizationId: string
  actorUserId: string
  reason: string
}) => {
  const organization = await getOrganizationById(input.organizationId)
  const beforeMetadata = parseOrganizationMetadata(organization.metadata)

  ensureDemoTenant(beforeMetadata)
  ensureDemoTenantNotConverted(beforeMetadata)

  const updatedMetadata = applyDemoSuspension(beforeMetadata, {
    actorUserId: input.actorUserId,
    reason: input.reason,
  })

  await persistOrganizationMetadata(organization.id, updatedMetadata)

  return {
    before: buildSummary(organization, beforeMetadata),
    after: buildSummary(organization, updatedMetadata),
  }
}

export const convertDemoTenant = async (input: {
  organizationId: string
  actorUserId: string
  reason?: string
}) => {
  const organization = await getOrganizationById(input.organizationId)
  const beforeMetadata = parseOrganizationMetadata(organization.metadata)

  ensureDemoTenant(beforeMetadata)
  ensureDemoTenantNotConverted(beforeMetadata)

  const updatedMetadata = applyDemoConversion(beforeMetadata, {
    actorUserId: input.actorUserId,
    reason: input.reason,
  })

  await persistOrganizationMetadata(organization.id, updatedMetadata)

  return {
    before: buildSummary(organization, beforeMetadata),
    after: buildSummary(organization, updatedMetadata),
  }
}

export const handoffDemoTenantOwner = async (input: {
  organizationId: string
  actorUserId: string
  ownerEmail: string
  ownerName?: string
  role: 'owner' | 'admin'
}) => {
  const organization = await getOrganizationById(input.organizationId)
  const beforeMetadata = parseOrganizationMetadata(organization.metadata)

  ensureDemoTenant(beforeMetadata)

  const matchedUser = await db
    .selectFrom('user')
    .select(['id', 'name', 'email'])
    .where('email', '=', input.ownerEmail)
    .executeTakeFirst()

  let ownerUserId: string | null = null
  let invitationId: string | null = null

  if (matchedUser) {
    ownerUserId = matchedUser.id

    if (input.role === 'owner') {
      await db
        .updateTable('member')
        .set({ role: 'admin' })
        .where('organizationId', '=', organization.id)
        .where('role', '=', 'owner')
        .where('userId', '!=', matchedUser.id)
        .executeTakeFirst()
    }

    const existingMember = await db
      .selectFrom('member')
      .select(['id'])
      .where('organizationId', '=', organization.id)
      .where('userId', '=', matchedUser.id)
      .executeTakeFirst()

    if (existingMember) {
      await db
        .updateTable('member')
        .set({ role: input.role })
        .where('organizationId', '=', organization.id)
        .where('userId', '=', matchedUser.id)
        .executeTakeFirst()
    } else {
      await db
        .insertInto('member')
        .values(
          withId({
            organizationId: organization.id,
            userId: matchedUser.id,
            role: input.role,
            createdAt: new Date(),
          }),
        )
        .executeTakeFirst()
    }

    await updateUserLastActiveOrganizationId(matchedUser.id, organization.id)
  } else {
    const invitation = await createOwnerInvitation({
      organizationId: organization.id,
      organizationName: organization.name,
      ownerEmail: input.ownerEmail,
      role: input.role,
      inviterId: input.actorUserId,
    })
    invitationId = invitation.id
  }

  const updatedMetadata = applyDemoOwnerHandoff(beforeMetadata, {
    actorUserId: input.actorUserId,
    ownerEmail: input.ownerEmail,
    ownerUserId,
    ownerName: input.ownerName || matchedUser?.name || null,
    invitationId,
  })

  await persistOrganizationMetadata(organization.id, updatedMetadata)

  return {
    before: buildSummary(organization, beforeMetadata),
    after: buildSummary(organization, updatedMetadata),
    ownerUserId,
    invitationId,
  }
}
