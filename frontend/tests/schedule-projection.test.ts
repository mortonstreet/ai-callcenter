import assert from 'node:assert/strict'
import test from 'node:test'
import { buildScheduleAppointments } from '../app/dashboard/schedule/scheduleProjection'

test('schedule projection combines internal + google calendar events with source labels', () => {
  const appointments = buildScheduleAppointments({
    tasks: [
      {
        id: 'task_1',
        taskName: 'Water heater check',
        appointmentTime: '2026-02-17T14:00:00.000Z',
        status: 'booked',
        info: {
          'full-name': 'Alex Customer',
          'phone-number': '+15551234567',
          address: '11 Service Ave',
        },
      },
      {
        id: 'task_2',
        taskName: 'No appointment yet',
        appointmentTime: null,
        status: 'open',
        info: {},
      },
    ],
    integrationConfig: {
      calendarEvents: [
        {
          id: 'gcal_1',
          title: 'Google inspection',
          startTime: '2026-02-17T16:00:00.000Z',
          endTime: '2026-02-17T16:30:00.000Z',
          status: 'confirmed',
          organizerEmail: 'ops@example.com',
        },
        {
          id: 'gcal_2',
          title: 'Cancelled event',
          startTime: '2026-02-17T18:00:00.000Z',
          endTime: '2026-02-17T18:30:00.000Z',
          status: 'cancelled',
        },
      ],
    },
  })

  assert.equal(appointments.length, 2)
  assert.equal(appointments[0].id, 'task_1')
  assert.equal(appointments[0].source, 'internal')
  assert.equal(appointments[0].sourceLabel, 'RevCenter')
  assert.equal(appointments[1].id, 'google-calendar:gcal_1')
  assert.equal(appointments[1].source, 'google-calendar')
  assert.equal(appointments[1].sourceLabel, 'Google Calendar')
  assert.equal(appointments[1].customerName, 'ops@example.com')
})
