import { DBOrganization } from '@shared/db/src/types'
import {
  AdminCreateOrganizationRequest,
  AdminCreateOrganizationRequestSchema,
} from '@shared/types/src'

type AdminCreateOrganizationErrorCode =
  | 'ADMIN_OWNER_EMAIL_REQUIRED'
  | 'ADMIN_OWNER_EMAIL_INVALID'
  | 'ADMIN_CREATE_ORG_INVALID_REQUEST'

interface AdminCreateOrganizationValidationError {
  status: 400
  code: AdminCreateOrganizationErrorCode
  message: string
  userMessage: string
  details?: unknown
}

type ParseAdminCreateOrganizationPayloadResult =
  | { ok: true; data: AdminCreateOrganizationRequest }
  | { ok: false; error: AdminCreateOrganizationValidationError }

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const toTrimmedString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const buildOwnerEmailRequiredError = (legacyPayloadDetected: boolean) => {
  return {
    status: 400 as const,
    code: 'ADMIN_OWNER_EMAIL_REQUIRED' as const,
    message: legacyPayloadDetected
      ? 'ownerEmail is required. Legacy `{ name, slug }` payload is no longer supported.'
      : 'ownerEmail is required.',
    userMessage:
      'Provide the organization owner email before creating the organization.',
    details: {
      field: 'ownerEmail',
      legacyPayloadDetected,
    },
  }
}

export const parseAdminCreateOrganizationPayload = (
  payload: unknown,
): ParseAdminCreateOrganizationPayloadResult => {
  const parsed = AdminCreateOrganizationRequestSchema.safeParse(payload)
  if (parsed.success) {
    return {
      ok: true,
      data: parsed.data,
    }
  }

  if (!isRecord(payload)) {
    return {
      ok: false,
      error: {
        status: 400,
        code: 'ADMIN_CREATE_ORG_INVALID_REQUEST',
        message: 'Invalid organization creation payload.',
        userMessage:
          'Unable to create organization because the request payload is invalid.',
        details: parsed.error.issues,
      },
    }
  }

  const ownerEmail = toTrimmedString(payload.ownerEmail)
  const legacySlug = toTrimmedString(payload.slug)
  const ownerEmailIssues = parsed.error.issues.filter(
    (issue) => issue.path[0] === 'ownerEmail',
  )

  if (!ownerEmail && ownerEmailIssues.length > 0) {
    return {
      ok: false,
      error: buildOwnerEmailRequiredError(Boolean(legacySlug)),
    }
  }

  if (ownerEmailIssues.length > 0) {
    return {
      ok: false,
      error: {
        status: 400,
        code: 'ADMIN_OWNER_EMAIL_INVALID',
        message: 'ownerEmail must be a valid email address.',
        userMessage: 'Provide a valid owner email address.',
        details: ownerEmailIssues,
      },
    }
  }

  return {
    ok: false,
    error: {
      status: 400,
      code: 'ADMIN_CREATE_ORG_INVALID_REQUEST',
      message: 'Invalid organization creation payload.',
      userMessage:
        'Unable to create organization because the request payload is invalid.',
      details: parsed.error.issues,
    },
  }
}

export interface AdminCreateOrganizationResponse {
  organization: Pick<
    DBOrganization,
    'id' | 'name' | 'slug' | 'logo' | 'createdAt'
  >
  owner: {
    email: string
  }
}

export const buildAdminCreateOrganizationResponse = (
  organization: DBOrganization,
  ownerEmail: string,
): AdminCreateOrganizationResponse => {
  return {
    organization: {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      logo: organization.logo,
      createdAt: organization.createdAt,
    },
    owner: {
      email: ownerEmail,
    },
  }
}
