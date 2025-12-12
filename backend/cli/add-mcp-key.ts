import { db } from '../src/lib/db'
import { randomBytes } from 'crypto'

const agentId = '9a626988-91a6-4a0c-83e2-9c223d7024c5' // Meerkat Pest Control agent

const generateSecureKey = (prefix: string = ''): string => {
  const bytes = randomBytes(32)
  return `${prefix}${bytes.toString('hex')}`
}

const addMcpKey = async () => {
  const mcpApiKey = generateSecureKey('mcp_')

  const agent = await db
    .updateTable('agent')
    .set({
      mcpApiKey,
      updatedAt: new Date(),
    })
    .where('id', '=', agentId)
    .returningAll()
    .executeTakeFirstOrThrow()

  console.log(`\n✅ MCP API Key added to agent!\n`)
  console.log(`   Agent: ${agent.name}`)
  console.log(`   Agent ID: ${agent.id}`)
  console.log(`   ElevenLabs ID: ${agent.externalId}`)
  console.log(`\n🔑 MCP API Key: ${mcpApiKey}`)
  console.log(
    `\n📍 MCP Endpoint: https://meerkat-revcenter.ngrok.dev/api/mcp/sse`,
  )
  console.log(`\n⚙️  Configure your ElevenLabs agent with:`)
  console.log(
    `   - Server URL: https://meerkat-revcenter.ngrok.dev/api/mcp/sse`,
  )
  console.log(`   - Header: x-api-key: ${mcpApiKey}\n`)
}

addMcpKey()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err)
    process.exit(1)
  })
