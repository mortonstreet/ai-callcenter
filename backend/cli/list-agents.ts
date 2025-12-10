import { db } from '../src/lib/db'

const listAgents = async () => {
  const agents = await db
    .selectFrom('agent')
    .select(['id', 'name', 'phoneNumber', 'externalId', 'organizationId'])
    .execute()

  if (agents.length === 0) {
    console.log('\n📭 No agents yet!\n')
  } else {
    console.log('\n🤖 Agents:\n')
    agents.forEach(a => {
      console.log(`  • ${a.name}`)
      console.log(`    ID: ${a.id}`)
      console.log(`    Phone: ${a.phoneNumber}`)
      console.log(`    ElevenLabs ID: ${a.externalId}\n`)
    })
  }

  // Also check for tasks
  const tasks = await db
    .selectFrom('task')
    .select(['id', 'name', 'agentId', 'requiredInfo'])
    .execute()

  if (tasks.length === 0) {
    console.log('📭 No services/tasks configured yet!')
    console.log('   Create one in the dashboard or via CLI.\n')
  } else {
    console.log('📋 Services/Tasks:\n')
    tasks.forEach(t => {
      console.log(`  • ${t.name}`)
      console.log(`    ID: ${t.id}`)
      console.log(`    Required Info: ${JSON.stringify(t.requiredInfo)}\n`)
    })
  }
}

listAgents()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err)
    process.exit(1)
  })
