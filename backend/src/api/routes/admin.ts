import { Router } from 'express'
import { withBetterAuth } from '../middlewares/auth'
import { adminOnlyRoute } from './utils'
import {
  getAdminStats,
  getAdminUsers,
  getAdminOrganizations,
  createOrganization,
  createAgent,
  updateOrganizationLogo,
  deleteOrganization,
} from '@/api/controllers/admin.controller'
import { z } from 'zod'
import { validateAndMerge } from '@/api/middlewares/validationMiddleware'
import {
  AdminCreateOrganizationRequest,
  AdminCreateOrganizationRequestSchema,
  AdminCreateAgentRequest,
  AdminCreateAgentRequestSchema,
} from '@shared/types/src'
import { twilioClient } from '@/clients/twilio.client'
import { findTwilioConfig } from '@/repositories/call-center.repository'
import logger from '@/lib/logger'

const router = Router()

router.get('/stats', withBetterAuth, adminOnlyRoute<{}>(getAdminStats))
router.get('/users', withBetterAuth, adminOnlyRoute<{}>(getAdminUsers))
router.get(
  '/organizations',
  withBetterAuth,
  adminOnlyRoute<{}>(getAdminOrganizations),
)
router.post(
  '/organizations',
  withBetterAuth,
  validateAndMerge(AdminCreateOrganizationRequestSchema),
  adminOnlyRoute<AdminCreateOrganizationRequest>(createOrganization),
)
router.post(
  '/agents',
  withBetterAuth,
  validateAndMerge(AdminCreateAgentRequestSchema),
  adminOnlyRoute<AdminCreateAgentRequest>(createAgent),
)

// Update organization logo
const UpdateOrganizationLogoSchema = z.object({
  organizationId: z.string(),
  logo: z.string(), // URL or base64 data
})

router.patch(
  '/organizations/:organizationId/logo',
  withBetterAuth,
  validateAndMerge(UpdateOrganizationLogoSchema),
  adminOnlyRoute<{ organizationId: string; logo: string }>(
    updateOrganizationLogo,
  ),
)

// Delete organization
const DeleteOrganizationSchema = z.object({
  organizationId: z.string(),
})

router.delete(
  '/organizations/:organizationId',
  withBetterAuth,
  validateAndMerge(DeleteOrganizationSchema),
  adminOnlyRoute<{ organizationId: string }>(deleteOrganization),
)

// =============================================================================
// ERROR LOGS (Twilio Alerts API)
// =============================================================================

/**
 * Helper: load Twilio credentials from the user's active org
 */
async function loadTwilioCredentialsForAdmin(req: any): Promise<boolean> {
  const orgId =
    req.session?.session?.activeOrganizationId ||
    req.user?.activeOrganizationId
  if (!orgId) return false

  const dbConfig = await findTwilioConfig(orgId)
  if (dbConfig?.accountSid && dbConfig?.authToken) {
    twilioClient.setCredentials({
      accountSid: dbConfig.accountSid,
      authToken: dbConfig.authToken,
      phoneNumber: dbConfig.phoneNumber || '',
      apiKeySid: dbConfig.apiKeySid || undefined,
      apiKeySecret: dbConfig.apiKeySecret || undefined,
      twimlAppSid: dbConfig.twimlAppSid || undefined,
    })
    return true
  }
  twilioClient.clearCredentials()
  return twilioClient.isConfigured()
}

/**
 * Map Twilio alert log_level to a severity string the frontend expects.
 */
function mapSeverity(logLevel: string): string {
  switch (logLevel) {
    case 'error':
      return 'error'
    case 'warning':
      return 'warning'
    case 'notice':
      return 'info'
    default:
      return logLevel || 'info'
  }
}

/**
 * GET /admin/error-logs
 * List Twilio alerts with pagination and filtering.
 */
router.get(
  '/error-logs',
  withBetterAuth,
  adminOnlyRoute<{}>(async (req, res) => {
    const loaded = await loadTwilioCredentialsForAdmin(req)
    if (!loaded) {
      return res.status(400).json({ error: 'Twilio not configured' })
    }

    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const severity = req.query.severity as string | undefined
    const search = req.query.search as string | undefined

    try {
      const logLevel = severity === 'error' ? 'error'
        : severity === 'warning' ? 'warning'
        : undefined

      const result = await twilioClient.listAlerts({
        logLevel,
        limit: 200, // fetch a batch and paginate in-memory
      })

      if (!result.success) {
        return res.status(500).json({ error: result.error })
      }

      let alerts = result.alerts || []

      // Filter by search term if provided
      if (search) {
        const q = search.toLowerCase()
        alerts = alerts.filter(
          (a: any) =>
            (a.errorCode && String(a.errorCode).includes(q)) ||
            (a.description && a.description.toLowerCase().includes(q)) ||
            (a.alertText && a.alertText.toLowerCase().includes(q)),
        )
      }

      const total = alerts.length
      const start = (page - 1) * limit
      const paged = alerts.slice(start, start + limit)

      const data = paged.map((a: any) => ({
        id: a.sid,
        code: String(a.errorCode || ''),
        message: a.description || a.alertText || 'Unknown error',
        severity: mapSeverity(a.logLevel),
        status: 'active',
        product: a.serviceSid ? 'Voice' : 'General',
        organizationName: null,
        occurredAt: a.dateCreated ? new Date(a.dateCreated).toISOString() : new Date().toISOString(),
      }))

      res.json({
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1,
        },
      })
    } catch (error: any) {
      logger.error('Failed to list error logs:', error)
      res.status(500).json({ error: error.message })
    }
  }),
)

/**
 * GET /admin/error-logs/stats
 * Aggregate alerts by day for the trend chart.
 */
router.get(
  '/error-logs/stats',
  withBetterAuth,
  adminOnlyRoute<{}>(async (req, res) => {
    const loaded = await loadTwilioCredentialsForAdmin(req)
    if (!loaded) {
      return res.status(400).json({ error: 'Twilio not configured' })
    }

    const startDate = req.query.startDate as string | undefined
    const endDate = req.query.endDate as string | undefined

    try {
      const result = await twilioClient.listAlerts({
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        limit: 500,
      })

      if (!result.success) {
        return res.status(500).json({ error: result.error })
      }

      const alerts = result.alerts || []

      // Group by date
      const byDate: Record<string, number> = {}
      for (const a of alerts as any[]) {
        const date = a.dateCreated
          ? new Date(a.dateCreated).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0]
        byDate[date] = (byDate[date] || 0) + 1
      }

      const data = Object.entries(byDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, count }))

      res.json({ data })
    } catch (error: any) {
      logger.error('Failed to get error log stats:', error)
      res.status(500).json({ error: error.message })
    }
  }),
)

/**
 * GET /admin/error-logs/:id
 * Fetch a single alert detail from Twilio.
 */
router.get(
  '/error-logs/:id',
  withBetterAuth,
  adminOnlyRoute<{}>(async (req, res) => {
    const loaded = await loadTwilioCredentialsForAdmin(req)
    if (!loaded) {
      return res.status(400).json({ error: 'Twilio not configured' })
    }

    const { id } = req.params

    try {
      const result = await twilioClient.getAlert(id)

      if (!result.success || !result.alert) {
        return res.status(404).json({ error: result.error || 'Alert not found' })
      }

      const a = result.alert as any

      res.json({
        data: {
          id: a.sid,
          code: String(a.errorCode || ''),
          message: a.description || a.alertText || 'Unknown error',
          severity: mapSeverity(a.logLevel),
          status: 'active',
          product: a.serviceSid ? 'Voice' : 'General',
          organizationName: null,
          occurredAt: a.dateCreated ? new Date(a.dateCreated).toISOString() : new Date().toISOString(),
          stackTrace: a.alertText || null,
          metadata: {
            resourceSid: a.resourceSid,
            serviceSid: a.serviceSid,
            url: a.url,
            requestMethod: a.requestMethod,
            requestUrl: a.requestUrl,
            responseBody: a.responseBody,
            requestVariables: a.requestVariables,
            responseHeaders: a.responseHeaders,
          },
          resolvedAt: null,
          resolvedBy: null,
        },
      })
    } catch (error: any) {
      logger.error('Failed to get error log detail:', error)
      res.status(500).json({ error: error.message })
    }
  }),
)

export default router
