import assert from 'node:assert/strict'
import test from 'node:test'
import { createHmac } from 'crypto'
import {
  buildCheckoutLineItems,
  mapSubscriptionStatusToEntitlementState,
  verifyStripeWebhookSignature,
} from '../src/services/billing.core'

test('validates stripe webhook signatures', () => {
  const webhookSecret = 'whsec_test_secret'
  const timestamp = Math.floor(Date.now() / 1000)
  const payload = JSON.stringify({ id: 'evt_1', type: 'invoice.paid' })
  const signedPayload = `${timestamp}.${payload}`
  const signature = createHmac('sha256', webhookSecret)
    .update(signedPayload, 'utf8')
    .digest('hex')

  const validResult = verifyStripeWebhookSignature({
    rawBody: payload,
    signatureHeader: `t=${timestamp},v1=${signature}`,
    webhookSecret,
    nowUnixSeconds: timestamp,
  })
  assert.equal(validResult.valid, true)

  const invalidResult = verifyStripeWebhookSignature({
    rawBody: payload,
    signatureHeader: `t=${timestamp},v1=invalidsignature`,
    webhookSecret,
    nowUnixSeconds: timestamp,
  })
  assert.equal(invalidResult.valid, false)
})

test('maps subscription statuses to entitlement states', () => {
  assert.equal(
    mapSubscriptionStatusToEntitlementState('active'),
    'payment_verified',
  )
  assert.equal(
    mapSubscriptionStatusToEntitlementState('trialing'),
    'payment_verified',
  )
  assert.equal(
    mapSubscriptionStatusToEntitlementState('past_due'),
    'payment_required',
  )
  assert.equal(
    mapSubscriptionStatusToEntitlementState('canceled'),
    'restricted',
  )
})

test('builds monthly metered and enterprise quarterly checkout line items', () => {
  const monthlyItems = buildCheckoutLineItems({
    offer: 'metered_monthly',
  })
  assert.equal(monthlyItems.length, 2)
  assert.equal(typeof monthlyItems[0].priceId, 'string')
  assert.equal(monthlyItems[0].quantity, 1)
  assert.equal(typeof monthlyItems[1].priceId, 'string')
  assert.equal(monthlyItems[1].quantity, undefined)

  const enterpriseItems = buildCheckoutLineItems({
    offer: 'enterprise_quarterly',
    seats: 15,
  })
  assert.equal(enterpriseItems.length, 2)
  assert.equal(enterpriseItems[0].quantity, 15)
  assert.equal(enterpriseItems[1].quantity, undefined)
})
