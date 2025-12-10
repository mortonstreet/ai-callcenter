import { db } from '@/lib/db'
import {
  DBTaskInstance,
  InsertDBOrganization,
  DBInvitation,
} from '@shared/db/src'
import { withIdAndTimestamps, withId } from './utils'

export const findById = async (id: string) => {
  return await db
    .selectFrom('organization')
    .where('id', '=', id)
    .selectAll()
    .executeTakeFirstOrThrow()
}

export const findMember = async (organizationId: string, userId: string) => {
  return await db
    .selectFrom('member')
    .where('organizationId', '=', organizationId)
    .where('userId', '=', userId)
    .selectAll()
    .executeTakeFirst()
}

export const findTasksByOrganizationId = async (organizationId: string) => {
  return await db
    .selectFrom('task')
    .where('organizationId', '=', organizationId)
    .selectAll()
    .execute()
}

export const findAgentsByOrganization = async (organizationId: string) => {
  return await db
    .selectFrom('agent')
    .where('organizationId', '=', organizationId)
    .selectAll()
    .execute()
}

export const createOrganization = async (
  organization: Omit<InsertDBOrganization, 'id'>,
) => {
  return await db
    .insertInto('organization')
    .values(withId(organization))
    .returningAll()
    .executeTakeFirstOrThrow()
}

export const createInvitation = async (
  invitation: Omit<DBInvitation, 'id'>,
) => {
  return await db
    .insertInto('invitation')
    .values(withId(invitation))
    .returningAll()
    .executeTakeFirstOrThrow()
}

export const findTaskById = async (id: string, organizationId: string) => {
  return await db
    .selectFrom('task')
    .where('id', '=', id)
    .where('organizationId', '=', organizationId)
    .selectAll()
    .executeTakeFirst()
}

export const createTaskInstance = async (
  taskInstance: Omit<DBTaskInstance, 'id' | 'createdAt' | 'updatedAt'>,
) => {
  const now = new Date()
  return await db
    .insertInto('task_instance')
    .values({
      ...withIdAndTimestamps(taskInstance, true),
      createdAt: now, // Explicitly set to avoid timezone issues
      updatedAt: now,
    })
    .returningAll()
    .executeTakeFirstOrThrow()
}

export const getTaskInstanceById = async (
  id: string,
  organizationId: string,
) => {
  const taskInstance = await db
    .selectFrom('task_instance')
    .leftJoin('user', 'user.id', 'task_instance.dispatcherId')
    .where('task_instance.id', '=', id)
    .where('task_instance.organizationId', '=', organizationId)
    .select([
      'task_instance.id',
      'task_instance.taskId',
      'task_instance.status',
      'task_instance.info',
      'task_instance.requiredInfo',
      'task_instance.conversationId',
      'task_instance.callSid',
      'task_instance.dispatcherId',
      'task_instance.createdAt',
      'task_instance.updatedAt',
      'task_instance.organizationId',
      'user.name as dispatcherName',
      'user.email as dispatcherEmail',
      // Lead fields
      'task_instance.leadType',
      'task_instance.resolutionType',
      'task_instance.customerType',
      'task_instance.leadScore',
      'task_instance.estimatedValue',
      // Cal.com booking fields
      'task_instance.calcomBookingId',
      'task_instance.calcomEventId',
      'task_instance.appointmentTime',
      // Tags and pipeline
      'task_instance.tags',
      'task_instance.pipelineStage',
    ])
    .executeTakeFirst()

  return taskInstance
}

export const getTaskInstanceWithDetails = async (
  id: string,
  organizationId: string,
) => {
  // Get task instance
  const taskInstance = await getTaskInstanceById(id, organizationId)

  if (!taskInstance) {
    return null
  }

  // Get the full task
  const task = await db
    .selectFrom('task')
    .where('id', '=', taskInstance.taskId)
    .where('organizationId', '=', organizationId)
    .selectAll()
    .executeTakeFirst()

  // Get recording by conversationId if it exists
  const recording = await db
    .selectFrom('recording')
    .where('conversationId', '=', taskInstance.conversationId)
    .where('organizationId', '=', organizationId)
    .select([
      'id',
      'conversationId',
      'callSid',
      'taskInstanceId',
      'organizationId',
      'callDurationSeconds',
      'transcriptSummary',
      'payload',
      'callQuality',
      'callQualityReason',
      'createdAt',
      'updatedAt',
    ])
    .executeTakeFirst()

  return {
    taskInstance,
    task,
    recording: recording || null,
  }
}

export const getTaskInstances = async (filters: {
  organizationId: string
  taskId?: string
  dispatcherId?: string
  status?: string
  search?: string
  page: number
  limit: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  startDate?: string
  endDate?: string
}) => {
  // Build base query with filters
  let baseQuery = db
    .selectFrom('task_instance')
    .innerJoin('task', 'task.id', 'task_instance.taskId')
    .where('task_instance.organizationId', '=', filters.organizationId)

  // Apply filters
  if (filters.taskId) {
    baseQuery = baseQuery.where('task_instance.taskId', '=', filters.taskId)
  }
  if (filters.dispatcherId) {
    baseQuery = baseQuery.where(
      'task_instance.dispatcherId',
      '=',
      filters.dispatcherId,
    )
  }
  if (filters.status) {
    baseQuery = baseQuery.where('task_instance.status', '=', filters.status)
  }
  if (filters.search) {
    baseQuery = baseQuery.where('task.name', 'ilike', `%${filters.search}%`)
  }
  if (filters.startDate) {
    baseQuery = baseQuery.where('task_instance.createdAt', '>=', new Date(filters.startDate))
  }
  if (filters.endDate) {
    baseQuery = baseQuery.where('task_instance.createdAt', '<=', new Date(filters.endDate))
  }

  // Get total count - separate query
  const countResult = await baseQuery
    .select(db.fn.countAll<number>().as('count'))
    .executeTakeFirst()
  const total = Number(countResult?.count || 0)

  // Build data query with all joins and selections
  let dataQuery = baseQuery
    .leftJoin('user', 'user.id', 'task_instance.dispatcherId')
    .select([
      'task_instance.id',
      'task_instance.taskId',
      'task_instance.status',
      'task_instance.info',
      'task_instance.conversationId',
      'task_instance.callSid',
      'task_instance.dispatcherId',
      'task_instance.createdAt',
      'task_instance.updatedAt',
      'task.name as taskName',
      'user.name as dispatcherName',
      'user.email as dispatcherEmail',
      // Lead fields
      'task_instance.leadType',
      'task_instance.resolutionType',
      'task_instance.customerType',
      'task_instance.leadScore',
      'task_instance.estimatedValue',
      // Cal.com booking fields
      'task_instance.calcomBookingId',
      'task_instance.calcomEventId',
      'task_instance.appointmentTime',
      // Tags and pipeline
      'task_instance.tags',
      'task_instance.pipelineStage',
    ])

  // Apply sorting
  const sortBy = filters.sortBy || 'createdAt'
  const sortOrder = filters.sortOrder || 'desc'
  dataQuery = dataQuery.orderBy(`task_instance.${sortBy}` as any, sortOrder)

  // Apply pagination
  const offset = (filters.page - 1) * filters.limit
  dataQuery = dataQuery.limit(filters.limit).offset(offset)

  const data = await dataQuery.execute()

  return {
    data,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.ceil(total / filters.limit),
      hasNextPage: filters.page * filters.limit < total,
      hasPrevPage: filters.page > 1,
    },
  }
}

export const updateTaskInstanceStatus = async (
  id: string,
  organizationId: string,
  status: string,
) => {
  return await db
    .updateTable('task_instance')
    .set({ status, updatedAt: new Date() })
    .where('id', '=', id)
    .where('organizationId', '=', organizationId)
    .returningAll()
    .executeTakeFirstOrThrow()
}

// General update for task instance - used for lead fields, booking info, etc.
export const updateTaskInstance = async (
  id: string,
  updates: {
    status?: string
    leadType?: string | null
    resolutionType?: string | null
    customerType?: string | null
    leadScore?: number | null
    estimatedValue?: number | null
    calcomBookingId?: string | null
    calcomEventId?: number | null
    appointmentTime?: Date | null
    tags?: string | null
    pipelineStage?: string | null
  },
) => {
  return await db
    .updateTable('task_instance')
    .set({ ...updates, updatedAt: new Date() })
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirstOrThrow()
}

export const getRecordings = async (filters: {
  organizationId: string
  page: number
  limit: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  startDate?: string
  endDate?: string
}) => {
  // Build base query with date filters for counting
  let countQuery = db
    .selectFrom('recording')
    .where('organizationId', '=', filters.organizationId)
  
  if (filters.startDate) {
    countQuery = countQuery.where('createdAt', '>=', new Date(filters.startDate))
  }
  if (filters.endDate) {
    countQuery = countQuery.where('createdAt', '<=', new Date(filters.endDate))
  }
  
  // Get total count
  const countResult = await countQuery
    .select(db.fn.countAll<number>().as('count'))
    .executeTakeFirst()
  const total = Number(countResult?.count || 0)

  // Build data query
  let query = db
    .selectFrom('recording')
    .where('organizationId', '=', filters.organizationId)
  
  if (filters.startDate) {
    query = query.where('createdAt', '>=', new Date(filters.startDate))
  }
  if (filters.endDate) {
    query = query.where('createdAt', '<=', new Date(filters.endDate))
  }
  
  query = query.select([
      'id',
      'conversationId',
      'callSid',
      'taskInstanceId',
      'organizationId',
      'callDurationSeconds',
      'transcriptSummary',
      'payload',
      'createdAt',
      'updatedAt',
    ])

  // Apply sorting
  const sortBy = filters.sortBy || 'createdAt'
  const sortOrder = filters.sortOrder || 'desc'
  query = query.orderBy(sortBy as any, sortOrder)

  // Apply pagination
  const offset = (filters.page - 1) * filters.limit
  query = query.limit(filters.limit).offset(offset)

  const data = await query.execute()

  return {
    data,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.ceil(total / filters.limit),
      hasNextPage: filters.page * filters.limit < total,
      hasPrevPage: filters.page > 1,
    },
  }
}

// Update recording call quality (manual override)
export const updateRecordingQuality = async (
  recordingId: string,
  organizationId: string,
  updates: {
    callQuality: string
    callQualityReason?: string
  },
) => {
  return await db
    .updateTable('recording')
    .set({
      callQuality: updates.callQuality,
      callQualityReason: updates.callQualityReason || 'Manually updated',
      updatedAt: new Date(),
    })
    .where('id', '=', recordingId)
    .where('organizationId', '=', organizationId)
    .returningAll()
    .executeTakeFirstOrThrow()
}

// Get all leads with recording data for CSV export
export const getLeadsForExport = async (
  organizationId: string,
  startDate?: string,
  endDate?: string,
) => {
  // First, get all task instances
  let taskQuery = db
    .selectFrom('task_instance')
    .where('task_instance.organizationId', '=', organizationId)
  
  // Apply date filters
  if (startDate) {
    taskQuery = taskQuery.where('task_instance.createdAt', '>=', new Date(startDate))
  }
  if (endDate) {
    taskQuery = taskQuery.where('task_instance.createdAt', '<=', new Date(endDate))
  }
  
  const tasks = await taskQuery
    .select([
      'task_instance.id',
      'task_instance.info',
      'task_instance.pipelineStage',
      'task_instance.estimatedValue',
      'task_instance.leadScore',
      'task_instance.appointmentTime',
      'task_instance.createdAt',
      'task_instance.conversationId',
    ])
    .orderBy('task_instance.createdAt', 'desc')
    .execute()

  // Get all recordings for this organization
  let recordingQuery = db
    .selectFrom('recording')
    .where('recording.organizationId', '=', organizationId)
  
  if (startDate) {
    recordingQuery = recordingQuery.where('recording.createdAt', '>=', new Date(startDate))
  }
  if (endDate) {
    recordingQuery = recordingQuery.where('recording.createdAt', '<=', new Date(endDate))
  }
  
  const recordings = await recordingQuery
    .select([
      'recording.id',
      'recording.taskInstanceId',
      'recording.conversationId',
      'recording.callDurationSeconds',
      'recording.transcriptSummary',
      'recording.payload',
    ])
    .execute()

  // Create maps of recordings for quick lookup
  const recordingByTaskId = new Map<string, typeof recordings[0]>()
  const recordingByConvId = new Map<string, typeof recordings[0]>()
  const recordingByPhone = new Map<string, typeof recordings[0]>()
  const recordingByEmail = new Map<string, typeof recordings[0]>()
  
  for (const rec of recordings) {
    if (rec.taskInstanceId) {
      recordingByTaskId.set(rec.taskInstanceId, rec)
    }
    if (rec.conversationId) {
      recordingByConvId.set(rec.conversationId, rec)
    }
    // Extract customer data from ElevenLabs data_collection_results
    const payload = rec.payload as Record<string, any> | null
    const dataCollection = payload?.analysis?.data_collection_results
    
    // Try phone number
    const phoneNumber = dataCollection?.customer_phone?.value ||
                       payload?.metadata?.phone_call?.from_number
    if (phoneNumber) {
      // Normalize phone number (remove non-digits)
      const normalizedPhone = String(phoneNumber).replace(/\D/g, '')
      recordingByPhone.set(normalizedPhone, rec)
    }
    
    // Try email
    const email = dataCollection?.customer_email?.value
    if (email) {
      recordingByEmail.set(email.toLowerCase(), rec)
    }
  }

  // Helper to normalize phone numbers for comparison
  const normalizePhone = (phone: string | undefined | null): string => {
    if (!phone) return ''
    return phone.replace(/\D/g, '')
  }

  // Match recordings to tasks
  const leads = tasks.map(task => {
    // Try to find a matching recording by multiple methods
    let recording = recordingByTaskId.get(task.id)
    
    if (!recording && task.conversationId) {
      recording = recordingByConvId.get(task.conversationId)
    }
    
    const taskInfo = task.info as Record<string, any> | null
    
    // Try matching by phone number from task info
    if (!recording) {
      const taskPhone = taskInfo?.['phone-number'] || taskInfo?.phone || taskInfo?.phoneNumber
      if (taskPhone) {
        const normalizedTaskPhone = normalizePhone(taskPhone)
        recording = recordingByPhone.get(normalizedTaskPhone)
      }
    }
    
    // Try matching by email from task info
    if (!recording) {
      const taskEmail = taskInfo?.['email-address'] || taskInfo?.email || taskInfo?.emailAddress
      if (taskEmail) {
        recording = recordingByEmail.get(taskEmail.toLowerCase())
      }
    }
    
    return {
      ...task,
      recordingDuration: recording?.callDurationSeconds || null,
      transcriptSummary: recording?.transcriptSummary || null,
      recordingPayload: recording?.payload || null,
    }
  })

  return leads
}
