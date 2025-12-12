import { Pool } from 'pg'
import { DB } from '@shared/db/src'
import { Kysely, PostgresDialect } from 'kysely'
import { config } from '@/config'
import { PrismaClient } from '@shared/db/src'

const dialect = new PostgresDialect({
  pool: new Pool({
    connectionString: config.databaseUrl,
    max: 20,
  }),
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
