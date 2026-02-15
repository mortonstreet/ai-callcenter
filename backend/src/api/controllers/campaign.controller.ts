import { AuthRequestHandler } from '@/types/handlers'
import {
  ActivateCampaignRequest,
  CreateCampaignEnrollmentRequest,
  CreateCampaignEnrollmentsFromListRequest,
  CreateCampaignRequest,
  CreateCampaignStepRequest,
  DeleteCampaignEnrollmentRequest,
  DeleteCampaignRequest,
  DeleteCampaignStepRequest,
  DuplicateCampaignRequest,
  GetCampaignEventsRequest,
  GetCampaignRequest,
  GetCampaignStatsRequest,
  ListCampaignEnrollmentsRequest,
  ListCampaignsRequest,
  PauseCampaignRequest,
  UpdateCampaignRequest,
  UpdateCampaignStepRequest,
} from '@shared/types/src/requests/campaigns'
import { OrganizationRole } from '@shared/types/src'
import {
  activateCampaign,
  createCampaign,
  createCampaignEnrollment,
  createCampaignEnrollmentsFromList,
  createCampaignStep,
  deleteCampaign,
  deleteCampaignEnrollment,
  deleteCampaignStep,
  duplicateCampaign,
  getCampaign,
  getCampaignEvents,
  getCampaignStats,
  listCampaignEnrollments,
  listCampaigns,
  pauseCampaign,
  updateCampaign,
  updateCampaignStep,
} from '@/services/campaign-contract.service'
import { sendApiError } from '@/api/utils/error-contract'
import { findMember } from '@/repositories/organization.repository'

const isPrivilegedRole = (role?: string) =>
  role === OrganizationRole.ADMIN || role === OrganizationRole.OWNER

const canManageEnrollment = async (input: {
  userId: string
  isPlatformAdmin: boolean
  organizationId: string
  allowMemberEnrollment: boolean
}) => {
  if (input.isPlatformAdmin) {
    return true
  }

  const membership = await findMember(input.organizationId, input.userId)
  if (!membership) {
    return false
  }

  if (isPrivilegedRole(membership.role)) {
    return true
  }

  if (
    membership.role === OrganizationRole.MEMBER &&
    input.allowMemberEnrollment
  ) {
    return true
  }

  return false
}

export const listCampaignsHandler: AuthRequestHandler<
  ListCampaignsRequest
> = async (req, res) => {
  const { organizationId, status, channel } = req.validated
  return res.json({
    data: listCampaigns(organizationId, { status, channel }),
  })
}

export const createCampaignHandler: AuthRequestHandler<
  CreateCampaignRequest
> = async (req, res) => {
  const { organizationId, name, description, channels, allowMemberEnrollment } =
    req.validated

  const campaign = createCampaign({
    organizationId,
    name,
    description,
    channels,
    allowMemberEnrollment,
  })

  return res.status(201).json({
    data: campaign,
  })
}

export const getCampaignHandler: AuthRequestHandler<
  GetCampaignRequest
> = async (req, res) => {
  const { organizationId, id } = req.validated
  const campaign = getCampaign(organizationId, id)
  if (!campaign) {
    return sendApiError(req, res, 404, {
      code: 'CAMPAIGN_NOT_FOUND',
      message: `Campaign ${id} not found`,
      userMessage: 'Campaign not found.',
    })
  }
  return res.json({
    data: campaign,
  })
}

export const updateCampaignHandler: AuthRequestHandler<
  UpdateCampaignRequest
> = async (req, res) => {
  const { organizationId, id, ...updates } = req.validated
  const campaign = updateCampaign(organizationId, id, updates)
  if (!campaign) {
    return sendApiError(req, res, 404, {
      code: 'CAMPAIGN_NOT_FOUND',
      message: `Campaign ${id} not found`,
      userMessage: 'Campaign not found.',
    })
  }
  return res.json({
    data: campaign,
  })
}

export const deleteCampaignHandler: AuthRequestHandler<
  DeleteCampaignRequest
> = async (req, res) => {
  const { organizationId, id } = req.validated
  const campaign = deleteCampaign(organizationId, id)
  if (!campaign) {
    return sendApiError(req, res, 404, {
      code: 'CAMPAIGN_NOT_FOUND',
      message: `Campaign ${id} not found`,
      userMessage: 'Campaign not found.',
    })
  }
  return res.json({
    success: true,
    data: campaign,
  })
}

export const activateCampaignHandler: AuthRequestHandler<
  ActivateCampaignRequest
> = async (req, res) => {
  const { organizationId, id } = req.validated
  const campaign = activateCampaign(organizationId, id)
  if (!campaign) {
    return sendApiError(req, res, 404, {
      code: 'CAMPAIGN_NOT_FOUND',
      message: `Campaign ${id} not found`,
      userMessage: 'Campaign not found.',
    })
  }
  return res.json({
    data: campaign,
  })
}

export const pauseCampaignHandler: AuthRequestHandler<
  PauseCampaignRequest
> = async (req, res) => {
  const { organizationId, id } = req.validated
  const campaign = pauseCampaign(organizationId, id)
  if (!campaign) {
    return sendApiError(req, res, 404, {
      code: 'CAMPAIGN_NOT_FOUND',
      message: `Campaign ${id} not found`,
      userMessage: 'Campaign not found.',
    })
  }
  return res.json({
    data: campaign,
  })
}

export const duplicateCampaignHandler: AuthRequestHandler<
  DuplicateCampaignRequest
> = async (req, res) => {
  const { organizationId, id } = req.validated
  const campaign = duplicateCampaign(organizationId, id)
  if (!campaign) {
    return sendApiError(req, res, 404, {
      code: 'CAMPAIGN_NOT_FOUND',
      message: `Campaign ${id} not found`,
      userMessage: 'Campaign not found.',
    })
  }
  return res.status(201).json({
    data: campaign,
  })
}

export const createCampaignStepHandler: AuthRequestHandler<
  CreateCampaignStepRequest
> = async (req, res) => {
  const { organizationId, id, ...stepData } = req.validated
  const step = createCampaignStep(organizationId, id, stepData)
  if (!step) {
    return sendApiError(req, res, 404, {
      code: 'CAMPAIGN_NOT_FOUND',
      message: `Campaign ${id} not found`,
      userMessage: 'Campaign not found.',
    })
  }
  return res.status(201).json({
    data: step,
  })
}

export const updateCampaignStepHandler: AuthRequestHandler<
  UpdateCampaignStepRequest
> = async (req, res) => {
  const { organizationId, id, stepId, ...stepData } = req.validated
  const step = updateCampaignStep(organizationId, id, stepId, stepData)
  if (!step) {
    return sendApiError(req, res, 404, {
      code: 'CAMPAIGN_STEP_NOT_FOUND',
      message: `Step ${stepId} not found`,
      userMessage: 'Campaign step not found.',
      details: { campaignId: id },
    })
  }
  return res.json({
    data: step,
  })
}

export const deleteCampaignStepHandler: AuthRequestHandler<
  DeleteCampaignStepRequest
> = async (req, res) => {
  const { organizationId, id, stepId } = req.validated
  const deleted = deleteCampaignStep(organizationId, id, stepId)
  if (!deleted) {
    return sendApiError(req, res, 404, {
      code: 'CAMPAIGN_STEP_NOT_FOUND',
      message: `Step ${stepId} not found`,
      userMessage: 'Campaign step not found.',
      details: { campaignId: id },
    })
  }
  return res.json({
    success: true,
  })
}

export const listCampaignEnrollmentsHandler: AuthRequestHandler<
  ListCampaignEnrollmentsRequest
> = async (req, res) => {
  const { organizationId, id, status } = req.validated
  const enrollments = listCampaignEnrollments(organizationId, id, status)
  if (!enrollments) {
    return sendApiError(req, res, 404, {
      code: 'CAMPAIGN_NOT_FOUND',
      message: `Campaign ${id} not found`,
      userMessage: 'Campaign not found.',
    })
  }
  return res.json({
    data: enrollments,
  })
}

export const createCampaignEnrollmentHandler: AuthRequestHandler<
  CreateCampaignEnrollmentRequest
> = async (req, res) => {
  const { organizationId, id, leadId, contact } = req.validated
  const campaign = getCampaign(organizationId, id)
  if (!campaign) {
    return sendApiError(req, res, 404, {
      code: 'CAMPAIGN_NOT_FOUND',
      message: `Campaign ${id} not found`,
      userMessage: 'Campaign not found.',
    })
  }

  const allowed = await canManageEnrollment({
    userId: req.user.id,
    isPlatformAdmin: req.user.isAdmin,
    organizationId,
    allowMemberEnrollment: campaign.allowMemberEnrollment,
  })

  if (!allowed) {
    return sendApiError(req, res, 403, {
      code: 'CAMPAIGN_ENROLLMENT_FORBIDDEN',
      message: 'User cannot manage enrollments for this campaign',
      userMessage:
        'You do not have permission to enroll leads in this campaign.',
    })
  }

  const enrollment = createCampaignEnrollment(organizationId, id, {
    leadId,
    contact,
  })

  if (!enrollment) {
    return sendApiError(req, res, 404, {
      code: 'CAMPAIGN_NOT_FOUND',
      message: `Campaign ${id} not found`,
      userMessage: 'Campaign not found.',
    })
  }

  return res.status(201).json({
    data: enrollment,
  })
}

export const createCampaignEnrollmentsFromListHandler: AuthRequestHandler<
  CreateCampaignEnrollmentsFromListRequest
> = async (req, res) => {
  const { organizationId, id, listId, leadIds } = req.validated
  const campaign = getCampaign(organizationId, id)
  if (!campaign) {
    return sendApiError(req, res, 404, {
      code: 'CAMPAIGN_NOT_FOUND',
      message: `Campaign ${id} not found`,
      userMessage: 'Campaign not found.',
    })
  }

  const allowed = await canManageEnrollment({
    userId: req.user.id,
    isPlatformAdmin: req.user.isAdmin,
    organizationId,
    allowMemberEnrollment: campaign.allowMemberEnrollment,
  })

  if (!allowed) {
    return sendApiError(req, res, 403, {
      code: 'CAMPAIGN_ENROLLMENT_FORBIDDEN',
      message: 'User cannot manage enrollments for this campaign',
      userMessage:
        'You do not have permission to enroll leads in this campaign.',
    })
  }

  const enrollments = createCampaignEnrollmentsFromList(organizationId, id, {
    listId,
    leadIds: leadIds || [],
  })

  if (!enrollments) {
    return sendApiError(req, res, 404, {
      code: 'CAMPAIGN_NOT_FOUND',
      message: `Campaign ${id} not found`,
      userMessage: 'Campaign not found.',
    })
  }

  return res.status(201).json({
    data: enrollments,
  })
}

export const deleteCampaignEnrollmentHandler: AuthRequestHandler<
  DeleteCampaignEnrollmentRequest
> = async (req, res) => {
  const { organizationId, id, enrollmentId } = req.validated
  const campaign = getCampaign(organizationId, id)
  if (!campaign) {
    return sendApiError(req, res, 404, {
      code: 'CAMPAIGN_NOT_FOUND',
      message: `Campaign ${id} not found`,
      userMessage: 'Campaign not found.',
    })
  }

  const allowed = await canManageEnrollment({
    userId: req.user.id,
    isPlatformAdmin: req.user.isAdmin,
    organizationId,
    allowMemberEnrollment: campaign.allowMemberEnrollment,
  })

  if (!allowed) {
    return sendApiError(req, res, 403, {
      code: 'CAMPAIGN_ENROLLMENT_FORBIDDEN',
      message: 'User cannot manage enrollments for this campaign',
      userMessage: 'You do not have permission to update campaign enrollments.',
    })
  }

  const deleted = deleteCampaignEnrollment(organizationId, id, enrollmentId)
  if (!deleted) {
    return sendApiError(req, res, 404, {
      code: 'CAMPAIGN_ENROLLMENT_NOT_FOUND',
      message: `Enrollment ${enrollmentId} not found`,
      userMessage: 'Campaign enrollment not found.',
      details: { campaignId: id },
    })
  }

  return res.json({
    success: true,
  })
}

export const getCampaignStatsHandler: AuthRequestHandler<
  GetCampaignStatsRequest
> = async (req, res) => {
  const { organizationId, id } = req.validated
  const stats = getCampaignStats(organizationId, id)
  if (!stats) {
    return sendApiError(req, res, 404, {
      code: 'CAMPAIGN_NOT_FOUND',
      message: `Campaign ${id} not found`,
      userMessage: 'Campaign not found.',
    })
  }
  return res.json({
    data: stats,
  })
}

export const getCampaignEventsHandler: AuthRequestHandler<
  GetCampaignEventsRequest
> = async (req, res) => {
  const { organizationId, id, limit } = req.validated
  const events = getCampaignEvents(organizationId, id, limit)
  if (!events) {
    return sendApiError(req, res, 404, {
      code: 'CAMPAIGN_NOT_FOUND',
      message: `Campaign ${id} not found`,
      userMessage: 'Campaign not found.',
    })
  }
  return res.json({
    data: events,
  })
}
