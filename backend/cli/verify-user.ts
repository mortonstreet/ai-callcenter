import { db } from '../src/lib/db'

const email = process.argv[2]

if (!email) {
  console.error('Usage: pnpm tsx cli/verify-user.ts <email>')
  process.exit(1)
}

const verifyUser = async () => {
  const user = await db
    .updateTable('user')
    .set({ emailVerified: true })
    .where('email', '=', email)
    .returningAll()
    .executeTakeFirst()

  if (!user) {
    console.error(`User with email "${email}" not found`)
    process.exit(1)
  }

  console.log(`✅ User "${user.email}" email is now verified!`)
}

verifyUser()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err)
    process.exit(1)
  })
