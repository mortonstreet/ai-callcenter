import * as leadRepository from '@/repositories/lead.repository'
import { DBLead } from '@shared/db/src'
import { normalizePhone } from '@/utils/phone'

export const create = async (data: {
  organizationId: string
  firstName?: string
  lastName?: string
  email?: string
  phone: string
  company?: string
  title?: string
  linkedInUrl?: string
  website?: string
  dealValue?: number
  pipelineStageId?: string
}): Promise<DBLead> => {
  const normalizedPhone = normalizePhone(data.phone)
  return leadRepository.create({
    organizationId: data.organizationId,
    firstName: data.firstName || null,
    lastName: data.lastName || null,
    email: data.email || null,
    phone: data.phone,
    normalizedPhone,
    company: data.company || null,
    title: data.title || null,
    linkedInUrl: data.linkedInUrl || null,
    website: data.website || null,
    dealValue: data.dealValue != null ? String(data.dealValue) : null,
    pipelineStageId: data.pipelineStageId || null,
    customFields: null,
    updatedAt: new Date(),
  })
}

export const getById = async (
  id: string,
  organizationId: string,
): Promise<DBLead | undefined> => {
  const lead = await leadRepository.findById(id)
  if (!lead || lead.organizationId !== organizationId) return undefined
  return lead
}

export const list = async (
  organizationId: string,
  options: { search?: string; page: number; limit: number },
) => {
  const { data, total } = await leadRepository.findMany(organizationId, options)
  const totalPages = Math.ceil(total / options.limit)
  return {
    data,
    pagination: {
      page: options.page,
      limit: options.limit,
      total,
      totalPages,
      hasNextPage: options.page < totalPages,
      hasPrevPage: options.page > 1,
    },
  }
}

export const update = async (
  id: string,
  organizationId: string,
  data: {
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
    company?: string
    title?: string
    linkedInUrl?: string
    website?: string
    dealValue?: number
    pipelineStageId?: string | null
  },
): Promise<DBLead | undefined> => {
  const existing = await leadRepository.findById(id)
  if (!existing || existing.organizationId !== organizationId) return undefined

  const updateData: Record<string, unknown> = {}
  if (data.firstName !== undefined)
    updateData.firstName = data.firstName || null
  if (data.lastName !== undefined) updateData.lastName = data.lastName || null
  if (data.email !== undefined) updateData.email = data.email || null
  if (data.phone !== undefined) {
    updateData.phone = data.phone
    updateData.normalizedPhone = normalizePhone(data.phone)
  }
  if (data.company !== undefined) updateData.company = data.company || null
  if (data.title !== undefined) updateData.title = data.title || null
  if (data.linkedInUrl !== undefined)
    updateData.linkedInUrl = data.linkedInUrl || null
  if (data.website !== undefined) updateData.website = data.website || null
  if (data.dealValue !== undefined)
    updateData.dealValue = String(data.dealValue)
  if (data.pipelineStageId !== undefined)
    updateData.pipelineStageId = data.pipelineStageId

  return leadRepository.update(id, updateData as any)
}

export const remove = async (
  id: string,
  organizationId: string,
): Promise<boolean> => {
  const existing = await leadRepository.findById(id)
  if (!existing || existing.organizationId !== organizationId) return false
  await leadRepository.softDelete(id)
  return true
}
