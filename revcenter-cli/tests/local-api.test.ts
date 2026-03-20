import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import test from 'node:test'
import assert from 'node:assert/strict'
import { startLocalWizardApiServer } from '../src/local-api'

const buildRequest = () => ({
  name: 'Northwind HVAC',
  industry: 'hvac',
  useCase: 'inbound_lead_capture',
  services: ['Repairs', 'Installations'],
  knowledgeSources: ['https://northwind.example.com'],
  voiceSelection: {
    voiceId: 'voice_demo_123',
  },
  greeting: {
    mode: 'generated',
  },
  agentName: 'Northwind Dispatch',
})

interface LocalStatusPayload {
  status: string
  agent: {
    provider: string | null
  }
  steps: Array<{
    status: string
  }>
}

test('local API server supports render, submit, and status', async (t) => {
  const tempDir = await fs.mkdtemp(
    path.join(os.tmpdir(), 'revcenter-cli-local-api-'),
  )
  let started:
    | Awaited<ReturnType<typeof startLocalWizardApiServer>>
    | null = null

  try {
    try {
      started = await startLocalWizardApiServer({
        port: 0,
        dataDir: tempDir,
        apiKey: null,
        stepDelayMs: 5,
      })
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EPERM') {
        t.skip('Local socket bind is not permitted in this sandbox.')
        return
      }
      throw error
    }

    const baseUrl = `http://127.0.0.1:${started.config.port}`

    const renderResponse = await fetch(`${baseUrl}/v1/wizard/agents/render`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        request: buildRequest(),
        options: {
          testMode: true,
        },
      }),
    })
    assert.equal(renderResponse.status, 200)
    const render = (await renderResponse.json()) as { summary: { agentName: string } }
    assert.equal(render.summary.agentName, 'Northwind Dispatch')

    const submitResponse = await fetch(`${baseUrl}/v1/wizard/agents`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        idempotencyKey: 'demo-123',
        correlationId: 'corr-demo-123',
        request: buildRequest(),
        options: {
          testMode: true,
          requireProvider: false,
          waitForTerminal: false,
        },
      }),
    })
    assert.equal(submitResponse.status, 200)
    const submit = (await submitResponse.json()) as { jobId: string }
    assert.ok(submit.jobId)

    let statusPayload: LocalStatusPayload | null = null

    for (let attempt = 0; attempt < 40; attempt += 1) {
      const statusResponse = await fetch(
        `${baseUrl}/v1/provisioning/jobs/${submit.jobId}`,
      )
      assert.equal(statusResponse.status, 200)
      statusPayload = (await statusResponse.json()) as LocalStatusPayload
      if (statusPayload?.status === 'completed') {
        break
      }
      await new Promise((resolve) => {
        setTimeout(resolve, 10)
      })
    }

    assert.ok(statusPayload)
    assert.equal(statusPayload.status, 'completed')
    assert.equal(statusPayload.agent.provider, 'LOCAL_STUB')
    assert.ok(statusPayload.steps.every((step) => step.status === 'completed'))
  } finally {
    if (started) {
      await started.close()
    }
    await fs.rm(tempDir, { recursive: true, force: true })
  }
})
