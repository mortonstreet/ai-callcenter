import { findMember } from '@/repositories/organization.repository'

export const isMemberOfOrganization = async (
  userId: string,
  organizationId: string,
) => {
  const member = await findMember(organizationId, userId)
  if (!member) {
    return false
  }
  return true
}
