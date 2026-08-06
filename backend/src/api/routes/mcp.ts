import { Router, Request, Response } from 'express'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { createMcpServer } from '@/lib/mcp'
import logger from '@/lib/logger'
import { config, McpProvider } from '@/config'
import { findAgentByMcpApiKey } from '@/repositories/agent.repository'
import { authenticateScopedApiKey } from '@/services/api-key.service'

const router = Router()

// Helper to find provider by API key from env config (legacy/fallback)
const findProviderByApiKey = (apiKey: string): McpProvider | undefined => {
  return config.mcpProviders.find((p) => p.apiKey === apiKey)
}

// Helper to find provider by slug from env config (legacy/fallback)
export const findProviderBySlug = (slug: string): McpProvider | undefined => {
  return config.mcpProviders.find((p) => p.slug === slug)
}

// Extract token from various header formats
const extractToken = (req: Request): string | undefined => {
  // Check x-api-key header first
  const xApiKey = req.headers['x-api-key'] as string
  if (xApiKey) return xApiKey

  // Check Authorization header (Bearer token)
  const authHeader = req.headers['authorization'] as string
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }

  // Check x-secret-token header (ElevenLabs may use this)
  const secretToken = req.headers['x-secret-token'] as string
  if (secretToken) return secretToken

  return undefined
}

const handleMcpForOrganization = async (
  req: Request,
  res: Response,
  organizationId: string,
  label: string,
) => {
  // Ensure Accept header includes required types for MCP
  if (
    !req.headers.accept ||
    !req.headers.accept.includes('text/event-stream')
  ) {
    req.headers.accept = 'application/json, text/event-stream'
  }

  logger.info(`[${label}] Connected to organization ID: ${organizationId}`)
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
}

// Generic MCP handler - supports both database agents and legacy env providers
const handleMcpRequest = async (
  req: Request,
  res: Response,
  providerSlug?: string,
) => {
  const token = extractToken(req)
  const organizationIdHeader = req.headers['x-organization-id'] as string

  logger.info(
    {
      hasXApiKey: !!req.headers['x-api-key'],
      hasAuthorization: !!req.headers['authorization'],
      hasSecretToken: !!req.headers['x-secret-token'],
    },
    'MCP request received',
  )

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized - Missing API key' })
  }

  if (token.startsWith('rvc_')) {
    const apiKeyAuth = await authenticateScopedApiKey(token, 'mcp:connect')

    if (!apiKeyAuth) {
      return res
        .status(401)
        .json({ error: 'Unauthorized - Invalid or unscoped API key' })
    }

    await handleMcpForOrganization(
      req,
      res,
      apiKeyAuth.key.organizationId,
      `API key: ${apiKeyAuth.key.name}`,
    )
    return
  }

  // First, try to find agent by MCP API key in database (scalable approach)
  const agent = await findAgentByMcpApiKey(token)

  if (agent) {
    await handleMcpForOrganization(
      req,
      res,
      agent.organizationId,
      `Agent: ${agent.name}`,
    )
    return
  }

  // Fallback to legacy env-based provider lookup
  let provider: McpProvider | undefined
  if (providerSlug) {
    provider = findProviderBySlug(providerSlug)
    if (provider && token !== provider.apiKey) {
      return res
        .status(401)
        .json({ error: 'Unauthorized - Invalid API key for provider' })
    }
  } else {
    provider = findProviderByApiKey(token)
  }

  if (!provider) {
    return res.status(401).json({ error: 'Unauthorized - Unknown API key' })
  }

  // For legacy providers, organization ID is required in header
  if (!organizationIdHeader) {
    return res.status(400).json({ error: 'Organization ID is required' })
  }

  await handleMcpForOrganization(req, res, organizationIdHeader, provider.name)
}

// Main MCP endpoint - Streamable HTTP transport
router.post('/sse', async (req, res) => {
  await handleMcpRequest(req, res)
})

// Dynamic routes for each registered provider: /mcp/:providerSlug/sse
router.post('/:providerSlug/sse', async (req, res) => {
  const { providerSlug } = req.params
  await handleMcpRequest(req, res, providerSlug)
})

// List available MCP providers from env config (for debugging/admin)
router.get('/providers', (req, res) => {
  const providers = config.mcpProviders.map((p) => ({
    name: p.name,
    slug: p.slug,
    endpoint: `/api/mcp/${p.slug}/sse`,
    ngrokUrl: p.ngrokUrl,
  }))
  res.json({ providers })
})

export default router
