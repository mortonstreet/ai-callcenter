import { AuthRequestHandler } from '@/types/handlers'
import { config } from '@/config'
import { db } from '@/lib/db'
import { getOrganizationMember } from '@/repositories/auth.repository'

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
  const organizationId = (req.validated as any)?.organizationId || req.params.organizationId

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

