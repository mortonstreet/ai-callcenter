import {
  AuthRequest,
  AuthRequestHandler,
  ValidatedRequest,
  ValidatedRequestHandler,
} from '@/types/handlers'
import { RequestHandler } from 'express'
import { setRequestContext } from '@/lib/context'
import { DBUser } from '@shared/types/src'
import { sendApiError } from '../utils/error-contract'

export const validatedRoute = <T>(
  handler: ValidatedRequestHandler<T>,
): RequestHandler => {
  return (req, res, next) => {
    return handler(req as ValidatedRequest<T>, res, next)
  }
}

export const authenticatedRoute = <T>(
  handler: AuthRequestHandler<T>,
): RequestHandler => {
  return (req, res, next) => {
    // At this point, we assume withAuth has already run and attached user
    if (!req.user) {
      return sendApiError(req, res, 401, {
        code: 'AUTH_UNAUTHORIZED',
        message: 'Unauthorized',
        userMessage: 'Please sign in and retry.',
      })
    }
    setRequestContext('userId', (req.user as any).id)
    return handler(req as AuthRequest<T>, res, next)
  }
}

export const adminOnlyRoute = <T>(
  handler: AuthRequestHandler<T>,
): RequestHandler => {
  return authenticatedRoute<T>(async (req, res, next) => {
    if (!(req.user as DBUser).isAdmin) {
      return sendApiError(req, res, 403, {
        code: 'AUTH_FORBIDDEN',
        message: 'Forbidden',
        userMessage: 'Admin access is required for this action.',
      })
    }
    return handler(req, res, next)
  })
}
