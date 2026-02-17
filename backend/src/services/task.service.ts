import {
  createTaskInstance as createTaskInstanceRepository,
  findTaskById,
  updateTaskInstance as updateTaskInstanceRepository,
} from '@/repositories/organization.repository'
import { McpCreateTaskInput } from '@/types/mcp'
import {
  TaskStatus,
  LeadType,
  PipelineStage,
  CustomerType,
} from '@shared/types/src'
import { findById as findUserById } from '@/repositories/user.repository'
import { sendTaskInstanceToDispatcher } from '@/clients/email.client'

// Lead scoring based on service type and customer info
const calculateLeadScore = (serviceArgs: Record<string, unknown>): number => {
  let score = 50 // Base score

  // Commercial properties are typically higher value
  const locationType =
    serviceArgs['location-status'] || serviceArgs['locationType']
  if (locationType === 'commercial') {
    score += 20
  }

  // Has complete contact info
  if (serviceArgs['email-address'] || serviceArgs['customerEmail']) {
    score += 10
  }
  if (serviceArgs['phone-number'] || serviceArgs['customerPhone']) {
    score += 10
  }
  if (serviceArgs['address'] || serviceArgs['customerAddress']) {
    score += 10
  }

  return Math.min(score, 100)
}

// Estimate revenue based on service type and location
const estimateRevenue = (
  serviceArgs: Record<string, unknown>,
  taskName?: string,
): number => {
  let baseValue = 200 // Base inspection value

  const locationType =
    serviceArgs['location-status'] || serviceArgs['locationType']
  if (locationType === 'commercial') {
    baseValue = 500 // Commercial jobs are higher value
  }

  // Adjust based on service type
  const serviceName = (taskName || '').toLowerCase()
  if (serviceName.includes('wildlife') || serviceName.includes('removal')) {
    baseValue *= 1.5
  }
  if (serviceName.includes('termite')) {
    baseValue *= 2
  }

  return baseValue
}

// Determine initial tags based on input
const generateInitialTags = (
  serviceArgs: Record<string, unknown>,
): string[] => {
  const tags: string[] = ['human_caller'] // Default - will be updated if robo detected

  const locationType =
    serviceArgs['location-status'] || serviceArgs['locationType']
  if (locationType === 'commercial') {
    tags.push('commercial')
  } else {
    tags.push('residential')
  }

  return tags
}

export const createTaskInstance = async (
  input: McpCreateTaskInput,
  organizationId: string,
) => {
  const task = await findTaskById(input.serviceId, organizationId)
  if (!task) {
    throw new Error('Task not found')
  }

  const leadScore = calculateLeadScore(input.serviceArgs)
  const estimatedValue = estimateRevenue(input.serviceArgs, task.name)
  const tags = generateInitialTags(input.serviceArgs)

  const taskInstance = await createTaskInstanceRepository({
    taskId: task.id,
    status: TaskStatus.PENDING,
    info: input.serviceArgs,
    requiredInfo: JSON.stringify(task.requiredInfo),
    conversationId: input.conversationId,
    callSid: input.callSid || null,
    dispatcherId: task.dispatcherUserId || null,
    organizationId: task.organizationId,
    // New lead fields
    leadType: null, // Will be set to "booking" when appointment is booked
    resolutionType: null, // Will be set based on outcome
    customerType: CustomerType.NEW_CUSTOMER, // Default to new, can be updated
    leadScore,
    estimatedValue,
    tags: JSON.stringify(tags),
    pipelineStage: PipelineStage.NEW,
    pipelineStageId: null,
    calcomBookingId: null,
    calcomEventId: null,
    appointmentTime: null,
    // Booking status fields
    bookingStatus: null,
    bookingCancelledAt: null,
    bookingCancelReason: null,
  })
  return taskInstance
}

// Update task instance with booking info after Cal.com booking
// Sets pipeline to BOOKED (not DISPATCHED - that happens when team is sent out)
export const updateTaskInstanceWithBooking = async (
  taskInstanceId: string,
  bookingInfo: {
    calcomBookingId: string
    calcomEventId?: number
    appointmentTime: Date
  },
) => {
  return await updateTaskInstanceRepository(taskInstanceId, {
    leadType: LeadType.BOOKING,
    resolutionType: 'resolved',
    pipelineStage: PipelineStage.BOOKED, // Booked, not dispatched yet
    calcomBookingId: bookingInfo.calcomBookingId,
    calcomEventId: bookingInfo.calcomEventId || null,
    appointmentTime: bookingInfo.appointmentTime,
  })
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
