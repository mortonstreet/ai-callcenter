export const ORG_LIFECYCLE_STATUSES = [
  'onboarding_incomplete',
  'payment_required',
  'demo_approved',
  'provisioning_pending',
  'workspace_active',
  'suspended',
] as const

export const ORG_PLAN_TYPES = ['paid', 'demo'] as const

export const ORG_PROVISIONING_STATUSES = [
  'pending',
  'running',
  'failed',
  'completed',
] as const

export type OrganizationLifecycleStatus =
  (typeof ORG_LIFECYCLE_STATUSES)[number]
export type OrganizationPlanType = (typeof ORG_PLAN_TYPES)[number]
export type OrganizationProvisioningStatus =
  (typeof ORG_PROVISIONING_STATUSES)[number]

export type OrganizationLifecycleSnapshot = {
  organizationId: string | null
  lifecycleStatus: OrganizationLifecycleStatus
  planType: OrganizationPlanType
  provisioningStatus: OrganizationProvisioningStatus
}

export type LifecycleGateDecision = {
  allowed: boolean
  reason?: string
  requiredStatus?: OrganizationLifecycleStatus
  requiredPath?: string
}

const isLifecycleStatus = (
  value: unknown,
): value is OrganizationLifecycleStatus =>
  typeof value === 'string' &&
  ORG_LIFECYCLE_STATUSES.includes(value as OrganizationLifecycleStatus)

const isPlanType = (value: unknown): value is OrganizationPlanType =>
  typeof value === 'string' &&
  ORG_PLAN_TYPES.includes(value as OrganizationPlanType)

const isProvisioningStatus = (
  value: unknown,
): value is OrganizationProvisioningStatus =>
  typeof value === 'string' &&
  ORG_PROVISIONING_STATUSES.includes(value as OrganizationProvisioningStatus)

export const parseLifecycleMetadata = (
  raw: unknown,
): Record<string, unknown> => {
  if (!raw) return {}
  if (typeof raw === 'object') return raw as Record<string, unknown>
  if (typeof raw !== 'string') return {}
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, unknown>
    }
  } catch {
    return {}
  }
  return {}
}

const buildSnapshotFromMetadata = (
  organizationId: string,
  metadata: Record<string, unknown>,
): OrganizationLifecycleSnapshot => {
  const lifecycle = metadata.lifecycle
  const nestedLifecycle =
    lifecycle && typeof lifecycle === 'object'
      ? (lifecycle as Record<string, unknown>)
      : {}

  const planTypeRaw = metadata.planType ?? nestedLifecycle.planType
  const provisioningStatusRaw =
    metadata.provisioningStatus ?? nestedLifecycle.provisioningStatus
  const lifecycleStatusRaw =
    metadata.lifecycleStatus ?? nestedLifecycle.lifecycleStatus

  const planType = isPlanType(planTypeRaw) ? planTypeRaw : 'paid'
  const provisioningStatus = isProvisioningStatus(provisioningStatusRaw)
    ? provisioningStatusRaw
    : 'completed'

  let lifecycleStatus: OrganizationLifecycleStatus = 'workspace_active'
  if (isLifecycleStatus(lifecycleStatusRaw)) {
    lifecycleStatus = lifecycleStatusRaw
  } else if (
    provisioningStatus === 'pending' ||
    provisioningStatus === 'running'
  ) {
    lifecycleStatus = 'provisioning_pending'
  }

  return {
    organizationId,
    lifecycleStatus,
    planType,
    provisioningStatus,
  }
}

export const buildMissingOrganizationLifecycleSnapshot =
  (): OrganizationLifecycleSnapshot => ({
    organizationId: null,
    lifecycleStatus: 'onboarding_incomplete',
    planType: 'paid',
    provisioningStatus: 'pending',
  })

export const buildOrganizationLifecycleSnapshotFromMetadata = (input: {
  organizationId: string
  metadata: unknown
}): OrganizationLifecycleSnapshot =>
  buildSnapshotFromMetadata(
    input.organizationId,
    parseLifecycleMetadata(input.metadata),
  )

const matchesAllowedPrefixes = (
  requestPath: string,
  allowedPrefixes: string[],
): boolean =>
  allowedPrefixes.some(
    (prefix) => requestPath === prefix || requestPath.startsWith(`${prefix}/`),
  )

const API_ALLOWLIST_BY_STATUS: Partial<
  Record<OrganizationLifecycleStatus, string[]>
> = {
  onboarding_incomplete: [
    '/api/organization/onboarding',
    '/api/user/me',
    '/api/user/account',
  ],
  demo_approved: ['/api/provisioning', '/api/user/me', '/api/user/account'],
  payment_required: ['/api/billing', '/api/user/me', '/api/user/account'],
  provisioning_pending: [
    '/api/provisioning',
    '/api/user/me',
    '/api/user/account',
  ],
  suspended: ['/api/user/me', '/api/user/account'],
}

const CLIENT_REQUIRED_ROUTE_BY_STATUS: Partial<
  Record<OrganizationLifecycleStatus, string>
> = {
  onboarding_incomplete: '/onboarding',
  demo_approved: '/dashboard/provisioning',
  payment_required: '/dashboard/billing',
  provisioning_pending: '/dashboard/provisioning',
  suspended: '/dashboard/billing',
}

export const getRequiredClientRouteForStatus = (
  status: OrganizationLifecycleStatus,
): string | null => CLIENT_REQUIRED_ROUTE_BY_STATUS[status] || null

export const evaluateApiLifecycleGate = (
  requestPath: string,
  snapshot: OrganizationLifecycleSnapshot,
): LifecycleGateDecision => {
  const requiredPath = getRequiredClientRouteForStatus(snapshot.lifecycleStatus)
  if (!requiredPath) {
    return { allowed: true }
  }

  const allowedPrefixes =
    API_ALLOWLIST_BY_STATUS[snapshot.lifecycleStatus] || []
  if (matchesAllowedPrefixes(requestPath, allowedPrefixes)) {
    return { allowed: true }
  }

  return {
    allowed: false,
    reason: `Lifecycle status "${snapshot.lifecycleStatus}" requires ${requiredPath}`,
    requiredStatus: snapshot.lifecycleStatus,
    requiredPath,
  }
}
