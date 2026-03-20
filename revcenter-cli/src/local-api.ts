import crypto from 'crypto'
import fs from 'fs/promises'
import { createServer, type IncomingMessage, type ServerResponse } from 'http'
import os from 'os'
import path from 'path'
import { URL } from 'url'
import {
  wizardRenderRequestSchema,
  wizardStatusResponseSchema,
  wizardSubmitRequestSchema,
  type WizardAgentRequest,
  type WizardProvisioningStep,
  type WizardStatusResponse,
  type WizardSubmitResponse,
} from './contracts'
import {
  buildWizardRequestSummary,
  createWizardRenderResponseFromRequest,
} from './requests'

const LOCAL_API_DEFAULT_PORT = 4010
const LOCAL_API_DEFAULT_STEP_DELAY_MS = 150
const TERMINAL_JOB_STATUSES = new Set(['completed', 'failed', 'blocked_manual'])
const LOCAL_API_STEP_IDS = [
  'validate_request',
  'normalize_request',
  'resolve_profile',
  'compile_prompt_and_greeting',
  'persist_versions_and_finalize',
] as const

export interface LocalWizardApiConfig {
  port: number
  dataDir: string
  apiKey: string | null
  stepDelayMs: number
}

interface StoredJob {
  jobId: string
  organizationId: string
  organizationName: string
  agentId: string
  agentName: string
  correlationId: string
  idempotencyKey: string | null
  request: WizardAgentRequest
  summary: ReturnType<typeof buildWizardRequestSummary>
  status: string
  reusedExisting: boolean
  provider: string | null
  providerExternalId: string | null
  readinessStatus: string | null
  lastErrorCode: string | null
  lastErrorMessage: string | null
  options: {
    testMode: boolean
    requireProvider: boolean
    waitForTerminal: boolean
  }
  steps: WizardProvisioningStep[]
  createdAt: string
  updatedAt: string
}

interface LocalWizardApiState {
  jobs: Record<string, StoredJob>
  jobsByIdempotencyKey: Record<string, string>
}

const defaultState = (): LocalWizardApiState => ({
  jobs: {},
  jobsByIdempotencyKey: {},
})

const sleep = async (ms: number) =>
  await new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

const createId = (prefix: string) =>
  `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`

const asJson = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`

const parseInteger = (value: string | undefined, fallback: number) => {
  if (!value) {
    return fallback
  }

  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback
}

const createQueuedSteps = (): WizardProvisioningStep[] =>
  LOCAL_API_STEP_IDS.map((stepId, index) => ({
    stepId,
    stepOrder: index + 1,
    status: 'queued',
    attempts: 0,
    lastErrorCode: null,
    lastErrorMessage: null,
  }))

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const mapStoredJobToStatus = (job: StoredJob): WizardStatusResponse =>
  wizardStatusResponseSchema.parse({
    jobId: job.jobId,
    status: job.status,
    correlationId: job.correlationId,
    organization: {
      id: job.organizationId,
      name: job.organizationName,
    },
    agent: {
      agentId: job.agentId,
      name: job.agentName,
      provider: job.provider,
      providerExternalId: job.providerExternalId,
      readinessStatus: job.readinessStatus,
    },
    steps: job.steps,
    lastErrorCode: job.lastErrorCode,
    lastErrorMessage: job.lastErrorMessage,
  })

class LocalWizardApiStore {
  private state = defaultState()
  private readonly statePath: string
  private persistQueue: Promise<void> = Promise.resolve()

  constructor(private readonly dataDir: string) {
    this.statePath = path.join(dataDir, 'state.json')
  }

  async init() {
    await fs.mkdir(this.dataDir, { recursive: true })

    try {
      const source = await fs.readFile(this.statePath, 'utf8')
      this.state = JSON.parse(source) as LocalWizardApiState
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error
      }
      this.state = defaultState()
      await this.persist()
    }
  }

  async persist() {
    const snapshot = asJson(this.state)
    this.persistQueue = this.persistQueue.then(async () => {
      await fs.writeFile(this.statePath, snapshot)
    })
    await this.persistQueue
  }

  getStatePath() {
    return this.statePath
  }

  getJob(jobId: string) {
    const job = this.state.jobs[jobId]
    return job ? clone(job) : null
  }

  listPendingJobIds() {
    return Object.values(this.state.jobs)
      .filter((job) => !TERMINAL_JOB_STATUSES.has(job.status))
      .map((job) => job.jobId)
  }

  async createOrReuseJob(input: {
    idempotencyKey: string | null
    correlationId: string
    request: WizardAgentRequest
    options: {
      testMode: boolean
      requireProvider: boolean
      waitForTerminal: boolean
    }
  }): Promise<{ job: StoredJob; reusedExisting: boolean }> {
    if (
      input.idempotencyKey &&
      this.state.jobsByIdempotencyKey[input.idempotencyKey]
    ) {
      const existingJobId = this.state.jobsByIdempotencyKey[input.idempotencyKey]
      const existing = this.state.jobs[existingJobId]
      if (existing) {
        return {
          job: clone({
            ...existing,
            reusedExisting: true,
          }),
          reusedExisting: true,
        }
      }
    }

    const summary = buildWizardRequestSummary(input.request)
    const now = new Date().toISOString()
    const jobId = createId('prov')
    const job: StoredJob = {
      jobId,
      organizationId: createId('org'),
      organizationName: summary.organizationName,
      agentId: createId('agent'),
      agentName: summary.agentName,
      correlationId: input.correlationId,
      idempotencyKey: input.idempotencyKey,
      request: input.request,
      summary,
      status: 'queued',
      reusedExisting: false,
      provider: null,
      providerExternalId: null,
      readinessStatus: 'queued',
      lastErrorCode: null,
      lastErrorMessage: null,
      options: input.options,
      steps: createQueuedSteps(),
      createdAt: now,
      updatedAt: now,
    }

    this.state.jobs[jobId] = job
    if (input.idempotencyKey) {
      this.state.jobsByIdempotencyKey[input.idempotencyKey] = jobId
    }
    await this.persist()

    return {
      job: clone(job),
      reusedExisting: false,
    }
  }

  async updateJob(jobId: string, updater: (job: StoredJob) => void) {
    const job = this.state.jobs[jobId]
    if (!job) {
      return null
    }

    updater(job)
    job.updatedAt = new Date().toISOString()
    await this.persist()
    return clone(job)
  }
}

const getRequestBody = async (request: IncomingMessage): Promise<unknown> => {
  const chunks: Buffer[] = []

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  const source = Buffer.concat(chunks).toString('utf8').trim()
  if (!source) {
    return {}
  }

  return JSON.parse(source)
}

const sendJson = (
  response: ServerResponse,
  statusCode: number,
  payload: unknown,
) => {
  response.statusCode = statusCode
  response.setHeader('content-type', 'application/json')
  response.end(asJson(payload))
}

const sendError = (
  response: ServerResponse,
  statusCode: number,
  message: string,
) => {
  sendJson(response, statusCode, {
    message,
  })
}

const authorizeRequest = (
  request: IncomingMessage,
  response: ServerResponse,
  config: LocalWizardApiConfig,
) => {
  if (!config.apiKey) {
    return true
  }

  if (request.headers.authorization === `Bearer ${config.apiKey}`) {
    return true
  }

  sendError(response, 401, 'Unauthorized')
  return false
}

const submitResponseFromJob = (job: StoredJob): WizardSubmitResponse => ({
  jobId: job.jobId,
  agentId: job.agentId,
  status: job.status,
  correlationId: job.correlationId,
  reusedExisting: job.reusedExisting,
})

const normalizeSubmitOptions = (body: {
  options?: {
    testMode?: boolean
    requireProvider?: boolean
    waitForTerminal?: boolean
  }
}) => ({
  testMode: body.options?.testMode ?? true,
  requireProvider: body.options?.requireProvider ?? true,
  waitForTerminal: body.options?.waitForTerminal ?? false,
})

const withStepStatus = (
  job: StoredJob,
  stepId: string,
  status: 'queued' | 'in_progress' | 'completed' | 'failed',
  error?: { code: string; message: string } | null,
) => {
  const step = job.steps.find((entry) => entry.stepId === stepId)
  if (!step) {
    return
  }

  step.status = status
  if (status === 'in_progress') {
    step.attempts += 1
  }
  step.lastErrorCode = error?.code || null
  step.lastErrorMessage = error?.message || null
}

const processJob = async (
  store: LocalWizardApiStore,
  jobId: string,
  config: LocalWizardApiConfig,
) => {
  const existing = store.getJob(jobId)
  if (!existing || TERMINAL_JOB_STATUSES.has(existing.status)) {
    return
  }

  await store.updateJob(jobId, (job) => {
    job.status = 'running'
    job.readinessStatus = 'processing'
  })

  for (const stepId of LOCAL_API_STEP_IDS) {
    await store.updateJob(jobId, (job) => {
      withStepStatus(job, stepId, 'in_progress')
    })
    await sleep(config.stepDelayMs)
    await store.updateJob(jobId, (job) => {
      withStepStatus(job, stepId, 'completed')
    })
  }

  await store.updateJob(jobId, (job) => {
    job.status = 'completed'
    job.provider = 'LOCAL_STUB'
    job.providerExternalId = null
    job.readinessStatus = 'ready'
  })
}

export const resolveLocalWizardApiConfig = (): LocalWizardApiConfig => {
  const packageRoot = path.resolve(__dirname, '..')
  return {
    port: parseInteger(process.env.REVCENTER_API_PORT, LOCAL_API_DEFAULT_PORT),
    dataDir:
      process.env.REVCENTER_API_DATA_DIR ||
      path.join(packageRoot, '.local-api'),
    apiKey:
      process.env.REVCENTER_API_KEY && process.env.REVCENTER_API_KEY.trim()
        ? process.env.REVCENTER_API_KEY.trim()
        : null,
    stepDelayMs: parseInteger(
      process.env.REVCENTER_API_STEP_DELAY_MS,
      LOCAL_API_DEFAULT_STEP_DELAY_MS,
    ),
  }
}

export const createLocalWizardApiServer = async (
  input?: Partial<LocalWizardApiConfig>,
) => {
  const config: LocalWizardApiConfig = {
    ...resolveLocalWizardApiConfig(),
    ...input,
  }
  const store = new LocalWizardApiStore(config.dataDir)
  await store.init()

  const activeJobs = new Set<string>()
  const enqueueJob = (jobId: string) => {
    if (activeJobs.has(jobId)) {
      return
    }

    activeJobs.add(jobId)
    void processJob(store, jobId, config).finally(() => {
      activeJobs.delete(jobId)
    })
  }

  for (const jobId of store.listPendingJobIds()) {
    enqueueJob(jobId)
  }

  const server = createServer(async (request, response) => {
    try {
      if (!request.url || !request.method) {
        sendError(response, 400, 'Invalid request')
        return
      }

      if (!authorizeRequest(request, response, config)) {
        return
      }

      const url = new URL(request.url, 'http://127.0.0.1')

      if (request.method === 'GET' && url.pathname === '/health') {
        sendJson(response, 200, {
          ok: true,
          hostname: os.hostname(),
          dataDir: config.dataDir,
          statePath: store.getStatePath(),
        })
        return
      }

      if (
        request.method === 'POST' &&
        url.pathname === '/v1/wizard/agents/render'
      ) {
        const body = wizardRenderRequestSchema.parse(await getRequestBody(request))
        sendJson(response, 200, createWizardRenderResponseFromRequest(body.request))
        return
      }

      if (request.method === 'POST' && url.pathname === '/v1/wizard/agents') {
        const body = wizardSubmitRequestSchema.parse(await getRequestBody(request))
        const created = await store.createOrReuseJob({
          idempotencyKey: body.idempotencyKey || null,
          correlationId: body.correlationId || createId('corr'),
          request: body.request,
          options: normalizeSubmitOptions(body),
        })

        if (!created.reusedExisting) {
          enqueueJob(created.job.jobId)
        }

        sendJson(response, 200, submitResponseFromJob(created.job))
        return
      }

      if (
        request.method === 'GET' &&
        url.pathname.startsWith('/v1/provisioning/jobs/')
      ) {
        const jobId = decodeURIComponent(
          url.pathname.replace('/v1/provisioning/jobs/', ''),
        )
        const job = store.getJob(jobId)
        if (!job) {
          sendError(response, 404, `Job ${jobId} was not found.`)
          return
        }

        sendJson(response, 200, mapStoredJobToStatus(job))
        return
      }

      sendError(response, 404, `No route for ${request.method} ${url.pathname}`)
    } catch (error) {
      if (error instanceof SyntaxError) {
        sendError(response, 400, `Invalid JSON body: ${error.message}`)
        return
      }

      if (error && typeof error === 'object' && 'issues' in error) {
        sendError(response, 400, JSON.stringify((error as { issues: unknown }).issues))
        return
      }

      const message = error instanceof Error ? error.message : 'unknown error'
      sendError(response, 500, message)
    }
  })

  return {
    config,
    server,
    getStatePath: () => store.getStatePath(),
  }
}

export const startLocalWizardApiServer = async (
  input?: Partial<LocalWizardApiConfig>,
) => {
  const { server, config, getStatePath } = await createLocalWizardApiServer(input)

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(config.port, '127.0.0.1', () => {
      server.off('error', reject)
      resolve()
    })
  })

  const address = server.address()
  const port =
    address && typeof address === 'object' && typeof address.port === 'number'
      ? address.port
      : config.port

  return {
    config: {
      ...config,
      port,
    },
    server,
    statePath: getStatePath(),
    close: async () =>
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error)
            return
          }
          resolve()
        })
      }),
  }
}
