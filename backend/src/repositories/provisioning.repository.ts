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

export const createAgentProvisioningJob = async (
  data: Omit<InsertDBAgentProvisioningJob, 'id'>,
): Promise<DBAgentProvisioningJob> => {
  return db
    .insertInto('agent_provisioning_job')
    .values(withId(data))
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
    .values(data.map((entry) => withId(entry)))
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
    .set({ ...data, updatedAt: new Date() })
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
    .set({ ...data, updatedAt: new Date() })
    .where('jobId', '=', jobId)
    .where('stepId', '=', stepId)
    .returningAll()
    .executeTakeFirst()
}
