import {
  AgentActivationGate,
  AgentHealthCheckName,
  AgentHealthChecks,
  AgentHealthStatus,
} from '@shared/types/src'

export const DEFAULT_BLOCKING_AGENT_HEALTH_CHECKS: AgentHealthCheckName[] = [
  'provider',
  'workflow',
  'webhook',
  'tests',
]

const FAILING_STATUSES = new Set(['failed', 'blocked'])

export const isFailingHealthCheckStatus = (
  status: AgentHealthChecks[AgentHealthCheckName]['status'],
): boolean => {
  return FAILING_STATUSES.has(status)
}

const toEntries = (
  checks: AgentHealthChecks,
): Array<[AgentHealthCheckName, AgentHealthChecks[AgentHealthCheckName]]> => {
  return Object.entries(checks) as Array<
    [AgentHealthCheckName, AgentHealthChecks[AgentHealthCheckName]]
  >
}

export const getActivationDeniedChecks = (
  checks: AgentHealthChecks,
): AgentHealthCheckName[] => {
  return toEntries(checks)
    .filter(([, check]) => check.blocking && isFailingHealthCheckStatus(check.status))
    .map(([checkName]) => checkName)
}

export const buildAgentActivationGate = (
  checks: AgentHealthChecks,
): AgentActivationGate => {
  const deniedBy = getActivationDeniedChecks(checks)
  return {
    allowed: deniedBy.length === 0,
    deniedBy,
  }
}

export const resolveAgentHealthStatus = (
  checks: AgentHealthChecks,
): AgentHealthStatus => {
  const activation = buildAgentActivationGate(checks)
  if (!activation.allowed) {
    return 'blocked'
  }

  const hasNonOkCheck = toEntries(checks).some(([, check]) => check.status !== 'ok')
  if (hasNonOkCheck) {
    return 'degraded'
  }

  return 'healthy'
}

