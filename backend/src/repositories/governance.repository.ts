import { db } from '@/lib/db'
import { withId } from './utils'
import {
  DBAdminAuditLog,
  DBErrorLog,
  InsertDBAdminAuditLog,
  InsertDBErrorLog,
  UpdateDBErrorLog,
} from '@shared/db/src'

export const createErrorLog = async (
  data: Omit<InsertDBErrorLog, 'id'>,
): Promise<DBErrorLog> => {
  return db
    .insertInto('error_log')
    .values(withId(data))
    .returningAll()
    .executeTakeFirstOrThrow()
}

export const findErrorLogById = async (
  id: string,
): Promise<DBErrorLog | undefined> => {
  return db
    .selectFrom('error_log')
    .where('id', '=', id)
    .selectAll()
    .executeTakeFirst()
}

export const listErrorLogs = async (
  organizationId?: string,
  limit = 100,
): Promise<DBErrorLog[]> => {
  let query = db.selectFrom('error_log')

  if (organizationId) {
    query = query.where('organizationId', '=', organizationId)
  }

  return query.orderBy('createdAt', 'desc').limit(limit).selectAll().execute()
}

export const updateErrorLog = async (
  id: string,
  data: Omit<UpdateDBErrorLog, 'id' | 'organizationId' | 'createdAt'>,
): Promise<DBErrorLog | undefined> => {
  return db
    .updateTable('error_log')
    .set({ ...data, updatedAt: new Date() })
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst()
}

export const createAdminAuditLog = async (
  data: Omit<InsertDBAdminAuditLog, 'id'>,
): Promise<DBAdminAuditLog> => {
  return db
    .insertInto('admin_audit_log')
    .values(withId(data))
    .returningAll()
    .executeTakeFirstOrThrow()
}

export const listAdminAuditLogs = async (
  organizationId?: string,
  limit = 100,
): Promise<DBAdminAuditLog[]> => {
  let query = db.selectFrom('admin_audit_log')

  if (organizationId) {
    query = query.where('organizationId', '=', organizationId)
  }

  return query.orderBy('createdAt', 'desc').limit(limit).selectAll().execute()
}
