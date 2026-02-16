import { db } from '@/lib/db'
import {
  Agent,
  Task,
  UpdateDBTask,
  InsertDBTask,
  DBRecording,
} from '@shared/db/src'
import { withIdAndTimestamps, withTimestamps } from './utils'

export const createAgent = async (
  agent: Omit<
    Agent,
    | 'id'
    | 'createdAt'
    | 'updatedAt'
    | 'mcpApiKey'
    | 'webhookSecret'
    | 'mcpEndpointUrl'
  > &
    Partial<Pick<Agent, 'mcpApiKey' | 'webhookSecret' | 'mcpEndpointUrl'>>,
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

// Update task instance booking status (for Cal.com webhook events)
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
