import { Request, Response, NextFunction } from 'express'
import { isMemberOfOrganization } from '@/services/user.service'
import { AuthRequest } from '@/types/handlers'
import { sendApiError } from '@/api/utils/error-contract'

interface MaybeOrganizationScope {
  organizationId?: string
}

const resolveRequestedOrganizationId = (req: Request): string | undefined => {
  const fromValidated = req.validated?.organizationId
  if (typeof fromValidated === 'string' && fromValidated.length > 0) {
    return fromValidated
  }

  const fromQuery = req.query.organizationId
  if (typeof fromQuery === 'string' && fromQuery.length > 0) {
    return fromQuery
  }

  const fromBody = req.body?.organizationId
  if (typeof fromBody === 'string' && fromBody.length > 0) {
    return fromBody
  }

  const fromParams = req.params.organizationId
  if (typeof fromParams === 'string' && fromParams.length > 0) {
    return fromParams
  }

  return undefined
}

export const resolveOrganizationScope = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authReq = req as AuthRequest<MaybeOrganizationScope>

  if (!authReq.user || !authReq.session) {
    return sendApiError(req, res, 401, {
      code: 'AUTH_UNAUTHORIZED',
      message: 'Authentication required',
      userMessage: 'Please sign in and retry.',
      retryable: false,
    })
  }

  const requestedOrganizationId = resolveRequestedOrganizationId(req)
  const sessionOrganizationId =
    (authReq.session as any)?.activeOrganizationId ||
    (authReq.session as any)?.session?.activeOrganizationId ||
    undefined

  if (authReq.user.isAdmin) {
    const adminOrganizationId = requestedOrganizationId || sessionOrganizationId
    if (!adminOrganizationId) {
      return sendApiError(req, res, 400, {
        code: 'ORG_SCOPE_REQUIRED',
        message: 'Organization scope is required',
        userMessage: 'Select an organization and retry.',
      })
    }
    req.validated = {
      ...(req.validated || {}),
      organizationId: adminOrganizationId,
    }
    return next()
  }

  let resolvedOrganizationId: string | undefined
  if (requestedOrganizationId) {
    const requestedIsMember = await isMemberOfOrganization(
      authReq.user.id,
      requestedOrganizationId,
    )
    if (requestedIsMember) {
      resolvedOrganizationId = requestedOrganizationId
    }
  }

  if (!resolvedOrganizationId && sessionOrganizationId) {
    const sessionIsMember = await isMemberOfOrganization(
      authReq.user.id,
      sessionOrganizationId,
    )
    if (sessionIsMember) {
      resolvedOrganizationId = sessionOrganizationId
    }
  }

  if (!resolvedOrganizationId) {
    return sendApiError(req, res, 401, {
      code: 'ORG_SCOPE_UNAUTHORIZED',
      message: 'User is not authorized for requested organization',
      userMessage: 'You do not have access to this organization.',
      retryable: false,
    })
  }

  req.validated = {
    ...(req.validated || {}),
    organizationId: resolvedOrganizationId,
  }
  return next()
}
