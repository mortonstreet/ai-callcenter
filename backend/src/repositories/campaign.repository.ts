import { db } from '@/lib/db'
import { withId } from './utils'
import {
  DBCampaign,
  DBCampaignLead,
  DBCampaignList,
  DBCampaignOrchestration,
  DBCampaignUser,
  InsertDBCampaign,
  InsertDBCampaignLead,
  InsertDBCampaignList,
  InsertDBCampaignOrchestration,
  InsertDBCampaignUser,
  UpdateDBCampaign,
  UpdateDBCampaignLead,
  UpdateDBCampaignList,
  UpdateDBCampaignOrchestration,
  UpdateDBCampaignUser,
} from '@shared/db/src'

export const createCampaign = async (
  data: Omit<InsertDBCampaign, 'id'>,
): Promise<DBCampaign> => {
  return db
    .insertInto('campaign')
    .values(withId(data))
    .returningAll()
    .executeTakeFirstOrThrow()
}

export const findCampaignById = async (
  id: string,
): Promise<DBCampaign | undefined> => {
  return db
    .selectFrom('campaign')
    .where('id', '=', id)
    .selectAll()
    .executeTakeFirst()
}

export const listCampaignsByOrganization = async (
  organizationId: string,
): Promise<DBCampaign[]> => {
  return db
    .selectFrom('campaign')
    .where('organizationId', '=', organizationId)
    .orderBy('createdAt', 'desc')
    .selectAll()
    .execute()
}

export const updateCampaign = async (
  id: string,
  data: Omit<UpdateDBCampaign, 'id' | 'organizationId' | 'createdAt'>,
): Promise<DBCampaign | undefined> => {
  return db
    .updateTable('campaign')
    .set({ ...data, updatedAt: new Date() })
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst()
}

export const createCampaignLead = async (
  data: Omit<InsertDBCampaignLead, 'id'>,
): Promise<DBCampaignLead> => {
  return db
    .insertInto('campaign_lead')
    .values(withId(data))
    .returningAll()
    .executeTakeFirstOrThrow()
}

export const updateCampaignLead = async (
  id: string,
  data: Omit<
    UpdateDBCampaignLead,
    'id' | 'campaignId' | 'leadId' | 'organizationId' | 'createdAt'
  >,
): Promise<DBCampaignLead | undefined> => {
  return db
    .updateTable('campaign_lead')
    .set({ ...data, updatedAt: new Date() })
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst()
}

export const listCampaignLeads = async (
  campaignId: string,
): Promise<DBCampaignLead[]> => {
  return db
    .selectFrom('campaign_lead')
    .where('campaignId', '=', campaignId)
    .orderBy('createdAt', 'desc')
    .selectAll()
    .execute()
}

export const createCampaignUser = async (
  data: Omit<InsertDBCampaignUser, 'id'>,
): Promise<DBCampaignUser> => {
  return db
    .insertInto('campaign_user')
    .values(withId(data))
    .returningAll()
    .executeTakeFirstOrThrow()
}

export const updateCampaignUser = async (
  id: string,
  data: Omit<
    UpdateDBCampaignUser,
    'id' | 'campaignId' | 'userId' | 'organizationId' | 'createdAt'
  >,
): Promise<DBCampaignUser | undefined> => {
  return db
    .updateTable('campaign_user')
    .set({ ...data, updatedAt: new Date() })
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst()
}

export const listCampaignUsers = async (
  campaignId: string,
): Promise<DBCampaignUser[]> => {
  return db
    .selectFrom('campaign_user')
    .where('campaignId', '=', campaignId)
    .orderBy('createdAt', 'desc')
    .selectAll()
    .execute()
}

export const createCampaignList = async (
  data: Omit<InsertDBCampaignList, 'id'>,
): Promise<DBCampaignList> => {
  return db
    .insertInto('campaign_list')
    .values(withId(data))
    .returningAll()
    .executeTakeFirstOrThrow()
}

export const updateCampaignList = async (
  id: string,
  data: Omit<
    UpdateDBCampaignList,
    'id' | 'campaignId' | 'organizationId' | 'createdAt'
  >,
): Promise<DBCampaignList | undefined> => {
  return db
    .updateTable('campaign_list')
    .set({ ...data, updatedAt: new Date() })
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst()
}

export const listCampaignLists = async (
  campaignId: string,
): Promise<DBCampaignList[]> => {
  return db
    .selectFrom('campaign_list')
    .where('campaignId', '=', campaignId)
    .orderBy('createdAt', 'desc')
    .selectAll()
    .execute()
}

export const createCampaignOrchestration = async (
  data: Omit<InsertDBCampaignOrchestration, 'id'>,
): Promise<DBCampaignOrchestration> => {
  return db
    .insertInto('campaign_orchestration')
    .values(withId(data))
    .returningAll()
    .executeTakeFirstOrThrow()
}

export const updateCampaignOrchestration = async (
  id: string,
  data: Omit<
    UpdateDBCampaignOrchestration,
    'id' | 'campaignId' | 'organizationId' | 'createdAt'
  >,
): Promise<DBCampaignOrchestration | undefined> => {
  return db
    .updateTable('campaign_orchestration')
    .set({ ...data, updatedAt: new Date() })
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst()
}

export const findCampaignOrchestrationByCampaignId = async (
  campaignId: string,
): Promise<DBCampaignOrchestration | undefined> => {
  return db
    .selectFrom('campaign_orchestration')
    .where('campaignId', '=', campaignId)
    .selectAll()
    .executeTakeFirst()
}
