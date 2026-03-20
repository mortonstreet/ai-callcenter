import {
  WIZARD_API_ENDPOINTS,
  cliModeSchema,
  wizardRenderRequestSchema,
  wizardRenderResponseSchema,
  wizardStatusResponseSchema,
  wizardSubmitRequestSchema,
  wizardSubmitResponseSchema,
  type CliMode,
  type WizardRenderResponse,
  type WizardStatusResponse,
  type WizardSubmitOptions,
  type WizardSubmitResponse,
} from './contracts'
import {
  createWizardRenderResponse,
  type ParsedWizardCliRequest,
} from './requests'
import {
  loadBackendModules,
  loadProvisioningSnapshot,
  type ProvisioningSnapshot,
  type ResolvedRequester,
} from './runtime'

const TERMINAL_JOB_STATUSES = new Set(['completed', 'failed', 'blocked_manual'])

export interface WizardService {
  readonly mode: CliMode
  render(input: {
    parsed: ParsedWizardCliRequest
    testMode?: boolean
  }): Promise<WizardRenderResponse>
  submit(input: {
    parsed: ParsedWizardCliRequest
    requester?: ResolvedRequester
    idempotencyKey?: string
    correlationId?: string
    options?: WizardSubmitOptions
  }): Promise<WizardSubmitResponse>
  getStatus(input: {
    jobId?: string
    agentId?: string
  }): Promise<WizardStatusResponse>
}

interface ApiClientConfig {
  baseUrl: string
  apiKey?: string
  fetchImpl?: typeof fetch
}

const sleep = async (ms: number) =>
  await new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

const parseJsonResponse = async (response: Response) => {
  const raw = await response.text()
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error'
    throw new Error(
      `Failed to parse JSON from ${response.url}: ${message}`,
    )
  }
}

const extractErrorMessage = (payload: unknown) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null
  }

  const message = (payload as Record<string, unknown>).message
  return typeof message === 'string' && message.trim().length > 0
    ? message.trim()
    : null
}

const mapProvisioningSnapshotToStatus = (
  snapshot: ProvisioningSnapshot,
): WizardStatusResponse => {
  return wizardStatusResponseSchema.parse({
    jobId: String(snapshot.job.id || ''),
    status: String(snapshot.job.status || 'unknown'),
    correlationId:
      typeof snapshot.job.correlationId === 'string'
        ? snapshot.job.correlationId
        : null,
    organization: {
      id:
        typeof snapshot.organization?.id === 'string'
          ? snapshot.organization.id
          : null,
      name:
        typeof snapshot.organization?.name === 'string'
          ? snapshot.organization.name
          : null,
    },
    agent: {
      agentId: String(snapshot.agent.id || ''),
      name: typeof snapshot.agent.name === 'string' ? snapshot.agent.name : null,
      provider:
        typeof snapshot.agent.externalType === 'string'
          ? snapshot.agent.externalType
          : null,
      providerExternalId:
        typeof snapshot.agent.externalId === 'string'
          ? snapshot.agent.externalId
          : null,
      readinessStatus:
        typeof snapshot.agent.readinessStatus === 'string'
          ? snapshot.agent.readinessStatus
          : null,
    },
    steps: snapshot.steps.map((step, index) => ({
      stepId: String(step.stepId || `step_${index + 1}`),
      stepOrder:
        typeof step.stepOrder === 'number'
          ? step.stepOrder
          : Number(step.stepOrder || index + 1),
      status: String(step.status || 'unknown'),
      attempts:
        typeof step.attempt === 'number'
          ? step.attempt
          : typeof step.attempts === 'number'
            ? step.attempts
            : Number(step.attempt || step.attempts || 0),
      lastErrorCode:
        typeof step.lastErrorCode === 'string' ? step.lastErrorCode : null,
      lastErrorMessage:
        typeof step.lastErrorMessage === 'string' ? step.lastErrorMessage : null,
    })),
    lastErrorCode:
      typeof snapshot.job.lastErrorCode === 'string'
        ? snapshot.job.lastErrorCode
        : null,
    lastErrorMessage:
      typeof snapshot.job.lastErrorMessage === 'string'
        ? snapshot.job.lastErrorMessage
        : null,
  })
}

const createApiWizardService = (config: ApiClientConfig): WizardService => {
  const baseUrl = config.baseUrl.trim()
  if (!baseUrl) {
    throw new Error(
      'API mode requires `REVCENTER_API_BASE_URL` or `--api-base-url`.',
    )
  }

  const fetchImpl = config.fetchImpl || fetch
  const buildUrl = (pathname: string) => new URL(pathname, baseUrl).toString()

  const requestJson = async <T>(input: {
    method: 'GET' | 'POST'
    pathname: string
    body?: unknown
    schema: { parse: (payload: unknown) => T }
  }): Promise<T> => {
    const response = await fetchImpl(buildUrl(input.pathname), {
      method: input.method,
      headers: {
        Accept: 'application/json',
        ...(input.body ? { 'Content-Type': 'application/json' } : {}),
        ...(config.apiKey
          ? { Authorization: `Bearer ${config.apiKey}` }
          : {}),
      },
      ...(input.body ? { body: JSON.stringify(input.body) } : {}),
    })

    const payload = await parseJsonResponse(response)
    if (!response.ok) {
      const message = extractErrorMessage(payload)
      throw new Error(
        `API request failed (${response.status} ${response.statusText})${
          message ? `: ${message}` : ''
        }`,
      )
    }

    return input.schema.parse(payload)
  }

  return {
    mode: 'api',
    async render(input) {
      const body = wizardRenderRequestSchema.parse({
        request: input.parsed.request,
        options:
          input.testMode === undefined ? undefined : { testMode: input.testMode },
      })

      return await requestJson({
        method: 'POST',
        pathname: WIZARD_API_ENDPOINTS.render,
        body,
        schema: wizardRenderResponseSchema,
      })
    },
    async submit(input) {
      const body = wizardSubmitRequestSchema.parse({
        idempotencyKey: input.idempotencyKey,
        correlationId: input.correlationId,
        request: input.parsed.request,
        options: input.options,
      })

      return await requestJson({
        method: 'POST',
        pathname: WIZARD_API_ENDPOINTS.submit,
        body,
        schema: wizardSubmitResponseSchema,
      })
    },
    async getStatus(input) {
      if (!input.jobId) {
        throw new Error('API mode status requires `--job-id`.')
      }

      return await requestJson({
        method: 'GET',
        pathname: WIZARD_API_ENDPOINTS.status(input.jobId),
        schema: wizardStatusResponseSchema,
      })
    },
  }
}

const createEmbeddedWizardService = (): WizardService => {
  return {
    mode: 'embedded',
    async render(input) {
      return createWizardRenderResponse(input.parsed)
    },
    async submit(input) {
      if (!input.requester) {
        throw new Error(
          'Embedded mode requires a resolved requester before submission.',
        )
      }

      const { startWizardProvisioningContract } = await loadBackendModules()
      const submission = await startWizardProvisioningContract({
        organizationId: input.requester.organizationId,
        requestedByUserId: input.requester.id,
        idempotencyKey: input.idempotencyKey,
        correlationId: input.correlationId,
        requestPayload: {
          organizationId: input.requester.organizationId,
          ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
          wizard_input_v2: input.parsed.wizardInputV2,
        },
      })

      return wizardSubmitResponseSchema.parse({
        jobId: String(submission.job.id),
        agentId: String(submission.agentId),
        status: String(submission.job.status),
        correlationId: String(submission.job.correlationId || input.correlationId || ''),
        reusedExisting: Boolean(submission.idempotentReplay),
      })
    },
    async getStatus(input) {
      const snapshot = await loadProvisioningSnapshot({
        jobId: input.jobId,
        agentId: input.agentId,
      })
      return mapProvisioningSnapshotToStatus(snapshot)
    },
  }
}

export const resolveCliMode = (modeOverride?: string): CliMode => {
  const rawMode = modeOverride || process.env.REVCENTER_CLI_MODE || 'embedded'
  return cliModeSchema.parse(rawMode)
}

export const createWizardService = (input: {
  mode?: string
  apiBaseUrl?: string
  apiKey?: string
  fetchImpl?: typeof fetch
}): WizardService => {
  const mode = resolveCliMode(input.mode)

  if (mode === 'api') {
    return createApiWizardService({
      baseUrl: input.apiBaseUrl || process.env.REVCENTER_API_BASE_URL || '',
      apiKey: input.apiKey || process.env.REVCENTER_API_KEY,
      fetchImpl: input.fetchImpl,
    })
  }

  return createEmbeddedWizardService()
}

export const waitForWizardTerminalStatus = async (input: {
  service: WizardService
  jobId: string
  timeoutMs: number
  pollMs: number
  onStatus?: (status: WizardStatusResponse) => void | Promise<void>
}): Promise<{ status: WizardStatusResponse; timedOut: boolean }> => {
  const deadline = Date.now() + input.timeoutMs

  while (true) {
    const status = await input.service.getStatus({ jobId: input.jobId })
    if (input.onStatus) {
      await input.onStatus(status)
    }
    if (TERMINAL_JOB_STATUSES.has(status.status)) {
      return {
        status,
        timedOut: false,
      }
    }

    if (Date.now() >= deadline) {
      return {
        status,
        timedOut: true,
      }
    }

    await sleep(input.pollMs)
  }
}

export const evaluateProvisioningOutcome = (input: {
  status: WizardStatusResponse
  requireProvider: boolean
}) => {
  if (input.status.status === 'failed' || input.status.status === 'blocked_manual') {
    throw new Error(
      `Provisioning ended in ${input.status.status}: ${
        input.status.lastErrorMessage || 'no error message'
      }`,
    )
  }

  if (input.requireProvider && input.status.agent.provider !== 'ELEVEN_LABS') {
    throw new Error(
      `Provisioning did not yield an ElevenLabs-backed agent. provider=${input.status.agent.provider || 'n/a'}`,
    )
  }
}
