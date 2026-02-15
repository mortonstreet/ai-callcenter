import { db } from '@/lib/db'
import { withId } from './utils'
import {
  DBIntegration,
  DBIntegrationSyncJob,
  DBIntegrationSyncLog,
  DBIntegrationWebhookEvent,
  InsertDBIntegration,
  InsertDBIntegrationSyncJob,
  InsertDBIntegrationSyncLog,
  InsertDBIntegrationWebhookEvent,
  UpdateDBIntegration,
  UpdateDBIntegrationSyncJob,
  UpdateDBIntegrationWebhookEvent,
} from '@shared/db/src'

export const createIntegration = async (
  data: Omit<InsertDBIntegration, 'id'>,
): Promise<DBIntegration> => {
  return db
    .insertInto('integration')
    .values(withId(data))
    .returningAll()
    .executeTakeFirstOrThrow()
}

export const findIntegrationById = async (
  id: string,
): Promise<DBIntegration | undefined> => {
  return db
    .selectFrom('integration')
    .where('id', '=', id)
    .selectAll()
    .executeTakeFirst()
}

export const findIntegrationByOrganizationAndProvider = async (
  organizationId: string,
  provider: string,
): Promise<DBIntegration | undefined> => {
  return db
    .selectFrom('integration')
    .where('organizationId', '=', organizationId)
    .where('provider', '=', provider)
    .selectAll()
    .executeTakeFirst()
}

export const listIntegrationsByOrganization = async (
  organizationId: string,
): Promise<DBIntegration[]> => {
  return db
    .selectFrom('integration')
    .where('organizationId', '=', organizationId)
    .orderBy('createdAt', 'desc')
    .selectAll()
    .execute()
}

export const updateIntegration = async (
  id: string,
  data: Omit<UpdateDBIntegration, 'id' | 'organizationId' | 'createdAt'>,
): Promise<DBIntegration | undefined> => {
  return db
    .updateTable('integration')
    .set({ ...data, updatedAt: new Date() })
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst()
}

export const createIntegrationSyncJob = async (
  data: Omit<InsertDBIntegrationSyncJob, 'id'>,
): Promise<DBIntegrationSyncJob> => {
  return db
    .insertInto('integration_sync_job')
    .values(withId(data))
    .returningAll()
    .executeTakeFirstOrThrow()
}

export const updateIntegrationSyncJob = async (
  id: string,
  data: Omit<
    UpdateDBIntegrationSyncJob,
    'id' | 'integrationId' | 'organizationId' | 'createdAt'
  >,
): Promise<DBIntegrationSyncJob | undefined> => {
  return db
    .updateTable('integration_sync_job')
    .set({ ...data, updatedAt: new Date() })
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst()
}

export const listIntegrationSyncJobs = async (
  organizationId: string,
  options?: {
    integrationId?: string
    status?: string
    limit?: number
  },
): Promise<DBIntegrationSyncJob[]> => {
  let query = db
    .selectFrom('integration_sync_job')
    .where('organizationId', '=', organizationId)

  if (options?.integrationId) {
    query = query.where('integrationId', '=', options.integrationId)
  }

  if (options?.status) {
    query = query.where('status', '=', options.status)
  }

  return query
    .orderBy('createdAt', 'desc')
    .limit(options?.limit ?? 100)
    .selectAll()
    .execute()
}

export const createIntegrationSyncLog = async (
  data: Omit<InsertDBIntegrationSyncLog, 'id'>,
): Promise<DBIntegrationSyncLog> => {
  return db
    .insertInto('integration_sync_log')
    .values(withId(data))
    .returningAll()
    .executeTakeFirstOrThrow()
}

export const listIntegrationSyncLogs = async (
  integrationId: string,
): Promise<DBIntegrationSyncLog[]> => {
  return db
    .selectFrom('integration_sync_log')
    .where('integrationId', '=', integrationId)
    .orderBy('createdAt', 'desc')
    .selectAll()
    .execute()
}

export const createIntegrationWebhookEvent = async (
  data: Omit<InsertDBIntegrationWebhookEvent, 'id'>,
): Promise<DBIntegrationWebhookEvent> => {
  return db
    .insertInto('integration_webhook_event')
    .values(withId(data))
    .returningAll()
    .executeTakeFirstOrThrow()
}

export const updateIntegrationWebhookEvent = async (
  id: string,
  data: Omit<UpdateDBIntegrationWebhookEvent, 'id' | 'organizationId' | 'createdAt'>,
): Promise<DBIntegrationWebhookEvent | undefined> => {
  return db
    .updateTable('integration_webhook_event')
    .set({ ...data, updatedAt: new Date() })
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst()
}
