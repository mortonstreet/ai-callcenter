import { AuthRequestHandler } from '@/types/handlers'
import * as pipelineRepository from '@/repositories/pipeline.repository'
import { updateTaskInstance } from '@/repositories/organization.repository'
import {
  GetPipelineStagesRequest,
  CreatePipelineStageRequest,
  UpdatePipelineStageRequest,
  DeletePipelineStageRequest,
  ReorderPipelineStagesRequest,
  MoveLeadToPipelineStageRequest,
  LeadType,
} from '@shared/types/src'

export const getPipelineStagesHandler: AuthRequestHandler<
  GetPipelineStagesRequest
> = async (req, res) => {
  const { organizationId } = req.validated

  let stages = await pipelineRepository.findByOrganizationId(organizationId)

  // Create default stages if none exist
  if (stages.length === 0) {
    stages = await pipelineRepository.createDefaultStages(organizationId)
  }

  // Get lead counts and total values per stage
  const stageStats = await pipelineRepository.getStageStats(organizationId)

  // Enhance stages with stats
  const stagesWithStats = stages.map((stage) => {
    const stats = stageStats.get(stage.id) || { count: 0, totalValue: 0 }
    return {
      ...stage,
      leadCount: stats.count,
      totalValue: stats.totalValue,
    }
  })

  return res.json({ data: stagesWithStats })
}

export const createPipelineStageHandler: AuthRequestHandler<
  CreatePipelineStageRequest
> = async (req, res) => {
  const { organizationId, label, color, sortOrder, isDefault } = req.validated

  // If this stage is default, clear others
  if (isDefault) {
    await pipelineRepository.clearDefaultFlag(organizationId)
  }

  const stage = await pipelineRepository.create({
    organizationId,
    label,
    color,
    sortOrder,
    isDefault,
    createdAt: new Date(),
  })

  return res.status(201).json(stage)
}

export const updatePipelineStageHandler: AuthRequestHandler<
  UpdatePipelineStageRequest
> = async (req, res) => {
  const { organizationId, id, ...updateData } = req.validated

  // Check ownership
  const existing = await pipelineRepository.findById(id)
  if (!existing || existing.organizationId !== organizationId) {
    return res.status(404).json({ error: 'Pipeline stage not found' })
  }

  // If setting as default, clear others
  if (updateData.isDefault) {
    await pipelineRepository.clearDefaultFlag(organizationId)
  }

  const stage = await pipelineRepository.update(id, updateData)

  return res.json(stage)
}

export const deletePipelineStageHandler: AuthRequestHandler<
  DeletePipelineStageRequest
> = async (req, res) => {
  const { organizationId, id } = req.validated

  // Check ownership
  const existing = await pipelineRepository.findById(id)
  if (!existing || existing.organizationId !== organizationId) {
    return res.status(404).json({ error: 'Pipeline stage not found' })
  }

  await pipelineRepository.deleteById(id)

  return res.json({ success: true })
}

export const reorderPipelineStagesHandler: AuthRequestHandler<
  ReorderPipelineStagesRequest
> = async (req, res) => {
  const { organizationId, stages } = req.validated

  // Verify all stages belong to this organization
  for (const stage of stages) {
    const existing = await pipelineRepository.findById(stage.id)
    if (!existing || existing.organizationId !== organizationId) {
      return res
        .status(404)
        .json({ error: `Pipeline stage ${stage.id} not found` })
    }
  }

  await pipelineRepository.updateSortOrders(stages)
  const updatedStages =
    await pipelineRepository.findByOrganizationId(organizationId)
  return res.json({ data: updatedStages })
}

export const moveLeadToPipelineStageHandler: AuthRequestHandler<
  MoveLeadToPipelineStageRequest
> = async (req, res) => {
  const { id, pipelineStageId } = req.validated

  // Look up stage to determine lead type changes
  const stage = await pipelineRepository.findById(pipelineStageId)

  let leadType: string | null = null
  let resolutionType: string | null = null

  // Detect closed stages by label
  if (stage) {
    const labelLower = stage.label.toLowerCase()
    if (labelLower.includes('closed') && labelLower.includes('won')) {
      leadType = LeadType.BOOKING
      resolutionType = 'resolved'
    } else if (labelLower.includes('closed') && labelLower.includes('lost')) {
      leadType = LeadType.NON_BOOKING
      resolutionType = 'unresolved'
    }
  }

  const taskInstance = await updateTaskInstance(id, {
    pipelineStageId,
    leadType,
    resolutionType,
  })

  res.json(taskInstance)
}
