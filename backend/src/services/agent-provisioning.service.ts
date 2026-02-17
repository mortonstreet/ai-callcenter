import { QueueJobPayload } from '@/types/queues'
import {
  AgentProvisioningContractError,
  startWizardProvisioningContract,
} from '@/services/agent-provisioning-contract.service'
import { CreateElevenLabsAgentRequest } from '@shared/types/src'

export const WIZARD_PROVISION_JOB_NAME = 'wizard-agent-provision'

export interface ProvisioningQueuePayload extends QueueJobPayload {
  jobId: string
}

export const startWizardProvisioning = async (input: {
  organizationId: string
  requestPayload: CreateElevenLabsAgentRequest
  requestedByUserId: string
  correlationId: string
  idempotencyKey?: string
}) => {
  return startWizardProvisioningContract(input)
}

export const executeWizardProvisioningJob = async (jobId: string) => {
  throw new AgentProvisioningContractError(
    501,
    'WIZARD_PROVISIONING_LEGACY_JOB_NOT_SUPPORTED',
    `Legacy wizard provisioning job ${jobId} is no longer supported by this worker.`,
    {
      jobId,
    },
  )
}
