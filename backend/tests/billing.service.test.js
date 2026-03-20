'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
const strict_1 = require('node:assert/strict')
const node_test_1 = require('node:test')
const crypto_1 = require('crypto')
const billing_core_1 = require('../src/services/billing.core')
;(0, node_test_1.default)('validates stripe webhook signatures', () => {
  const webhookSecret = 'whsec_test_secret'
  const timestamp = Math.floor(Date.now() / 1000)
  const payload = JSON.stringify({ id: 'evt_1', type: 'invoice.paid' })
  const signedPayload = `${timestamp}.${payload}`
  const signature = (0, crypto_1.createHmac)('sha256', webhookSecret)
    .update(signedPayload, 'utf8')
    .digest('hex')
  const validResult = (0, billing_core_1.verifyStripeWebhookSignature)({
    rawBody: payload,
    signatureHeader: `t=${timestamp},v1=${signature}`,
    webhookSecret,
    nowUnixSeconds: timestamp,
  })
  strict_1.default.equal(validResult.valid, true)
  const invalidResult = (0, billing_core_1.verifyStripeWebhookSignature)({
    rawBody: payload,
    signatureHeader: `t=${timestamp},v1=invalidsignature`,
    webhookSecret,
    nowUnixSeconds: timestamp,
  })
  strict_1.default.equal(invalidResult.valid, false)
})
;(0, node_test_1.default)(
  'maps subscription statuses to entitlement states',
  () => {
    strict_1.default.equal(
      (0, billing_core_1.mapSubscriptionStatusToEntitlementState)('active'),
      'payment_verified',
    )
    strict_1.default.equal(
      (0, billing_core_1.mapSubscriptionStatusToEntitlementState)('trialing'),
      'payment_verified',
    )
    strict_1.default.equal(
      (0, billing_core_1.mapSubscriptionStatusToEntitlementState)('past_due'),
      'payment_required',
    )
    strict_1.default.equal(
      (0, billing_core_1.mapSubscriptionStatusToEntitlementState)('canceled'),
      'restricted',
    )
  },
)
;(0, node_test_1.default)(
  'builds monthly metered and enterprise quarterly checkout line items',
  () => {
    const monthlyItems = (0, billing_core_1.buildCheckoutLineItems)({
      offer: 'metered_monthly',
    })
    strict_1.default.equal(monthlyItems.length, 2)
    strict_1.default.equal(typeof monthlyItems[0].priceId, 'string')
    strict_1.default.equal(monthlyItems[0].quantity, 1)
    strict_1.default.equal(typeof monthlyItems[1].priceId, 'string')
    strict_1.default.equal(monthlyItems[1].quantity, undefined)
    const enterpriseItems = (0, billing_core_1.buildCheckoutLineItems)({
      offer: 'enterprise_quarterly',
      seats: 15,
    })
    strict_1.default.equal(enterpriseItems.length, 2)
    strict_1.default.equal(enterpriseItems[0].quantity, 15)
    strict_1.default.equal(enterpriseItems[1].quantity, undefined)
  },
)
