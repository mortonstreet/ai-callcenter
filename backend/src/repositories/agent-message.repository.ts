import { db } from '@/lib/db'
import { withId } from './utils'
import {
  DBAgentEmailConfig,
  DBAgentMessage,
  DBAgentWorkflow,
  InsertDBAgentEmailConfig,
  InsertDBAgentMessage,
  InsertDBAgentWorkflow,
  UpdateDBAgentEmailConfig,
  UpdateDBAgentMessage,
  UpdateDBAgentWorkflow,
} from '@shared/db/src'

export const createAgentEmailConfig = async (
  data: Omit<InsertDBAgentEmailConfig, 'id'>,
): Promise<DBAgentEmailConfig> => {
  return db
    .insertInto('agent_email_config')
    .values(withId(data))
    .returningAll()
    .executeTakeFirstOrThrow()
}

export const findAgentEmailConfigByAgentId = async (
  agentId: string,
): Promise<DBAgentEmailConfig | undefined> => {
  return db
    .selectFrom('agent_email_config')
    .where('agentId', '=', agentId)
    .selectAll()
    .executeTakeFirst()
}

export const updateAgentEmailConfig = async (
  id: string,
  data: Omit<
    UpdateDBAgentEmailConfig,
    'id' | 'agentId' | 'organizationId' | 'createdAt'
  >,
): Promise<DBAgentEmailConfig | undefined> => {
  return db
    .updateTable('agent_email_config')
    .set({ ...data, updatedAt: new Date() })
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst()
}

export const createAgentMessage = async (
  data: Omit<InsertDBAgentMessage, 'id'>,
): Promise<DBAgentMessage> => {
  return db
    .insertInto('agent_message')
    .values(withId(data))
    .returningAll()
    .executeTakeFirstOrThrow()
}

export const findAgentMessageById = async (
  id: string,
): Promise<DBAgentMessage | undefined> => {
  return db
    .selectFrom('agent_message')
    .where('id', '=', id)
    .selectAll()
    .executeTakeFirst()
}

export const listAgentMessagesByAgent = async (
  agentId: string,
  limit = 100,
): Promise<DBAgentMessage[]> => {
  return db
    .selectFrom('agent_message')
    .where('agentId', '=', agentId)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .selectAll()
    .execute()
}

export const updateAgentMessage = async (
  id: string,
  data: Omit<
    UpdateDBAgentMessage,
    'id' | 'organizationId' | 'agentId' | 'createdAt'
  >,
): Promise<DBAgentMessage | undefined> => {
  return db
    .updateTable('agent_message')
    .set({ ...data, updatedAt: new Date() })
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst()
}

export const createAgentWorkflow = async (
  data: Omit<InsertDBAgentWorkflow, 'id'>,
): Promise<DBAgentWorkflow> => {
  return db
    .insertInto('agent_workflow')
    .values(withId(data))
    .returningAll()
    .executeTakeFirstOrThrow()
}

export const findAgentWorkflowByAgentAndName = async (
  agentId: string,
  name: string,
): Promise<DBAgentWorkflow | undefined> => {
  return db
    .selectFrom('agent_workflow')
    .where('agentId', '=', agentId)
    .where('name', '=', name)
    .selectAll()
    .executeTakeFirst()
}

export const updateAgentWorkflow = async (
  id: string,
  data: Omit<
    UpdateDBAgentWorkflow,
    'id' | 'agentId' | 'organizationId' | 'createdAt'
  >,
): Promise<DBAgentWorkflow | undefined> => {
  return db
    .updateTable('agent_workflow')
    .set({ ...data, updatedAt: new Date() })
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst()
}
