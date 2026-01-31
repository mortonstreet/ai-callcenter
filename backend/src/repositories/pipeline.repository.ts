import { db } from '@/lib/db'
import { withId } from './utils'
import {
  DBPipelineStage,
  InsertDBPipelineStage,
  UpdateDBPipelineStage,
} from '@shared/db/src'

export const findByOrganizationId = async (
  organizationId: string,
): Promise<DBPipelineStage[]> => {
  return db
    .selectFrom('pipeline_stage')
    .where('organizationId', '=', organizationId)
    .orderBy('sortOrder', 'asc')
    .selectAll()
    .execute()
}

export const findById = async (
  id: string,
): Promise<DBPipelineStage | undefined> => {
  return db
    .selectFrom('pipeline_stage')
    .where('id', '=', id)
    .selectAll()
    .executeTakeFirst()
}

export const findDefaultByOrganizationId = async (
  organizationId: string,
): Promise<DBPipelineStage | undefined> => {
  return db
    .selectFrom('pipeline_stage')
    .where('organizationId', '=', organizationId)
    .where('isDefault', '=', true)
    .selectAll()
    .executeTakeFirst()
}

export const create = async (
  data: Omit<InsertDBPipelineStage, 'id'>,
): Promise<DBPipelineStage> => {
  return db
    .insertInto('pipeline_stage')
    .values(withId(data))
    .returningAll()
    .executeTakeFirstOrThrow()
}

export const update = async (
  id: string,
  data: Omit<UpdateDBPipelineStage, 'id' | 'organizationId' | 'createdAt'>,
): Promise<DBPipelineStage | undefined> => {
  return db
    .updateTable('pipeline_stage')
    .set(data)
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst()
}

export const deleteById = async (id: string): Promise<void> => {
  await db.deleteFrom('pipeline_stage').where('id', '=', id).execute()
}

export const updateSortOrders = async (
  stages: { id: string; sortOrder: number }[],
): Promise<void> => {
  await db.transaction().execute(async (trx) => {
    for (const stage of stages) {
      await trx
        .updateTable('pipeline_stage')
        .set({ sortOrder: stage.sortOrder })
        .where('id', '=', stage.id)
        .execute()
    }
  })
}

export const createDefaultStages = async (
  organizationId: string,
): Promise<DBPipelineStage[]> => {
  const defaultStages = [
    { label: 'New Leads', color: '#EAB308', sortOrder: 0, isDefault: true },
    { label: 'Follow Up', color: '#F97316', sortOrder: 1, isDefault: false },
    { label: 'Booked', color: '#A855F7', sortOrder: 2, isDefault: false },
    { label: 'Dispatched', color: '#3B82F6', sortOrder: 3, isDefault: false },
    { label: 'Closed Won', color: '#22C55E', sortOrder: 4, isDefault: false },
    { label: 'Closed Lost', color: '#6B7280', sortOrder: 5, isDefault: false },
  ]

  const results: DBPipelineStage[] = []
  for (const stage of defaultStages) {
    const created = await create({
      organizationId,
      ...stage,
      createdAt: new Date(),
    })
    if (created) results.push(created)
  }
  return results
}

export const clearDefaultFlag = async (
  organizationId: string,
): Promise<void> => {
  await db
    .updateTable('pipeline_stage')
    .set({ isDefault: false })
    .where('organizationId', '=', organizationId)
    .execute()
}

// Get lead counts and total estimated values per pipeline stage
export const getStageStats = async (
  organizationId: string,
): Promise<Map<string, { count: number; totalValue: number }>> => {
  const results = await db
    .selectFrom('task_instance')
    .where('organizationId', '=', organizationId)
    .where('pipelineStageId', 'is not', null)
    .select([
      'pipelineStageId',
      db.fn.countAll<number>().as('count'),
    ])
    .groupBy('pipelineStageId')
    .execute()

  // Get total values separately since we need to sum estimatedValue
  const valueResults = await db
    .selectFrom('task_instance')
    .where('organizationId', '=', organizationId)
    .where('pipelineStageId', 'is not', null)
    .where('estimatedValue', 'is not', null)
    .select([
      'pipelineStageId',
      db.fn.sum<number>('estimatedValue').as('totalValue'),
    ])
    .groupBy('pipelineStageId')
    .execute()

  const statsMap = new Map<string, { count: number; totalValue: number }>()

  for (const row of results) {
    if (row.pipelineStageId) {
      statsMap.set(row.pipelineStageId, {
        count: Number(row.count),
        totalValue: 0,
      })
    }
  }

  for (const row of valueResults) {
    if (row.pipelineStageId) {
      const existing = statsMap.get(row.pipelineStageId)
      if (existing) {
        existing.totalValue = Number(row.totalValue) || 0
      }
    }
  }

  return statsMap
}
