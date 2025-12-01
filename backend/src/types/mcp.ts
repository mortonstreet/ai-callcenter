import { z } from 'zod'

export const McpCreateTaskInputSchema = z.object({
  serviceId: z.string().describe('The ID of the service to execute'),
  conversationId: z
    .string()
    .describe(
      'The ID of the conversation, DO NOT ASK THE USER FOR THIS, you can get this from your system__conversation_id',
    ),
  callSid: z
    .string()
    .optional()
    .describe(
      'The SID of the call, DO NOT ASK THE USER FOR THIS, you can get this from your system__call_sid',
    ),
  serviceArgs: z
    .record(z.string(), z.any())
    .describe('The arguments to pass to execute the service'),
})

export type McpCreateTaskInput = z.infer<typeof McpCreateTaskInputSchema>
