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

export const McpCreateOrUpdateLeadInputSchema = z.object({
  conversationId: z
    .string()
    .describe(
      'The conversation ID - DO NOT ASK THE USER FOR THIS, get from system__conversation_id',
    ),
  customerName: z.string().optional().describe('Full name of the customer'),
  customerPhone: z.string().optional().describe('Phone number of the customer'),
  customerEmail: z
    .string()
    .optional()
    .describe('Email address of the customer'),
  serviceNeeded: z
    .string()
    .optional()
    .describe('Type of service the customer needs'),
  customerAddress: z
    .string()
    .optional()
    .describe('Service address of the customer'),
  notes: z
    .string()
    .optional()
    .describe('Additional notes about the lead or conversation'),
})

export type McpCreateOrUpdateLeadInput = z.infer<
  typeof McpCreateOrUpdateLeadInputSchema
>
