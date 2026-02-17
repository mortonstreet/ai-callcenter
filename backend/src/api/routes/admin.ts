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
import { getOperationsMetricsSnapshot } from '@/services/operations-metrics.service'
import { workerRuntime } from '@/queues/workers'
import { createAdminAuditLog } from '@/repositories/governance.repository'
import {
  addSuppression,
  listSuppressions,
  removeSuppression,
} from '@/services/compliance.service'

const router = Router()

type ErrorWorkflowStatus = 'open' | 'acknowledged' | 'resolved'

const errorWorkflowStore = new Map<
  string,
  {
    status: ErrorWorkflowStatus
    updatedAt: string
    updatedByUserId: string | null
  }
>()

const resolveWorkflowStatus = (
  id: string,
  fallbackResolvedAt?: string | null,
): ErrorWorkflowStatus => {
  if (fallbackResolvedAt) {
    return 'resolved'
  }
  return errorWorkflowStore.get(id)?.status || 'open'
}

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

const AdminImpersonateSchema = z.object({
  id: z.string(),
  reason: z.string().optional(),
})

router.post(
  '/users/:id/impersonate',
  withBetterAuth,
  validateAndMerge(AdminImpersonateSchema),
  adminOnlyRoute<{ id: string; reason?: string }>(async (req, res) => {
    const { id, reason } = req.validated

    await createAdminAuditLog({
      organizationId: null,
      actorUserId: req.user.id,
      action: 'admin.impersonation.start',
      resourceType: 'user',
      resourceId: id,
      before: null,
      after: {
        reason: reason || null,
      },
      ipAddress: req.ip || null,
      userAgent: req.get('user-agent') || null,
    })

    return res.json({
      token: `impersonation-disabled:${id}`,
      impersonation: {
        enabled: false,
        targetUserId: id,
      },
    })
  }),
)

router.post(
  '/users/:id/impersonate/end',
  withBetterAuth,
  validateAndMerge(z.object({ id: z.string() })),
  adminOnlyRoute<{ id: string }>(async (req, res) => {
    const { id } = req.validated

    await createAdminAuditLog({
      organizationId: null,
      actorUserId: req.user.id,
      action: 'admin.impersonation.end',
      resourceType: 'user',
      resourceId: id,
      before: null,
      after: null,
      ipAddress: req.ip || null,
      userAgent: req.get('user-agent') || null,
    })

    return res.json({
      success: true,
      targetUserId: id,
    })
  }),
)

const ListSuppressionsSchema = z.object({
  organizationId: z.string(),
})

const UpsertSuppressionSchema = z.object({
  organizationId: z.string(),
  phone: z.string().optional(),
  email: z.string().optional(),
  reason: z.string().optional(),
})

router.get(
  '/compliance/suppressions',
  withBetterAuth,
  validateAndMerge(ListSuppressionsSchema),
  adminOnlyRoute<{ organizationId: string }>(async (req, res) => {
    const { organizationId } = req.validated
    return res.json({
      data: listSuppressions(organizationId),
    })
  }),
)

router.post(
  '/compliance/suppressions',
  withBetterAuth,
  validateAndMerge(UpsertSuppressionSchema),
  adminOnlyRoute<{
    organizationId: string
    phone?: string
    email?: string
    reason?: string
  }>(async (req, res) => {
    const entry = addSuppression(req.validated)
    if (!entry) {
      return res.status(400).json({
        error: 'SUPPRESSION_INPUT_REQUIRED',
        message: 'Provide phone or email for suppression',
      })
    }

    await createAdminAuditLog({
      organizationId: entry.organizationId,
      actorUserId: req.user.id,
      action: 'compliance.suppression.added',
      resourceType: 'suppression',
      resourceId: entry.key,
      before: null,
      after: entry,
      ipAddress: req.ip || null,
      userAgent: req.get('user-agent') || null,
    })

    return res.status(201).json({ data: entry })
  }),
)

router.delete(
  '/compliance/suppressions',
  withBetterAuth,
  validateAndMerge(UpsertSuppressionSchema),
  adminOnlyRoute<{
    organizationId: string
    phone?: string
    email?: string
    reason?: string
  }>(async (req, res) => {
    const removed = removeSuppression(req.validated)
    if (!removed) {
      return res.status(404).json({
        error: 'SUPPRESSION_NOT_FOUND',
        message: 'Suppression entry was not found',
      })
    }

    await createAdminAuditLog({
      organizationId: req.validated.organizationId,
      actorUserId: req.user.id,
      action: 'compliance.suppression.removed',
      resourceType: 'suppression',
      resourceId: `${req.validated.organizationId}:${req.validated.phone || req.validated.email || 'unknown'}`,
      before: {
        phone: req.validated.phone || null,
        email: req.validated.email || null,
      },
      after: {
        removed: true,
        reason: req.validated.reason || null,
      },
      ipAddress: req.ip || null,
      userAgent: req.get('user-agent') || null,
    })

    return res.json({ success: true })
  }),
)

// =============================================================================
// OPERATIONS METRICS
// =============================================================================

router.get(
  '/operations/metrics',
  withBetterAuth,
  adminOnlyRoute<{}>(async (_req, res) => {
    const [workerHealth, opsMetrics] = await Promise.all([
      workerRuntime.getHealth(),
      Promise.resolve(getOperationsMetricsSnapshot()),
    ])

    const queueBacklogP0 = workerHealth.queues.filter(
      (snapshot) => snapshot.depth.waiting + snapshot.depth.delayed >= 1000,
    )
    const elevatedFailureP1 = Object.entries(opsMetrics.queues)
      .filter(
        ([, snapshot]) => snapshot.failed > 5 && snapshot.failureRate >= 0.25,
      )
      .map(([queueName, snapshot]) => ({
        queueName,
        ...snapshot,
      }))

    return res.json({
      data: {
        worker: workerHealth,
        metrics: opsMetrics,
        alerts: {
          p0: queueBacklogP0.map((snapshot) => ({
            queue: snapshot.queueName,
            reason: 'Queue backlog is above P0 threshold',
            waiting: snapshot.depth.waiting,
            delayed: snapshot.depth.delayed,
          })),
          p1: elevatedFailureP1.map((snapshot) => ({
            queue: snapshot.queueName,
            reason: 'Queue failure rate is above P1 threshold',
            failureRate: snapshot.failureRate,
            failed: snapshot.failed,
          })),
        },
      },
    })
  }),
)

// =============================================================================
// ERROR LOGS (Twilio Alerts API)
// =============================================================================

/**
 * Helper: load Twilio credentials from the user's active org
 */
async function loadTwilioCredentialsForAdmin(req: any): Promise<boolean> {
  const orgId =
    req.session?.session?.activeOrganizationId || req.user?.activeOrganizationId
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
    const status = req.query.status as ErrorWorkflowStatus | undefined
    const search = req.query.search as string | undefined

    try {
      const logLevel =
        severity === 'error'
          ? 'error'
          : severity === 'warning'
            ? 'warning'
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
            (a.alertText && a.alertText.toLowerCase().includes(q)) ||
            (a.sid && a.sid.toLowerCase().includes(q)),
        )
      }

      if (
        status &&
        (status === 'open' ||
          status === 'acknowledged' ||
          status === 'resolved')
      ) {
        alerts = alerts.filter(
          (a: any) => resolveWorkflowStatus(a.sid) === status,
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
        status: resolveWorkflowStatus(a.sid, null),
        product: a.serviceSid ? 'Voice' : 'General',
        organizationName: null,
        occurredAt: a.dateCreated
          ? new Date(a.dateCreated).toISOString()
          : new Date().toISOString(),
        correlationId: a.sid,
        correlationLink: a.url || null,
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
        return res
          .status(404)
          .json({ error: result.error || 'Alert not found' })
      }

      const a = result.alert as any

      res.json({
        data: {
          id: a.sid,
          code: String(a.errorCode || ''),
          message: a.description || a.alertText || 'Unknown error',
          severity: mapSeverity(a.logLevel),
          status: resolveWorkflowStatus(
            a.sid,
            a.dateResolved ? new Date(a.dateResolved).toISOString() : null,
          ),
          product: a.serviceSid ? 'Voice' : 'General',
          organizationName: null,
          occurredAt: a.dateCreated
            ? new Date(a.dateCreated).toISOString()
            : new Date().toISOString(),
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
          resolvedAt: a.dateResolved
            ? new Date(a.dateResolved).toISOString()
            : null,
          resolvedBy: errorWorkflowStore.get(a.sid)?.updatedByUserId || null,
          correlationId: a.sid,
          correlationLink: a.url || null,
        },
      })
    } catch (error: any) {
      logger.error('Failed to get error log detail:', error)
      res.status(500).json({ error: error.message })
    }
  }),
)

const UpdateErrorLogWorkflowSchema = z.object({
  id: z.string(),
  status: z.enum(['open', 'acknowledged', 'resolved']),
})

router.patch(
  '/error-logs/:id/status',
  withBetterAuth,
  validateAndMerge(UpdateErrorLogWorkflowSchema),
  adminOnlyRoute<{ id: string; status: ErrorWorkflowStatus }>(
    async (req, res) => {
      const { id, status } = req.validated

      errorWorkflowStore.set(id, {
        status,
        updatedAt: new Date().toISOString(),
        updatedByUserId: req.user?.id || null,
      })

      return res.json({
        success: true,
        data: {
          id,
          status,
        },
      })
    },
  ),
)

export default router
