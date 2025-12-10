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
    invitedByUsername: 'Rev Center Admin',
    invitedByEmail: 'admin@revcenter.ai',
    teamName: organizationName,
    inviteLink,
  })
}
