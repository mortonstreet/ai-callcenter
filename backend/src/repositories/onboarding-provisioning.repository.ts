import { db } from '@/lib/db'
import { withId } from './utils'
import {
  DBOnboardingProvisioningEvent,
  DBOnboardingProvisioningJob,
  InsertDBOnboardingProvisioningEvent,
  InsertDBOnboardingProvisioningJob,
  UpdateDBOnboardingProvisioningJob,
} from '@shared/db/src'

export const createOnboardingProvisioningJob = async (
  data: Omit<InsertDBOnboardingProvisioningJob, 'id'>,
): Promise<DBOnboardingProvisioningJob> => {
  return db
    .insertInto('onboarding_provisioning_job')
    .values(withId(data))
    .returningAll()
    .executeTakeFirstOrThrow()
}

export const findOnboardingProvisioningJobById = async (
  id: string,
): Promise<DBOnboardingProvisioningJob | undefined> => {
  return db
    .selectFrom('onboarding_provisioning_job')
    .where('id', '=', id)
    .selectAll()
    .executeTakeFirst()
}

export const findOnboardingProvisioningJobByIdempotencyKey = async (
  idempotencyKey: string,
): Promise<DBOnboardingProvisioningJob | undefined> => {
  return db
    .selectFrom('onboarding_provisioning_job')
    .where('idempotencyKey', '=', idempotencyKey)
    .selectAll()
    .executeTakeFirst()
}

export const findLatestOnboardingProvisioningJob = async (
  organizationId: string,
): Promise<DBOnboardingProvisioningJob | undefined> => {
  return db
    .selectFrom('onboarding_provisioning_job')
    .where('organizationId', '=', organizationId)
    .orderBy('createdAt', 'desc')
    .selectAll()
    .executeTakeFirst()
}

export const updateOnboardingProvisioningJob = async (
  id: string,
  data: Omit<
    UpdateDBOnboardingProvisioningJob,
    'id' | 'organizationId' | 'submittedByUserId' | 'createdAt'
  >,
): Promise<DBOnboardingProvisioningJob | undefined> => {
  return db
    .updateTable('onboarding_provisioning_job')
    .set({ ...data, updatedAt: new Date() })
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst()
}

export const createOnboardingProvisioningEvent = async (
  data: Omit<InsertDBOnboardingProvisioningEvent, 'id'>,
): Promise<DBOnboardingProvisioningEvent> => {
  return db
    .insertInto('onboarding_provisioning_event')
    .values(withId(data))
    .returningAll()
    .executeTakeFirstOrThrow()
}

export const listOnboardingProvisioningEvents = async (
  provisioningJobId: string,
  limit = 30,
): Promise<DBOnboardingProvisioningEvent[]> => {
  return db
    .selectFrom('onboarding_provisioning_event')
    .where('provisioningJobId', '=', provisioningJobId)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .selectAll()
    .execute()
}
