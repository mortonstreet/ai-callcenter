import { Request, Response } from 'express'
import { AuthRequestHandler } from '@/types/handlers'
import {
  CreateCheckoutSessionRequest,
  CreatePortalSessionRequest,
  GetBillingSummaryRequest,
} from '@shared/types/src/requests/billing'
import {
  createBillingPortalSessionForOrganization,
  createCheckoutSessionForOrganization,
  getBillingSummary,
  handleStripeWebhook,
} from '@/services/billing.service'
import { sendApiError } from '../utils/error-contract'

type RequestWithRawBody = Request & {
  rawBodyText?: string
}

const sendBillingError = (req: Request, res: Response, error: unknown) => {
  const message = error instanceof Error ? error.message : 'Billing error'
  const normalized = message.toLowerCase()

  if (normalized.includes('not found')) {
    return sendApiError(req, res, 404, {
      code: 'BILLING_ORGANIZATION_NOT_FOUND',
      message,
      userMessage: 'Organization was not found.',
    })
  }

  if (
    normalized.includes('stripe') ||
    normalized.includes('billing') ||
    normalized.includes('subscription') ||
    normalized.includes('customer')
  ) {
    return sendApiError(req, res, 400, {
      code: 'BILLING_REQUEST_FAILED',
      message,
      userMessage:
        'Unable to complete billing request right now. Please retry shortly.',
    })
  }

  return sendApiError(req, res, 500, {
    code: 'BILLING_INTERNAL_ERROR',
    message,
    userMessage: 'Billing service failed unexpectedly.',
  })
}

const requireOrganizationId = (req: Request): string | null => {
  const organizationId = req.validated?.organizationId
  return typeof organizationId === 'string' && organizationId.length > 0
    ? organizationId
    : null
}

export const getBillingSummaryHandler: AuthRequestHandler<
  GetBillingSummaryRequest
> = async (req, res) => {
  const organizationId = requireOrganizationId(req)
  if (!organizationId) {
    return sendApiError(req, res, 400, {
      code: 'BILLING_ORGANIZATION_REQUIRED',
      message: 'Organization scope is required',
      userMessage: 'Select an organization and retry.',
    })
  }

  try {
    const summary = await getBillingSummary({
      organizationId,
    })
    return res.json({ data: summary })
  } catch (error) {
    return sendBillingError(req, res, error)
  }
}

export const createCheckoutSessionHandler: AuthRequestHandler<
  CreateCheckoutSessionRequest
> = async (req, res) => {
  const organizationId = requireOrganizationId(req)
  if (!organizationId) {
    return sendApiError(req, res, 400, {
      code: 'BILLING_ORGANIZATION_REQUIRED',
      message: 'Organization scope is required',
      userMessage: 'Select an organization and retry.',
    })
  }

  try {
    const checkoutSession = await createCheckoutSessionForOrganization({
      organizationId,
      userId: req.user.id,
      offer: req.validated.offer,
      seats: req.validated.seats,
    })

    return res.json({
      data: checkoutSession,
    })
  } catch (error) {
    return sendBillingError(req, res, error)
  }
}

export const createPortalSessionHandler: AuthRequestHandler<
  CreatePortalSessionRequest
> = async (req, res) => {
  const organizationId = requireOrganizationId(req)
  if (!organizationId) {
    return sendApiError(req, res, 400, {
      code: 'BILLING_ORGANIZATION_REQUIRED',
      message: 'Organization scope is required',
      userMessage: 'Select an organization and retry.',
    })
  }

  try {
    const portalSession = await createBillingPortalSessionForOrganization({
      organizationId,
    })
    return res.json({
      data: portalSession,
    })
  } catch (error) {
    return sendBillingError(req, res, error)
  }
}

export const stripeWebhookHandler = async (req: Request, res: Response) => {
  const requestWithRaw = req as RequestWithRawBody
  const signatureHeaderRaw = req.headers['stripe-signature']
  if (!signatureHeaderRaw) {
    return sendApiError(req, res, 401, {
      code: 'BILLING_WEBHOOK_UNAUTHORIZED',
      message: 'Missing Stripe signature header',
      userMessage: 'Webhook signature is required.',
    })
  }

  const signatureHeader = Array.isArray(signatureHeaderRaw)
    ? signatureHeaderRaw[0]
    : signatureHeaderRaw
  const rawBody =
    requestWithRaw.rawBodyText ||
    (req.body ? JSON.stringify(req.body) : JSON.stringify({}))

  try {
    const result = await handleStripeWebhook({
      rawBody,
      signatureHeader,
    })
    return res.status(200).json({
      received: true,
      data: result,
    })
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Stripe webhook processing failed'
    const isSignatureError = message.toLowerCase().includes('signature')
    return sendApiError(req, res, isSignatureError ? 401 : 400, {
      code: isSignatureError
        ? 'BILLING_WEBHOOK_SIGNATURE_INVALID'
        : 'BILLING_WEBHOOK_FAILED',
      message,
      userMessage: isSignatureError
        ? 'Webhook signature is invalid.'
        : 'Webhook could not be processed.',
    })
  }
}
