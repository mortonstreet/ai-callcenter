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
import { authenticatedRoute, validatedRoute } from './utils'
import {
  getAgent,
  getAgents,
  agentWebhook,
  createTask,
  getTasks,
  updateTask,
  deleteTask,
} from '@/api/controllers/agent.controller'
import {
  validateMemberOfOrganizationOrAdmin,
  validateMemberOfOrganizationIsOrAdmin,
  withBetterAuth,
  withElevenLabsWebhookAuth,
} from '../middlewares/auth'

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

export default router
