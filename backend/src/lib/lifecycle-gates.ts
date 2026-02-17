import { db } from '@/lib/db'
import {
  buildMissingOrganizationLifecycleSnapshot,
  buildOrganizationLifecycleSnapshotFromMetadata,
  OrganizationLifecycleSnapshot,
} from './lifecycle-gates.core'

export * from './lifecycle-gates.core'

export const resolveOrganizationLifecycleSnapshot = async (
  organizationId?: string | null,
): Promise<OrganizationLifecycleSnapshot> => {
  if (!organizationId) {
    return buildMissingOrganizationLifecycleSnapshot()
  }

  const organization = await db
    .selectFrom('organization')
    .where('id', '=', organizationId)
    .select(['id', 'metadata'])
    .executeTakeFirst()

  if (!organization) {
    return buildMissingOrganizationLifecycleSnapshot()
  }

  return buildOrganizationLifecycleSnapshotFromMetadata({
    organizationId: organization.id,
    metadata: organization.metadata,
  })
}
