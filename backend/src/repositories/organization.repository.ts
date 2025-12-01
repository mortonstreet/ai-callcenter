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
  return await db
    .insertInto('task_instance')
    .values(withIdAndTimestamps(taskInstance))
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

export const getRecordings = async (filters: {
  organizationId: string
  page: number
  limit: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}) => {
  // Get total count
  const countResult = await db
    .selectFrom('recording')
    .where('organizationId', '=', filters.organizationId)
    .select(db.fn.countAll<number>().as('count'))
    .executeTakeFirst()
  const total = Number(countResult?.count || 0)

  // Build data query
  let query = db
    .selectFrom('recording')
    .where('organizationId', '=', filters.organizationId)
    .select([
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
