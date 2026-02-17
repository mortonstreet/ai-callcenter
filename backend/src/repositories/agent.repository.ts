import { db } from '@/lib/db'
import {
  Agent,
  Task,
  UpdateDBTask,
  InsertDBTask,
  InsertDBAgent,
  UpdateDBAgent,
  DBRecording,
} from '@shared/db/src'
import { sql } from 'kysely'
import { withIdAndTimestamps, withTimestamps } from './utils'

export const createAgent = async (
  agent: Omit<InsertDBAgent, 'id' | 'createdAt' | 'updatedAt'>,
) => {
  const newAgent = await db
    .insertInto('agent')
    .values(withIdAndTimestamps(agent))
    .returningAll()
    .executeTakeFirstOrThrow()
  return newAgent
}

export const findAllByOrganizationId = async (organizationId: string) => {
  return await db
    .selectFrom('agent')
    .where('organizationId', '=', organizationId)
    .selectAll()
    .execute()
}

export const findById = async (id: string, organizationId: string) => {
  return await db
    .selectFrom('agent')
    .where('id', '=', id)
    .where('organizationId', '=', organizationId)
    .selectAll()
    .executeTakeFirstOrThrow()
}

export const createTask = async (
  task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>,
) => {
  const newTask = await db
    .insertInto('task')
    .values(withIdAndTimestamps(task))
    .returningAll()
    .executeTakeFirstOrThrow()
  return newTask
}

export const getAgentTasks = async (
  agentId: string,
  organizationId: string,
) => {
  return await db
    .selectFrom('task')
    .where('agentId', '=', agentId)
    .where('organizationId', '=', organizationId)
    .selectAll()
    .execute()
}

export const updateTask = async (id: string, task: UpdateDBTask) => {
  return await db
    .updateTable('task')
    .set(withTimestamps(task))
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirstOrThrow()
}

export const deleteAgent = async (id: string, organizationId: string) => {
  return await db
    .deleteFrom('agent')
    .where('id', '=', id)
    .where('organizationId', '=', organizationId)
    .returningAll()
    .executeTakeFirstOrThrow()
}

export const deleteTask = async (id: string, organizationId: string) => {
  return await db
    .deleteFrom('task')
    .where('id', '=', id)
    .where('organizationId', '=', organizationId)
    .returningAll()
    .executeTakeFirstOrThrow()
}

export const createRecording = async (
  recording: Omit<DBRecording, 'id' | 'createdAt' | 'updatedAt'> & {
    createdAt?: Date
  },
) => {
  const { createdAt, ...rest } = recording
  return await db
    .insertInto('recording')
    .values({
      ...withIdAndTimestamps(rest),
      createdAt: createdAt || new Date(),
      updatedAt: new Date(),
    })
    .returningAll()
    .executeTakeFirstOrThrow()
}

export const findAgentByExternalId = async (
  externalId: string,
  externalType: string = 'elevenlabs',
) => {
  return await db
    .selectFrom('agent')
    .where('externalId', '=', externalId)
    .where('externalType', '=', externalType)
    .selectAll()
    .executeTakeFirst()
}

// Find agent by MCP API key - for authenticating MCP requests
export const findAgentByMcpApiKey = async (mcpApiKey: string) => {
  return await db
    .selectFrom('agent')
    .where('mcpApiKey', '=', mcpApiKey)
    .selectAll()
    .executeTakeFirst()
}

// Find agent by ID only (for webhook lookups where we know the agent)
export const findAgentByIdOnly = async (id: string) => {
  return await db
    .selectFrom('agent')
    .where('id', '=', id)
    .selectAll()
    .executeTakeFirst()
}

// Update agent MCP credentials
export const updateAgentMcpCredentials = async (
  id: string,
  credentials: {
    mcpApiKey?: string | null
    webhookSecret?: string | null
    mcpEndpointUrl?: string | null
  },
) => {
  return await db
    .updateTable('agent')
    .set({
      ...credentials,
      updatedAt: new Date(),
    })
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirstOrThrow()
}

export const findTaskInstanceByConversationId = async (
  conversationId: string,
  organizationId: string,
) => {
  return await db
    .selectFrom('task_instance')
    .where('conversationId', '=', conversationId)
    .where('organizationId', '=', organizationId)
    .selectAll()
    .executeTakeFirst()
}

// Find task instance by Cal.com booking ID
export const findTaskInstanceByBookingId = async (bookingId: string) => {
  return await db
    .selectFrom('task_instance')
    .where('calcomBookingId', '=', bookingId)
    .selectAll()
    .executeTakeFirst()
}

// Update agent fields
export const updateAgent = async (
  id: string,
  organizationId: string,
  updates: Partial<{
    name: string
    slug: string
    industry: string | null
    useCase: string | null
    website: string | null
    mainGoal: string | null
    voiceId: string | null
    status: string
    externalId: string
    externalType: string
    phoneNumber: string
    redirectNumber: string
    syncPending: boolean
    lastSyncAt: Date | null
    lastSyncError: string | null
    providerCorrelationKey: string | null
  }>,
) => {
  return await db
    .updateTable('agent')
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where('id', '=', id)
    .where('organizationId', '=', organizationId)
    .returningAll()
    .executeTakeFirstOrThrow()
}

// Delete agent
export const deleteAgent = async (id: string, organizationId: string) => {
  return await db
    .deleteFrom('agent')
    .where('id', '=', id)
    .where('organizationId', '=', organizationId)
    .returningAll()
    .executeTakeFirstOrThrow()
}

// Get recording aggregates for analytics
export const getRecordingAggregates = async (
  organizationId: string,
  agentExternalId: string,
  startDate?: string,
  endDate?: string,
) => {
  let query = db
    .selectFrom('recording')
    .where('recording.organizationId', '=', organizationId)

  if (startDate) {
    query = query.where('recording.createdAt', '>=', new Date(startDate))
  }
  if (endDate) {
    query = query.where('recording.createdAt', '<=', new Date(endDate))
  }

  const result = await query
    .select([
      sql<number>`count(*)`.as('totalCalls'),
      sql<number>`coalesce(avg("callDurationSeconds"), 0)`.as('avgDuration'),
      sql<number>`coalesce(sum(cost), 0)`.as('totalCost'),
      sql<number>`coalesce(avg(cost), 0)`.as('avgCost'),
      sql<number>`count(case when "callQuality" = 'productive' then 1 end)`.as(
        'productiveCalls',
      ),
    ])
    .executeTakeFirst()

  return result
}

// Get recording time series for analytics charts
export const getRecordingTimeSeries = async (
  organizationId: string,
  startDate?: string,
  endDate?: string,
  granularity: 'hour' | 'day' | 'week' | 'month' = 'day',
) => {
  const truncFn =
    granularity === 'hour'
      ? `date_trunc('hour', "createdAt")`
      : granularity === 'week'
        ? `date_trunc('week', "createdAt")`
        : granularity === 'month'
          ? `date_trunc('month', "createdAt")`
          : `date_trunc('day', "createdAt")`

  let query = db
    .selectFrom('recording')
    .where('recording.organizationId', '=', organizationId)

  if (startDate) {
    query = query.where('recording.createdAt', '>=', new Date(startDate))
  }
  if (endDate) {
    query = query.where('recording.createdAt', '<=', new Date(endDate))
  }

  const results = await query
    .select([
      sql<string>`${sql.raw(truncFn)}`.as('period'),
      sql<number>`count(*)`.as('calls'),
      sql<number>`coalesce(avg("callDurationSeconds"), 0)`.as('avgDuration'),
      sql<number>`coalesce(sum(cost), 0)`.as('totalCost'),
    ])
    .groupBy(sql`${sql.raw(truncFn)}`)
    .orderBy(sql`${sql.raw(truncFn)}`, 'asc')
    .execute()

  return results
}

// Update task instance booking status (for Cal.com webhook events)
export const findFirstTaskByAgentId = async (
  agentId: string,
  organizationId: string,
) => {
  return await db
    .selectFrom('task')
    .where('agentId', '=', agentId)
    .where('organizationId', '=', organizationId)
    .selectAll()
    .executeTakeFirst()
}

export const updateTaskInstanceBookingStatus = async (
  id: string,
  updates: {
    bookingStatus?: string | null
    bookingCancelledAt?: Date | null
    bookingCancelReason?: string | null
    pipelineStage?: string | null
    appointmentTime?: Date | null
  },
) => {
  return await db
    .updateTable('task_instance')
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirstOrThrow()
}
