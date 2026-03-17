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
import * as integrationRepository from '@/repositories/integration.repository'
import { isMemberOfOrganization } from '@/services/user.service'
import {
  completeIntegrationCallback,
  connectIntegration,
  disconnectIntegration,
  getIntegrationStatus,
  getSyncJob,
  IntegrationServiceError,
  listIntegrations,
  listSyncJobs,
  startSyncJob,
  testIntegrationConnection,
  updateIntegrationConfig,
} from '@/services/integration-contract.service'

const sendIntegrationServiceError = (
  req: Parameters<AuthRequestHandler<any>>[0],
  res: Parameters<AuthRequestHandler<any>>[1],
  error: IntegrationServiceError,
) => {
  return sendApiError(req, res, error.status, {
    code: error.code,
    message: error.message,
    userMessage: error.userMessage,
    details: error.details,
  })
}

export const listIntegrationsHandler: AuthRequestHandler<
  GetIntegrationsRequest
> = async (req, res, next) => {
  try {
    const { organizationId } = req.validated
    return res.json({
      data: await listIntegrations(organizationId),
    })
  } catch (error) {
    if (error instanceof IntegrationServiceError) {
      return sendIntegrationServiceError(req, res, error)
    }
    return next(error)
  }
}

export const getIntegrationStatusHandler: AuthRequestHandler<
  GetIntegrationStatusRequest
> = async (req, res, next) => {
  try {
    const { organizationId, provider } = req.validated
    return res.json({
      data: await getIntegrationStatus(organizationId, provider),
    })
  } catch (error) {
    if (error instanceof IntegrationServiceError) {
      return sendIntegrationServiceError(req, res, error)
    }
    return next(error)
  }
}

export const connectIntegrationHandler: AuthRequestHandler<
  ConnectIntegrationRequest
> = async (req, res, next) => {
  try {
    const { organizationId, provider, redirectUri } = req.validated

    const result = await connectIntegration(
      organizationId,
      provider,
      req.user.id,
      redirectUri,
    )

    return res.status(200).json({
      data: result.integration,
      authorizeUrl: result.authorizeUrl,
    })
  } catch (error) {
    if (error instanceof IntegrationServiceError) {
      return sendIntegrationServiceError(req, res, error)
    }
    return next(error)
  }
}

export const integrationCallbackHandler: AuthRequestHandler<
  IntegrationCallbackRequest
> = async (req, res, next) => {
  try {
    const { organizationId, provider, code, state, error } = req.validated

    if (error) {
      return sendApiError(req, res, 400, {
        code: 'INTEGRATION_CALLBACK_FAILED',
        message: `Integration callback failed for ${provider}`,
        userMessage: 'Integration callback failed. Please retry.',
        details: { provider, error },
      })
    }

    let resolvedOrganizationId = organizationId

    if (!resolvedOrganizationId && state) {
      const pendingIntegration =
        await integrationRepository.findIntegrationByProviderAndOauthState(
          provider,
          state,
        )

      if (!pendingIntegration) {
        return sendApiError(req, res, 404, {
          code: 'INTEGRATION_NOT_FOUND',
          message: `Pending ${provider} integration was not found`,
          userMessage: 'Start a new connection attempt and retry.',
          details: { provider },
        })
      }

      const isMember = await isMemberOfOrganization(
        req.user.id,
        pendingIntegration.organizationId,
      )

      if (
        !isMember &&
        !req.user.isAdmin &&
        pendingIntegration.createdByUserId !== req.user.id
      ) {
        return sendApiError(req, res, 401, {
          code: 'ORG_UNAUTHORIZED',
          message: 'Unauthorized',
          userMessage: 'You do not have access to this organization.',
          retryable: false,
        })
      }

      resolvedOrganizationId = pendingIntegration.organizationId
    }

    if (!resolvedOrganizationId) {
      return sendApiError(req, res, 400, {
        code: 'ORG_SCOPE_REQUIRED',
        message: 'Organization scope is required',
        userMessage: 'Select an organization and retry.',
        retryable: false,
      })
    }

    await completeIntegrationCallback(
      resolvedOrganizationId,
      provider,
      code,
      state,
    )

    return res.status(200).type('html').send(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Integration Connected</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, sans-serif; padding: 32px; color: #111827; }
      .muted { color: #6b7280; }
    </style>
  </head>
  <body>
    <h1>${provider} connected</h1>
    <p class="muted">You can close this window. RevCenter will refresh the integration status automatically.</p>
    <script>
      if (window.opener && !window.opener.closed) {
        try {
          window.opener.location.reload();
        } catch (error) {}
      }
      setTimeout(() => window.close(), 400);
    </script>
  </body>
</html>`)
  } catch (error) {
    if (error instanceof IntegrationServiceError) {
      return sendIntegrationServiceError(req, res, error)
    }
    return next(error)
  }
}

export const updateIntegrationConfigHandler: AuthRequestHandler<
  UpdateIntegrationConfigRequest
> = async (req, res, next) => {
  try {
    const { organizationId, provider, config } = req.validated
    const integration = await updateIntegrationConfig(
      organizationId,
      provider,
      config,
    )
    return res.json({
      data: integration,
    })
  } catch (error) {
    if (error instanceof IntegrationServiceError) {
      return sendIntegrationServiceError(req, res, error)
    }
    return next(error)
  }
}

export const testIntegrationHandler: AuthRequestHandler<
  TestIntegrationRequest
> = async (req, res, next) => {
  try {
    const { organizationId, provider } = req.validated
    const result = await testIntegrationConnection(organizationId, provider)
    return res.json({
      data: result.integration,
      result: {
        ok: result.ok,
        message: result.message,
      },
    })
  } catch (error) {
    if (error instanceof IntegrationServiceError) {
      return sendIntegrationServiceError(req, res, error)
    }
    return next(error)
  }
}

export const deleteIntegrationHandler: AuthRequestHandler<
  DeleteIntegrationRequest
> = async (req, res, next) => {
  try {
    const { organizationId, provider } = req.validated
    const integration = await disconnectIntegration(organizationId, provider)
    return res.json({
      data: integration,
    })
  } catch (error) {
    if (error instanceof IntegrationServiceError) {
      return sendIntegrationServiceError(req, res, error)
    }
    return next(error)
  }
}

export const startIntegrationPullSyncHandler: AuthRequestHandler<
  StartIntegrationPullSyncRequest
> = async (req, res, next) => {
  try {
    const { organizationId, provider } = req.validated
    const job = await startSyncJob(organizationId, provider, 'pull')
    return res.status(202).json({
      data: job,
    })
  } catch (error) {
    if (error instanceof IntegrationServiceError) {
      return sendIntegrationServiceError(req, res, error)
    }
    return next(error)
  }
}

export const startIntegrationPushSyncHandler: AuthRequestHandler<
  StartIntegrationPushSyncRequest
> = async (req, res, next) => {
  try {
    const { organizationId, provider } = req.validated
    const job = await startSyncJob(organizationId, provider, 'push')
    return res.status(202).json({
      data: job,
    })
  } catch (error) {
    if (error instanceof IntegrationServiceError) {
      return sendIntegrationServiceError(req, res, error)
    }
    return next(error)
  }
}

export const listIntegrationSyncJobsHandler: AuthRequestHandler<
  ListIntegrationSyncJobsRequest
> = async (req, res, next) => {
  try {
    const { organizationId, provider } = req.validated
    return res.json({
      data: await listSyncJobs(organizationId, provider),
    })
  } catch (error) {
    if (error instanceof IntegrationServiceError) {
      return sendIntegrationServiceError(req, res, error)
    }
    return next(error)
  }
}

export const getIntegrationSyncJobHandler: AuthRequestHandler<
  GetIntegrationSyncJobRequest
> = async (req, res, next) => {
  try {
    const { organizationId, provider, jobId } = req.validated
    const job = await getSyncJob(organizationId, provider, jobId)
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
  } catch (error) {
    if (error instanceof IntegrationServiceError) {
      return sendIntegrationServiceError(req, res, error)
    }
    return next(error)
  }
}
