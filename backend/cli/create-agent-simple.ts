import { db } from '../src/lib/db'
import { formatToSlug } from '../src/utils'
import { v4 as uuid } from 'uuid'

const args = process.argv.slice(2)

if (args.length < 4) {
  console.log(`
Usage: pnpm tsx cli/create-agent-simple.ts <name> <phone> <redirectPhone> <elevenLabsAgentId>

Example:
  pnpm tsx cli/create-agent-simple.ts "Support Agent" "+15551234567" "+15559876543" "agent_abc123"
`)
  process.exit(1)
}

const [name, phoneNumber, redirectNumber, externalId] = args
const organizationId = '4nEvK4my318ApynG0qFxMSQu4UOVCehj' // semper fi demo

const createAgent = async () => {
  const agent = await db
    .insertInto('agent')
    .values({
      id: uuid(),
      name,
      slug: formatToSlug(name),
      organizationId,
      phoneNumber,
      redirectNumber,
      externalId,
      externalType: 'ELEVEN_LABS',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returningAll()
    .executeTakeFirst()

  console.log(`\n✅ Agent created successfully!\n`)
  console.log(`   Name: ${agent?.name}`)
  console.log(`   ID: ${agent?.id}`)
  console.log(`   Phone: ${agent?.phoneNumber}`)
  console.log(`   ElevenLabs ID: ${agent?.externalId}\n`)
}

createAgent()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err)
    process.exit(1)
  })
