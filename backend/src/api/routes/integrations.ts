import { Router } from 'express'
import { withBetterAuth } from '../middlewares/auth'
import {
  validateMemberOfOrganizationIsOrAdmin,
  validateMemberOfOrganizationOrAdmin,
} from '../middlewares/auth'
import { validateAndMerge } from '../middlewares/validationMiddleware'
import { authenticatedRoute } from './utils'
import {
  ConnectIntegrationRequestSchema,
  DeleteIntegrationRequestSchema,
  GetIntegrationStatusRequestSchema,
  GetIntegrationSyncJobRequestSchema,
  GetIntegrationsRequestSchema,
  ListIntegrationSyncJobsRequestSchema,
  StartIntegrationPullSyncRequestSchema,
  StartIntegrationPushSyncRequestSchema,
  TestIntegrationRequestSchema,
  UpdateIntegrationConfigRequestSchema,
  IntegrationCallbackRequestSchema,
} from '@shared/types/src/requests/integrations'
import { OrganizationRole } from '@shared/types/src'
import { resolveOrganizationScope } from '../middlewares/organizationScope'
import {
  connectIntegrationHandler,
  deleteIntegrationHandler,
  getIntegrationStatusHandler,
  getIntegrationSyncJobHandler,
  integrationCallbackHandler,
  listIntegrationSyncJobsHandler,
  listIntegrationsHandler,
  startIntegrationPullSyncHandler,
  startIntegrationPushSyncHandler,
  testIntegrationHandler,
  updateIntegrationConfigHandler,
} from '../controllers/integration.controller'

const router = Router()

router.use(withBetterAuth)

router.get(
  '/',
  validateAndMerge(GetIntegrationsRequestSchema),
  resolveOrganizationScope,
  validateMemberOfOrganizationOrAdmin,
  authenticatedRoute(listIntegrationsHandler),
)

router.get(
  '/:provider/status',
  validateAndMerge(GetIntegrationStatusRequestSchema),
  resolveOrganizationScope,
  validateMemberOfOrganizationOrAdmin,
  authenticatedRoute(getIntegrationStatusHandler),
)

router.post(
  '/:provider/connect',
  validateAndMerge(ConnectIntegrationRequestSchema),
  resolveOrganizationScope,
  validateMemberOfOrganizationIsOrAdmin([
    OrganizationRole.ADMIN,
    OrganizationRole.OWNER,
  ]),
  authenticatedRoute(connectIntegrationHandler),
)

router.get(
  '/:provider/callback',
  validateAndMerge(IntegrationCallbackRequestSchema),
  resolveOrganizationScope,
  validateMemberOfOrganizationIsOrAdmin([
    OrganizationRole.ADMIN,
    OrganizationRole.OWNER,
  ]),
  authenticatedRoute(integrationCallbackHandler),
)

router.patch(
  '/:provider/config',
  validateAndMerge(UpdateIntegrationConfigRequestSchema),
  resolveOrganizationScope,
  validateMemberOfOrganizationIsOrAdmin([
    OrganizationRole.ADMIN,
    OrganizationRole.OWNER,
  ]),
  authenticatedRoute(updateIntegrationConfigHandler),
)

router.post(
  '/:provider/test',
  validateAndMerge(TestIntegrationRequestSchema),
  resolveOrganizationScope,
  validateMemberOfOrganizationIsOrAdmin([
    OrganizationRole.ADMIN,
    OrganizationRole.OWNER,
  ]),
  authenticatedRoute(testIntegrationHandler),
)

router.delete(
  '/:provider',
  validateAndMerge(DeleteIntegrationRequestSchema),
  resolveOrganizationScope,
  validateMemberOfOrganizationIsOrAdmin([
    OrganizationRole.ADMIN,
    OrganizationRole.OWNER,
  ]),
  authenticatedRoute(deleteIntegrationHandler),
)

router.post(
  '/:provider/sync/pull',
  validateAndMerge(StartIntegrationPullSyncRequestSchema),
  resolveOrganizationScope,
  validateMemberOfOrganizationIsOrAdmin([
    OrganizationRole.ADMIN,
    OrganizationRole.OWNER,
  ]),
  authenticatedRoute(startIntegrationPullSyncHandler),
)

router.post(
  '/:provider/sync/push',
  validateAndMerge(StartIntegrationPushSyncRequestSchema),
  resolveOrganizationScope,
  validateMemberOfOrganizationIsOrAdmin([
    OrganizationRole.ADMIN,
    OrganizationRole.OWNER,
  ]),
  authenticatedRoute(startIntegrationPushSyncHandler),
)

router.get(
  '/:provider/sync/jobs',
  validateAndMerge(ListIntegrationSyncJobsRequestSchema),
  resolveOrganizationScope,
  validateMemberOfOrganizationOrAdmin,
  authenticatedRoute(listIntegrationSyncJobsHandler),
)

router.get(
  '/:provider/sync/jobs/:jobId',
  validateAndMerge(GetIntegrationSyncJobRequestSchema),
  resolveOrganizationScope,
  validateMemberOfOrganizationOrAdmin,
  authenticatedRoute(getIntegrationSyncJobHandler),
)

export default router
