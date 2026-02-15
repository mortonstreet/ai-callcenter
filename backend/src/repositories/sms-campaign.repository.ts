import { db } from '@/lib/db'
import { withId } from './utils'
import {
  DBSmsCampaign,
  DBSmsCampaignEnrollment,
  DBSmsCampaignList,
  DBSmsCampaignMessage,
  DBSmsCampaignStep,
  InsertDBSmsCampaign,
  InsertDBSmsCampaignEnrollment,
  InsertDBSmsCampaignList,
  InsertDBSmsCampaignMessage,
  InsertDBSmsCampaignStep,
  UpdateDBSmsCampaign,
  UpdateDBSmsCampaignEnrollment,
  UpdateDBSmsCampaignList,
  UpdateDBSmsCampaignMessage,
  UpdateDBSmsCampaignStep,
} from '@shared/db/src'

export const createSmsCampaign = async (
  data: Omit<InsertDBSmsCampaign, 'id'>,
): Promise<DBSmsCampaign> => {
  return db
    .insertInto('sms_campaign')
    .values(withId(data))
    .returningAll()
    .executeTakeFirstOrThrow()
}

export const findSmsCampaignById = async (
  id: string,
): Promise<DBSmsCampaign | undefined> => {
  return db
    .selectFrom('sms_campaign')
    .where('id', '=', id)
    .selectAll()
    .executeTakeFirst()
}

export const updateSmsCampaign = async (
  id: string,
  data: Omit<
    UpdateDBSmsCampaign,
    'id' | 'campaignId' | 'organizationId' | 'createdAt'
  >,
): Promise<DBSmsCampaign | undefined> => {
  return db
    .updateTable('sms_campaign')
    .set({ ...data, updatedAt: new Date() })
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst()
}

export const createSmsCampaignStep = async (
  data: Omit<InsertDBSmsCampaignStep, 'id'>,
): Promise<DBSmsCampaignStep> => {
  return db
    .insertInto('sms_campaign_step')
    .values(withId(data))
    .returningAll()
    .executeTakeFirstOrThrow()
}

export const updateSmsCampaignStep = async (
  id: string,
  data: Omit<UpdateDBSmsCampaignStep, 'id' | 'campaignId' | 'createdAt'>,
): Promise<DBSmsCampaignStep | undefined> => {
  return db
    .updateTable('sms_campaign_step')
    .set({ ...data, updatedAt: new Date() })
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst()
}

export const listSmsCampaignSteps = async (
  campaignId: string,
): Promise<DBSmsCampaignStep[]> => {
  return db
    .selectFrom('sms_campaign_step')
    .where('campaignId', '=', campaignId)
    .orderBy('stepNumber', 'asc')
    .selectAll()
    .execute()
}

export const createSmsCampaignList = async (
  data: Omit<InsertDBSmsCampaignList, 'id'>,
): Promise<DBSmsCampaignList> => {
  return db
    .insertInto('sms_campaign_list')
    .values(withId(data))
    .returningAll()
    .executeTakeFirstOrThrow()
}

export const updateSmsCampaignList = async (
  id: string,
  data: Omit<UpdateDBSmsCampaignList, 'id' | 'campaignId' | 'createdAt'>,
): Promise<DBSmsCampaignList | undefined> => {
  return db
    .updateTable('sms_campaign_list')
    .set({ ...data, updatedAt: new Date() })
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst()
}

export const listSmsCampaignLists = async (
  campaignId: string,
): Promise<DBSmsCampaignList[]> => {
  return db
    .selectFrom('sms_campaign_list')
    .where('campaignId', '=', campaignId)
    .orderBy('createdAt', 'desc')
    .selectAll()
    .execute()
}

export const createSmsCampaignEnrollment = async (
  data: Omit<InsertDBSmsCampaignEnrollment, 'id'>,
): Promise<DBSmsCampaignEnrollment> => {
  return db
    .insertInto('sms_campaign_enrollment')
    .values(withId(data))
    .returningAll()
    .executeTakeFirstOrThrow()
}

export const updateSmsCampaignEnrollment = async (
  id: string,
  data: Omit<
    UpdateDBSmsCampaignEnrollment,
    'id' | 'campaignId' | 'leadId' | 'createdAt'
  >,
): Promise<DBSmsCampaignEnrollment | undefined> => {
  return db
    .updateTable('sms_campaign_enrollment')
    .set({ ...data, updatedAt: new Date() })
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst()
}

export const listPendingSmsCampaignEnrollments = async (
  now = new Date(),
  limit = 200,
): Promise<DBSmsCampaignEnrollment[]> => {
  return db
    .selectFrom('sms_campaign_enrollment')
    .where('status', '=', 'pending')
    .where((eb) =>
      eb.or([eb('nextSendAt', 'is', null), eb('nextSendAt', '<=', now)]),
    )
    .orderBy('nextSendAt', 'asc')
    .limit(limit)
    .selectAll()
    .execute()
}

export const createSmsCampaignMessage = async (
  data: Omit<InsertDBSmsCampaignMessage, 'id'>,
): Promise<DBSmsCampaignMessage> => {
  return db
    .insertInto('sms_campaign_message')
    .values(withId(data))
    .returningAll()
    .executeTakeFirstOrThrow()
}

export const updateSmsCampaignMessage = async (
  id: string,
  data: Omit<
    UpdateDBSmsCampaignMessage,
    'id' | 'campaignId' | 'enrollmentId' | 'leadId' | 'createdAt'
  >,
): Promise<DBSmsCampaignMessage | undefined> => {
  return db
    .updateTable('sms_campaign_message')
    .set({ ...data, updatedAt: new Date() })
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst()
}
