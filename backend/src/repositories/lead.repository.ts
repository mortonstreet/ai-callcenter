import { db } from '@/lib/db'
import { withId } from './utils'
import { DBLead, InsertDBLead, UpdateDBLead } from '@shared/db/src'
import { sql } from 'kysely'

export const create = async (
  data: Omit<InsertDBLead, 'id'>,
): Promise<DBLead> => {
  return db
    .insertInto('lead')
    .values(withId(data))
    .returningAll()
    .executeTakeFirstOrThrow()
}

export const findById = async (id: string): Promise<DBLead | undefined> => {
  return db
    .selectFrom('lead')
    .where('id', '=', id)
    .where('deletedAt', 'is', null)
    .selectAll()
    .executeTakeFirst()
}

export const findByOrganizationAndIntegrationExternalId = async (
  organizationId: string,
  provider: string,
  externalId: string,
): Promise<DBLead | undefined> => {
  return db
    .selectFrom('lead')
    .where('organizationId', '=', organizationId)
    .where('deletedAt', 'is', null)
    .where(
      sql<boolean>`
      COALESCE(("customFields"->'integration'->>'provider'), '') = ${provider}
    `,
    )
    .where(
      sql<boolean>`
      COALESCE(("customFields"->'integration'->>'externalId'), '') = ${externalId}
    `,
    )
    .selectAll()
    .executeTakeFirst()
}

export const findByOrganizationAndContact = async (
  organizationId: string,
  input: {
    email?: string | null
    normalizedPhone?: string | null
  },
): Promise<DBLead | undefined> => {
  const email = input.email?.trim().toLowerCase()
  const normalizedPhone = input.normalizedPhone?.trim()

  if (!email && !normalizedPhone) {
    return undefined
  }

  let query = db
    .selectFrom('lead')
    .where('organizationId', '=', organizationId)
    .where('deletedAt', 'is', null)

  if (email && normalizedPhone) {
    query = query.where((eb) =>
      eb.or([
        eb('email', '=', email),
        eb('normalizedPhone', '=', normalizedPhone),
      ]),
    )
  } else if (email) {
    query = query.where('email', '=', email)
  } else if (normalizedPhone) {
    query = query.where('normalizedPhone', '=', normalizedPhone)
  }

  return query.orderBy('updatedAt', 'desc').selectAll().executeTakeFirst()
}

export const findMany = async (
  organizationId: string,
  options: {
    search?: string
    page: number
    limit: number
  },
): Promise<{ data: DBLead[]; total: number }> => {
  let query = db
    .selectFrom('lead')
    .where('organizationId', '=', organizationId)
    .where('deletedAt', 'is', null)

  if (options.search) {
    const search = `%${options.search}%`
    query = query.where((eb) =>
      eb.or([
        eb('firstName', 'ilike', search),
        eb('lastName', 'ilike', search),
        eb('email', 'ilike', search),
        eb('phone', 'ilike', search),
        eb('company', 'ilike', search),
      ]),
    )
  }

  const countResult = await db
    .selectFrom(query.as('filtered'))
    .select(db.fn.countAll<number>().as('count'))
    .executeTakeFirstOrThrow()

  const total = Number(countResult.count)

  const data = await query
    .orderBy('createdAt', 'desc')
    .limit(options.limit)
    .offset((options.page - 1) * options.limit)
    .selectAll()
    .execute()

  return { data, total }
}

export const update = async (
  id: string,
  data: Omit<UpdateDBLead, 'id' | 'organizationId' | 'createdAt'>,
): Promise<DBLead | undefined> => {
  return db
    .updateTable('lead')
    .set({ ...data, updatedAt: new Date() })
    .where('id', '=', id)
    .where('deletedAt', 'is', null)
    .returningAll()
    .executeTakeFirst()
}

export const softDelete = async (id: string): Promise<void> => {
  await db
    .updateTable('lead')
    .set({ deletedAt: new Date() })
    .where('id', '=', id)
    .execute()
}
