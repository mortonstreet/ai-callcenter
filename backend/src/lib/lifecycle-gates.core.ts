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

type BillingEntitlementState =
  | 'payment_required'
  | 'payment_verified'
  | 'restricted'
  | 'demo_bypass'

const BILLING_ENTITLEMENT_STATES = [
  'payment_required',
  'payment_verified',
  'restricted',
  'demo_bypass',
] as const

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing'])
const RESTRICTED_SUBSCRIPTION_STATUSES = new Set([
  'canceled',
  'unpaid',
  'incomplete_expired',
])

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

const isBillingEntitlementState = (
  value: unknown,
): value is BillingEntitlementState =>
  typeof value === 'string' &&
  BILLING_ENTITLEMENT_STATES.includes(value as BillingEntitlementState)

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)

const parseOptionalDate = (value: unknown): Date | null => {
  if (typeof value !== 'string' || value.trim().length === 0) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const mapSubscriptionStatusToEntitlementState = (
  subscriptionStatus: string | null,
): BillingEntitlementState | null => {
  if (!subscriptionStatus) return null
  const normalized = subscriptionStatus.toLowerCase().trim()
  if (ACTIVE_SUBSCRIPTION_STATUSES.has(normalized)) {
    return 'payment_verified'
  }
  if (RESTRICTED_SUBSCRIPTION_STATUSES.has(normalized)) {
    return 'restricted'
  }
  return 'payment_required'
}

const extractEntitlementSignals = (metadata: Record<string, unknown>) => {
  const billing = isRecord(metadata.billing) ? metadata.billing : {}
  const entitlementRaw = metadata.entitlementState ?? billing.entitlementState
  const subscriptionStatusRaw =
    metadata.subscriptionStatus ?? billing.subscriptionStatus

  const entitlementState = isBillingEntitlementState(entitlementRaw)
    ? entitlementRaw
    : null
  const subscriptionStatus =
    typeof subscriptionStatusRaw === 'string' &&
    subscriptionStatusRaw.trim().length > 0
      ? subscriptionStatusRaw.trim()
      : null

  const hasBillingSignal =
    entitlementState !== null ||
    subscriptionStatus !== null ||
    typeof metadata.billingOffer === 'string' ||
    typeof billing.offer === 'string'

  return {
    entitlementState,
    subscriptionStatus,
    hasBillingSignal,
  }
}

const isDemoPolicyApproved = (
  metadata: Record<string, unknown>,
  now: Date = new Date(),
) => {
  const demoPolicy = isRecord(metadata.demoPolicy) ? metadata.demoPolicy : {}
  const approvedAt = parseOptionalDate(
    demoPolicy.approvedAt ?? demoPolicy.approved_at,
  )
  if (!approvedAt) return false

  const suspendedAt = parseOptionalDate(
    demoPolicy.suspendedAt ?? demoPolicy.suspended_at,
  )
  if (suspendedAt && suspendedAt <= now) return false

  const expiresAt = parseOptionalDate(
    demoPolicy.expiresAt ?? demoPolicy.expires_at,
  )
  if (expiresAt && expiresAt <= now) return false

  return true
}

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

  const lifecycleStatusRaw =
    metadata.lifecycleStatus ?? nestedLifecycle.lifecycleStatus
  const planTypeRaw = metadata.planType ?? nestedLifecycle.planType
  const provisioningStatusRaw =
    metadata.provisioningStatus ?? nestedLifecycle.provisioningStatus

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

  const entitlementSignals = extractEntitlementSignals(metadata)
  const hasExplicitLifecycle = isLifecycleStatus(lifecycleStatusRaw)
  const shouldApplyEntitlementRules =
    hasExplicitLifecycle || entitlementSignals.hasBillingSignal

  if (planType === 'demo') {
    const demoPolicyApproved = isDemoPolicyApproved(metadata)
    if (demoPolicyApproved && lifecycleStatus === 'payment_required') {
      lifecycleStatus = 'demo_approved'
    } else if (
      !demoPolicyApproved &&
      (lifecycleStatus === 'demo_approved' ||
        lifecycleStatus === 'workspace_active')
    ) {
      lifecycleStatus = 'payment_required'
    }
  } else if (shouldApplyEntitlementRules) {
    const derivedEntitlementState =
      entitlementSignals.entitlementState ||
      mapSubscriptionStatusToEntitlementState(
        entitlementSignals.subscriptionStatus,
      )

    if (derivedEntitlementState === 'restricted') {
      lifecycleStatus = 'suspended'
    } else if (derivedEntitlementState === 'payment_required') {
      if (lifecycleStatus !== 'onboarding_incomplete') {
        lifecycleStatus = 'payment_required'
      }
    } else if (derivedEntitlementState === 'payment_verified') {
      if (lifecycleStatus !== 'onboarding_incomplete') {
        lifecycleStatus =
          provisioningStatus === 'pending' || provisioningStatus === 'running'
            ? 'provisioning_pending'
            : 'workspace_active'
      }
    }
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
  demo_approved: [
    '/api/provisioning',
    '/api/call-center/provisioning',
    '/api/user/me',
    '/api/user/account',
  ],
  payment_required: ['/api/billing', '/api/user/me', '/api/user/account'],
  provisioning_pending: [
    '/api/provisioning',
    '/api/call-center/provisioning',
    '/api/user/me',
    '/api/user/account',
  ],
  suspended: ['/api/billing', '/api/user/me', '/api/user/account'],
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
