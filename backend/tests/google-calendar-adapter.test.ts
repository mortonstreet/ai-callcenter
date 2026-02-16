import assert from 'node:assert/strict'
import test from 'node:test'

const ensureBackendEnv = () => {
  const defaults: Record<string, string> = {
    FRONTEND_URL: 'http://localhost:3000',
    DATABASE_URL: 'http://localhost:5432/revcenter',
    DB_HOST: 'localhost',
    DB_PORT: '5432',
    DB_USER: 'postgres',
    DB_PASSWORD: 'postgres',
    DB_NAME: 'revcenter',
    BETTERSTACK_TOKEN: 'test-token',
    BETTERSTACK_HOST: 'test-host',
    SENTRY_DSN: 'https://example@sentry.io/1',
    JWT_SECRET: 'test-jwt-secret',
    WEBHOOK_API_KEY: 'test-webhook-api-key',
    GOOGLE_CLIENT_ID: 'test-google-client-id',
    GOOGLE_CLIENT_SECRET: 'test-google-client-secret',
    RESEND_API_KEY: 'test-resend-key',
  }

  for (const [key, value] of Object.entries(defaults)) {
    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

test('google calendar adapter builds oauth callback url and exchanges tokens', async () => {
  ensureBackendEnv()
  const { googleCalendarAdapter } = await import(
    '../src/services/integrations/provider-adapters'
  )

  const authorizeUrl = googleCalendarAdapter.buildAuthorizeUrl({
    organizationId: 'org_123',
    state: 'oauth-state',
  })

  const parsedAuthorizeUrl = new URL(authorizeUrl)
  assert.equal(
    parsedAuthorizeUrl.origin + parsedAuthorizeUrl.pathname,
    'https://accounts.google.com/o/oauth2/v2/auth',
  )
  assert.equal(parsedAuthorizeUrl.searchParams.get('state'), 'oauth-state')
  assert.equal(parsedAuthorizeUrl.searchParams.get('response_type'), 'code')
  assert.match(
    parsedAuthorizeUrl.searchParams.get('redirect_uri') || '',
    /\/api\/integrations\/google-calendar\/callback\?organizationId=org_123/,
  )

  const originalFetch = globalThis.fetch
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        access_token: 'access-token-1',
        refresh_token: 'refresh-token-1',
        expires_in: 3600,
        scope: 'https://www.googleapis.com/auth/calendar.readonly',
      }),
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
      },
    )

  try {
    const tokenSet = await googleCalendarAdapter.exchangeCode({
      organizationId: 'org_123',
      code: 'auth-code-123',
    })

    assert.equal(tokenSet.accessToken, 'access-token-1')
    assert.equal(tokenSet.refreshToken, 'refresh-token-1')
    assert.equal(
      tokenSet.scopes,
      'https://www.googleapis.com/auth/calendar.readonly',
    )
    assert.ok(tokenSet.tokenExpiresAt instanceof Date)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('google calendar adapter refresh keeps prior refresh token when provider omits one', async () => {
  ensureBackendEnv()
  const { googleCalendarAdapter } = await import(
    '../src/services/integrations/provider-adapters'
  )

  const originalFetch = globalThis.fetch
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        access_token: 'access-token-2',
        expires_in: 1200,
      }),
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
      },
    )

  try {
    const refreshed = await googleCalendarAdapter.refreshToken({
      organizationId: 'org_123',
      refreshToken: 'refresh-token-original',
    })

    assert.equal(refreshed.accessToken, 'access-token-2')
    assert.equal(refreshed.refreshToken, 'refresh-token-original')
    assert.ok(refreshed.tokenExpiresAt instanceof Date)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('google calendar event mapping handles confirmed, tentative, and cancelled payloads', async () => {
  ensureBackendEnv()
  const { mapGoogleCalendarEventsToJobs } = await import(
    '../src/services/integrations/provider-adapters'
  )

  const mapped = mapGoogleCalendarEventsToJobs([
    {
      id: 'evt_1',
      summary: 'Install follow-up',
      status: 'confirmed',
      start: { dateTime: '2026-02-17T16:00:00.000Z' },
      end: { dateTime: '2026-02-17T16:30:00.000Z' },
      organizer: { email: 'dispatcher@example.com' },
      location: '123 Main St',
    },
    {
      id: 'evt_2',
      summary: 'All-day hold',
      status: 'tentative',
      start: { date: '2026-02-18' },
      end: { date: '2026-02-19' },
    },
    {
      id: 'evt_3',
      status: 'cancelled',
    },
  ])

  assert.equal(mapped.length, 3)
  assert.equal(mapped[0].externalId, 'evt_1')
  assert.equal(mapped[0].status, 'confirmed')
  assert.equal(mapped[0].source, 'google-calendar')
  assert.equal(mapped[0].organizerEmail, 'dispatcher@example.com')
  assert.equal(mapped[1].status, 'tentative')
  assert.match(mapped[1].startsAt || '', /^2026-02-18T00:00:00.000Z$/)
  assert.equal(mapped[2].externalId, 'evt_3')
  assert.equal(mapped[2].status, 'cancelled')
})
