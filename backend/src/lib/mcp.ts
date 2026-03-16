import { z } from 'zod'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import logger from '@/lib/logger'
import { findTasksByOrganizationId } from '@/repositories/organization.repository'
import { findTaskInstanceByConversationId } from '@/repositories/agent.repository'
import {
  McpCreateTaskInput,
  McpCreateTaskInputSchema,
  McpCreateOrUpdateLeadInput,
  McpCreateOrUpdateLeadInputSchema,
} from '@/types/mcp'
import * as leadRepository from '@/repositories/lead.repository'
import { normalizePhone } from '@/utils/phone'
import { formatTasksForMcp } from '@/utils/task'
import {
  createTaskInstanceWithDispatcher,
  updateTaskInstanceWithBooking,
} from '@/services/task.service'
import { CalComClient } from '@/clients/calcom.client'
import { config } from '@/config'
import {
  listGoogleCalendarFollowUpSlots,
  scheduleGoogleCalendarFollowUpCall,
} from '@/services/google-calendar.service'

// Schema for book-appointment input - email is optional for phone callback appointments
const BookAppointmentInputSchema = z.object({
  conversationId: z
    .string()
    .optional()
    .describe(
      'The conversation ID to link the booking to the lead - get from system__conversation_id',
    ),
  customerName: z.string().describe('Full name of the customer'),
  customerPhone: z
    .string()
    .describe('Phone number of the customer - REQUIRED for callback'),
  customerEmail: z
    .string()
    .optional()
    .describe(
      'Email address of the customer (optional - if not provided, we will call them back)',
    ),
  customerAddress: z
    .string()
    .optional()
    .describe('Service address of the customer'),
  preferredDate: z
    .string()
    .optional()
    .describe(
      'Preferred date for appointment (e.g., "tomorrow", "next monday", "2024-12-15")',
    ),
  serviceType: z
    .string()
    .optional()
    .describe(
      'Type of service requested (e.g., "ants", "rodents", "general pest inspection")',
    ),
  locationType: z
    .string()
    .optional()
    .describe('Whether residential or commercial'),
  notes: z
    .string()
    .optional()
    .describe('Additional notes about the appointment'),
})

type BookAppointmentInput = z.infer<typeof BookAppointmentInputSchema>

const GetFollowUpSlotsInputSchema = z.object({
  preferredDate: z
    .string()
    .optional()
    .describe(
      'Optional preferred date, such as "tomorrow", "next Tuesday", or "2026-03-20"',
    ),
  preferredTimeframe: z
    .string()
    .optional()
    .describe(
      'Optional time preference such as "morning", "afternoon", or "evening"',
    ),
  durationMinutes: z
    .number()
    .optional()
    .describe('Optional follow-up call duration in minutes'),
})

type GetFollowUpSlotsInput = z.infer<typeof GetFollowUpSlotsInputSchema>

const ScheduleFollowUpCallInputSchema = z.object({
  conversationId: z
    .string()
    .optional()
    .describe(
      'The conversation ID to link the follow-up to the current call thread',
    ),
  customerName: z.string().describe('Full name of the customer'),
  customerPhone: z.string().describe('Best callback number for the customer'),
  customerEmail: z
    .string()
    .optional()
    .describe('Customer email, if available'),
  scheduledStartTime: z
    .string()
    .describe(
      'The exact ISO start time chosen by the customer, ideally copied from get-follow-up-slots',
    ),
  durationMinutes: z
    .number()
    .optional()
    .describe('Optional follow-up call duration in minutes'),
  serviceType: z
    .string()
    .optional()
    .describe('Type of service the caller needs'),
  notes: z
    .string()
    .optional()
    .describe('Extra notes for the contractor follow-up call'),
})

type ScheduleFollowUpCallInput = z.infer<
  typeof ScheduleFollowUpCallInputSchema
>

// Placeholder email for bookings without customer email
const PLACEHOLDER_EMAIL = 'callback@meerkatpestcontrol.com'

export function createMcpServer(organizationId: string) {
  const mcpServer = new McpServer({
    name: 'revcenter-mcp-server',
    version: '1.0.0',
  })

  // Initialize Cal.com client if API key is available
  const calcomClient = config.calcom.apiKey
    ? new CalComClient(config.calcom.apiKey)
    : null

  mcpServer.tool(
    'list-services',
    'Get all services that are available to the customer',
    async () => {
      logger.info(`🔧 TOOL CALLED: list-services for org ${organizationId}`)

      const tasks = await findTasksByOrganizationId(organizationId)
      logger.info(`📋 Found ${tasks.length} services`)
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
      logger.info(`🔧 TOOL CALLED: create-task`)
      logger.info(`📝 Service ID: ${input.serviceId}`)
      logger.info(`📝 Conversation ID: ${input.conversationId}`)
      logger.info(`📝 Service Args: ${JSON.stringify(input.serviceArgs)}`)

      try {
        const taskInstance = await createTaskInstanceWithDispatcher(
          input,
          organizationId,
        )

        logger.info(`✅ TASK CREATED: ${taskInstance.id}`)

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
      } catch (error) {
        logger.error(`❌ TASK CREATION FAILED:`, error)
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                success: false,
                error: 'Failed to create task',
              }),
            },
          ],
        }
      }
    },
  )

  mcpServer.tool(
    'get-follow-up-slots',
    'Check the connected Google Calendar and return specific available times for a contractor follow-up call. Use this before you offer times to the caller.',
    GetFollowUpSlotsInputSchema.shape,
    async (input: GetFollowUpSlotsInput) => {
      logger.info(`🔧 TOOL CALLED: get-follow-up-slots`)

      try {
        const result = await listGoogleCalendarFollowUpSlots({
          organizationId,
          preferredDate: input.preferredDate,
          preferredTimeframe: input.preferredTimeframe,
          durationMinutes: input.durationMinutes,
        })

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                success: result.slots.length > 0,
                connectedEmail: result.connectedEmail,
                calendarSummary: result.calendarSummary,
                calendarTimeZone: result.calendarTimeZone,
                slots: result.slots,
                message:
                  result.slots.length > 0
                    ? 'Here are the next available follow-up call times.'
                    : 'No open follow-up call slots were found in the current search window.',
              }),
            },
          ],
        }
      } catch (error) {
        logger.error(`❌ FOLLOW-UP SLOT LOOKUP FAILED:`, error)
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                success: false,
                error: 'Failed to check follow-up availability',
                message:
                  'Calendar availability could not be checked. Offer to have the team call back to confirm a time.',
              }),
            },
          ],
        }
      }
    },
  )

  mcpServer.tool(
    'schedule-follow-up-call',
    'Schedule a contractor follow-up call on the connected Google Calendar after the caller picks one of the offered times.',
    ScheduleFollowUpCallInputSchema.shape,
    async (input: ScheduleFollowUpCallInput) => {
      logger.info(`🔧 TOOL CALLED: schedule-follow-up-call`)

      try {
        const result = await scheduleGoogleCalendarFollowUpCall({
          organizationId,
          conversationId: input.conversationId,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          customerEmail: input.customerEmail,
          scheduledStartTime: input.scheduledStartTime,
          durationMinutes: input.durationMinutes,
          serviceType: input.serviceType,
          notes: input.notes,
        })

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                success: true,
                eventId: result.eventId,
                status: result.status,
                startAt: result.startAt,
                endAt: result.endAt,
                htmlLink: result.htmlLink,
                connectedEmail: result.connectedEmail,
                calendarSummary: result.calendarSummary,
                message:
                  'The follow-up call has been scheduled on the connected Google Calendar.',
              }),
            },
          ],
        }
      } catch (error) {
        logger.error(`❌ FOLLOW-UP SCHEDULING FAILED:`, error)
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                success: false,
                error: 'Failed to schedule follow-up call',
                message:
                  'The follow-up call could not be scheduled. Offer to have the team call back to confirm the time manually.',
              }),
            },
          ],
        }
      }
    },
  )

  // Book appointment tool - schedules via Cal.com
  // Supports bookings with or without email - phone callbacks for customers without email
  mcpServer.tool(
    'book-appointment',
    'Legacy booking tool for older appointment flows. Prefer get-follow-up-slots and schedule-follow-up-call for contractor follow-up call scheduling.',
    BookAppointmentInputSchema.shape,
    async (input: BookAppointmentInput) => {
      const hasEmail = input.customerEmail && input.customerEmail.trim() !== ''
      const effectiveEmail = hasEmail ? input.customerEmail! : PLACEHOLDER_EMAIL

      logger.info(`🔧 TOOL CALLED: book-appointment`)
      logger.info(`📝 Customer: ${input.customerName}`)
      logger.info(`📞 Phone: ${input.customerPhone}`)
      logger.info(
        `📧 Email: ${hasEmail ? input.customerEmail : '(none - phone callback)'}`,
      )
      logger.info(`📍 Address: ${input.customerAddress || 'not provided'}`)
      logger.info(
        `📝 Preferred Date: ${input.preferredDate || 'next available'}`,
      )

      if (!calcomClient) {
        logger.warn('Cal.com client not configured - skipping booking')
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                success: false,
                error:
                  'Booking system not configured. Please transfer to scheduling team.',
                message:
                  'Our scheduling team will contact you to confirm your appointment.',
              }),
            },
          ],
        }
      }

      try {
        // Get event types to find the inspection event
        const eventTypes = await calcomClient.getEventTypes()
        logger.info(`📋 Found ${eventTypes?.length || 0} event types`)

        // Find "Free Pest Inspection" event type or use the first one
        let eventType = eventTypes?.find(
          (et) =>
            et.title.toLowerCase().includes('inspection') ||
            et.title.toLowerCase().includes('pest'),
        )

        if (!eventType && eventTypes?.length > 0) {
          eventType = eventTypes[0]
        }

        if (!eventType) {
          logger.warn('No event types found in Cal.com')
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  success: false,
                  error: 'No appointment types available',
                  message:
                    'Our scheduling team will contact you to schedule your free inspection.',
                }),
              },
            ],
          }
        }

        // Get next available slot
        const nextSlot = await calcomClient.getNextAvailableSlot(
          eventType.id,
          14,
        ) // Look 14 days ahead

        if (!nextSlot) {
          logger.warn('No available slots found')
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  success: false,
                  error: 'No available appointment slots',
                  message:
                    'Our scheduling team will contact you within 24 hours to schedule your free inspection.',
                }),
              },
            ],
          }
        }

        // Build comprehensive notes with all customer info for the callback
        const notesParts = [
          `📞 CALLBACK APPOINTMENT`,
          ``,
          `Customer: ${input.customerName}`,
          `Phone: ${input.customerPhone}`,
          input.customerEmail
            ? `Email: ${input.customerEmail}`
            : `Email: Not provided - PHONE CALLBACK REQUIRED`,
          input.customerAddress ? `Address: ${input.customerAddress}` : null,
          input.locationType ? `Location Type: ${input.locationType}` : null,
          input.serviceType ? `Service Requested: ${input.serviceType}` : null,
          input.notes ? `Additional Notes: ${input.notes}` : null,
          ``,
          `⚠️ ${hasEmail ? 'Customer will receive email confirmation' : 'NO EMAIL - Please call customer to confirm appointment'}`,
        ]
          .filter(Boolean)
          .join('\n')

        // Create the booking
        const booking = await calcomClient.createBooking({
          eventTypeId: eventType.id,
          start: nextSlot,
          attendee: {
            name: input.customerName,
            email: effectiveEmail,
            phoneNumber: input.customerPhone,
            timeZone: 'America/New_York',
          },
          notes: notesParts,
          metadata: {
            organizationId,
            serviceType: input.serviceType || 'pest-control',
            hasEmail: hasEmail ? 'true' : 'false',
            customerPhone: input.customerPhone,
            customerAddress: input.customerAddress || '',
          },
        })

        const appointmentDate = new Date(nextSlot)
        const formattedDate = appointmentDate.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        })
        const formattedTime = appointmentDate.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })

        logger.info(`✅ BOOKING CREATED: ${booking?.uid || booking?.id}`)
        logger.info(`📅 Appointment: ${formattedDate} at ${formattedTime}`)
        logger.info(
          `📧 Email confirmation: ${hasEmail ? 'Yes' : 'No - phone callback'}`,
        )

        // Link booking to task instance if we have a conversationId
        if (input.conversationId) {
          try {
            const taskInstance = await findTaskInstanceByConversationId(
              input.conversationId,
              organizationId,
            )
            if (taskInstance) {
              await updateTaskInstanceWithBooking(taskInstance.id, {
                calcomBookingId: String(booking?.uid || booking?.id),
                calcomEventId: eventType.id,
                appointmentTime: appointmentDate,
              })
              logger.info(`📎 Linked booking to lead: ${taskInstance.id}`)
            }
          } catch (linkError) {
            logger.warn(`Could not link booking to lead:`, linkError)
            // Don't fail the booking if linking fails
          }
        }

        // Different success messages based on whether email was provided
        const successMessage = hasEmail
          ? `Great news! Your free pest inspection is scheduled for ${formattedDate} at ${formattedTime}. You'll receive a confirmation email at ${input.customerEmail}.`
          : `Great news! Your free pest inspection is scheduled for ${formattedDate} at ${formattedTime}. Our team will call you at ${input.customerPhone} to confirm the appointment.`

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                success: true,
                bookingId: booking?.uid || booking?.id,
                appointmentDate: formattedDate,
                appointmentTime: formattedTime,
                hasEmail,
                confirmationMethod: hasEmail ? 'email' : 'phone',
                message: successMessage,
              }),
            },
          ],
        }
      } catch (error) {
        logger.error(`❌ BOOKING FAILED:`, error)
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                success: false,
                error: 'Failed to book appointment',
                message:
                  'Our scheduling team will contact you within 24 hours to confirm your free inspection appointment.',
              }),
            },
          ],
        }
      }
    },
  )

  mcpServer.tool(
    'create-or-update-lead',
    'Create or update a lead record with customer information collected during the conversation. Call this whenever you collect contact details like name, phone, or email from the caller.',
    McpCreateOrUpdateLeadInputSchema.shape,
    async (input: McpCreateOrUpdateLeadInput) => {
      logger.info(`🔧 TOOL CALLED: create-or-update-lead`)
      logger.info(`📝 Conversation ID: ${input.conversationId}`)

      try {
        const email = input.customerEmail?.trim().toLowerCase() || null
        const phone = input.customerPhone?.trim() || null
        const normalized = phone ? normalizePhone(phone) : null

        if (!email && !normalized) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  success: false,
                  error:
                    'At least one of customerPhone or customerEmail is required to identify the lead',
                }),
              },
            ],
          }
        }

        let firstName: string | null = null
        let lastName: string | null = null
        if (input.customerName?.trim()) {
          const parts = input.customerName.trim().split(/\s+/)
          firstName = parts[0] || null
          lastName = parts.length > 1 ? parts.slice(1).join(' ') : null
        }

        const existingLead = await leadRepository.findByOrganizationAndContact(
          organizationId,
          {
            email,
            normalizedPhone: normalized,
          },
        )

        let lead: Awaited<ReturnType<typeof leadRepository.create>>
        let matchedExisting = false

        if (existingLead) {
          matchedExisting = true

          const updates: Record<string, unknown> = {}
          if (!existingLead.firstName && firstName)
            updates.firstName = firstName
          if (!existingLead.lastName && lastName) updates.lastName = lastName
          if (!existingLead.email && email) updates.email = email
          if (!existingLead.phone && phone) {
            updates.phone = phone
            updates.normalizedPhone = normalized
          }

          const prevCustom =
            typeof existingLead.customFields === 'object' &&
            existingLead.customFields !== null
              ? (existingLead.customFields as Record<string, unknown>)
              : {}
          const merged = { ...prevCustom }
          let customFieldsChanged = false

          if (
            input.serviceNeeded &&
            merged.serviceNeeded !== input.serviceNeeded
          ) {
            merged.serviceNeeded = input.serviceNeeded
            customFieldsChanged = true
          }
          if (
            input.customerAddress &&
            merged.customerAddress !== input.customerAddress
          ) {
            merged.customerAddress = input.customerAddress
            customFieldsChanged = true
          }
          if (input.notes && merged.notes !== input.notes) {
            merged.notes = input.notes
            customFieldsChanged = true
          }

          if (customFieldsChanged) updates.customFields = merged

          if (Object.keys(updates).length > 0) {
            const updated = await leadRepository.update(
              existingLead.id,
              updates as any,
            )
            lead = updated ?? existingLead
          } else {
            lead = existingLead
          }
        } else {
          const customFields: Record<string, unknown> = {}
          if (input.serviceNeeded)
            customFields.serviceNeeded = input.serviceNeeded
          if (input.customerAddress)
            customFields.customerAddress = input.customerAddress
          if (input.notes) customFields.notes = input.notes

          lead = await leadRepository.create({
            organizationId,
            firstName,
            lastName,
            email,
            phone,
            normalizedPhone: normalized,
            company: null,
            title: null,
            linkedInUrl: null,
            website: null,
            customFields:
              Object.keys(customFields).length > 0 ? customFields : null,
            pipelineStageId: null,
            dealValue: null,
            updatedAt: new Date(),
          })
        }

        if (input.conversationId) {
          try {
            const taskInstance = await findTaskInstanceByConversationId(
              input.conversationId,
              organizationId,
            )
            if (taskInstance) {
              logger.info(
                { taskInstanceId: taskInstance.id, leadId: lead.id },
                'Lead associated with task instance via conversationId',
              )
            }
          } catch (linkError) {
            logger.warn(
              { error: linkError },
              'Could not look up task instance for lead association',
            )
          }
        }

        logger.info(
          { leadId: lead.id, matchedExisting, phone, email },
          matchedExisting
            ? 'Lead updated via MCP tool'
            : 'Lead created via MCP tool',
        )

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                success: true,
                leadId: lead.id,
                matchedExisting,
                message: matchedExisting
                  ? 'Customer information has been updated in our system.'
                  : 'New lead has been created in our system.',
              }),
            },
          ],
        }
      } catch (error) {
        logger.error(`❌ LEAD UPSERT FAILED:`, error)
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                success: false,
                error: 'Failed to create or update lead',
              }),
            },
          ],
        }
      }
    },
  )

  return mcpServer
}
