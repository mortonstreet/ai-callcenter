import { z } from 'zod'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import logger from '@/lib/logger'
import { findTasksByOrganizationId } from '@/repositories/organization.repository'
import { McpCreateTaskInput, McpCreateTaskInputSchema } from '@/types/mcp'
import { formatTasksForMcp } from '@/utils/task'
import { createTaskInstanceWithDispatcher } from '@/services/task.service'

export function createMcpServer(organizationId: string) {
  const mcpServer = new McpServer({
    name: 'vaci-mcp-server',
    version: '1.0.0',
  })

  mcpServer.tool(
    'list-services',
    'Get all services that are available to the customer',
    async () => {
      // organizationId is available here
      logger.info(`Organization ID: ${organizationId}`)

      const tasks = await findTasksByOrganizationId(organizationId)
      logger.info(`Tasks: ${JSON.stringify(tasks)}`)
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(formatTasksForMcp(tasks)),
          },
        ],
      }
    },
  )

  mcpServer.tool(
    'create-task',
    'Your job is to figure out which service the customer wants and then gather the necessary information to create a task for the service',
    McpCreateTaskInputSchema.shape,
    async (input: McpCreateTaskInput) => {
      logger.info(
        `Creating task instance for service ${input.serviceId} with args:`,
        input.serviceArgs,
      )

      const taskInstance = await createTaskInstanceWithDispatcher(
        input,
        organizationId,
      )

      logger.info(`Created task instance ${taskInstance.id}`)

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              success: true,
              taskInstanceId: taskInstance.id,
              message: `Task created successfully! Your request for ${input.serviceId} has been submitted.`,
            }),
          },
        ],
      }
    },
  )

  return mcpServer
}
