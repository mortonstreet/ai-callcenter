import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { sendApiError } from '@/api/utils/error-contract'
import { collectForbiddenWizardFields } from '@/api/utils/wizard-v2'

export const rejectForbiddenWizardFields = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const forbiddenFields = collectForbiddenWizardFields(req.body)
  if (forbiddenFields.length === 0) {
    return next()
  }

  return sendApiError(req, res, StatusCodes.BAD_REQUEST, {
    code: 'WIZARD_FORBIDDEN_FIELDS',
    message: 'Wizard payload contains forbidden internal fields',
    userMessage: 'Unsupported internal fields were provided.',
    details: {
      fields: forbiddenFields,
    },
  })
}
