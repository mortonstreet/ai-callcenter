import { Router } from 'express'
import express from 'express'
import { getExample } from '@/api/controllers/example.controller'
import { validateAndMerge } from '@/api/middlewares/validationMiddleware'
import {
  AgentWebhookSchema,
  CreateTaskRequestSchema,
  GetAgentRequestSchema,
  GetAgentsRequestSchema,
  GetTasksRequestSchema,
  UpdateTaskRequestSchema,
  OrganizationRole,
  DeleteTaskRequestSchema,
  CreateElevenLabsAgentSchema,
  UpdateElevenLabsAgentSchema,
  OwnerUpdateAgentSchema,
  DeleteElevenLabsAgentSchema,
  GetAgentConfigSchema,
  GetAgentAnalyticsSchema,
  GetAgentConversationsSchema,
  GetAgentHealthSchema,
} from '@shared/types/src'
import { z } from 'zod'
import { authenticatedRoute, validatedRoute } from './utils'
import {
  getAgent,
  getAgents,
  agentWebhook,
  createTask,
  getTasks,
  updateTask,
  deleteTask,
  updateAgentMcpConfig,
  getAgentMcpConfig,
  createElevenLabsAgent,
  updateElevenLabsAgent,
  ownerUpdateAgent,
  deleteElevenLabsAgent,
  getAgentConfig,
  listVoices,
  getAgentAnalytics,
  getAgentConversations,
  getAgentHealth,
} from '@/api/controllers/agent.controller'
import {
  validateMemberOfOrganizationOrAdmin,
  validateMemberOfOrganizationIsOrAdmin,
  withBetterAuth,
  withElevenLabsWebhookAuth,
} from '../middlewares/auth'

// Schema for updating agent MCP configuration
const UpdateAgentMcpConfigSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  mcpApiKey: z.string().nullable().optional(),
  webhookSecret: z.string().nullable().optional(),
  mcpEndpointUrl: z.string().url().nullable().optional(),
  generateNewApiKey: z.boolean().optional(),
  generateNewWebhookSecret: z.boolean().optional(),
})

// Schema for getting agent MCP configuration
const GetAgentMcpConfigSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
})

const router = Router()

router.use(withBetterAuth)

// ===== Voices (no org required) =====
router.get('/voices', authenticatedRoute(listVoices))

// ===== Agent CRUD =====
router.get(
  '/:organizationId',
  validateAndMerge(GetAgentsRequestSchema),
  validateMemberOfOrganizationOrAdmin,
  authenticatedRoute(getAgents),
)

router.get(
  '/:organizationId/:id',
  validateAndMerge(GetAgentRequestSchema),
  validateMemberOfOrganizationOrAdmin,
  authenticatedRoute(getAgent),
)

// Create agent via ElevenLabs
router.post(
  '/:organizationId/create-agent',
  validateAndMerge(CreateElevenLabsAgentSchema),
  validateMemberOfOrganizationIsOrAdmin([
    OrganizationRole.ADMIN,
    OrganizationRole.OWNER,
  ]),
  authenticatedRoute(createElevenLabsAgent),
)

// Update agent (admin/owner - full access)
router.patch(
  '/:organizationId/:id/update-agent',
  validateAndMerge(UpdateElevenLabsAgentSchema),
  validateMemberOfOrganizationIsOrAdmin([
    OrganizationRole.ADMIN,
    OrganizationRole.OWNER,
  ]),
  authenticatedRoute(updateElevenLabsAgent),
)

// Update agent (owner - limited fields)
router.patch(
  '/:organizationId/:id/owner-update',
  validateAndMerge(OwnerUpdateAgentSchema),
  validateMemberOfOrganizationIsOrAdmin([OrganizationRole.OWNER]),
  authenticatedRoute(ownerUpdateAgent),
)

// Delete agent
router.delete(
  '/:organizationId/:id/delete-agent',
  validateAndMerge(DeleteElevenLabsAgentSchema),
  validateMemberOfOrganizationIsOrAdmin([
    OrganizationRole.ADMIN,
    OrganizationRole.OWNER,
  ]),
  authenticatedRoute(deleteElevenLabsAgent),
)

// Get full ElevenLabs config
router.get(
  '/:organizationId/:id/config',
  validateAndMerge(GetAgentConfigSchema),
  validateMemberOfOrganizationIsOrAdmin([
    OrganizationRole.ADMIN,
    OrganizationRole.OWNER,
  ]),
  authenticatedRoute(getAgentConfig),
)

// Agent analytics (admin only)
router.get(
  '/:organizationId/:id/analytics',
  validateAndMerge(GetAgentAnalyticsSchema),
  validateMemberOfOrganizationIsOrAdmin([OrganizationRole.ADMIN]),
  authenticatedRoute(getAgentAnalytics),
)

// Agent conversations
router.get(
  '/:organizationId/:id/conversations',
  validateAndMerge(GetAgentConversationsSchema),
  validateMemberOfOrganizationIsOrAdmin([
    OrganizationRole.ADMIN,
    OrganizationRole.OWNER,
  ]),
  authenticatedRoute(getAgentConversations),
)

router.get(
  '/:organizationId/:id/health',
  validateAndMerge(GetAgentHealthSchema),
  validateMemberOfOrganizationOrAdmin,
  authenticatedRoute(getAgentHealth),
)

// ===== Task (Service) CRUD =====
router.post(
  '/:organizationId/task',
  validateAndMerge(CreateTaskRequestSchema),
  validateMemberOfOrganizationIsOrAdmin([
    OrganizationRole.ADMIN,
    OrganizationRole.OWNER,
  ]),
  authenticatedRoute(createTask),
)

router.get(
  '/:organizationId/:agentId/tasks',
  validateAndMerge(GetTasksRequestSchema),
  validateMemberOfOrganizationOrAdmin,
  authenticatedRoute(getTasks),
)

router.put(
  '/:organizationId/task/:id',
  validateAndMerge(UpdateTaskRequestSchema),
  validateMemberOfOrganizationIsOrAdmin([
    OrganizationRole.ADMIN,
    OrganizationRole.OWNER,
  ]),
  authenticatedRoute(updateTask),
)

router.delete(
  '/:organizationId/task/:id',
  validateAndMerge(DeleteTaskRequestSchema),
  validateMemberOfOrganizationIsOrAdmin([
    OrganizationRole.ADMIN,
    OrganizationRole.OWNER,
  ]),
  authenticatedRoute(deleteTask),
)

// MCP Configuration Routes
router.get(
  '/:organizationId/:id/mcp-config',
  validateAndMerge(GetAgentMcpConfigSchema),
  validateMemberOfOrganizationIsOrAdmin([
    OrganizationRole.ADMIN,
    OrganizationRole.OWNER,
  ]),
  authenticatedRoute(getAgentMcpConfig),
)

router.put(
  '/:organizationId/:id/mcp-config',
  validateAndMerge(UpdateAgentMcpConfigSchema),
  validateMemberOfOrganizationIsOrAdmin([
    OrganizationRole.ADMIN,
    OrganizationRole.OWNER,
  ]),
  authenticatedRoute(updateAgentMcpConfig),
)

export default router
