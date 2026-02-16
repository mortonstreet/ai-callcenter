const ORG_PROVISIONING_STATUSES = new Set([
  'pending',
  'running',
  'failed',
  'completed',
])

type ProvisioningStatus = 'pending' | 'running' | 'failed' | 'completed'

type DemoLifecycleStatus =
  | 'onboarding_incomplete'
  | 'payment_required'
  | 'demo_approved'
  | 'provisioning_pending'
  | 'workspace_active'
  | 'suspended'

export type DemoTenantStatus =
  | 'pending_approval'
  | 'approved'
  | 'expired'
  | 'suspended'
  | 'converted'

export type DemoUsageLimits = {
  maxSeats?: number
  maxAgents?: number
  maxMonthlyCalls?: number
}

export type DemoOnboardingProfile = {
  domain?: string
  industry?: string
  services?: string[]
  useCase?: string
  website?: string
  mainGoal?: string
  agentName?: string
}

export type DemoPolicy = {
  requestedAt?: string | null
  requestedByUserId?: string | null
  requestedOwnerEmail?: string | null
  requestedOwnerName?: string | null
  approvalNotes?: string | null
  approvedAt?: string | null
  approverUserId?: string | null
  expiresAt?: string | null
  usageLimits?: DemoUsageLimits | null
  extensionReason?: string | null
  extendedAt?: string | null
  suspendedAt?: string | null
  suspendedByUserId?: string | null
  suspendedReason?: string | null
  convertedAt?: string | null
  convertedByUserId?: string | null
  conversionReason?: string | null
  ownerHandoffAt?: string | null
  ownerHandoffByUserId?: string | null
  ownerHandoffEmail?: string | null
  ownerHandoffUserId?: string | null
  ownerHandoffInvitationId?: string | null
}

export type DemoTenantSummary = {
  organizationId: string
  name: string
  slug: string
  createdAt: string
  lifecycleStatus: DemoLifecycleStatus
  provisioningStatus: ProvisioningStatus
  status: DemoTenantStatus
  ownerEmail: string | null
  ownerName: string | null
  approvedAt: string | null
  expiresAt: string | null
  suspendedAt: string | null
  convertedAt: string | null
  extensionReason: string | null
  usageLimits: DemoUsageLimits | null
}

const DEMO_DEFAULT_EXPIRY_DAYS = 14

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)

const isProvisioningStatus = (value: unknown): value is ProvisioningStatus =>
  typeof value === 'string' && ORG_PROVISIONING_STATUSES.has(value)

const asTrimmedString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null

const parseOptionalDate = (value: unknown): Date | null => {
  const iso = asTrimmedString(value)
  if (!iso) return null
  const parsed = new Date(iso)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const toIso = (value: unknown): string | null => {
  if (!value) return null
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString()
  }
  if (typeof value === 'string') {
    const parsed = parseOptionalDate(value)
    return parsed ? parsed.toISOString() : null
  }
  return null
}

const withDays = (from: Date, days: number) => {
  const next = new Date(from)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

const normalizeUsageLimits = (input: unknown): DemoUsageLimits | null => {
  if (!isRecord(input)) return null
  const maxSeats =
    typeof input.maxSeats === 'number' ? input.maxSeats : undefined
  const maxAgents =
    typeof input.maxAgents === 'number' ? input.maxAgents : undefined
  const maxMonthlyCalls =
    typeof input.maxMonthlyCalls === 'number'
      ? input.maxMonthlyCalls
      : undefined

  if (
    typeof maxSeats !== 'number' &&
    typeof maxAgents !== 'number' &&
    typeof maxMonthlyCalls !== 'number'
  ) {
    return null
  }

  return {
    ...(typeof maxSeats === 'number' ? { maxSeats } : {}),
    ...(typeof maxAgents === 'number' ? { maxAgents } : {}),
    ...(typeof maxMonthlyCalls === 'number' ? { maxMonthlyCalls } : {}),
  }
}

const normalizeOnboardingProfile = (
  input: unknown,
): DemoOnboardingProfile | null => {
  if (!isRecord(input)) return null

  const services = Array.isArray(input.services)
    ? input.services.filter(
        (entry): entry is string => typeof entry === 'string',
      )
    : undefined

  const profile: DemoOnboardingProfile = {
    ...(asTrimmedString(input.domain)
      ? { domain: asTrimmedString(input.domain) || undefined }
      : {}),
    ...(asTrimmedString(input.industry)
      ? { industry: asTrimmedString(input.industry) || undefined }
      : {}),
    ...(services ? { services } : {}),
    ...(asTrimmedString(input.useCase)
      ? { useCase: asTrimmedString(input.useCase) || undefined }
      : {}),
    ...(asTrimmedString(input.website)
      ? { website: asTrimmedString(input.website) || undefined }
      : {}),
    ...(asTrimmedString(input.mainGoal)
      ? { mainGoal: asTrimmedString(input.mainGoal) || undefined }
      : {}),
    ...(asTrimmedString(input.agentName)
      ? { agentName: asTrimmedString(input.agentName) || undefined }
      : {}),
  }

  return Object.keys(profile).length > 0 ? profile : null
}

export const parseOrganizationMetadata = (
  raw: unknown,
): Record<string, unknown> => {
  if (!raw) return {}
  if (isRecord(raw)) return raw
  if (typeof raw !== 'string') return {}
  try {
    const parsed = JSON.parse(raw)
    return isRecord(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

const resolveProvisioningStatus = (
  metadata: Record<string, unknown>,
): ProvisioningStatus => {
  const nestedLifecycle = isRecord(metadata.lifecycle) ? metadata.lifecycle : {}
  const fromMetadata = metadata.provisioningStatus
  const fromNested = nestedLifecycle.provisioningStatus

  if (isProvisioningStatus(fromMetadata)) return fromMetadata
  if (isProvisioningStatus(fromNested)) return fromNested
  return 'pending'
}

const applyLifecycleFields = (
  metadata: Record<string, unknown>,
  input: {
    lifecycleStatus: DemoLifecycleStatus
    planType: 'demo' | 'paid'
    provisioningStatus: ProvisioningStatus
  },
): Record<string, unknown> => ({
  ...metadata,
  lifecycleStatus: input.lifecycleStatus,
  planType: input.planType,
  provisioningStatus: input.provisioningStatus,
  lifecycle: {
    ...(isRecord(metadata.lifecycle) ? metadata.lifecycle : {}),
    lifecycleStatus: input.lifecycleStatus,
    planType: input.planType,
    provisioningStatus: input.provisioningStatus,
  },
})

const readDemoPolicy = (metadata: Record<string, unknown>): DemoPolicy => {
  const policy = isRecord(metadata.demoPolicy) ? metadata.demoPolicy : {}
  return {
    requestedAt: toIso(policy.requestedAt),
    requestedByUserId: asTrimmedString(policy.requestedByUserId),
    requestedOwnerEmail: asTrimmedString(policy.requestedOwnerEmail),
    requestedOwnerName: asTrimmedString(policy.requestedOwnerName),
    approvalNotes: asTrimmedString(policy.approvalNotes),
    approvedAt: toIso(policy.approvedAt),
    approverUserId: asTrimmedString(policy.approverUserId),
    expiresAt: toIso(policy.expiresAt),
    usageLimits: normalizeUsageLimits(policy.usageLimits),
    extensionReason: asTrimmedString(policy.extensionReason),
    extendedAt: toIso(policy.extendedAt),
    suspendedAt: toIso(policy.suspendedAt),
    suspendedByUserId: asTrimmedString(policy.suspendedByUserId),
    suspendedReason: asTrimmedString(policy.suspendedReason),
    convertedAt: toIso(policy.convertedAt),
    convertedByUserId: asTrimmedString(policy.convertedByUserId),
    conversionReason: asTrimmedString(policy.conversionReason),
    ownerHandoffAt: toIso(policy.ownerHandoffAt),
    ownerHandoffByUserId: asTrimmedString(policy.ownerHandoffByUserId),
    ownerHandoffEmail: asTrimmedString(policy.ownerHandoffEmail),
    ownerHandoffUserId: asTrimmedString(policy.ownerHandoffUserId),
    ownerHandoffInvitationId: asTrimmedString(policy.ownerHandoffInvitationId),
  }
}

const writeDemoPolicy = (
  metadata: Record<string, unknown>,
  policy: DemoPolicy,
): Record<string, unknown> => ({
  ...metadata,
  demoPolicy: {
    ...policy,
  },
})

export const buildCreateDemoMetadata = (input: {
  now?: Date
  ownerEmail: string
  ownerName?: string
  actorUserId: string
  expiresAt?: string
  usageLimits?: DemoUsageLimits
  onboarding?: DemoOnboardingProfile
  approvalNotes?: string
}): Record<string, unknown> => {
  const now = input.now || new Date()
  const provisioningStatus: ProvisioningStatus = 'pending'
  const expiresAt =
    toIso(input.expiresAt) ||
    withDays(now, DEMO_DEFAULT_EXPIRY_DAYS).toISOString()

  const demoPolicy: DemoPolicy = {
    requestedAt: now.toISOString(),
    requestedByUserId: input.actorUserId,
    requestedOwnerEmail: input.ownerEmail,
    requestedOwnerName: input.ownerName || null,
    approvalNotes: input.approvalNotes || null,
    approvedAt: null,
    approverUserId: null,
    expiresAt,
    usageLimits: normalizeUsageLimits(input.usageLimits) || null,
    extensionReason: null,
    extendedAt: null,
    suspendedAt: null,
    suspendedByUserId: null,
    suspendedReason: null,
    convertedAt: null,
    convertedByUserId: null,
    conversionReason: null,
    ownerHandoffAt: null,
    ownerHandoffByUserId: null,
    ownerHandoffEmail: null,
    ownerHandoffUserId: null,
    ownerHandoffInvitationId: null,
  }

  const onboarding = normalizeOnboardingProfile(input.onboarding)

  const baseMetadata: Record<string, unknown> = applyLifecycleFields(
    {},
    {
      lifecycleStatus: 'payment_required',
      planType: 'demo',
      provisioningStatus,
    },
  )

  return writeDemoPolicy(
    {
      ...baseMetadata,
      ...(onboarding ? { onboarding } : {}),
    },
    demoPolicy,
  )
}

export const applyDemoApproval = (
  metadataInput: Record<string, unknown>,
  input: {
    now?: Date
    actorUserId: string
    expiresAt?: string
    usageLimits?: DemoUsageLimits
    approvalNotes?: string
  },
): Record<string, unknown> => {
  const now = input.now || new Date()
  const metadata = { ...metadataInput }
  const existingPolicy = readDemoPolicy(metadata)
  const expiresAt =
    toIso(input.expiresAt) ||
    existingPolicy.expiresAt ||
    withDays(now, DEMO_DEFAULT_EXPIRY_DAYS).toISOString()

  const updatedPolicy: DemoPolicy = {
    ...existingPolicy,
    approvedAt: now.toISOString(),
    approverUserId: input.actorUserId,
    approvalNotes: input.approvalNotes || existingPolicy.approvalNotes || null,
    expiresAt,
    usageLimits:
      normalizeUsageLimits(input.usageLimits) ||
      existingPolicy.usageLimits ||
      null,
    suspendedAt: null,
    suspendedByUserId: null,
    suspendedReason: null,
  }

  const provisioningStatus = resolveProvisioningStatus(metadata)
  const withLifecycle = applyLifecycleFields(metadata, {
    lifecycleStatus: 'demo_approved',
    planType: 'demo',
    provisioningStatus,
  })

  return writeDemoPolicy(withLifecycle, updatedPolicy)
}

export const applyDemoExtension = (
  metadataInput: Record<string, unknown>,
  input: {
    now?: Date
    actorUserId: string
    expiresAt: string
    extensionReason: string
  },
): Record<string, unknown> => {
  const now = input.now || new Date()
  const metadata = { ...metadataInput }
  const existingPolicy = readDemoPolicy(metadata)

  const updatedPolicy: DemoPolicy = {
    ...existingPolicy,
    approvedAt: existingPolicy.approvedAt || now.toISOString(),
    approverUserId: existingPolicy.approverUserId || input.actorUserId,
    expiresAt:
      toIso(input.expiresAt) || existingPolicy.expiresAt || now.toISOString(),
    extensionReason: input.extensionReason,
    extendedAt: now.toISOString(),
    suspendedAt: null,
    suspendedByUserId: null,
    suspendedReason: null,
  }

  const provisioningStatus = resolveProvisioningStatus(metadata)
  const withLifecycle = applyLifecycleFields(metadata, {
    lifecycleStatus: 'demo_approved',
    planType: 'demo',
    provisioningStatus,
  })

  return writeDemoPolicy(withLifecycle, updatedPolicy)
}

export const applyDemoSuspension = (
  metadataInput: Record<string, unknown>,
  input: {
    now?: Date
    actorUserId: string
    reason: string
  },
): Record<string, unknown> => {
  const now = input.now || new Date()
  const metadata = { ...metadataInput }
  const existingPolicy = readDemoPolicy(metadata)

  const updatedPolicy: DemoPolicy = {
    ...existingPolicy,
    suspendedAt: now.toISOString(),
    suspendedByUserId: input.actorUserId,
    suspendedReason: input.reason,
  }

  const provisioningStatus = resolveProvisioningStatus(metadata)
  const withLifecycle = applyLifecycleFields(metadata, {
    lifecycleStatus: 'suspended',
    planType: 'demo',
    provisioningStatus,
  })

  return writeDemoPolicy(withLifecycle, updatedPolicy)
}

export const applyDemoConversion = (
  metadataInput: Record<string, unknown>,
  input: {
    now?: Date
    actorUserId: string
    reason?: string
  },
): Record<string, unknown> => {
  const now = input.now || new Date()
  const metadata = { ...metadataInput }
  const existingPolicy = readDemoPolicy(metadata)

  const updatedPolicy: DemoPolicy = {
    ...existingPolicy,
    convertedAt: now.toISOString(),
    convertedByUserId: input.actorUserId,
    conversionReason: input.reason || null,
  }

  const provisioningStatus = resolveProvisioningStatus(metadata)
  const withLifecycle = applyLifecycleFields(metadata, {
    lifecycleStatus: 'payment_required',
    planType: 'paid',
    provisioningStatus,
  })

  const billing = isRecord(withLifecycle.billing) ? withLifecycle.billing : {}

  return writeDemoPolicy(
    {
      ...withLifecycle,
      entitlementState: 'payment_required',
      subscriptionStatus: 'incomplete',
      billingOffer:
        asTrimmedString(withLifecycle.billingOffer) || 'metered_monthly',
      billing: {
        ...billing,
        entitlementState: 'payment_required',
        subscriptionStatus: 'incomplete',
        updatedAt: now.toISOString(),
      },
    },
    updatedPolicy,
  )
}

export const applyDemoOwnerHandoff = (
  metadataInput: Record<string, unknown>,
  input: {
    now?: Date
    actorUserId: string
    ownerEmail: string
    ownerUserId?: string | null
    ownerName?: string | null
    invitationId?: string | null
  },
): Record<string, unknown> => {
  const now = input.now || new Date()
  const metadata = { ...metadataInput }
  const existingPolicy = readDemoPolicy(metadata)

  const updatedPolicy: DemoPolicy = {
    ...existingPolicy,
    ownerHandoffAt: now.toISOString(),
    ownerHandoffByUserId: input.actorUserId,
    ownerHandoffEmail: input.ownerEmail,
    ownerHandoffUserId: input.ownerUserId || null,
    ownerHandoffInvitationId: input.invitationId || null,
    requestedOwnerEmail: input.ownerEmail,
    requestedOwnerName:
      input.ownerName || existingPolicy.requestedOwnerName || null,
  }

  return writeDemoPolicy(metadata, updatedPolicy)
}

export const resolveDemoTenantStatus = (
  metadataInput: Record<string, unknown>,
  now: Date = new Date(),
): DemoTenantStatus => {
  const metadata = { ...metadataInput }
  const policy = readDemoPolicy(metadata)
  const planType = asTrimmedString(metadata.planType)

  if (policy.convertedAt || planType === 'paid') {
    return 'converted'
  }

  const suspendedAt = parseOptionalDate(policy.suspendedAt)
  if (suspendedAt && suspendedAt <= now) {
    return 'suspended'
  }

  const approvedAt = parseOptionalDate(policy.approvedAt)
  if (!approvedAt) {
    return 'pending_approval'
  }

  const expiresAt = parseOptionalDate(policy.expiresAt)
  if (expiresAt && expiresAt <= now) {
    return 'expired'
  }

  return 'approved'
}

export const buildDemoTenantSummary = (input: {
  organizationId: string
  name: string
  slug: string
  createdAt: Date | string
  metadata: unknown
  now?: Date
}): DemoTenantSummary => {
  const metadata = parseOrganizationMetadata(input.metadata)
  const status = resolveDemoTenantStatus(metadata, input.now)
  const demoPolicy = readDemoPolicy(metadata)

  const lifecycleStatusRaw = asTrimmedString(metadata.lifecycleStatus)
  const hasKnownLifecycleStatus =
    lifecycleStatusRaw &&
    [
      'onboarding_incomplete',
      'payment_required',
      'demo_approved',
      'provisioning_pending',
      'workspace_active',
      'suspended',
    ].includes(lifecycleStatusRaw)

  const lifecycleStatus: DemoLifecycleStatus =
    status === 'suspended' || status === 'expired'
      ? 'suspended'
      : status === 'converted'
        ? hasKnownLifecycleStatus
          ? (lifecycleStatusRaw as DemoLifecycleStatus)
          : 'payment_required'
        : hasKnownLifecycleStatus
          ? (lifecycleStatusRaw as DemoLifecycleStatus)
          : status === 'approved'
            ? 'demo_approved'
            : 'payment_required'

  const provisioningStatus = resolveProvisioningStatus(metadata)

  const createdAt =
    input.createdAt instanceof Date
      ? input.createdAt.toISOString()
      : new Date(input.createdAt).toISOString()

  return {
    organizationId: input.organizationId,
    name: input.name,
    slug: input.slug,
    createdAt,
    lifecycleStatus,
    provisioningStatus,
    status,
    ownerEmail:
      demoPolicy.ownerHandoffEmail || demoPolicy.requestedOwnerEmail || null,
    ownerName: demoPolicy.requestedOwnerName || null,
    approvedAt: demoPolicy.approvedAt || null,
    expiresAt: demoPolicy.expiresAt || null,
    suspendedAt: demoPolicy.suspendedAt || null,
    convertedAt: demoPolicy.convertedAt || null,
    extensionReason: demoPolicy.extensionReason || null,
    usageLimits: demoPolicy.usageLimits || null,
  }
}

export const isDemoTenantMetadata = (
  metadataInput: Record<string, unknown>,
) => {
  const metadata = { ...metadataInput }
  const planType = asTrimmedString(metadata.planType)
  if (planType === 'demo') return true
  const policy = readDemoPolicy(metadata)
  return !!(policy.requestedAt || policy.approvedAt || policy.convertedAt)
}
