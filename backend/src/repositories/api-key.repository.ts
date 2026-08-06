import { db } from '@/lib/db'
import { withId } from './utils'
import { DBApiKey, InsertDBApiKey, UpdateDBApiKey } from '@shared/db/src'

export const createApiKeyRecord = async (
  data: Omit<InsertDBApiKey, 'id'>,
): Promise<DBApiKey> => {
  return db
    .insertInto('api_key')
    .values(withId(data))
    .returningAll()
    .executeTakeFirstOrThrow()
}

export const listApiKeyRecords = async (
  organizationId: string,
): Promise<DBApiKey[]> => {
  return db
    .selectFrom('api_key')
    .where('organizationId', '=', organizationId)
    .orderBy('createdAt', 'desc')
    .selectAll()
    .execute()
}

export const findApiKeyRecordsByPrefix = async (
  keyPrefix: string,
): Promise<DBApiKey[]> => {
  const now = new Date()

  return db
    .selectFrom('api_key')
    .where('keyPrefix', '=', keyPrefix)
    .where('revokedAt', 'is', null)
    .where((eb) =>
      eb.or([eb('expiresAt', 'is', null), eb('expiresAt', '>', now)]),
    )
    .selectAll()
    .execute()
}

export const findApiKeyRecordById = async (
  id: string,
  organizationId: string,
): Promise<DBApiKey | undefined> => {
  return db
    .selectFrom('api_key')
    .where('id', '=', id)
    .where('organizationId', '=', organizationId)
    .selectAll()
    .executeTakeFirst()
}

export const updateApiKeyRecord = async (
  id: string,
  organizationId: string,
  data: Omit<UpdateDBApiKey, 'id' | 'organizationId' | 'createdAt'>,
): Promise<DBApiKey | undefined> => {
  return db
    .updateTable('api_key')
    .set({ ...data, updatedAt: new Date() })
    .where('id', '=', id)
    .where('organizationId', '=', organizationId)
    .returningAll()
    .executeTakeFirst()
}

export const touchApiKeyLastUsedAt = async (id: string): Promise<void> => {
  await db
    .updateTable('api_key')
    .set({ lastUsedAt: new Date(), updatedAt: new Date() })
    .where('id', '=', id)
    .execute()
}
