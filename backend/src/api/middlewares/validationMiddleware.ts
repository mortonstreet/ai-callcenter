import { Request, Response, NextFunction } from 'express'
import { z, ZodError } from 'zod'
import { StatusCodes } from 'http-status-codes'
import { sendApiError } from '../utils/error-contract'

export const validateAndMerge = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const merged = {
        ...req.body,
        ...req.params,
        ...req.query,
      }

      const validated = schema.parse(merged)
      req.validated = validated
      next()
    } catch (error) {
      if (error instanceof ZodError) {
        console.error('Validation failed for URL:', req.url)
        console.error(
          'Validation errors:',
          JSON.stringify(error.issues, null, 2),
        )
        return sendApiError(req, res, StatusCodes.BAD_REQUEST, {
          code: 'VALIDATION_FAILED',
          message: 'Validation failed',
          userMessage: 'Request validation failed.',
          details: error.issues,
        })
      }
      next(error)
    }
  }
}
