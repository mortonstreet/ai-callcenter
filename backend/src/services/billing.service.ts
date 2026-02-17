import { createHmac, timingSafeEqual } from 'crypto'
import { db } from '@/lib/db'
import { config } from '@/config'
import logger from '@/lib/logger'
import { getRequestContext } from '@/lib/context'
import {
  ORG_LIFECYCLE_STATUSES,
  ORG_PLAN_TYPES,
  ORG_PROVISIONING_STATUSES,
  OrganizationLifecycleStatus,
  OrganizationPlanType,
  OrganizationProvisioningStatus,
  buildOrganizationLifecycleSnapshotFromMetadata,
  parseLifecycleMetadata,
} from '@/lib/lifecycle-gates.core'

export type BillingOffer = 'metered_monthly' | 'enterprise_quarterly'
export type BillingEntitlementState =
  | 'payment_required'
  | 'payment_verified'
  | 'restricted'
  | 'demo_bypass'

type StripeCheckoutSession = {
  id: string
  url: string | null
  customer: string | null
  subscription: string | null
  status?: string
  payment_status?: string
}

type StripePortalSession = {
  id: string
  url: string
}

type StripeWebhookEvent = {
  id: string
  type: string
  created: number
  data: {
    object: Record<string, unknown>
  }
}

type CheckoutLineItem = {
  priceId: string
  quantity?: number
}

type OrganizationRecord = {
  id: string
  name: string
  metadata: string | null
}

type SubscriptionRecord = {
  id: string
  plan: string
  referenceId: string
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  status: string | null
  periodStart: Date | null
  periodEnd: Date | null
  trialStart: Date | null
  trialEnd: Date | null
  cancelAtPeriodEnd: boolean | null
  seats: number | null
}

const STRIPE_API_BASE_URL = 'https://api.stripe.com/v1'
const STRIPE_SIGNATURE_TOLERANCE_SECONDS = 5 * 60
const SUBSCRIPTION_ID_PREFIX = 'org_subscription_'

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing'])
const RESTRICTED_SUBSCRIPTION_STATUSES = new Set([
  'canceled',
  'unpaid',
  'incomplete_expired',
])

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)

const asString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value : null

const asNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

const parseIsoDate = (value: unknown): Date | null => {
  if (typeof value !== 'string' || value.trim().length === 0) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const parseUnixDateSeconds = (value: unknown): Date | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  const parsed = new Date(value * 1000)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const toIso = (value: Date | null | undefined): string | null =>
  value ? value.toISOString() : null

const buildSubscriptionRecordId = (organizationId: string) =>
  `${SUBSCRIPTION_ID_PREFIX}${organizationId}`

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

const readLifecycleSnapshotParts = (
  metadata: Record<string, unknown>,
): {
  lifecycleStatus: OrganizationLifecycleStatus
  planType: OrganizationPlanType
  provisioningStatus: OrganizationProvisioningStatus
} => {
  const nestedLifecycle = isRecord(metadata.lifecycle) ? metadata.lifecycle : {}
  const lifecycleStatusRaw =
    metadata.lifecycleStatus ?? nestedLifecycle.lifecycleStatus
  const planTypeRaw = metadata.planType ?? nestedLifecycle.planType
  const provisioningStatusRaw =
    metadata.provisioningStatus ?? nestedLifecycle.provisioningStatus

  const provisioningStatus = isProvisioningStatus(provisioningStatusRaw)
    ? provisioningStatusRaw
    : 'completed'
  const lifecycleStatus = isLifecycleStatus(lifecycleStatusRaw)
    ? lifecycleStatusRaw
    : provisioningStatus === 'pending' || provisioningStatus === 'running'
      ? 'provisioning_pending'
      : 'workspace_active'
  const planType = isPlanType(planTypeRaw) ? planTypeRaw : 'paid'

  return {
    lifecycleStatus,
    planType,
    provisioningStatus,
  }
}

const readBillingMetadata = (
  metadata: Record<string, unknown>,
): Record<string, unknown> =>
  isRecord(metadata.billing) ? metadata.billing : {}

export const isDemoPolicyApproved = (
  metadata: Record<string, unknown>,
  now: Date = new Date(),
): boolean => {
  const demoPolicy = isRecord(metadata.demoPolicy) ? metadata.demoPolicy : {}
  const approvedAt = parseIsoDate(
    demoPolicy.approvedAt ?? demoPolicy.approved_at ?? null,
  )
  if (!approvedAt) return false

  const suspendedAt = parseIsoDate(
    demoPolicy.suspendedAt ?? demoPolicy.suspended_at ?? null,
  )
  if (suspendedAt && suspendedAt <= now) return false

  const expiresAt = parseIsoDate(
    demoPolicy.expiresAt ?? demoPolicy.expires_at ?? null,
  )
  if (expiresAt && expiresAt <= now) return false

  return true
}

export const mapSubscriptionStatusToEntitlementState = (
  status: string | null | undefined,
): BillingEntitlementState => {
  const normalized = (status || '').toLowerCase().trim()
  if (ACTIVE_SUBSCRIPTION_STATUSES.has(normalized)) {
    return 'payment_verified'
  }
  if (RESTRICTED_SUBSCRIPTION_STATUSES.has(normalized)) {
    return 'restricted'
  }
  return 'payment_required'
}

export const deriveLifecycleForEntitlementState = (input: {
  currentLifecycleStatus: OrganizationLifecycleStatus
  provisioningStatus: OrganizationProvisioningStatus
  entitlementState: BillingEntitlementState
}): OrganizationLifecycleStatus => {
  if (input.currentLifecycleStatus === 'onboarding_incomplete') {
    return 'onboarding_incomplete'
  }
  if (input.entitlementState === 'restricted') {
    return 'suspended'
  }
  if (input.entitlementState === 'payment_required') {
    return 'payment_required'
  }
  if (
    input.provisioningStatus === 'pending' ||
    input.provisioningStatus === 'running'
  ) {
    return 'provisioning_pending'
  }
  return 'workspace_active'
}

export const verifyStripeWebhookSignature = (input: {
  rawBody: string
  signatureHeader: string
  webhookSecret: string
  toleranceSeconds?: number
  nowUnixSeconds?: number
}) => {
  const signatureParts = input.signatureHeader
    .split(',')
    .map((part) => part.trim())
  const timestampPart = signatureParts.find((part) => part.startsWith('t='))
  const signatureCandidates = signatureParts
    .filter((part) => part.startsWith('v1='))
    .map((part) => part.slice(3))
    .filter((part) => part.length > 0)

  if (!timestampPart || signatureCandidates.length === 0) {
    return { valid: false as const, reason: 'missing_signature_parts' }
  }

  const timestampString = timestampPart.slice(2)
  const timestamp = Number(timestampString)
  if (!Number.isFinite(timestamp)) {
    return { valid: false as const, reason: 'invalid_timestamp' }
  }

  const nowUnixSeconds = input.nowUnixSeconds ?? Math.floor(Date.now() / 1000)
  const toleranceSeconds =
    input.toleranceSeconds ?? STRIPE_SIGNATURE_TOLERANCE_SECONDS
  if (Math.abs(nowUnixSeconds - timestamp) > toleranceSeconds) {
    return { valid: false as const, reason: 'timestamp_out_of_tolerance' }
  }

  const expectedPayload = `${timestampString}.${input.rawBody}`
  const expectedSignature = createHmac('sha256', input.webhookSecret)
    .update(expectedPayload, 'utf8')
    .digest('hex')
  const expectedBuffer = Buffer.from(expectedSignature, 'hex')

  const matched = signatureCandidates.some((candidate) => {
    const candidateBuffer = Buffer.from(candidate, 'hex')
    if (candidateBuffer.length !== expectedBuffer.length) {
      return false
    }
    return timingSafeEqual(candidateBuffer, expectedBuffer)
  })

  if (!matched) {
    return { valid: false as const, reason: 'signature_mismatch' }
  }

  return { valid: true as const, timestamp }
}

export const buildCheckoutLineItems = (input: {
  offer: BillingOffer
  seats?: number
}): CheckoutLineItem[] => {
  if (input.offer === 'enterprise_quarterly') {
    const basePriceId = config.stripe.offers.enterpriseQuarterly.basePriceId
    const overagePriceId =
      config.stripe.offers.enterpriseQuarterly.overagePriceId
    if (!basePriceId || !overagePriceId) {
      throw new Error(
        'Stripe enterprise quarterly prices are not configured in environment variables.',
      )
    }

    return [
      {
        priceId: basePriceId,
        quantity: input.seats && input.seats > 0 ? input.seats : 1,
      },
      {
        priceId: overagePriceId,
      },
    ]
  }

  const basePriceId = config.stripe.offers.meteredMonthly.basePriceId
  const usagePriceId = config.stripe.offers.meteredMonthly.usagePriceId
  if (!basePriceId || !usagePriceId) {
    throw new Error(
      'Stripe metered monthly prices are not configured in environment variables.',
    )
  }

  return [
    {
      priceId: basePriceId,
      quantity: 1,
    },
    {
      priceId: usagePriceId,
    },
  ]
}

const stripeApiRequest = async <T>(input: {
  path: string
  formData: URLSearchParams
  idempotencyKey?: string
}): Promise<T> => {
  if (!config.stripe.secretKey) {
    throw new Error('Stripe secret key is not configured.')
  }

  const response = await fetch(`${STRIPE_API_BASE_URL}${input.path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.stripe.secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(input.idempotencyKey
        ? { 'Idempotency-Key': input.idempotencyKey }
        : {}),
    },
    body: input.formData.toString(),
  })

  const payload = (await response.json()) as Record<string, unknown>
  if (!response.ok) {
    const errorPayload = isRecord(payload.error) ? payload.error : {}
    const message =
      asString(errorPayload.message) ||
      asString(payload.message) ||
      `Stripe API request failed with status ${response.status}`
    throw new Error(message)
  }

  return payload as T
}

const getOrganizationRecord = async (
  organizationId: string,
): Promise<OrganizationRecord> => {
  const organization = await db
    .selectFrom('organization')
    .where('id', '=', organizationId)
    .select(['id', 'name', 'metadata'])
    .executeTakeFirst()

  if (!organization) {
    throw new Error(`Organization ${organizationId} was not found`)
  }

  return organization
}

const findSubscriptionRecordsByOrganizationId = async (
  organizationId: string,
): Promise<SubscriptionRecord[]> =>
  await db
    .selectFrom('subscription')
    .where('referenceId', '=', organizationId)
    .selectAll()
    .execute()

const findSubscriptionRecordForOrganization = async (
  organizationId: string,
): Promise<SubscriptionRecord | null> => {
  const rows = await findSubscriptionRecordsByOrganizationId(organizationId)
  if (rows.length === 0) return null
  const expectedId = buildSubscriptionRecordId(organizationId)
  const exact = rows.find((row) => row.id === expectedId)
  return exact || rows[0]
}

const findOrganizationIdByStripeSubscriptionId = async (
  stripeSubscriptionId: string,
): Promise<string | null> => {
  const subscription = await db
    .selectFrom('subscription')
    .where('stripeSubscriptionId', '=', stripeSubscriptionId)
    .select(['referenceId'])
    .executeTakeFirst()

  return subscription?.referenceId || null
}

const findOrganizationIdByStripeCustomerId = async (
  stripeCustomerId: string,
): Promise<string | null> => {
  const subscription = await db
    .selectFrom('subscription')
    .where('stripeCustomerId', '=', stripeCustomerId)
    .select(['referenceId'])
    .executeTakeFirst()

  return subscription?.referenceId || null
}

const persistSubscriptionRecord = async (input: {
  organizationId: string
  offer: BillingOffer
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  status: string | null
  periodStart?: Date | null
  periodEnd?: Date | null
  seats?: number | null
  cancelAtPeriodEnd?: boolean | null
}) => {
  const existing = await findSubscriptionRecordForOrganization(
    input.organizationId,
  )
  const nowStatus = input.status || 'incomplete'
  const recordId =
    existing?.id || buildSubscriptionRecordId(input.organizationId)

  const updateValues = {
    plan: input.offer,
    referenceId: input.organizationId,
    stripeCustomerId: input.stripeCustomerId,
    stripeSubscriptionId: input.stripeSubscriptionId,
    status: nowStatus,
    periodStart: input.periodStart || null,
    periodEnd: input.periodEnd || null,
    cancelAtPeriodEnd: input.cancelAtPeriodEnd ?? false,
    seats: input.seats ?? null,
  }

  if (!existing) {
    await db
      .insertInto('subscription')
      .values({
        id: recordId,
        ...updateValues,
        trialStart: null,
        trialEnd: null,
      })
      .executeTakeFirst()
    return
  }

  await db
    .updateTable('subscription')
    .set(updateValues)
    .where('id', '=', existing.id)
    .executeTakeFirst()
}

const determineLifecycleForPaidUpdate = (input: {
  currentLifecycleStatus: OrganizationLifecycleStatus
  currentProvisioningStatus: OrganizationProvisioningStatus
  entitlementState: BillingEntitlementState
}) =>
  deriveLifecycleForEntitlementState({
    currentLifecycleStatus: input.currentLifecycleStatus,
    provisioningStatus: input.currentProvisioningStatus,
    entitlementState: input.entitlementState,
  })

const persistPaidEntitlementMetadata = async (input: {
  organizationId: string
  metadata: Record<string, unknown>
  offer: BillingOffer
  entitlementState: BillingEntitlementState
  subscriptionStatus: string | null
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  periodStart?: Date | null
  periodEnd?: Date | null
  cancelAtPeriodEnd?: boolean | null
  seats?: number | null
  source: 'checkout' | 'webhook'
  webhookEventId?: string
  webhookEventType?: string
}) => {
  const current = readLifecycleSnapshotParts(input.metadata)
  const existingBilling = readBillingMetadata(input.metadata)
  const nextLifecycleStatus = determineLifecycleForPaidUpdate({
    currentLifecycleStatus: current.lifecycleStatus,
    currentProvisioningStatus: current.provisioningStatus,
    entitlementState: input.entitlementState,
  })

  const correlationId = getRequestContext()?.correlationId || null
  const updatedBilling = {
    ...existingBilling,
    offer: input.offer,
    entitlementState: input.entitlementState,
    subscriptionStatus: input.subscriptionStatus,
    stripeCustomerId: input.stripeCustomerId,
    stripeSubscriptionId: input.stripeSubscriptionId,
    periodStart: toIso(input.periodStart),
    periodEnd: toIso(input.periodEnd),
    cancelAtPeriodEnd: input.cancelAtPeriodEnd ?? false,
    seats: input.seats ?? null,
    source: input.source,
    correlationId,
    ...(input.webhookEventId
      ? {
          lastWebhookEventId: input.webhookEventId,
          lastWebhookEventType: input.webhookEventType || null,
        }
      : {}),
    updatedAt: new Date().toISOString(),
  }

  const updatedMetadata = {
    ...input.metadata,
    lifecycleStatus: nextLifecycleStatus,
    planType: 'paid',
    provisioningStatus: current.provisioningStatus,
    lifecycle: {
      ...(isRecord(input.metadata.lifecycle) ? input.metadata.lifecycle : {}),
      lifecycleStatus: nextLifecycleStatus,
      planType: 'paid',
      provisioningStatus: current.provisioningStatus,
    },
    entitlementState: input.entitlementState,
    subscriptionStatus: input.subscriptionStatus,
    billingOffer: input.offer,
    billing: updatedBilling,
  }

  await db
    .updateTable('organization')
    .set({ metadata: JSON.stringify(updatedMetadata) })
    .where('id', '=', input.organizationId)
    .executeTakeFirst()

  logger.info(
    {
      organizationId: input.organizationId,
      lifecycleStatus: nextLifecycleStatus,
      entitlementState: input.entitlementState,
      subscriptionStatus: input.subscriptionStatus,
      offer: input.offer,
      source: input.source,
      webhookEventId: input.webhookEventId || null,
      correlationId,
    },
    'Billing entitlement transition persisted',
  )
}

const buildStripeSuccessUrl = () =>
  `${config.frontendUrl}/dashboard/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`

const buildStripeCancelUrl = () =>
  `${config.frontendUrl}/dashboard/billing?checkout=cancelled`

const buildStripePortalReturnUrl = () =>
  `${config.frontendUrl}/dashboard/billing`

const createStripeCustomer = async (input: {
  organizationId: string
  organizationName: string
}) => {
  const formData = new URLSearchParams()
  formData.set('name', input.organizationName)
  formData.set('metadata[organizationId]', input.organizationId)

  const customer = await stripeApiRequest<{ id: string }>({
    path: '/customers',
    formData,
  })
  return customer.id
}

const extractOffer = (
  value: string | null | undefined,
): BillingOffer | null => {
  if (value === 'metered_monthly' || value === 'enterprise_quarterly') {
    return value
  }
  return null
}

const resolveOfferForOrganization = (
  valueFromMetadata: string | null | undefined,
): BillingOffer => extractOffer(valueFromMetadata) || 'metered_monthly'

export const getBillingSummary = async (input: { organizationId: string }) => {
  const organization = await getOrganizationRecord(input.organizationId)
  const metadata = parseLifecycleMetadata(organization.metadata)
  const billing = readBillingMetadata(metadata)
  const subscription = await findSubscriptionRecordForOrganization(
    organization.id,
  )
  const snapshot = buildOrganizationLifecycleSnapshotFromMetadata({
    organizationId: organization.id,
    metadata: organization.metadata,
  })

  const offer = resolveOfferForOrganization(
    asString(
      (billing.offer as string | undefined) ||
        (metadata.billingOffer as string | undefined) ||
        subscription?.plan ||
        null,
    ),
  )
  const planType = snapshot.planType
  const demoBypassApproved = isDemoPolicyApproved(metadata)
  const entitlementState = asString(
    (billing.entitlementState as string | undefined) ||
      (metadata.entitlementState as string | undefined) ||
      null,
  )
  const subscriptionStatus =
    asString(
      (billing.subscriptionStatus as string | undefined) ||
        (metadata.subscriptionStatus as string | undefined) ||
        null,
    ) ||
    subscription?.status ||
    null
  const periodStart =
    parseIsoDate(billing.periodStart) ||
    parseIsoDate(metadata.periodStart) ||
    subscription?.periodStart ||
    null
  const periodEnd =
    parseIsoDate(billing.periodEnd) ||
    parseIsoDate(metadata.periodEnd) ||
    subscription?.periodEnd ||
    null
  const cancelAtPeriodEnd =
    typeof billing.cancelAtPeriodEnd === 'boolean'
      ? billing.cancelAtPeriodEnd
      : subscription?.cancelAtPeriodEnd || false

  return {
    organizationId: organization.id,
    organizationName: organization.name,
    lifecycleStatus: snapshot.lifecycleStatus,
    planType,
    provisioningStatus: snapshot.provisioningStatus,
    checkoutRequired: snapshot.lifecycleStatus === 'payment_required',
    demoBypassApproved,
    offer,
    entitlementState,
    subscriptionStatus,
    periodStart: toIso(periodStart),
    periodEnd: toIso(periodEnd),
    cancelAtPeriodEnd,
    stripeCustomerId: subscription?.stripeCustomerId || null,
    stripeSubscriptionId: subscription?.stripeSubscriptionId || null,
    publishableKeyConfigured: config.stripe.publishableKey.length > 0,
  }
}

export const createCheckoutSessionForOrganization = async (input: {
  organizationId: string
  userId: string
  offer: BillingOffer
  seats?: number
}) => {
  const organization = await getOrganizationRecord(input.organizationId)
  const metadata = parseLifecycleMetadata(organization.metadata)
  const snapshot = readLifecycleSnapshotParts(metadata)

  if (snapshot.planType === 'demo' && isDemoPolicyApproved(metadata)) {
    return {
      mode: 'demo_bypass' as const,
      offer: input.offer,
      url: `${config.frontendUrl}/dashboard/provisioning`,
      reason: 'Demo policy approved; checkout bypassed.',
    }
  }

  const subscription = await findSubscriptionRecordForOrganization(
    organization.id,
  )
  let stripeCustomerId =
    subscription?.stripeCustomerId ||
    asString(readBillingMetadata(metadata).stripeCustomerId) ||
    null

  if (!stripeCustomerId) {
    stripeCustomerId = await createStripeCustomer({
      organizationId: organization.id,
      organizationName: organization.name,
    })
  }

  const lineItems = buildCheckoutLineItems({
    offer: input.offer,
    seats: input.seats,
  })

  const formData = new URLSearchParams()
  formData.set('mode', 'subscription')
  formData.set('customer', stripeCustomerId)
  formData.set('success_url', buildStripeSuccessUrl())
  formData.set('cancel_url', buildStripeCancelUrl())
  formData.set('allow_promotion_codes', 'true')
  formData.set('metadata[organizationId]', organization.id)
  formData.set('metadata[billingOffer]', input.offer)
  formData.set('metadata[initiatedByUserId]', input.userId)
  formData.set('subscription_data[metadata][organizationId]', organization.id)
  formData.set('subscription_data[metadata][billingOffer]', input.offer)
  formData.set('subscription_data[metadata][initiatedByUserId]', input.userId)

  lineItems.forEach((lineItem, index) => {
    formData.set(`line_items[${index}][price]`, lineItem.priceId)
    if (typeof lineItem.quantity === 'number') {
      formData.set(`line_items[${index}][quantity]`, String(lineItem.quantity))
    }
  })

  const idempotencyKey = `checkout_${organization.id}_${Date.now()}`
  const checkoutSession = await stripeApiRequest<StripeCheckoutSession>({
    path: '/checkout/sessions',
    formData,
    idempotencyKey,
  })

  const subscriptionStatus =
    checkoutSession.payment_status === 'paid' ? 'active' : 'incomplete'
  const entitlementState =
    mapSubscriptionStatusToEntitlementState(subscriptionStatus)

  await persistSubscriptionRecord({
    organizationId: organization.id,
    offer: input.offer,
    stripeCustomerId,
    stripeSubscriptionId: checkoutSession.subscription,
    status: subscriptionStatus,
    seats: input.seats ?? null,
    cancelAtPeriodEnd: false,
  })

  await persistPaidEntitlementMetadata({
    organizationId: organization.id,
    metadata,
    offer: input.offer,
    entitlementState,
    subscriptionStatus,
    stripeCustomerId,
    stripeSubscriptionId: checkoutSession.subscription,
    source: 'checkout',
    seats: input.seats ?? null,
  })

  return {
    mode: 'checkout' as const,
    offer: input.offer,
    checkoutSessionId: checkoutSession.id,
    url: checkoutSession.url,
  }
}

export const createBillingPortalSessionForOrganization = async (input: {
  organizationId: string
}) => {
  const organization = await getOrganizationRecord(input.organizationId)
  const metadata = parseLifecycleMetadata(organization.metadata)
  const subscription = await findSubscriptionRecordForOrganization(
    organization.id,
  )
  const billing = readBillingMetadata(metadata)
  const stripeCustomerId =
    subscription?.stripeCustomerId || asString(billing.stripeCustomerId) || null

  if (!stripeCustomerId) {
    throw new Error(
      'No Stripe customer exists for this organization. Start checkout first.',
    )
  }

  const formData = new URLSearchParams()
  formData.set('customer', stripeCustomerId)
  formData.set('return_url', buildStripePortalReturnUrl())

  const portalSession = await stripeApiRequest<StripePortalSession>({
    path: '/billing_portal/sessions',
    formData,
  })

  return {
    portalSessionId: portalSession.id,
    url: portalSession.url,
  }
}

const resolveOrganizationIdForWebhookObject = async (
  object: Record<string, unknown>,
): Promise<string | null> => {
  const metadata = isRecord(object.metadata) ? object.metadata : {}
  const metadataOrgId = asString(metadata.organizationId)
  if (metadataOrgId) return metadataOrgId

  const subscriptionId = asString(object.id) || asString(object.subscription)
  if (subscriptionId) {
    const bySubscription =
      await findOrganizationIdByStripeSubscriptionId(subscriptionId)
    if (bySubscription) return bySubscription
  }

  const customerId = asString(object.customer)
  if (customerId) {
    const byCustomer = await findOrganizationIdByStripeCustomerId(customerId)
    if (byCustomer) return byCustomer
  }

  return null
}

const updateEntitlementFromWebhook = async (input: {
  event: StripeWebhookEvent
  organizationId: string
  offer: BillingOffer
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  subscriptionStatus: string | null
  periodStart?: Date | null
  periodEnd?: Date | null
  cancelAtPeriodEnd?: boolean | null
  seats?: number | null
}) => {
  const organization = await getOrganizationRecord(input.organizationId)
  const metadata = parseLifecycleMetadata(organization.metadata)
  const entitlementState = mapSubscriptionStatusToEntitlementState(
    input.subscriptionStatus,
  )

  await persistSubscriptionRecord({
    organizationId: input.organizationId,
    offer: input.offer,
    stripeCustomerId: input.stripeCustomerId,
    stripeSubscriptionId: input.stripeSubscriptionId,
    status: input.subscriptionStatus,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    cancelAtPeriodEnd: input.cancelAtPeriodEnd,
    seats: input.seats ?? null,
  })

  await persistPaidEntitlementMetadata({
    organizationId: input.organizationId,
    metadata,
    offer: input.offer,
    entitlementState,
    subscriptionStatus: input.subscriptionStatus,
    stripeCustomerId: input.stripeCustomerId,
    stripeSubscriptionId: input.stripeSubscriptionId,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    cancelAtPeriodEnd: input.cancelAtPeriodEnd,
    seats: input.seats ?? null,
    source: 'webhook',
    webhookEventId: input.event.id,
    webhookEventType: input.event.type,
  })

  return {
    organizationId: input.organizationId,
    entitlementState,
    lifecycleStatus: deriveLifecycleForEntitlementState({
      currentLifecycleStatus:
        readLifecycleSnapshotParts(metadata).lifecycleStatus,
      provisioningStatus:
        readLifecycleSnapshotParts(metadata).provisioningStatus,
      entitlementState,
    }),
  }
}

const handleCheckoutSessionCompleted = async (event: StripeWebhookEvent) => {
  const payload = event.data.object
  const organizationId = await resolveOrganizationIdForWebhookObject(payload)
  if (!organizationId) {
    logger.warn(
      { eventId: event.id, eventType: event.type },
      'Stripe checkout completion missing organization context; skipping',
    )
    return { handled: false as const, reason: 'organization_not_found' }
  }

  const metadata = isRecord(payload.metadata) ? payload.metadata : {}
  const offer = resolveOfferForOrganization(asString(metadata.billingOffer))
  const stripeCustomerId = asString(payload.customer)
  const stripeSubscriptionId = asString(payload.subscription)
  const subscriptionStatus =
    asString(payload.payment_status) === 'paid' ? 'active' : 'incomplete'

  const result = await updateEntitlementFromWebhook({
    event,
    organizationId,
    offer,
    stripeCustomerId,
    stripeSubscriptionId,
    subscriptionStatus,
    cancelAtPeriodEnd: false,
  })

  return {
    handled: true as const,
    organizationId: result.organizationId,
    entitlementState: result.entitlementState,
  }
}

const handleCustomerSubscriptionEvent = async (event: StripeWebhookEvent) => {
  const payload = event.data.object
  const organizationId = await resolveOrganizationIdForWebhookObject(payload)
  if (!organizationId) {
    logger.warn(
      { eventId: event.id, eventType: event.type },
      'Stripe subscription event missing organization context; skipping',
    )
    return { handled: false as const, reason: 'organization_not_found' }
  }

  const metadata = isRecord(payload.metadata) ? payload.metadata : {}
  const offer = resolveOfferForOrganization(asString(metadata.billingOffer))
  const stripeCustomerId = asString(payload.customer)
  const stripeSubscriptionId = asString(payload.id)
  const subscriptionStatus = asString(payload.status) || 'incomplete'
  const periodStart = parseUnixDateSeconds(payload.current_period_start)
  const periodEnd = parseUnixDateSeconds(payload.current_period_end)
  const cancelAtPeriodEnd =
    typeof payload.cancel_at_period_end === 'boolean'
      ? payload.cancel_at_period_end
      : false

  let seats: number | null = null
  const items = isRecord(payload.items) ? payload.items : null
  if (items) {
    const data = Array.isArray(items.data) ? items.data : []
    const first = data[0]
    if (isRecord(first)) {
      seats = asNumber(first.quantity)
    }
  }

  const result = await updateEntitlementFromWebhook({
    event,
    organizationId,
    offer,
    stripeCustomerId,
    stripeSubscriptionId,
    subscriptionStatus,
    periodStart,
    periodEnd,
    cancelAtPeriodEnd,
    seats,
  })

  return {
    handled: true as const,
    organizationId: result.organizationId,
    entitlementState: result.entitlementState,
  }
}

const handleInvoicePaymentEvent = async (event: StripeWebhookEvent) => {
  const payload = event.data.object
  const organizationId = await resolveOrganizationIdForWebhookObject(payload)
  if (!organizationId) {
    logger.warn(
      { eventId: event.id, eventType: event.type },
      'Stripe invoice event missing organization context; skipping',
    )
    return { handled: false as const, reason: 'organization_not_found' }
  }

  const subscriptionRecord =
    await findSubscriptionRecordForOrganization(organizationId)
  const offer = resolveOfferForOrganization(subscriptionRecord?.plan)
  const stripeCustomerId =
    asString(payload.customer) || subscriptionRecord?.stripeCustomerId || null
  const stripeSubscriptionId =
    asString(payload.subscription) ||
    subscriptionRecord?.stripeSubscriptionId ||
    null

  const subscriptionStatus =
    event.type === 'invoice.payment_failed' ? 'past_due' : 'active'
  const result = await updateEntitlementFromWebhook({
    event,
    organizationId,
    offer,
    stripeCustomerId,
    stripeSubscriptionId,
    subscriptionStatus,
    periodStart: subscriptionRecord?.periodStart || null,
    periodEnd: subscriptionRecord?.periodEnd || null,
    cancelAtPeriodEnd: subscriptionRecord?.cancelAtPeriodEnd || false,
    seats: subscriptionRecord?.seats || null,
  })

  return {
    handled: true as const,
    organizationId: result.organizationId,
    entitlementState: result.entitlementState,
  }
}

const parseWebhookEvent = (rawBody: string): StripeWebhookEvent => {
  const parsed = JSON.parse(rawBody) as StripeWebhookEvent
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    typeof parsed.id !== 'string' ||
    typeof parsed.type !== 'string' ||
    !parsed.data ||
    !isRecord(parsed.data) ||
    !isRecord(parsed.data.object)
  ) {
    throw new Error('Invalid Stripe webhook payload')
  }
  return parsed
}

export const processStripeWebhookEvent = async (event: StripeWebhookEvent) => {
  if (event.type === 'checkout.session.completed') {
    return await handleCheckoutSessionCompleted(event)
  }

  if (
    event.type === 'customer.subscription.created' ||
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted'
  ) {
    return await handleCustomerSubscriptionEvent(event)
  }

  if (
    event.type === 'invoice.payment_failed' ||
    event.type === 'invoice.paid' ||
    event.type === 'invoice.payment_succeeded'
  ) {
    return await handleInvoicePaymentEvent(event)
  }

  return {
    handled: false as const,
    reason: 'event_type_not_tracked',
  }
}

export const handleStripeWebhook = async (input: {
  rawBody: string
  signatureHeader: string
}) => {
  if (!config.stripe.webhookSecret) {
    throw new Error('Stripe webhook secret is not configured.')
  }

  const verification = verifyStripeWebhookSignature({
    rawBody: input.rawBody,
    signatureHeader: input.signatureHeader,
    webhookSecret: config.stripe.webhookSecret,
  })
  if (!verification.valid) {
    throw new Error(`Invalid Stripe webhook signature: ${verification.reason}`)
  }

  const event = parseWebhookEvent(input.rawBody)
  const result = await processStripeWebhookEvent(event)

  logger.info(
    {
      eventId: event.id,
      eventType: event.type,
      handled: result.handled,
      reason: (result as any).reason || null,
      organizationId: (result as any).organizationId || null,
      entitlementState: (result as any).entitlementState || null,
    },
    'Stripe webhook processed',
  )

  return {
    eventId: event.id,
    eventType: event.type,
    handled: result.handled,
    reason: (result as any).reason || null,
    organizationId: (result as any).organizationId || null,
    entitlementState: (result as any).entitlementState || null,
  }
}
