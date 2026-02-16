export type AppointmentSource = 'internal' | 'google-calendar'

export interface InternalScheduleTask {
  id: string
  taskName: string
  appointmentTime: string | null
  status: string
  info: unknown
}

export interface ScheduleAppointment {
  id: string
  title: string
  time: Date
  status: string
  customerName: string
  customerPhone: string
  customerAddress: string
  source: AppointmentSource
  sourceLabel: string
}

interface GoogleCalendarProjectionEvent {
  id: string
  title: string
  startTime: string
  status: 'confirmed' | 'tentative' | 'cancelled'
  location?: string
  organizerEmail?: string
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const asString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  return trimmed || null
}

const asInfoRecord = (value: unknown): Record<string, string> => {
  if (!isRecord(value)) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(value).flatMap(([key, item]) =>
      typeof item === 'string' ? [[key, item]] : [],
    ),
  )
}

const toDate = (value: unknown): Date | null => {
  if (typeof value !== 'string' || !value.trim()) {
    return null
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }
  return parsed
}

const parseGoogleProjectionEvent = (
  value: unknown,
): GoogleCalendarProjectionEvent | null => {
  if (!isRecord(value)) {
    return null
  }

  const id = asString(value.id)
  const title = asString(value.title) || 'Google Calendar event'
  const startTime = asString(value.startTime)
  if (!id || !startTime || !toDate(startTime)) {
    return null
  }

  const rawStatus = asString(value.status)
  const status: GoogleCalendarProjectionEvent['status'] =
    rawStatus === 'cancelled'
      ? 'cancelled'
      : rawStatus === 'tentative'
        ? 'tentative'
        : 'confirmed'

  return {
    id,
    title,
    startTime,
    status,
    location: asString(value.location) || undefined,
    organizerEmail: asString(value.organizerEmail) || undefined,
  }
}

const normalizeGoogleStatus = (status: GoogleCalendarProjectionEvent['status']) => {
  if (status === 'cancelled') return 'Cancelled'
  if (status === 'tentative') return 'Tentative'
  return 'Confirmed'
}

export const buildScheduleAppointments = (input: {
  tasks?: InternalScheduleTask[] | null
  integrationConfig?: Record<string, unknown> | null
}): ScheduleAppointment[] => {
  const internalAppointments: ScheduleAppointment[] = (input.tasks || [])
    .filter((task) => toDate(task.appointmentTime))
    .map((task) => {
      const info = asInfoRecord(task.info)
      return {
        id: task.id,
        title: task.taskName,
        time: toDate(task.appointmentTime)!,
        status: task.status,
        customerName:
          info['full-name'] || info.name || info['customer-name'] || 'Unknown',
        customerPhone: info['phone-number'] || info.phone || '',
        customerAddress: info.address || info['customer-address'] || '',
        source: 'internal',
        sourceLabel: 'RevCenter',
      }
    })

  const rawEvents = input.integrationConfig?.calendarEvents
  const googleAppointments: ScheduleAppointment[] = Array.isArray(rawEvents)
    ? rawEvents
        .map(parseGoogleProjectionEvent)
        .filter(
          (event): event is GoogleCalendarProjectionEvent => Boolean(event),
        )
        .filter((event) => event.status !== 'cancelled')
        .map((event) => ({
          id: `google-calendar:${event.id}`,
          title: event.title,
          time: toDate(event.startTime)!,
          status: normalizeGoogleStatus(event.status),
          customerName: event.organizerEmail || 'Google Calendar',
          customerPhone: '',
          customerAddress: event.location || '',
          source: 'google-calendar',
          sourceLabel: 'Google Calendar',
        }))
    : []

  return [...internalAppointments, ...googleAppointments].sort(
    (a, b) => a.time.getTime() - b.time.getTime(),
  )
}
