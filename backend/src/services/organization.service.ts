import { formatToSlug } from '@/utils'
import {
  createOrganization,
  createInvitation as createInvitationRepository,
} from '@/repositories/organization.repository'
import { sendOrganizationInvitation } from '@/clients/email.client'
import { DBOrganization, DBUser } from '@shared/db/src'
import { buildInvitationLink } from '@/utils/invitation.utils'

export const createOrganizationWithInvite = async (
  admin: DBUser,
  name: string,
  ownerEmail: string,
) => {
  const organization = await createOrganization({
    name,
    slug: formatToSlug(name),
    createdAt: new Date(),
  })
  await createOwnerInvitation(admin, organization, ownerEmail)

  return organization
}

export const createOwnerInvitation = async (
  admin: DBUser,
  organization: DBOrganization,
  ownerEmail: string,
) => {
  const invitation = await createInvitationRepository({
    email: ownerEmail,
    role: 'owner',
    organizationId: organization.id,
    status: 'pending',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    inviterId: admin.id,
  })
  await sendOrganizationInvitation({
    email: invitation.email,
    invitedByUsername: 'Vaci Admin',
    invitedByEmail: 'admin@vaci.io',
    teamName: organization.name,
    inviteLink: buildInvitationLink(invitation.id, invitation.email),
  })
  return invitation
}
