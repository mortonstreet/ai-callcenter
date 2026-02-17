import { Router } from 'express'
import express from 'express'
import { getExample } from '@/api/controllers/example.controller'
import { validateAndMerge } from '@/api/middlewares/validationMiddleware'
import {
  AgentWebhookSchema,
  CreateAgentRequestSchema,
  DeleteAgentRequestSchema,
  CreateTaskRequestSchema,
  GetAgentRequestSchema,
  GetAgentsRequestSchema,
  GetTasksRequestSchema,
  UpdateTaskRequestSchema,
  OrganizationRole,
  DeleteTaskRequestSchema,
  CreateElevenLabsAgentSchema,
  GetAgentProvisioningJobStatusSchema,
  RetryAgentProvisioningJobSchema,
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
  createAgent,
  deleteAgent,
  agentWebhook,
  createTask,
  getTasks,
  updateTask,
  deleteTask,
  updateAgentMcpConfig,
  getAgentMcpConfig,
  createElevenLabsAgent,
  getAgentProvisioningJobStatus,
  retryAgentProvisioningJob,
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
import { rejectForbiddenWizardFields } from '../middlewares/wizardContract'

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

router.post(
  '/:organizationId',
  validateAndMerge(CreateAgentRequestSchema),
  validateMemberOfOrganizationIsOrAdmin([
    OrganizationRole.ADMIN,
    OrganizationRole.OWNER,
  ]),
  authenticatedRoute(createAgent),
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
  rejectForbiddenWizardFields,
  validateAndMerge(CreateElevenLabsAgentSchema),
  validateMemberOfOrganizationIsOrAdmin([
    OrganizationRole.ADMIN,
    OrganizationRole.OWNER,
  ]),
  authenticatedRoute(createElevenLabsAgent),
)

router.get(
  '/:organizationId/provisioning/jobs/:jobId',
  validateAndMerge(GetAgentProvisioningJobStatusSchema),
  validateMemberOfOrganizationOrAdmin,
  authenticatedRoute(getAgentProvisioningJobStatus),
)

router.post(
  '/:organizationId/provisioning/jobs/:jobId/retry',
  validateAndMerge(RetryAgentProvisioningJobSchema),
  validateMemberOfOrganizationIsOrAdmin([
    OrganizationRole.ADMIN,
    OrganizationRole.OWNER,
  ]),
  authenticatedRoute(retryAgentProvisioningJob),
)

// Update agent (admin - full access)
router.patch(
  '/:organizationId/:id/update-agent',
  validateAndMerge(UpdateElevenLabsAgentSchema),
  validateMemberOfOrganizationIsOrAdmin([OrganizationRole.ADMIN]),
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
  '/:organizationId/:id',
  validateAndMerge(DeleteAgentRequestSchema),
  validateMemberOfOrganizationIsOrAdmin([
    OrganizationRole.ADMIN,
    OrganizationRole.OWNER,
  ]),
  authenticatedRoute(deleteAgent),
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

// ===== Agent Config, Health, Analytics, Conversations =====
router.get(
  '/:organizationId/:id/config',
  validateAndMerge(GetAgentConfigSchema),
  validateMemberOfOrganizationOrAdmin,
  authenticatedRoute(getAgentConfig),
)

router.get(
  '/:organizationId/:id/health',
  validateAndMerge(GetAgentHealthSchema),
  validateMemberOfOrganizationOrAdmin,
  authenticatedRoute(getAgentHealth),
)

router.get(
  '/:organizationId/:id/analytics',
  validateAndMerge(GetAgentAnalyticsSchema),
  validateMemberOfOrganizationOrAdmin,
  authenticatedRoute(getAgentAnalytics),
)

router.get(
  '/:organizationId/:id/conversations',
  validateAndMerge(GetAgentConversationsSchema),
  validateMemberOfOrganizationOrAdmin,
  authenticatedRoute(getAgentConversations),
)

export default router
