import { db } from '../src/lib/db'

const email = process.argv[2]

if (!email) {
  console.error('Usage: pnpm cli:make-admin <email>')
  process.exit(1)
}

const makeAdmin = async () => {
  const user = await db
    .updateTable('user')
    .set({ isAdmin: true })
    .where('email', '=', email)
    .returningAll()
    .executeTakeFirst()

  if (!user) {
    console.error(`User with email "${email}" not found`)
    process.exit(1)
  }

  console.log(`✅ User "${user.name || user.email}" is now an admin!`)
}

makeAdmin()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err)
    process.exit(1)
  })
