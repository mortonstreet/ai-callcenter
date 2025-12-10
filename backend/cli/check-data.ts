import { db } from '../src/lib/db'

const checkData = async () => {
  // Check task instances
  const taskInstances = await db
    .selectFrom('task_instance')
    .selectAll()
    .execute()

  console.log('\n📋 Task Instances:', taskInstances.length)
  if (taskInstances.length > 0) {
    taskInstances.slice(0, 5).forEach(t => {
      console.log(`  • ID: ${t.id}`)
      console.log(`    Status: ${t.status}`)
      console.log(`    Created: ${t.createdAt}`)
      console.log(`    Info: ${JSON.stringify(t.info).slice(0, 100)}...\n`)
    })
  } else {
    console.log('  (none)')
  }

  // Check recordings
  const recordings = await db
    .selectFrom('recording')
    .selectAll()
    .execute()

  console.log('\n🎙️ Recordings:', recordings.length)
  if (recordings.length > 0) {
    recordings.slice(0, 5).forEach(r => {
      console.log(`  • ID: ${r.id}`)
      console.log(`    Conversation: ${r.conversationId}`)
      console.log(`    Duration: ${r.callDurationSeconds}s`)
      console.log(`    Created: ${r.createdAt}\n`)
    })
  } else {
    console.log('  (none)')
  }
}

checkData()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err)
    process.exit(1)
  })
