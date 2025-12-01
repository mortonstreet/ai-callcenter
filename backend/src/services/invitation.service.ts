import { sendOrganizationInvitation } from '@/clients/email.client'
import { buildInvitationLink } from '@/utils/invitation.utils'

export const createInvitation = async (
  invitationId: string,
  email: string,
  organizationName: string,
) => {
  const inviteLink = buildInvitationLink(invitationId, email)
  await sendOrganizationInvitation({
    email: email,
    invitedByUsername: 'Vaci Admin',
    invitedByEmail: 'admin@vaci.io',
    teamName: organizationName,
    inviteLink,
  })
}
