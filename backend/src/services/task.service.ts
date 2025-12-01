import {
  createTaskInstance as createTaskInstanceRepository,
  findTaskById,
} from '@/repositories/organization.repository'
import { McpCreateTaskInput } from '@/types/mcp'
import { TaskStatus } from '@shared/types/src'
import { findById as findUserById } from '@/repositories/user.repository'
import { sendTaskInstanceToDispatcher } from '@/clients/email.client'

export const createTaskInstance = async (
  input: McpCreateTaskInput,
  organizationId: string,
) => {
  const task = await findTaskById(input.serviceId, organizationId)
  if (!task) {
    throw new Error('Task not found')
  }
  const taskInstance = await createTaskInstanceRepository({
    taskId: task.id,
    status: TaskStatus.PENDING,
    info: input.serviceArgs,
    requiredInfo: JSON.stringify(task.requiredInfo),
    conversationId: input.conversationId,
    callSid: input.callSid || null,
    dispatcherId: task.dispatcherUserId || null,
    organizationId: task.organizationId,
  })
  return taskInstance
}

export const createTaskInstanceWithDispatcher = async (
  input: McpCreateTaskInput,
  organizationId: string,
) => {
  const task = await findTaskById(input.serviceId, organizationId)
  if (!task) {
    throw new Error('Task not found')
  }

  const taskInstance = await createTaskInstance(input, organizationId)

  if (taskInstance.dispatcherId) {
    const dispatcher = await findUserById(taskInstance.dispatcherId)
    if (dispatcher) {
      // Need to include task info for the email
      await sendTaskInstanceToDispatcher(
        { ...taskInstance, task: { name: task.name } } as any,
        dispatcher,
      )
    }
  }

  return taskInstance
}
