import { db } from '../src/lib/db'

const listOrgs = async () => {
  const orgs = await db
    .selectFrom('organization')
    .select(['id', 'name', 'slug'])
    .execute()

  if (orgs.length === 0) {
    console.log('\n📭 No organizations yet!')
    console.log('\n👉 Create one from the dashboard after logging in.\n')
  } else {
    console.log('\n📋 Organizations:\n')
    orgs.forEach((o) => {
      console.log(`  • ${o.name}`)
      console.log(`    ID: ${o.id}`)
      console.log(`    Slug: ${o.slug}\n`)
    })
  }
}

listOrgs()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err)
    process.exit(1)
  })
