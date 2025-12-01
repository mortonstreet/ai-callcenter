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
  agent: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>,
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

export const deleteTask = async (id: string, organizationId: string) => {
  return await db
    .deleteFrom('task')
    .where('id', '=', id)
    .where('organizationId', '=', organizationId)
    .returningAll()
    .executeTakeFirstOrThrow()
}

export const createRecording = async (
  recording: Omit<DBRecording, 'id' | 'createdAt' | 'updatedAt'>,
) => {
  return await db
    .insertInto('recording')
    .values(withIdAndTimestamps(recording))
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
