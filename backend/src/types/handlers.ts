import { DBUser, DBSession } from '@shared/db/src/types'
import { Request, Response, NextFunction } from 'express'
import { ApiKeyScope } from '@shared/types/src'

export interface ApiKeyCredential {
  id: string
  organizationId: string
  name: string
  keyPrefix: string
  scopes: ApiKeyScope[]
  createdByUserId: string | null
}

export interface ValidatedRequest<T> extends Request {
  validated: T
  apiKey?: ApiKeyCredential
}

// Extend Express's Request type properly
export interface AuthRequest<T> extends ValidatedRequest<T> {
  user: DBUser
  session: DBSession
}

export type ValidatedRequestHandler<T> = (
  req: ValidatedRequest<T>,
  res: Response,
  next: NextFunction,
) => Promise<any>

// RequestHandler that ensures user exists in the handler
export type AuthRequestHandler<T> = (
  req: AuthRequest<T>,
  res: Response,
  next: NextFunction,
) => Promise<any>
