import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const readSource = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), 'utf8')

test('agent create controller uses wizard provisioning contract without Twilio client coupling', () => {
  const source = readSource('src/api/controllers/agent.controller.ts')

  assert.match(source, /startWizardProvisioningContract/)
  assert.doesNotMatch(
    source,
    /from ['"]@\/clients\/twilio\.client['"]|twilioClient/,
  )
})

test('wizard provisioning contract seeds fallback agent without Twilio configuration dependency', () => {
  const source = readSource(
    'src/services/agent-provisioning-contract.service.ts',
  )

  assert.match(source, /externalType:\s*AgentExternalType\.LOCAL_FALLBACK/)
  assert.match(source, /phoneNumber:\s*'\+15555550123'/)
  assert.match(source, /redirectNumber:\s*'\+15555550123'/)
  assert.doesNotMatch(
    source,
    /from ['"]@\/clients\/twilio\.client['"]|twilioClient/,
  )
})

test('orchestrator create_or_update_agent step delegates to retryAgentProvision without Twilio client calls', () => {
  const source = readSource('src/services/provisioning-orchestrator.service.ts')

  assert.match(source, /case 'create_or_update_agent':/)
  assert.match(source, /await retryAgentProvision\(retryPayload\)/)
  assert.doesNotMatch(
    source,
    /from ['"]@\/clients\/twilio\.client['"]|twilioClient/,
  )
})
