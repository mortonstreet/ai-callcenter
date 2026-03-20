import { db } from '@/lib/db'
import { withId } from './utils'
import {
  DBAgentProvisioningJob,
  DBAgentProvisioningStep,
  InsertDBAgentProvisioningJob,
  InsertDBAgentProvisioningStep,
  UpdateDBAgentProvisioningJob,
  UpdateDBAgentProvisioningStep,
} from '@shared/db/src'

const toJsonColumnValue = (value: unknown): unknown => {
  if (value === undefined) {
    return null
  }

  if (value === null || typeof value === 'string') {
    return value
  }

  if (Array.isArray(value) || typeof value === 'object') {
    return JSON.stringify(value)
  }

  return value
}

const serializeProvisioningJobJson = (
  data: Omit<InsertDBAgentProvisioningJob, 'id'>,
): Omit<InsertDBAgentProvisioningJob, 'id'> => {
  return {
    ...data,
    wizardInput: toJsonColumnValue(data.wizardInput),
    intentProfile: toJsonColumnValue(data.intentProfile),
    runtimeState: toJsonColumnValue(data.runtimeState),
  }
}

const serializeProvisioningJobUpdateJson = (
  data: Omit<
    UpdateDBAgentProvisioningJob,
    'id' | 'organizationId' | 'agentId' | 'createdAt'
  >,
): Omit<
  UpdateDBAgentProvisioningJob,
  'id' | 'organizationId' | 'agentId' | 'createdAt'
> => {
  return {
    ...data,
    wizardInput:
      data.wizardInput === undefined
        ? undefined
        : toJsonColumnValue(data.wizardInput),
    intentProfile:
      data.intentProfile === undefined
        ? undefined
        : toJsonColumnValue(data.intentProfile),
    runtimeState:
      data.runtimeState === undefined
        ? undefined
        : toJsonColumnValue(data.runtimeState),
  }
}

const serializeProvisioningStepJson = (
  data: Omit<InsertDBAgentProvisioningStep, 'id'>,
): Omit<InsertDBAgentProvisioningStep, 'id'> => {
  return {
    ...data,
    eventLog: toJsonColumnValue(data.eventLog),
    metadata: toJsonColumnValue(data.metadata),
  }
}

const serializeProvisioningStepUpdateJson = (
  data: Omit<
    UpdateDBAgentProvisioningStep,
    'id' | 'jobId' | 'organizationId' | 'agentId' | 'createdAt'
  >,
): Omit<
  UpdateDBAgentProvisioningStep,
  'id' | 'jobId' | 'organizationId' | 'agentId' | 'createdAt'
> => {
  return {
    ...data,
    eventLog:
      data.eventLog === undefined
        ? undefined
        : toJsonColumnValue(data.eventLog),
    metadata:
      data.metadata === undefined
        ? undefined
        : toJsonColumnValue(data.metadata),
  }
}

export const createAgentProvisioningJob = async (
  data: Omit<InsertDBAgentProvisioningJob, 'id'>,
): Promise<DBAgentProvisioningJob> => {
  return db
    .insertInto('agent_provisioning_job')
    .values(withId(serializeProvisioningJobJson(data)))
    .returningAll()
    .executeTakeFirstOrThrow()
}

export const createAgentProvisioningSteps = async (
  data: Array<Omit<InsertDBAgentProvisioningStep, 'id'>>,
): Promise<DBAgentProvisioningStep[]> => {
  if (data.length === 0) {
    return []
  }

  return db
    .insertInto('agent_provisioning_step')
    .values(data.map((entry) => withId(serializeProvisioningStepJson(entry))))
    .returningAll()
    .execute()
}

export const findAgentProvisioningJobById = async (
  id: string,
): Promise<DBAgentProvisioningJob | undefined> => {
  return db
    .selectFrom('agent_provisioning_job')
    .where('id', '=', id)
    .selectAll()
    .executeTakeFirst()
}

export const findAgentProvisioningJobByOrganizationAndId = async (
  organizationId: string,
  id: string,
): Promise<DBAgentProvisioningJob | undefined> => {
  return db
    .selectFrom('agent_provisioning_job')
    .where('organizationId', '=', organizationId)
    .where('id', '=', id)
    .selectAll()
    .executeTakeFirst()
}

export const findAgentProvisioningJobByOrganizationAndIdempotencyKey = async (
  organizationId: string,
  idempotencyKey: string,
): Promise<DBAgentProvisioningJob | undefined> => {
  return db
    .selectFrom('agent_provisioning_job')
    .where('organizationId', '=', organizationId)
    .where('idempotencyKey', '=', idempotencyKey)
    .orderBy('createdAt', 'desc')
    .selectAll()
    .executeTakeFirst()
}

export const findAgentProvisioningJobByRequesterAndIdempotencyKey = async (
  requestedByUserId: string,
  idempotencyKey: string,
): Promise<DBAgentProvisioningJob | undefined> => {
  return db
    .selectFrom('agent_provisioning_job')
    .where('requestedByUserId', '=', requestedByUserId)
    .where('idempotencyKey', '=', idempotencyKey)
    .orderBy('createdAt', 'desc')
    .selectAll()
    .executeTakeFirst()
}

export const findLatestAgentProvisioningJobByAgentId = async (
  agentId: string,
): Promise<DBAgentProvisioningJob | undefined> => {
  return db
    .selectFrom('agent_provisioning_job')
    .where('agentId', '=', agentId)
    .orderBy('createdAt', 'desc')
    .selectAll()
    .executeTakeFirst()
}

export const listAgentProvisioningSteps = async (
  jobId: string,
): Promise<DBAgentProvisioningStep[]> => {
  return db
    .selectFrom('agent_provisioning_step')
    .where('jobId', '=', jobId)
    .orderBy('stepOrder', 'asc')
    .selectAll()
    .execute()
}

export const findAgentProvisioningStep = async (
  jobId: string,
  stepId: string,
): Promise<DBAgentProvisioningStep | undefined> => {
  return db
    .selectFrom('agent_provisioning_step')
    .where('jobId', '=', jobId)
    .where('stepId', '=', stepId)
    .selectAll()
    .executeTakeFirst()
}

export const updateAgentProvisioningJob = async (
  id: string,
  data: Omit<
    UpdateDBAgentProvisioningJob,
    'id' | 'organizationId' | 'agentId' | 'createdAt'
  >,
): Promise<DBAgentProvisioningJob | undefined> => {
  return db
    .updateTable('agent_provisioning_job')
    .set({
      ...serializeProvisioningJobUpdateJson(data),
      updatedAt: new Date(),
    })
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst()
}

export const updateAgentProvisioningStepByStepId = async (
  jobId: string,
  stepId: string,
  data: Omit<
    UpdateDBAgentProvisioningStep,
    'id' | 'jobId' | 'organizationId' | 'agentId' | 'createdAt'
  >,
): Promise<DBAgentProvisioningStep | undefined> => {
  return db
    .updateTable('agent_provisioning_step')
    .set({
      ...serializeProvisioningStepUpdateJson(data),
      updatedAt: new Date(),
    })
    .where('jobId', '=', jobId)
    .where('stepId', '=', stepId)
    .returningAll()
    .executeTakeFirst()
}
