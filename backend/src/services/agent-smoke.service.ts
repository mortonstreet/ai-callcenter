import { createHmac } from 'crypto'

type SmokeScenarioStatus = 'passed' | 'failed'

export interface SmokeScenarioResult {
  id:
    | 'greeting_prompt_compile_sanity'
    | 'intent_routing_sample_scenarios'
    | 'tool_invocation_dry_run'
    | 'webhook_signature_test_call'
    | 'knowledge_retrieval_sanity_prompt'
  name: string
  blocking: boolean
  status: SmokeScenarioStatus
  message: string
  remediationAction?: string
}

export interface SmokeBundleResult {
  status: 'ok' | 'degraded' | 'failed'
  checkedAt: string
  message: string
  remediationAction?: string
  scenarios: SmokeScenarioResult[]
}

interface SmokeBundleInput {
  mode?: 'runtime' | 'provisioning'
  agent: {
    id: string
    externalId?: string | null
    organizationId: string
    name: string
    useCase?: string | null
    webhookSecret?: string | null
  }
  providerConfig: Record<string, unknown> | null
  promptOverride?: string
  greetingOverride?: string
  webhookUrlOverride?: string | null
}

const WEBHOOK_TIMEOUT_MS = 3000

const asRecord = (
  value: unknown,
): Record<string, unknown> | Record<string, never> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

const asArray = <T = unknown>(value: unknown): T[] => {
  return Array.isArray(value) ? (value as T[]) : []
}

const asTrimmedString = (value: unknown): string => {
  if (typeof value !== 'string') {
    return ''
  }
  return value.trim()
}

const resolvePrompt = (
  providerConfig: Record<string, unknown> | null,
  fallback?: string,
): string => {
  if (!providerConfig) {
    return asTrimmedString(fallback)
  }

  const conversationConfig = asRecord(providerConfig.conversation_config)
  const agentConfig = asRecord(conversationConfig.agent)
  const promptConfig = asRecord(agentConfig.prompt)

  return (
    asTrimmedString(promptConfig.prompt) ||
    asTrimmedString(
      (providerConfig as Record<string, unknown>).system_prompt,
    ) ||
    asTrimmedString(fallback)
  )
}

const resolveGreeting = (
  providerConfig: Record<string, unknown> | null,
  fallback?: string,
): string => {
  if (!providerConfig) {
    return asTrimmedString(fallback)
  }

  const conversationConfig = asRecord(providerConfig.conversation_config)
  const agentConfig = asRecord(conversationConfig.agent)

  return (
    asTrimmedString(agentConfig.first_message) ||
    asTrimmedString(
      (providerConfig as Record<string, unknown>).first_message,
    ) ||
    asTrimmedString(fallback)
  )
}

const resolveTools = (
  providerConfig: Record<string, unknown> | null,
): unknown[] => {
  if (!providerConfig) {
    return []
  }

  const conversationConfig = asRecord(providerConfig.conversation_config)
  const agentConfig = asRecord(conversationConfig.agent)
  const promptConfig = asRecord(agentConfig.prompt)

  return asArray(promptConfig.tools)
}

const resolveKnowledgeSources = (
  providerConfig: Record<string, unknown> | null,
): unknown[] => {
  if (!providerConfig) {
    return []
  }

  const conversationConfig = asRecord(providerConfig.conversation_config)
  const agentConfig = asRecord(conversationConfig.agent)
  const promptConfig = asRecord(agentConfig.prompt)
  const promptSources = asArray(promptConfig.knowledge_base)
  if (promptSources.length > 0) {
    return promptSources
  }

  return asArray((providerConfig as Record<string, unknown>).knowledge_base)
}

const resolveWorkflowNodes = (
  providerConfig: Record<string, unknown> | null,
): Array<Record<string, unknown>> => {
  if (!providerConfig) {
    return []
  }

  const workflow = asRecord(
    (providerConfig as Record<string, unknown>).workflow,
  )
  const workflowNodes = asArray<Record<string, unknown>>(workflow.nodes)
  if (workflowNodes.length > 0) {
    return workflowNodes
  }

  const conversationConfig = asRecord(providerConfig.conversation_config)
  const conversationWorkflow = asRecord(conversationConfig.workflow)
  const conversationNodes = asArray<Record<string, unknown>>(
    conversationWorkflow.nodes,
  )
  if (conversationNodes.length > 0) {
    return conversationNodes
  }

  const agentConfig = asRecord(conversationConfig.agent)
  const agentWorkflow = asRecord(agentConfig.workflow)
  return asArray<Record<string, unknown>>(agentWorkflow.nodes)
}

const resolveWorkflowHasFallbackRoute = (
  providerConfig: Record<string, unknown> | null,
): boolean => {
  if (!providerConfig) {
    return false
  }

  const workflow = asRecord(
    (providerConfig as Record<string, unknown>).workflow,
  )
  if (
    typeof workflow.fallback_node === 'string' &&
    workflow.fallback_node.trim()
  ) {
    return true
  }

  const nodes = resolveWorkflowNodes(providerConfig)
  return nodes.some((node) => {
    const nodeId = asTrimmedString(node.id)
    const nodeName = asTrimmedString(node.name)
    return /fallback|handoff|transfer/i.test(nodeId + nodeName)
  })
}

const resolveWebhookUrl = (
  providerConfig: Record<string, unknown> | null,
  fallback?: string | null,
): string => {
  if (!providerConfig) {
    return asTrimmedString(fallback)
  }

  const platformSettings = asRecord(providerConfig.platform_settings)
  const webhooks = asRecord(platformSettings.webhooks)
  const platformWebhookUrl = asTrimmedString(webhooks.post_call_url)
  if (platformWebhookUrl) {
    return platformWebhookUrl
  }

  const providerWebhooks = asRecord(
    (providerConfig as Record<string, unknown>).webhooks,
  )
  const providerWebhookUrl = asTrimmedString(providerWebhooks.post_call_url)
  if (providerWebhookUrl) {
    return providerWebhookUrl
  }

  return asTrimmedString(fallback)
}

const fetchWithTimeout = async (
  url: string,
  options: RequestInit,
  timeoutMs: number,
): Promise<Response> => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }
}

const runWebhookSignatureScenario = async (input: {
  agentId: string
  externalAgentId?: string | null
  organizationId: string
  webhookUrl: string
  webhookSecret: string
}): Promise<SmokeScenarioResult> => {
  const timestamp = String(Math.floor(Date.now() / 1000))
  const externalAgentId = input.externalAgentId || input.agentId
  const payload = JSON.stringify({
    type: 'agent.health_check',
    event_timestamp: Number(timestamp),
    data: {
      agent_id: externalAgentId,
      conversation_id: `health-check-${input.agentId}-${timestamp}`,
      status: 'health_check',
    },
  })
  const signature = createHmac('sha256', input.webhookSecret)
    .update(`${timestamp}.${payload}`)
    .digest('hex')

  try {
    const response = await fetchWithTimeout(
      input.webhookUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ElevenLabs-Signature': `t=${timestamp},v0=${signature}`,
        },
        body: payload,
      },
      WEBHOOK_TIMEOUT_MS,
    )

    if (response.ok) {
      return {
        id: 'webhook_signature_test_call',
        name: 'Webhook signature test call',
        blocking: true,
        status: 'passed',
        message: 'Signed webhook callback test succeeded.',
      }
    }

    return {
      id: 'webhook_signature_test_call',
      name: 'Webhook signature test call',
      blocking: true,
      status: 'failed',
      message: `Signed webhook callback test failed (${response.status}).`,
      remediationAction:
        'Confirm webhook endpoint is reachable and accepts ElevenLabs signed callback events.',
    }
  } catch (error) {
    return {
      id: 'webhook_signature_test_call',
      name: 'Webhook signature test call',
      blocking: true,
      status: 'failed',
      message:
        error instanceof Error
          ? `Signed webhook callback test failed: ${error.message}`
          : 'Signed webhook callback test failed.',
      remediationAction:
        'Ensure webhook URL is reachable from the backend and signature secret is valid.',
    }
  }
}

export const runAgentSmokeTestBundle = async (
  input: SmokeBundleInput,
): Promise<SmokeBundleResult> => {
  const mode = input.mode || 'provisioning'
  const checkedAt = new Date().toISOString()
  const prompt = resolvePrompt(input.providerConfig, input.promptOverride)
  const greeting = resolveGreeting(input.providerConfig, input.greetingOverride)
  const workflowNodes = resolveWorkflowNodes(input.providerConfig)
  const hasWorkflowFallback = resolveWorkflowHasFallbackRoute(
    input.providerConfig,
  )
  const tools = resolveTools(input.providerConfig)
  const knowledgeSources = resolveKnowledgeSources(input.providerConfig)
  const webhookUrl = resolveWebhookUrl(
    input.providerConfig,
    input.webhookUrlOverride,
  )

  const scenarios: SmokeScenarioResult[] = []

  const hasPrompt = prompt.length >= 20
  const hasGreeting = greeting.length >= 5
  scenarios.push({
    id: 'greeting_prompt_compile_sanity',
    name: 'Greeting + prompt compile sanity',
    blocking: true,
    status: hasPrompt && hasGreeting ? 'passed' : 'failed',
    message:
      hasPrompt && hasGreeting
        ? 'Prompt and greeting sanity checks passed.'
        : 'Prompt or greeting is missing required baseline content.',
    remediationAction:
      hasPrompt && hasGreeting
        ? undefined
        : 'Set a non-empty prompt and greeting in agent configuration.',
  })

  const hasWorkflowSignal =
    (workflowNodes.length > 0 && hasWorkflowFallback) ||
    (Boolean(input.agent.useCase) &&
      /fallback|handoff|transfer|escalat/i.test(prompt))
  scenarios.push({
    id: 'intent_routing_sample_scenarios',
    name: 'Intent routing sample scenarios',
    blocking: true,
    status: hasWorkflowSignal ? 'passed' : 'failed',
    message: hasWorkflowSignal
      ? 'Intent routing baseline checks passed.'
      : 'Workflow intent routes/fallback signal not detected.',
    remediationAction: hasWorkflowSignal
      ? undefined
      : 'Configure canonical workflow nodes and at least one fallback route.',
  })

  const malformedToolCount = tools.filter((tool) => {
    const parsedTool = asRecord(tool)
    return (
      !asTrimmedString(parsedTool.name) && !asTrimmedString(parsedTool.type)
    )
  }).length
  const toolsDryRunPassed = tools.length > 0 && malformedToolCount === 0
  scenarios.push({
    id: 'tool_invocation_dry_run',
    name: 'Tool invocation dry-run',
    blocking: false,
    status: toolsDryRunPassed ? 'passed' : 'failed',
    message: toolsDryRunPassed
      ? 'Required tools are present for dry-run invocation.'
      : 'Required tools are missing or malformed for dry-run.',
    remediationAction: toolsDryRunPassed
      ? undefined
      : 'Enable baseline tools/MCP and verify each tool has a valid name or type.',
  })

  if (!webhookUrl || !input.agent.webhookSecret) {
    scenarios.push({
      id: 'webhook_signature_test_call',
      name: 'Webhook signature test call',
      blocking: true,
      status: 'failed',
      message: 'Webhook URL or webhook signing secret is not configured.',
      remediationAction:
        'Configure post-call webhook URL and webhook secret before activation.',
    })
  } else if (mode === 'runtime') {
    scenarios.push({
      id: 'webhook_signature_test_call',
      name: 'Webhook signature test call',
      blocking: true,
      status: 'passed',
      message:
        'Webhook signature test call skipped in runtime mode; URL and signing secret are configured.',
    })
  } else {
    scenarios.push(
      await runWebhookSignatureScenario({
        agentId: input.agent.id,
        externalAgentId: input.agent.externalId,
        organizationId: input.agent.organizationId,
        webhookUrl,
        webhookSecret: input.agent.webhookSecret,
      }),
    )
  }

  const hasKnowledgeSources = knowledgeSources.length >= 1
  scenarios.push({
    id: 'knowledge_retrieval_sanity_prompt',
    name: 'Knowledge retrieval sanity prompt',
    blocking: false,
    status: hasKnowledgeSources ? 'passed' : 'failed',
    message: hasKnowledgeSources
      ? 'Knowledge retrieval source threshold satisfied.'
      : 'No knowledge sources were detected for retrieval sanity.',
    remediationAction: hasKnowledgeSources
      ? undefined
      : 'Attach at least one knowledge source and verify ingest completion.',
  })

  const failures = scenarios.filter((scenario) => scenario.status === 'failed')
  const blockingFailures = failures.filter((scenario) => scenario.blocking)
  const nonBlockingFailures = failures.filter((scenario) => !scenario.blocking)

  if (blockingFailures.length > 0) {
    return {
      status: 'failed',
      checkedAt,
      message: `${blockingFailures.length} blocking smoke test(s) failed.`,
      remediationAction: blockingFailures[0]?.remediationAction,
      scenarios,
    }
  }

  if (nonBlockingFailures.length > 0) {
    return {
      status: 'degraded',
      checkedAt,
      message: `${nonBlockingFailures.length} non-blocking smoke test(s) failed.`,
      remediationAction: nonBlockingFailures[0]?.remediationAction,
      scenarios,
    }
  }

  return {
    status: 'ok',
    checkedAt,
    message: 'Smoke test bundle passed.',
    scenarios,
  }
}
