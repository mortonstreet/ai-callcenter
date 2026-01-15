import { Router } from 'express'
import { withBetterAuth } from '../middlewares/auth'
import { validateAndMerge } from '@/api/middlewares/validationMiddleware'
import { z } from 'zod'
import { deleteOrganizationDev } from '@/api/controllers/organization.controller'

const router = Router()

const DeleteOrganizationSchema = z.object({
  organizationId: z.string(),
})

router.delete(
  '/:organizationId',
  withBetterAuth,
  validateAndMerge(DeleteOrganizationSchema),
  deleteOrganizationDev,
)

export default router

