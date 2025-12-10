import { z } from 'zod'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import logger from '@/lib/logger'
import { findTasksByOrganizationId } from '@/repositories/organization.repository'
import { findTaskInstanceByConversationId } from '@/repositories/agent.repository'
import { McpCreateTaskInput, McpCreateTaskInputSchema } from '@/types/mcp'
import { formatTasksForMcp } from '@/utils/task'
import { createTaskInstanceWithDispatcher, updateTaskInstanceWithBooking } from '@/services/task.service'
import { CalComClient } from '@/clients/calcom.client'
import { config } from '@/config'

// Schema for book-appointment input - email is optional for phone callback appointments
const BookAppointmentInputSchema = z.object({
  conversationId: z.string().optional().describe('The conversation ID to link the booking to the lead - get from system__conversation_id'),
  customerName: z.string().describe('Full name of the customer'),
  customerPhone: z.string().describe('Phone number of the customer - REQUIRED for callback'),
  customerEmail: z.string().optional().describe('Email address of the customer (optional - if not provided, we will call them back)'),
  customerAddress: z.string().optional().describe('Service address of the customer'),
  preferredDate: z.string().optional().describe('Preferred date for appointment (e.g., "tomorrow", "next monday", "2024-12-15")'),
  serviceType: z.string().optional().describe('Type of service requested (e.g., "ants", "rodents", "general pest inspection")'),
  locationType: z.string().optional().describe('Whether residential or commercial'),
  notes: z.string().optional().describe('Additional notes about the appointment'),
})

type BookAppointmentInput = z.infer<typeof BookAppointmentInputSchema>

// Placeholder email for bookings without customer email
const PLACEHOLDER_EMAIL = 'callback@meerkatpestcontrol.com'

export function createMcpServer(organizationId: string) {
  const mcpServer = new McpServer({
    name: 'revcenter-mcp-server',
    version: '1.0.0',
  })
  
  // Initialize Cal.com client if API key is available
  const calcomClient = config.calcom.apiKey ? new CalComClient(config.calcom.apiKey) : null

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

  // Book appointment tool - schedules via Cal.com
  // Supports bookings with or without email - phone callbacks for customers without email
  mcpServer.tool(
    'book-appointment',
    'Book a free inspection appointment for the customer. Call this AFTER collecting all customer information and creating the task. Email is optional - if not provided, we will schedule a phone callback.',
    BookAppointmentInputSchema.shape,
    async (input: BookAppointmentInput) => {
      const hasEmail = input.customerEmail && input.customerEmail.trim() !== ''
      const effectiveEmail = hasEmail ? input.customerEmail! : PLACEHOLDER_EMAIL
      
      logger.info(`🔧 TOOL CALLED: book-appointment`)
      logger.info(`📝 Customer: ${input.customerName}`)
      logger.info(`📞 Phone: ${input.customerPhone}`)
      logger.info(`📧 Email: ${hasEmail ? input.customerEmail : '(none - phone callback)'}`)
      logger.info(`📍 Address: ${input.customerAddress || 'not provided'}`)
      logger.info(`📝 Preferred Date: ${input.preferredDate || 'next available'}`)

      if (!calcomClient) {
        logger.warn('Cal.com client not configured - skipping booking')
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                success: false,
                error: 'Booking system not configured. Please transfer to scheduling team.',
                message: 'Our scheduling team will contact you to confirm your appointment.',
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
          (et) => et.title.toLowerCase().includes('inspection') || et.title.toLowerCase().includes('pest')
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
                  message: 'Our scheduling team will contact you to schedule your free inspection.',
                }),
              },
            ],
          }
        }

        // Get next available slot
        const nextSlot = await calcomClient.getNextAvailableSlot(eventType.id, 14) // Look 14 days ahead

        if (!nextSlot) {
          logger.warn('No available slots found')
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  success: false,
                  error: 'No available appointment slots',
                  message: 'Our scheduling team will contact you within 24 hours to schedule your free inspection.',
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
          input.customerEmail ? `Email: ${input.customerEmail}` : `Email: Not provided - PHONE CALLBACK REQUIRED`,
          input.customerAddress ? `Address: ${input.customerAddress}` : null,
          input.locationType ? `Location Type: ${input.locationType}` : null,
          input.serviceType ? `Service Requested: ${input.serviceType}` : null,
          input.notes ? `Additional Notes: ${input.notes}` : null,
          ``,
          `⚠️ ${hasEmail ? 'Customer will receive email confirmation' : 'NO EMAIL - Please call customer to confirm appointment'}`,
        ].filter(Boolean).join('\n')

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
        logger.info(`📧 Email confirmation: ${hasEmail ? 'Yes' : 'No - phone callback'}`)

        // Link booking to task instance if we have a conversationId
        if (input.conversationId) {
          try {
            const taskInstance = await findTaskInstanceByConversationId(input.conversationId, organizationId)
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
                message: 'Our scheduling team will contact you within 24 hours to confirm your free inspection appointment.',
              }),
            },
          ],
        }
      }
    },
  )

  return mcpServer
}
