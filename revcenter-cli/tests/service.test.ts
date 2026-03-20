import test from 'node:test'
import assert from 'node:assert/strict'
import { parseWizardCliRequest } from '../src/requests'
import {
  createWizardService,
  resolveCliMode,
  waitForWizardTerminalStatus,
} from '../src/service'

const buildParsedRequest = () =>
  parseWizardCliRequest({
    name: 'Northwind HVAC',
    industry: 'hvac',
    useCase: 'customer_support',
    services: ['Repairs', 'Installations'],
    mainObjective: 'Book qualified service calls.',
    knowledgeSources: ['https://northwind.example.com'],
    voiceSelection: {
      voiceId: 'voice_demo_123',
    },
    greeting: {
      mode: 'generated',
    },
    agentName: 'Northwind Dispatch',
  })

test('resolveCliMode defaults to embedded', () => {
  const previous = process.env.REVCENTER_CLI_MODE
  delete process.env.REVCENTER_CLI_MODE

  try {
    assert.equal(resolveCliMode(), 'embedded')
  } finally {
    process.env.REVCENTER_CLI_MODE = previous
  }
})

test('resolveCliMode accepts explicit api override', () => {
  assert.equal(resolveCliMode('api'), 'api')
})

test('createWizardService in api mode uses shared render, submit, and status endpoints', async () => {
  const requests: Array<{
    url: string
    method: string
    body?: string
    authorization: string | null
  }> = []
  const parsed = buildParsedRequest()

  const responses = [
    {
      normalizedRequest: parsed.request,
      summary: parsed.summary,
      resolvedProfile: {
        profileKey: 'hvac',
        profileVersion: null,
        selectedVoiceId: 'voice_demo_123',
        greetingMode: 'generated',
      },
      promptPreview: {
        compiledPromptSummary: 'Use case inbound preview',
        knowledgeSourceCount: 1,
      },
      warnings: [],
    },
    {
      jobId: 'prov_123',
      agentId: 'agent_123',
      status: 'queued',
      correlationId: 'corr_123',
      reusedExisting: false,
    },
    {
      jobId: 'prov_123',
      status: 'queued',
      correlationId: 'corr_123',
      organization: {
        id: 'org_123',
        name: 'Northwind HVAC',
      },
      agent: {
        agentId: 'agent_123',
        name: 'Northwind Dispatch',
        provider: 'ELEVEN_LABS',
        providerExternalId: 'ext_123',
        readinessStatus: 'queued',
      },
      steps: [],
      lastErrorCode: null,
      lastErrorMessage: null,
    },
  ]
  let responseIndex = 0

  const service = createWizardService({
    mode: 'api',
    apiBaseUrl: 'https://api.example.com',
    apiKey: 'secret-token',
    fetchImpl: async (input, init) => {
      requests.push({
        url: String(input),
        method: String(init?.method || 'GET'),
        body: typeof init?.body === 'string' ? init.body : undefined,
        authorization: new Headers(init?.headers).get('authorization'),
      })

      const payload = responses[responseIndex]
      responseIndex += 1
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      })
    },
  })

  const render = await service.render({
    parsed,
    testMode: true,
  })
  const submit = await service.submit({
    parsed,
    idempotencyKey: 'idem_123',
    correlationId: 'corr_123',
    options: {
      testMode: true,
      requireProvider: true,
      waitForTerminal: false,
    },
  })
  const status = await service.getStatus({
    jobId: 'prov_123',
  })

  assert.equal(render.summary.agentName, 'Northwind Dispatch')
  assert.equal(submit.jobId, 'prov_123')
  assert.equal(status.agent.providerExternalId, 'ext_123')

  assert.deepEqual(
    requests.map((request) => request.url),
    [
      'https://api.example.com/v1/wizard/agents/render',
      'https://api.example.com/v1/wizard/agents',
      'https://api.example.com/v1/provisioning/jobs/prov_123',
    ],
  )
  assert.deepEqual(
    requests.map((request) => request.method),
    ['POST', 'POST', 'GET'],
  )
  assert.ok(requests.every((request) => request.authorization === 'Bearer secret-token'))

  assert.deepEqual(JSON.parse(String(requests[0].body)), {
    request: parsed.request,
    options: {
      testMode: true,
    },
  })
  assert.deepEqual(JSON.parse(String(requests[1].body)), {
    idempotencyKey: 'idem_123',
    correlationId: 'corr_123',
    request: parsed.request,
    options: {
      testMode: true,
      requireProvider: true,
      waitForTerminal: false,
    },
  })
})

test('api mode status requires a job id', async () => {
  const service = createWizardService({
    mode: 'api',
    apiBaseUrl: 'https://api.example.com',
    fetchImpl: async () =>
      new Response('{}', {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      }),
  })

  await assert.rejects(
    async () => {
      await service.getStatus({ agentId: 'agent_123' })
    },
    /requires `--job-id`/,
  )
})

test('waitForWizardTerminalStatus reports intermediate statuses through onStatus', async () => {
  const statuses = [
    {
      jobId: 'prov_123',
      status: 'running',
      correlationId: 'corr_123',
      organization: {
        id: 'org_123',
        name: 'Northwind HVAC',
      },
      agent: {
        agentId: 'agent_123',
        name: 'Northwind Dispatch',
        provider: null,
        providerExternalId: null,
        readinessStatus: 'queued',
      },
      steps: [
        {
          stepId: 'compile_prompt_and_greeting',
          stepOrder: 1,
          status: 'in_progress',
          attempts: 1,
          lastErrorCode: null,
          lastErrorMessage: null,
        },
      ],
      lastErrorCode: null,
      lastErrorMessage: null,
    },
    {
      jobId: 'prov_123',
      status: 'completed',
      correlationId: 'corr_123',
      organization: {
        id: 'org_123',
        name: 'Northwind HVAC',
      },
      agent: {
        agentId: 'agent_123',
        name: 'Northwind Dispatch',
        provider: 'ELEVEN_LABS',
        providerExternalId: 'ext_123',
        readinessStatus: 'ready',
      },
      steps: [
        {
          stepId: 'compile_prompt_and_greeting',
          stepOrder: 1,
          status: 'completed',
          attempts: 1,
          lastErrorCode: null,
          lastErrorMessage: null,
        },
      ],
      lastErrorCode: null,
      lastErrorMessage: null,
    },
  ]
  let statusIndex = 0
  const observed: string[] = []

  const result = await waitForWizardTerminalStatus({
    service: {
      mode: 'api',
      async render() {
        throw new Error('not implemented')
      },
      async submit() {
        throw new Error('not implemented')
      },
      async getStatus() {
        const current = statuses[Math.min(statusIndex, statuses.length - 1)]
        statusIndex += 1
        return current
      },
    },
    jobId: 'prov_123',
    timeoutMs: 500,
    pollMs: 0,
    onStatus: async (status) => {
      observed.push(status.status)
    },
  })

  assert.equal(result.timedOut, false)
  assert.equal(result.status.status, 'completed')
  assert.deepEqual(observed, ['running', 'completed'])
})
