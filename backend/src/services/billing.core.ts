import { createHmac, timingSafeEqual } from 'crypto'
import { config } from '@/config'
import {
  OrganizationLifecycleStatus,
  OrganizationProvisioningStatus,
} from '@/lib/lifecycle-gates.core'

export type BillingOffer = 'metered_monthly' | 'enterprise_quarterly'
export type BillingEntitlementState =
  | 'payment_required'
  | 'payment_verified'
  | 'restricted'
  | 'demo_bypass'

type CheckoutLineItem = {
  priceId: string
  quantity?: number
}

const STRIPE_SIGNATURE_TOLERANCE_SECONDS = 5 * 60
const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing'])
const RESTRICTED_SUBSCRIPTION_STATUSES = new Set([
  'canceled',
  'unpaid',
  'incomplete_expired',
])

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
