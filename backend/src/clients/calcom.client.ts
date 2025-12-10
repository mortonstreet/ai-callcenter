import logger from '@/lib/logger'

// Using v1 API as v2 has issues
const CALCOM_API_URL = 'https://api.cal.com/v1'

interface CalComEventType {
  id: number
  slug: string
  title: string
  length: number
  description?: string
}

interface CalComAvailableSlot {
  time: string
}

interface CalComBooking {
  id: number
  uid: string
  title: string
  startTime: string
  endTime: string
  attendees: Array<{
    email: string
    name: string
  }>
  status: string
}

interface CreateBookingParams {
  eventTypeId: number
  start: string // ISO datetime
  attendee: {
    name: string
    email: string
    phoneNumber?: string
    timeZone?: string
  }
  notes?: string
  metadata?: Record<string, string>
}

interface GetAvailabilityParams {
  eventTypeId: number
  startTime: string // ISO datetime
  endTime: string // ISO datetime
}

export class CalComClient {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // v1 API uses query param for auth
    const separator = endpoint.includes('?') ? '&' : '?'
    const url = `${CALCOM_API_URL}${endpoint}${separator}apiKey=${this.apiKey}`
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error(`Cal.com API error: ${response.status} - ${errorText}`)
      throw new Error(`Cal.com API error: ${response.status} - ${errorText}`)
    }

    return response.json()
  }

  /**
   * Get all event types for the authenticated user
   */
  async getEventTypes(): Promise<CalComEventType[]> {
    const response = await this.request<{ event_types: CalComEventType[] }>('/event-types')
    return response.event_types || []
  }

  /**
   * Create a new event type
   */
  async createEventType(params: {
    title: string
    slug: string
    length: number
    description?: string
  }): Promise<CalComEventType> {
    const response = await this.request<{ event_type: CalComEventType }>('/event-types', {
      method: 'POST',
      body: JSON.stringify(params),
    })
    return response.event_type
  }

  /**
   * Get available time slots for an event type
   * Uses the /slots endpoint with username and event slug
   */
  async getAvailability(params: GetAvailabilityParams & { username?: string; eventSlug?: string }): Promise<{ slots: Record<string, Array<{ time: string }>> }> {
    const queryParams = new URLSearchParams({
      startTime: params.startTime,
      endTime: params.endTime,
      eventTypeId: params.eventTypeId.toString(),
    })
    
    // v1 uses /availability endpoint
    const response = await this.request<{ slots: Record<string, Array<{ time: string }>> }>(
      `/slots?${queryParams.toString()}`
    )
    return response
  }

  /**
   * Create a booking using v1 API
   */
  async createBooking(params: CreateBookingParams): Promise<CalComBooking> {
    const bookingData = {
      eventTypeId: params.eventTypeId,
      start: params.start,
      responses: {
        name: params.attendee.name,
        email: params.attendee.email,
        phone: params.attendee.phoneNumber,
        notes: params.notes || '',
      },
      timeZone: params.attendee.timeZone || 'America/New_York',
      language: 'en',
      metadata: params.metadata || {},
    }

    const response = await this.request<CalComBooking>('/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    })
    return response
  }

  /**
   * Get a booking by UID
   */
  async getBooking(bookingUid: string): Promise<CalComBooking> {
    return this.request<CalComBooking>(`/bookings/${bookingUid}`)
  }

  /**
   * Cancel a booking
   */
  async cancelBooking(bookingId: number, reason?: string): Promise<void> {
    await this.request(`/bookings/${bookingId}/cancel`, {
      method: 'DELETE',
      body: JSON.stringify({ cancellationReason: reason }),
    })
  }

  /**
   * Helper: Get the first available slot in the next N days
   */
  async getNextAvailableSlot(
    eventTypeId: number,
    daysAhead: number = 7
  ): Promise<string | null> {
    const startTime = new Date()
    const endTime = new Date()
    endTime.setDate(endTime.getDate() + daysAhead)

    try {
      const availability = await this.getAvailability({
        eventTypeId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      })

      // Find the first available slot
      const slots = availability.slots || {}
      for (const date of Object.keys(slots).sort()) {
        const daySlots = slots[date]
        if (daySlots && daySlots.length > 0) {
          return daySlots[0].time
        }
      }

      return null
    } catch (error) {
      logger.error('Failed to get availability:', error)
      return null
    }
  }
}

// Singleton instance - will be initialized when config is loaded
let calComClientInstance: CalComClient | null = null

export const getCalComClient = (apiKey?: string): CalComClient => {
  if (!calComClientInstance && apiKey) {
    calComClientInstance = new CalComClient(apiKey)
  }
  if (!calComClientInstance) {
    throw new Error('Cal.com client not initialized. Provide API key.')
  }
  return calComClientInstance
}

export const initCalComClient = (apiKey: string): CalComClient => {
  calComClientInstance = new CalComClient(apiKey)
  return calComClientInstance
}

