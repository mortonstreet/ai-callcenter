import { randomUUID } from 'crypto'
import {
  CampaignChannel,
  CampaignEnrollmentStatus,
  CampaignEnrollmentView,
  CampaignEventView,
  CampaignStatsView,
  CampaignStepView,
  CampaignStatus,
  CampaignView,
} from '@shared/types/src/requests/campaigns'

interface CampaignRecord extends CampaignView {
  enrollments: CampaignEnrollmentView[]
  events: CampaignEventView[]
}

const campaigns = new Map<string, CampaignRecord>()

const nowIso = () => new Date().toISOString()

const createChannelMix = (): Record<CampaignChannel, number> => ({
  voice: 0,
  sms: 0,
  email: 0,
})

const appendEvent = (
  campaign: CampaignRecord,
  type: string,
  details: Record<string, unknown>,
) => {
  const event: CampaignEventView = {
    id: randomUUID(),
    campaignId: campaign.id,
    organizationId: campaign.organizationId,
    type,
    createdAt: nowIso(),
    details,
  }
  campaign.events.push(event)
}

const getCampaignRecord = (organizationId: string, id: string) => {
  const campaign = campaigns.get(id)
  if (!campaign) {
    return null
  }
  if (campaign.organizationId !== organizationId) {
    return null
  }
  return campaign
}

export const listCampaigns = (
  organizationId: string,
  filters: {
    status?: CampaignStatus
    channel?: CampaignChannel
  },
): CampaignView[] => {
  const records = Array.from(campaigns.values()).filter(
    (campaign) => campaign.organizationId === organizationId,
  )

  return records
    .filter((campaign) =>
      filters.status ? campaign.status === filters.status : true,
    )
    .filter((campaign) =>
      filters.channel ? campaign.channels.includes(filters.channel) : true,
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export const createCampaign = (input: {
  organizationId: string
  name: string
  description?: string
  channels: CampaignChannel[]
  allowMemberEnrollment: boolean
}): CampaignView => {
  const now = nowIso()
  const id = randomUUID()
  const record: CampaignRecord = {
    id,
    organizationId: input.organizationId,
    name: input.name,
    description: input.description || null,
    status: 'draft',
    channels: Array.from(new Set(input.channels)),
    allowMemberEnrollment: input.allowMemberEnrollment,
    createdAt: now,
    updatedAt: now,
    activatedAt: null,
    pausedAt: null,
    steps: [],
    enrollments: [],
    events: [],
  }

  appendEvent(record, 'campaign.created', {
    name: record.name,
    channels: record.channels,
  })

  campaigns.set(id, record)
  return record
}

export const getCampaign = (
  organizationId: string,
  id: string,
): CampaignView | null => {
  return getCampaignRecord(organizationId, id)
}

export const updateCampaign = (
  organizationId: string,
  id: string,
  updates: {
    name?: string
    description?: string
    channels?: CampaignChannel[]
    allowMemberEnrollment?: boolean
  },
): CampaignView | null => {
  const campaign = getCampaignRecord(organizationId, id)
  if (!campaign) {
    return null
  }

  if (updates.name !== undefined) {
    campaign.name = updates.name
  }
  if (updates.description !== undefined) {
    campaign.description = updates.description || null
  }
  if (updates.channels !== undefined) {
    campaign.channels = Array.from(new Set(updates.channels))
  }
  if (updates.allowMemberEnrollment !== undefined) {
    campaign.allowMemberEnrollment = updates.allowMemberEnrollment
  }

  campaign.updatedAt = nowIso()
  appendEvent(campaign, 'campaign.updated', {
    changedFields: Object.keys(updates),
  })
  campaigns.set(id, campaign)
  return campaign
}

export const deleteCampaign = (organizationId: string, id: string) => {
  const campaign = getCampaignRecord(organizationId, id)
  if (!campaign) {
    return null
  }
  campaigns.delete(id)
  return campaign
}

export const activateCampaign = (organizationId: string, id: string) => {
  const campaign = getCampaignRecord(organizationId, id)
  if (!campaign) {
    return null
  }
  const now = nowIso()
  campaign.status = 'active'
  campaign.activatedAt = now
  campaign.updatedAt = now
  appendEvent(campaign, 'campaign.activated', {})
  campaigns.set(id, campaign)
  return campaign
}

export const pauseCampaign = (organizationId: string, id: string) => {
  const campaign = getCampaignRecord(organizationId, id)
  if (!campaign) {
    return null
  }
  const now = nowIso()
  campaign.status = 'paused'
  campaign.pausedAt = now
  campaign.updatedAt = now
  appendEvent(campaign, 'campaign.paused', {})
  campaigns.set(id, campaign)
  return campaign
}

export const duplicateCampaign = (
  organizationId: string,
  id: string,
): CampaignView | null => {
  const source = getCampaignRecord(organizationId, id)
  if (!source) {
    return null
  }

  const now = nowIso()
  const duplicateId = randomUUID()
  const duplicatedSteps: CampaignStepView[] = source.steps.map((step) => ({
    ...step,
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
  }))

  const duplicated: CampaignRecord = {
    id: duplicateId,
    organizationId: source.organizationId,
    name: `${source.name} (Copy)`,
    description: source.description,
    status: 'draft',
    channels: [...source.channels],
    allowMemberEnrollment: source.allowMemberEnrollment,
    createdAt: now,
    updatedAt: now,
    activatedAt: null,
    pausedAt: null,
    steps: duplicatedSteps,
    enrollments: [],
    events: [],
  }

  appendEvent(duplicated, 'campaign.duplicated', {
    sourceCampaignId: source.id,
  })
  appendEvent(source, 'campaign.duplicate.created', {
    duplicateCampaignId: duplicateId,
  })

  source.updatedAt = now
  campaigns.set(source.id, source)
  campaigns.set(duplicated.id, duplicated)

  return duplicated
}

export const createCampaignStep = (
  organizationId: string,
  campaignId: string,
  input: {
    channel: CampaignChannel
    offsetMinutes: number
    template: string
    skipIfReplied: boolean
    skipIfBooked: boolean
    metadata?: Record<string, unknown>
  },
): CampaignStepView | null => {
  const campaign = getCampaignRecord(organizationId, campaignId)
  if (!campaign) {
    return null
  }

  const now = nowIso()
  const step: CampaignStepView = {
    id: randomUUID(),
    channel: input.channel,
    offsetMinutes: input.offsetMinutes,
    template: input.template,
    skipIfReplied: input.skipIfReplied,
    skipIfBooked: input.skipIfBooked,
    metadata: input.metadata || {},
    createdAt: now,
    updatedAt: now,
  }
  campaign.steps.push(step)
  campaign.updatedAt = nowIso()
  appendEvent(campaign, 'campaign.step.created', {
    stepId: step.id,
    channel: step.channel,
  })
  campaigns.set(campaignId, campaign)
  return step
}

export const updateCampaignStep = (
  organizationId: string,
  campaignId: string,
  stepId: string,
  updates: {
    channel?: CampaignChannel
    offsetMinutes?: number
    template?: string
    skipIfReplied?: boolean
    skipIfBooked?: boolean
    metadata?: Record<string, unknown>
  },
): CampaignStepView | null => {
  const campaign = getCampaignRecord(organizationId, campaignId)
  if (!campaign) {
    return null
  }
  const step = campaign.steps.find((item) => item.id === stepId)
  if (!step) {
    return null
  }

  if (updates.channel !== undefined) {
    step.channel = updates.channel
  }
  if (updates.offsetMinutes !== undefined) {
    step.offsetMinutes = updates.offsetMinutes
  }
  if (updates.template !== undefined) {
    step.template = updates.template
  }
  if (updates.skipIfReplied !== undefined) {
    step.skipIfReplied = updates.skipIfReplied
  }
  if (updates.skipIfBooked !== undefined) {
    step.skipIfBooked = updates.skipIfBooked
  }
  if (updates.metadata !== undefined) {
    step.metadata = updates.metadata
  }
  step.updatedAt = nowIso()
  campaign.updatedAt = nowIso()
  appendEvent(campaign, 'campaign.step.updated', { stepId })
  campaigns.set(campaignId, campaign)
  return step
}

export const deleteCampaignStep = (
  organizationId: string,
  campaignId: string,
  stepId: string,
) => {
  const campaign = getCampaignRecord(organizationId, campaignId)
  if (!campaign) {
    return null
  }
  const before = campaign.steps.length
  campaign.steps = campaign.steps.filter((item) => item.id !== stepId)
  if (campaign.steps.length === before) {
    return null
  }
  campaign.updatedAt = nowIso()
  appendEvent(campaign, 'campaign.step.deleted', { stepId })
  campaigns.set(campaignId, campaign)
  return true
}

const createEnrollmentRecord = (input: {
  leadId: string
  source: 'manual' | 'list'
  sourceId: string | null
  status?: CampaignEnrollmentStatus
  contact: {
    name?: string
    phone?: string
    email?: string
  }
}): CampaignEnrollmentView => {
  const now = nowIso()
  return {
    id: randomUUID(),
    leadId: input.leadId,
    source: input.source,
    sourceId: input.sourceId,
    status: input.status || 'active',
    contact: input.contact,
    createdAt: now,
    updatedAt: now,
  }
}

export const listCampaignEnrollments = (
  organizationId: string,
  campaignId: string,
  status?: CampaignEnrollmentStatus,
) => {
  const campaign = getCampaignRecord(organizationId, campaignId)
  if (!campaign) {
    return null
  }
  if (!status) {
    return campaign.enrollments
  }
  return campaign.enrollments.filter(
    (enrollment) => enrollment.status === status,
  )
}

export const createCampaignEnrollment = (
  organizationId: string,
  campaignId: string,
  input: {
    leadId: string
    contact: {
      name?: string
      phone?: string
      email?: string
    }
  },
): CampaignEnrollmentView | null => {
  const campaign = getCampaignRecord(organizationId, campaignId)
  if (!campaign) {
    return null
  }

  const existing = campaign.enrollments.find(
    (enrollment) => enrollment.leadId === input.leadId,
  )
  if (existing) {
    return existing
  }

  const enrollment = createEnrollmentRecord({
    leadId: input.leadId,
    source: 'manual',
    sourceId: null,
    contact: input.contact,
  })

  campaign.enrollments.push(enrollment)
  campaign.updatedAt = nowIso()
  appendEvent(campaign, 'campaign.enrollment.created', {
    enrollmentId: enrollment.id,
    leadId: enrollment.leadId,
  })
  campaigns.set(campaignId, campaign)
  return enrollment
}

export const createCampaignEnrollmentsFromList = (
  organizationId: string,
  campaignId: string,
  input: {
    listId: string
    leadIds: string[]
  },
) => {
  const campaign = getCampaignRecord(organizationId, campaignId)
  if (!campaign) {
    return null
  }

  const created: CampaignEnrollmentView[] = []
  for (const leadId of input.leadIds) {
    const existing = campaign.enrollments.find(
      (enrollment) => enrollment.leadId === leadId,
    )
    if (existing) {
      continue
    }

    const enrollment = createEnrollmentRecord({
      leadId,
      source: 'list',
      sourceId: input.listId,
      contact: {},
    })
    campaign.enrollments.push(enrollment)
    created.push(enrollment)
  }

  campaign.updatedAt = nowIso()
  appendEvent(campaign, 'campaign.enrollment.bulk-created', {
    listId: input.listId,
    count: created.length,
  })
  campaigns.set(campaignId, campaign)
  return created
}

export const deleteCampaignEnrollment = (
  organizationId: string,
  campaignId: string,
  enrollmentId: string,
) => {
  const campaign = getCampaignRecord(organizationId, campaignId)
  if (!campaign) {
    return null
  }
  const before = campaign.enrollments.length
  campaign.enrollments = campaign.enrollments.filter(
    (item) => item.id !== enrollmentId,
  )
  if (campaign.enrollments.length === before) {
    return null
  }

  campaign.updatedAt = nowIso()
  appendEvent(campaign, 'campaign.enrollment.deleted', { enrollmentId })
  campaigns.set(campaignId, campaign)
  return true
}

export const getCampaignStats = (
  organizationId: string,
  campaignId: string,
): CampaignStatsView | null => {
  const campaign = getCampaignRecord(organizationId, campaignId)
  if (!campaign) {
    return null
  }

  const totals = {
    enrollments: campaign.enrollments.length,
    activeEnrollments: campaign.enrollments.filter((i) => i.status === 'active')
      .length,
    replied: campaign.enrollments.filter((i) => i.status === 'replied').length,
    unsubscribed: campaign.enrollments.filter(
      (i) => i.status === 'unsubscribed',
    ).length,
    failed: campaign.enrollments.filter((i) => i.status === 'failed').length,
  }

  const channelMix = createChannelMix()
  for (const channel of campaign.channels) {
    channelMix[channel] += 1
  }

  return {
    campaignId: campaign.id,
    organizationId: campaign.organizationId,
    totals,
    channelMix,
    updatedAt: nowIso(),
  }
}

export const getCampaignEvents = (
  organizationId: string,
  campaignId: string,
  limit: number,
) => {
  const campaign = getCampaignRecord(organizationId, campaignId)
  if (!campaign) {
    return null
  }

  return [...campaign.events]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit)
}
