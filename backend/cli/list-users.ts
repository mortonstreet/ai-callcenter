import { db } from '../src/lib/db'

const listUsers = async () => {
  const users = await db
    .selectFrom('user')
    .select(['id', 'email', 'name', 'isAdmin'])
    .execute()

  if (users.length === 0) {
    console.log('\n📭 No users in database yet!')
    console.log('\n👉 Go to http://localhost:3000/login and sign in with Google first.\n')
  } else {
    console.log('\n📋 Users in database:\n')
    users.forEach(u => {
      const admin = u.isAdmin ? ' 👑 ADMIN' : ''
      console.log(`  • ${u.email} ${u.name ? '(' + u.name + ')' : ''}${admin}`)
    })
    console.log('')
  }
}

listUsers()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err)
    process.exit(1)
  })
