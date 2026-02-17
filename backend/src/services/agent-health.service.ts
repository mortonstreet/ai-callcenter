import { createHash } from 'crypto'
import { getElevenLabsClient } from '@/clients/elevenlabs.client'
import logger from '@/lib/logger'
import { findById } from '@/repositories/agent.repository'
import { queueRegistry } from '@/queues'
import { QUEUE_NAMES } from '@/types/queues'
import {
  AgentExternalType,
  AgentHealthCheckName,
  AgentHealthCheckResult,
  AgentHealthChecks,
  AgentHealthResponse,
} from '@shared/types/src'
import {
  buildAgentActivationGate,
  resolveAgentHealthStatus,
} from '@/services/agent-health.core'
import { runAgentSmokeTestBundle } from '@/services/agent-smoke.service'

interface EvaluateAgentHealthOptions {
  mode?: 'runtime' | 'provisioning'
  promptOverride?: string
  greetingOverride?: string
}

const QUEUE_BACKLOG_WARNING_THRESHOLD = 25
const ENDPOINT_REACHABILITY_TIMEOUT_MS = 2000

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

const buildCheck = (
  input: Omit<AgentHealthCheckResult, 'checkedAt'> & { checkedAt?: string },
): AgentHealthCheckResult => ({
  status: input.status,
  checkedAt: input.checkedAt || new Date().toISOString(),
  message: input.message,
  blocking: input.blocking,
  remediationAction: input.remediationAction,
})

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

const hasExplicitWorkflowConfig = (
  providerConfig: Record<string, unknown> | null,
): boolean => {
  if (!providerConfig) {
    return false
  }

  const workflow = asRecord(
    (providerConfig as Record<string, unknown>).workflow,
  )
  if (Object.keys(workflow).length > 0) {
    return true
  }

  const conversationConfig = asRecord(providerConfig.conversation_config)
  const conversationWorkflow = asRecord(conversationConfig.workflow)
  if (Object.keys(conversationWorkflow).length > 0) {
    return true
  }

  const agentConfig = asRecord(conversationConfig.agent)
  const agentWorkflow = asRecord(agentConfig.workflow)
  return Object.keys(agentWorkflow).length > 0
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

const resolveWebhookUrl = (
  providerConfig: Record<string, unknown> | null,
): string => {
  if (!providerConfig) {
    return ''
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
  return asTrimmedString(providerWebhooks.post_call_url)
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

const checkEndpointReachability = async (
  url: string,
): Promise<{ reachable: boolean; statusCode?: number; message: string }> => {
  try {
    const headResponse = await fetchWithTimeout(
      url,
      {
        method: 'HEAD',
      },
      ENDPOINT_REACHABILITY_TIMEOUT_MS,
    )

    if (headResponse.ok || headResponse.status < 500) {
      return {
        reachable: true,
        statusCode: headResponse.status,
        message: `Endpoint reachable (${headResponse.status}).`,
      }
    }

    const getResponse = await fetchWithTimeout(
      url,
      {
        method: 'GET',
      },
      ENDPOINT_REACHABILITY_TIMEOUT_MS,
    )

    if (getResponse.ok || getResponse.status < 500) {
      return {
        reachable: true,
        statusCode: getResponse.status,
        message: `Endpoint reachable (${getResponse.status}).`,
      }
    }

    return {
      reachable: false,
      statusCode: getResponse.status,
      message: `Endpoint responded with ${getResponse.status}.`,
    }
  } catch (error) {
    return {
      reachable: false,
      message:
        error instanceof Error
          ? `Endpoint not reachable: ${error.message}`
          : 'Endpoint not reachable.',
    }
  }
}

export const getPrimaryBlockingFailureMessage = (
  health: AgentHealthResponse,
): string => {
  const firstDeniedCheck = health.activation.deniedBy[0]
  if (!firstDeniedCheck) {
    return 'Activation blocked by readiness policy.'
  }
  return health.checks[firstDeniedCheck].message
}

export const getPrimaryNonOkCheckMessage = (
  health: AgentHealthResponse,
): string | null => {
  const orderedChecks: AgentHealthCheckName[] = [
    'provider',
    'profile',
    'workflow',
    'knowledge_base',
    'tools_mcp',
    'webhook',
    'tests',
    'queues',
  ]

  for (const checkName of orderedChecks) {
    const check = health.checks[checkName]
    if (check.status !== 'ok') {
      return check.message
    }
  }

  return null
}

export async function evaluateAgentHealth(
  agentId: string,
  organizationId: string,
  options: EvaluateAgentHealthOptions = {},
): Promise<AgentHealthResponse> {
  const mode = options.mode || 'runtime'
  const checkedAt = new Date().toISOString()
  const agent = await findById(agentId, organizationId)

  let providerConfig: Record<string, unknown> | null = null
  let providerCheck: AgentHealthChecks['provider']

  if (agent.externalType === AgentExternalType.LOCAL_FALLBACK) {
    providerCheck = {
      ...buildCheck({
        status: 'failed',
        checkedAt,
        message: 'Agent is in local fallback mode and not provider-backed.',
        blocking: true,
        remediationAction:
          'Retry provider provisioning and recover provider-backed agent state.',
      }),
      provider: AgentExternalType.ELEVEN_LABS,
    }
  } else if (agent.syncPending || agent.status === 'error') {
    providerCheck = {
      ...buildCheck({
        status: 'failed',
        checkedAt,
        message:
          agent.lastSyncError ||
          'Provider sync is pending due to a recent provider error.',
        blocking: true,
        remediationAction:
          'Resolve provider sync failure and retry provisioning/update sync.',
      }),
      provider: AgentExternalType.ELEVEN_LABS,
    }
  } else {
    try {
      const client = getElevenLabsClient()
      const providerAgentConfig = await client.getAgent(agent.externalId)
      providerConfig = asRecord(providerAgentConfig) as Record<string, unknown>
      providerCheck = {
        ...buildCheck({
          status: 'ok',
          checkedAt,
          message: 'Provider health check succeeded.',
          blocking: true,
        }),
        provider: AgentExternalType.ELEVEN_LABS,
      }
    } catch (error) {
      logger.warn(
        {
          error,
          agentId: agent.id,
          organizationId: agent.organizationId,
        },
        'Agent provider health check failed',
      )
      providerCheck = {
        ...buildCheck({
          status: 'failed',
          checkedAt,
          message:
            error instanceof Error
              ? `Provider health check failed: ${error.message}`
              : 'Provider health check failed.',
          blocking: true,
          remediationAction:
            'Verify provider credentials/connectivity and rerun provisioning sync.',
        }),
        provider: AgentExternalType.ELEVEN_LABS,
      }
    }
  }

  const prompt = resolvePrompt(providerConfig, options.promptOverride)
  const greeting = resolveGreeting(providerConfig, options.greetingOverride)
  const profileIntegrityHash = createHash('sha1')
    .update(`${prompt}|${greeting}`)
    .digest('hex')
    .slice(0, 12)

  const profileCheck =
    prompt && greeting
      ? buildCheck({
          status: 'ok',
          checkedAt,
          message: `Profile integrity verified (hash:${profileIntegrityHash}).`,
          blocking: false,
        })
      : buildCheck({
          status: providerConfig ? 'failed' : 'degraded',
          checkedAt,
          message: providerConfig
            ? 'Profile integrity check failed: prompt or greeting missing.'
            : 'Profile integrity could not be verified while provider is unavailable.',
          blocking: false,
          remediationAction:
            'Regenerate profile prompt/greeting and persist profile version metadata.',
        })

  const workflowNodes = resolveWorkflowNodes(providerConfig)
  const hasFallbackRoute = resolveWorkflowHasFallbackRoute(providerConfig)
  const explicitWorkflowConfig = hasExplicitWorkflowConfig(providerConfig)
  let workflowCheck: AgentHealthCheckResult

  if (!providerConfig) {
    workflowCheck = buildCheck({
      status: 'degraded',
      checkedAt,
      message:
        'Workflow graph cannot be validated while provider is unavailable.',
      blocking: true,
      remediationAction: 'Retry provider sync and re-validate workflow graph.',
    })
  } else if (workflowNodes.length > 0 && hasFallbackRoute) {
    workflowCheck = buildCheck({
      status: 'ok',
      checkedAt,
      message: `Workflow validation passed (${workflowNodes.length} node(s), fallback route present).`,
      blocking: true,
    })
  } else if (workflowNodes.length > 0 && !hasFallbackRoute) {
    workflowCheck = buildCheck({
      status: 'failed',
      checkedAt,
      message: 'Workflow validation failed: no fallback route detected.',
      blocking: true,
      remediationAction:
        'Add canonical fallback/handoff route to workflow graph.',
    })
  } else if (explicitWorkflowConfig) {
    workflowCheck = buildCheck({
      status: 'failed',
      checkedAt,
      message: 'Workflow validation failed: workflow config has no nodes.',
      blocking: true,
      remediationAction: 'Add canonical workflow nodes before activation.',
    })
  } else {
    workflowCheck = buildCheck({
      status: 'degraded',
      checkedAt,
      message:
        'Workflow graph is not exposed by provider response; full route validation deferred.',
      blocking: true,
      remediationAction:
        'Ensure provisioning applies canonical workflow graph.',
    })
  }

  const knowledgeSources = resolveKnowledgeSources(providerConfig)
  const knowledgeBaseCheck =
    knowledgeSources.length >= 1
      ? buildCheck({
          status: 'ok',
          checkedAt,
          message: `Knowledge base threshold satisfied (${knowledgeSources.length} source(s)).`,
          blocking: false,
        })
      : buildCheck({
          status: providerConfig ? 'failed' : 'degraded',
          checkedAt,
          message: providerConfig
            ? 'Knowledge base threshold not met (minimum 1 source required).'
            : 'Knowledge base threshold could not be validated while provider is unavailable.',
          blocking: false,
          remediationAction:
            'Ingest at least one approved knowledge source and verify completion.',
        })

  const tools = resolveTools(providerConfig)
  let toolsMcpCheck: AgentHealthCheckResult

  if (!providerConfig) {
    toolsMcpCheck = buildCheck({
      status: 'degraded',
      checkedAt,
      message: 'Tools/MCP check deferred while provider is unavailable.',
      blocking: false,
      remediationAction: 'Retry provider sync and rerun tools/MCP checks.',
    })
  } else if (!agent.mcpEndpointUrl && tools.length === 0) {
    toolsMcpCheck = buildCheck({
      status: 'failed',
      checkedAt,
      message: 'No baseline tools configured and MCP endpoint is missing.',
      blocking: false,
      remediationAction:
        'Enable baseline tools or configure MCP endpoint and API key.',
    })
  } else if (agent.mcpEndpointUrl) {
    const mcpReachability = await checkEndpointReachability(
      agent.mcpEndpointUrl,
    )
    if (!mcpReachability.reachable) {
      toolsMcpCheck = buildCheck({
        status: 'failed',
        checkedAt,
        message: `MCP endpoint check failed: ${mcpReachability.message}`,
        blocking: false,
        remediationAction:
          'Ensure MCP endpoint is reachable and agent credentials are valid.',
      })
    } else if (tools.length === 0) {
      toolsMcpCheck = buildCheck({
        status: 'degraded',
        checkedAt,
        message:
          'MCP endpoint is reachable but provider tools list is empty for this agent.',
        blocking: false,
        remediationAction: 'Attach baseline tools for dry-run coverage.',
      })
    } else {
      toolsMcpCheck = buildCheck({
        status: 'ok',
        checkedAt,
        message: `Tools/MCP check passed (${tools.length} tool(s), MCP reachable).`,
        blocking: false,
      })
    }
  } else {
    toolsMcpCheck = buildCheck({
      status: 'ok',
      checkedAt,
      message: `Tools check passed (${tools.length} tool(s)).`,
      blocking: false,
    })
  }

  const webhookUrl = resolveWebhookUrl(providerConfig)
  let webhookCheck: AgentHealthCheckResult

  if (!webhookUrl || !agent.webhookSecret) {
    webhookCheck = buildCheck({
      status: 'failed',
      checkedAt,
      message:
        'Webhook check failed: webhook URL or signing secret is missing.',
      blocking: true,
      remediationAction:
        'Configure post-call webhook URL and webhook secret before activation.',
    })
  } else {
    const webhookReachability = await checkEndpointReachability(webhookUrl)
    webhookCheck = webhookReachability.reachable
      ? buildCheck({
          status: 'ok',
          checkedAt,
          message: 'Webhook endpoint reachability check succeeded.',
          blocking: true,
        })
      : buildCheck({
          status: 'failed',
          checkedAt,
          message: `Webhook endpoint check failed: ${webhookReachability.message}`,
          blocking: true,
          remediationAction:
            'Verify webhook endpoint availability and retry signed callback test.',
        })
  }

  const smokeBundle = await runAgentSmokeTestBundle({
    mode,
    agent: {
      id: agent.id,
      organizationId: agent.organizationId,
      name: agent.name,
      useCase: agent.useCase,
      webhookSecret: agent.webhookSecret,
    },
    providerConfig,
    promptOverride: options.promptOverride,
    greetingOverride: options.greetingOverride,
    webhookUrlOverride: webhookUrl || null,
  })
  const testsCheck = buildCheck({
    status: smokeBundle.status,
    checkedAt: smokeBundle.checkedAt,
    message: smokeBundle.message,
    blocking: true,
    remediationAction: smokeBundle.remediationAction,
  })

  let queuesCheck: AgentHealthCheckResult
  try {
    const queueCounts = await queueRegistry[
      QUEUE_NAMES.INTEGRATION_SYNC
    ].getJobCounts('waiting', 'active', 'delayed')
    const backlogDepth =
      Number(queueCounts.waiting || 0) +
      Number(queueCounts.active || 0) +
      Number(queueCounts.delayed || 0)

    queuesCheck =
      backlogDepth > QUEUE_BACKLOG_WARNING_THRESHOLD
        ? buildCheck({
            status: 'degraded',
            checkedAt,
            message: `Retry queue backlog is elevated (${backlogDepth} pending jobs).`,
            blocking: false,
            remediationAction:
              'Drain integration sync retries and monitor worker throughput.',
          })
        : buildCheck({
            status: 'ok',
            checkedAt,
            message: `Retry queue backlog is within threshold (${backlogDepth} pending jobs).`,
            blocking: false,
          })
  } catch (error) {
    queuesCheck = buildCheck({
      status: 'degraded',
      checkedAt,
      message:
        error instanceof Error
          ? `Retry queue health check failed: ${error.message}`
          : 'Retry queue health check failed.',
      blocking: false,
      remediationAction: 'Verify Redis/queue connectivity and worker health.',
    })
  }

  const checks: AgentHealthChecks = {
    provider: providerCheck,
    profile: profileCheck,
    workflow: workflowCheck,
    knowledge_base: knowledgeBaseCheck,
    tools_mcp: toolsMcpCheck,
    webhook: webhookCheck,
    tests: testsCheck,
    queues: queuesCheck,
  }

  const status = resolveAgentHealthStatus(checks)
  const activation = buildAgentActivationGate(checks)
  const degradedMode =
    agent.externalType === AgentExternalType.LOCAL_FALLBACK
      ? {
          enabled: true,
          reason: 'local_fallback_agent' as const,
        }
      : providerCheck.status !== 'ok'
        ? {
            enabled: true,
            reason: 'provider_unavailable' as const,
          }
        : status === 'blocked'
          ? {
              enabled: true,
              reason: 'readiness_blocked' as const,
            }
          : status !== 'healthy'
            ? {
                enabled: true,
                reason: 'readiness_checks_failed' as const,
              }
            : {
                enabled: false,
                reason: null,
              }

  return {
    agentId: agent.id,
    organizationId: agent.organizationId,
    status,
    readinessStatus:
      status === 'healthy'
        ? 'ready'
        : status === 'blocked'
          ? 'blocked'
          : 'degraded',
    degradedMode,
    activation,
    checks,
  }
}
