import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { formatToSlug } from '@/utils'
import { createAgent as createAgentRepository } from '@/repositories/agent.repository'
import { findById as findOrganizationById } from '@/repositories/organization.repository'
import { AgentExternalType } from '@shared/types/src'

const argv = yargs(hideBin(process.argv))
  .option('name', {
    alias: 'n',
    type: 'string',
    description: 'Agent name',
    demandOption: true,
  })
  .option('organizationId', {
    alias: 'org',
    type: 'string',
    description: 'Organization ID',
    demandOption: true,
  })
  .option('phoneNumber', {
    alias: 'phone',
    type: 'string',
    description: 'Phone number',
    demandOption: true,
  })
  .option('redirectNumber', {
    alias: 'redirect',
    type: 'string',
    description: 'Redirect phone number',
    demandOption: true,
  })
  .option('externalId', {
    alias: 'eid',
    type: 'string',
    description: 'External ID',
    demandOption: true,
  })
  .option('externalType', {
    alias: 'etype',
    type: 'string',
    description: 'External type',
    demandOption: true,
  })
  .parseSync()

const createAgent = async () => {
  const {
    name,
    organizationId,
    phoneNumber,
    redirectNumber,
    externalId,
    externalType,
  } = argv

  const nameSlug = formatToSlug(name)
  const organization = await findOrganizationById(organizationId)

  if (
    !Object.values(AgentExternalType).includes(
      externalType as AgentExternalType,
    )
  ) {
    throw new Error(`Invalid external type: ${externalType}`)
  }

  const agent = await createAgentRepository({
    name,
    slug: nameSlug,
    organizationId: organization.id,
    phoneNumber,
    redirectNumber,
    externalId,
    externalType,
  })

  console.log(`Agent created: ${agent?.id}`)
}

createAgent()
  .then(() => {
    console.log('Agent created')
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
