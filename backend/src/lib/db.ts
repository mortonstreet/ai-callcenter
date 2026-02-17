import { Pool } from 'pg'
import { DB } from '@shared/db/src'
import { Kysely, PostgresDialect } from 'kysely'
import { config } from '@/config'
import { PrismaClient } from '@shared/db/src'
import logger from '@/lib/logger'
import {
  recordDbQueryMetric,
  updateDbPoolMetric,
} from '@/services/operations-metrics.service'

export const dbPool = new Pool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  max: 20,
})

const updatePoolSnapshot = () => {
  updateDbPoolMetric({
    total: dbPool.totalCount,
    idle: dbPool.idleCount,
    waiting: dbPool.waitingCount,
    max: 20,
  })
}

const patchQueryInstrumentation = () => {
  const poolWithPatchedQuery = dbPool as Pool & {
    query: (...args: any[]) => Promise<any>
  }

  const originalQuery = poolWithPatchedQuery.query.bind(poolWithPatchedQuery)

  poolWithPatchedQuery.query = async (...args: any[]) => {
    const startedAt = Date.now()
    const queryText = typeof args[0] === 'string' ? args[0] : undefined

    try {
      const result = await originalQuery(...args)
      recordDbQueryMetric({
        durationMs: Date.now() - startedAt,
        queryText,
        errored: false,
      })
      updatePoolSnapshot()
      return result
    } catch (error) {
      recordDbQueryMetric({
        durationMs: Date.now() - startedAt,
        queryText,
        errored: true,
      })
      updatePoolSnapshot()
      throw error
    }
  }
}

patchQueryInstrumentation()
updatePoolSnapshot()

dbPool.on('error', (error) => {
  logger.error({ error }, 'Postgres pool error')
  recordDbQueryMetric({
    durationMs: 0,
    queryText: 'pool:error',
    errored: true,
  })
  updatePoolSnapshot()
})

dbPool.on('connect', () => {
  updatePoolSnapshot()
})

dbPool.on('acquire', () => {
  updatePoolSnapshot()
})

dbPool.on('remove', () => {
  updatePoolSnapshot()
})

const dialect = new PostgresDialect({
  pool: dbPool,
})

export const db = new Kysely<DB>({
  dialect,
})

export const prisma_OnlyForBetterAuth = new PrismaClient({
  datasources: {
    db: {
      url: config.databaseUrl,
    },
  },
})
