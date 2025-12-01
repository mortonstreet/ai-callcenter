import { Router } from 'express'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { createMcpServer } from '@/lib/mcp'
import logger from '@/lib/logger'
import { config } from '@/config'

const router = Router()

router.post('/sse', async (req, res) => {
  const token = req.headers['x-api-key']
  const organizationId = req.headers['x-organization-id'] as string
  if (!token || token !== config.elevenLabs.apiKey) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  if (!organizationId) {
    return res.status(400).json({ error: 'Organization ID is required' })
  }
  logger.info(`Connected Agent to organization ID: ${organizationId}`)
  const mcpServer = createMcpServer(organizationId)
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  })

  res.on('close', () => {
    transport.close()
  })

  await mcpServer.connect(transport)
  await transport.handleRequest(req, res, req.body)
})

export default router
