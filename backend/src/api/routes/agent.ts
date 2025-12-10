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

// MCP Configuration Routes - for managing agent MCP credentials
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
