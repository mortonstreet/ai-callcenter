import { AuthRequestHandler } from '@/types/handlers'
import {
  GetTaskInstancesRequest,
  GetTaskInstanceRequest,
  UpdateTaskInstanceStatusRequest,
  GetRecordingsRequest,
} from '@shared/types/src'
import {
  getTaskInstances,
  getTaskInstanceWithDetails,
  updateTaskInstanceStatus,
  getRecordings,
} from '@/repositories/organization.repository'

export const getTaskInstancesHandler: AuthRequestHandler<
  GetTaskInstancesRequest
> = async (req, res) => {
  const {
    organizationId,
    taskId,
    dispatcherId,
    status,
    search,
    page,
    limit,
    sortBy,
    sortOrder,
  } = req.validated

  const result = await getTaskInstances({
    organizationId,
    taskId,
    dispatcherId,
    status,
    search,
    page: page || 1,
    limit: limit || 20,
    sortBy,
    sortOrder,
  })

  res.json(result)
}

export const updateTaskInstanceStatusHandler: AuthRequestHandler<
  UpdateTaskInstanceStatusRequest
> = async (req, res) => {
  const { id, organizationId, status } = req.validated

  const taskInstance = await updateTaskInstanceStatus(
    id,
    organizationId,
    status,
  )

  res.json(taskInstance)
}

export const getTaskInstanceHandler: AuthRequestHandler<
  GetTaskInstanceRequest
> = async (req, res) => {
  const { id, organizationId } = req.validated

  const result = await getTaskInstanceWithDetails(id, organizationId)

  if (!result) {
    return res.status(404).json({ error: 'Task instance not found' })
  }

  res.json(result)
}

export const getRecordingsHandler: AuthRequestHandler<
  GetRecordingsRequest
> = async (req, res) => {
  const { organizationId, page, limit, sortBy, sortOrder } = req.validated

  const result = await getRecordings({
    organizationId,
    page: page || 1,
    limit: limit || 20,
    sortBy,
    sortOrder,
  })

  res.json(result)
}
