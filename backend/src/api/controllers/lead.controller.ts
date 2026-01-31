import { AuthRequestHandler } from '@/types/handlers'
import * as leadService from '@/services/lead.service'
import {
  ListLeadsRequest,
  GetLeadRequest,
  CreateLeadRequest,
  UpdateLeadRequest,
  DeleteLeadRequest,
} from '@shared/types/src'

export const listLeads: AuthRequestHandler<ListLeadsRequest> = async (
  req,
  res,
) => {
  const { organizationId, search, page, limit } = req.validated
  const result = await leadService.list(organizationId, { search, page, limit })
  return res.json(result)
}

export const getLead: AuthRequestHandler<GetLeadRequest> = async (
  req,
  res,
) => {
  const { organizationId, id } = req.validated
  const lead = await leadService.getById(id, organizationId)
  if (!lead) {
    return res.status(404).json({ error: 'Lead not found' })
  }
  return res.json(lead)
}

export const createLead: AuthRequestHandler<CreateLeadRequest> = async (
  req,
  res,
) => {
  const { organizationId, ...data } = req.validated
  const lead = await leadService.create({ organizationId, ...data })
  return res.status(201).json(lead)
}

export const updateLead: AuthRequestHandler<UpdateLeadRequest> = async (
  req,
  res,
) => {
  const { organizationId, id, ...data } = req.validated
  const lead = await leadService.update(id, organizationId, data)
  if (!lead) {
    return res.status(404).json({ error: 'Lead not found' })
  }
  return res.json(lead)
}

export const deleteLead: AuthRequestHandler<DeleteLeadRequest> = async (
  req,
  res,
) => {
  const { organizationId, id } = req.validated
  const deleted = await leadService.remove(id, organizationId)
  if (!deleted) {
    return res.status(404).json({ error: 'Lead not found' })
  }
  return res.json({ success: true })
}
