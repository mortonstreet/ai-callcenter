import { AuthRequestHandler } from '@/types/handlers'
import {
  ConnectIntegrationRequest,
  DeleteIntegrationRequest,
  GetIntegrationStatusRequest,
  GetIntegrationsRequest,
  GetIntegrationSyncJobRequest,
  IntegrationCallbackRequest,
  ListIntegrationSyncJobsRequest,
  StartIntegrationPullSyncRequest,
  StartIntegrationPushSyncRequest,
  TestIntegrationRequest,
  UpdateIntegrationConfigRequest,
} from '@shared/types/src/requests/integrations'
import { sendApiError } from '@/api/utils/error-contract'
import {
  completeIntegrationCallback,
  connectIntegration,
  disconnectIntegration,
  getIntegrationStatus,
  getSyncJob,
  listIntegrations,
  listSyncJobs,
  startSyncJob,
  testIntegrationConnection,
  updateIntegrationConfig,
} from '@/services/integration-contract.service'

export const listIntegrationsHandler: AuthRequestHandler<
  GetIntegrationsRequest
> = async (req, res) => {
  const { organizationId } = req.validated
  return res.json({
    data: listIntegrations(organizationId),
  })
}

export const getIntegrationStatusHandler: AuthRequestHandler<
  GetIntegrationStatusRequest
> = async (req, res) => {
  const { organizationId, provider } = req.validated
  return res.json({
    data: getIntegrationStatus(organizationId, provider),
  })
}

export const connectIntegrationHandler: AuthRequestHandler<
  ConnectIntegrationRequest
> = async (req, res) => {
  const { organizationId, provider, redirectUri } = req.validated

  const result = connectIntegration(
    organizationId,
    provider,
    req.user.id,
    redirectUri,
  )

  return res.status(200).json({
    data: result.integration,
    authorizeUrl: result.authorizeUrl,
  })
}

export const integrationCallbackHandler: AuthRequestHandler<
  IntegrationCallbackRequest
> = async (req, res) => {
  const { organizationId, provider, code, error } = req.validated

  if (error) {
    return sendApiError(req, res, 400, {
      code: 'INTEGRATION_CALLBACK_FAILED',
      message: `Integration callback failed for ${provider}`,
      userMessage: 'Integration callback failed. Please retry.',
      details: { provider, error },
    })
  }

  const integration = completeIntegrationCallback(
    organizationId,
    provider,
    Boolean(code),
  )

  return res.json({
    data: integration,
  })
}

export const updateIntegrationConfigHandler: AuthRequestHandler<
  UpdateIntegrationConfigRequest
> = async (req, res) => {
  const { organizationId, provider, config } = req.validated
  const integration = updateIntegrationConfig(organizationId, provider, config)
  return res.json({
    data: integration,
  })
}

export const testIntegrationHandler: AuthRequestHandler<
  TestIntegrationRequest
> = async (req, res) => {
  const { organizationId, provider } = req.validated
  const result = testIntegrationConnection(organizationId, provider)
  return res.json({
    data: result.integration,
    result: {
      ok: result.ok,
      message: result.message,
    },
  })
}

export const deleteIntegrationHandler: AuthRequestHandler<
  DeleteIntegrationRequest
> = async (req, res) => {
  const { organizationId, provider } = req.validated
  const integration = disconnectIntegration(organizationId, provider)
  return res.json({
    data: integration,
  })
}

export const startIntegrationPullSyncHandler: AuthRequestHandler<
  StartIntegrationPullSyncRequest
> = async (req, res) => {
  const { organizationId, provider } = req.validated
  const job = startSyncJob(organizationId, provider, 'pull')
  return res.status(202).json({
    data: job,
  })
}

export const startIntegrationPushSyncHandler: AuthRequestHandler<
  StartIntegrationPushSyncRequest
> = async (req, res) => {
  const { organizationId, provider } = req.validated
  const job = startSyncJob(organizationId, provider, 'push')
  return res.status(202).json({
    data: job,
  })
}

export const listIntegrationSyncJobsHandler: AuthRequestHandler<
  ListIntegrationSyncJobsRequest
> = async (req, res) => {
  const { organizationId, provider } = req.validated
  return res.json({
    data: listSyncJobs(organizationId, provider),
  })
}

export const getIntegrationSyncJobHandler: AuthRequestHandler<
  GetIntegrationSyncJobRequest
> = async (req, res) => {
  const { organizationId, provider, jobId } = req.validated
  const job = getSyncJob(organizationId, provider, jobId)
  if (!job) {
    return sendApiError(req, res, 404, {
      code: 'INTEGRATION_SYNC_JOB_NOT_FOUND',
      message: `Sync job ${jobId} not found`,
      userMessage: 'The requested sync job was not found.',
      details: { provider, jobId },
    })
  }
  return res.json({
    data: job,
  })
}
