import { config } from '@/config'

const GOOGLE_OAUTH_AUTHORIZE_URL =
  'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo'
const GOOGLE_CALENDAR_LIST_URL =
  'https://www.googleapis.com/calendar/v3/users/me/calendarList'
const GOOGLE_FREEBUSY_URL = 'https://www.googleapis.com/calendar/v3/freeBusy'

export interface GoogleTokenSet {
  accessToken: string
  refreshToken?: string | null
  expiresIn?: number
  scope?: string
  idToken?: string
}

export interface GoogleCalendarProfile {
  email: string
  calendarId: string
  calendarSummary: string
  timeZone: string | null
}

interface GoogleApiErrorPayload {
  error?: {
    code?: number
    message?: string
    status?: string
  }
  error_description?: string
}

export class GoogleCalendarApiError extends Error {
  status: number

  constructor(message: string, status = 500) {
    super(message)
    this.name = 'GoogleCalendarApiError'
    this.status = status
  }
}

const parseJsonResponse = async <T>(response: Response): Promise<T> => {
  const text = await response.text()
  const parsed = text ? (JSON.parse(text) as T) : ({} as T)

  if (!response.ok) {
    const payload = parsed as GoogleApiErrorPayload
    throw new GoogleCalendarApiError(
      payload.error?.message ||
        payload.error_description ||
        'Google Calendar request failed',
      response.status,
    )
  }

  return parsed
}

export class GoogleCalendarClient {
  private readonly clientId: string
  private readonly clientSecret: string

  constructor(
    clientId = config.providers.google.clientId,
    clientSecret = config.providers.google.clientSecret,
  ) {
    this.clientId = clientId
    this.clientSecret = clientSecret
  }

  buildAuthorizeUrl(input: {
    redirectUri: string
    state: string
    loginHint?: string
  }) {
    const url = new URL(GOOGLE_OAUTH_AUTHORIZE_URL)
    url.searchParams.set('client_id', this.clientId)
    url.searchParams.set('redirect_uri', input.redirectUri)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('access_type', 'offline')
    url.searchParams.set('include_granted_scopes', 'true')
    url.searchParams.set('prompt', 'consent')
    url.searchParams.set(
      'scope',
      ['openid', 'email', 'https://www.googleapis.com/auth/calendar'].join(' '),
    )
    url.searchParams.set('state', input.state)

    if (input.loginHint) {
      url.searchParams.set('login_hint', input.loginHint)
    }

    return url.toString()
  }

  async exchangeCode(input: {
    code: string
    redirectUri: string
  }): Promise<GoogleTokenSet> {
    const body = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code: input.code,
      redirect_uri: input.redirectUri,
      grant_type: 'authorization_code',
    })

    const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    })

    const payload = await parseJsonResponse<{
      access_token: string
      refresh_token?: string
      expires_in?: number
      scope?: string
      id_token?: string
    }>(response)

    return {
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token || null,
      expiresIn: payload.expires_in,
      scope: payload.scope,
      idToken: payload.id_token,
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<GoogleTokenSet> {
    const body = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    })

    const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    })

    const payload = await parseJsonResponse<{
      access_token: string
      expires_in?: number
      scope?: string
      id_token?: string
    }>(response)

    return {
      accessToken: payload.access_token,
      refreshToken,
      expiresIn: payload.expires_in,
      scope: payload.scope,
      idToken: payload.id_token,
    }
  }

  async getPrimaryCalendarProfile(
    accessToken: string,
  ): Promise<GoogleCalendarProfile> {
    const [userInfo, calendarList] = await Promise.all([
      this.getUserInfo(accessToken),
      this.getCalendarList(accessToken),
    ])

    const primaryCalendar =
      calendarList.items.find((item) => item.primary) || calendarList.items[0]

    if (!primaryCalendar) {
      throw new GoogleCalendarApiError(
        'No Google Calendar was found for the connected account',
        400,
      )
    }

    return {
      email: userInfo.email,
      calendarId: primaryCalendar.id,
      calendarSummary: primaryCalendar.summary || primaryCalendar.id,
      timeZone: primaryCalendar.timeZone || null,
    }
  }

  async testConnection(accessToken: string) {
    return this.getPrimaryCalendarProfile(accessToken)
  }

  async queryFreeBusy(input: {
    accessToken: string
    calendarId: string
    timeMin: string
    timeMax: string
    timeZone?: string
  }) {
    const response = await fetch(GOOGLE_FREEBUSY_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        timeMin: input.timeMin,
        timeMax: input.timeMax,
        timeZone: input.timeZone,
        items: [{ id: input.calendarId }],
      }),
    })

    return parseJsonResponse<{
      calendars?: Record<
        string,
        {
          busy?: Array<{ start: string; end: string }>
        }
      >
    }>(response)
  }

  async createEvent(input: {
    accessToken: string
    calendarId: string
    summary: string
    description: string
    startTime: string
    endTime: string
    timeZone?: string | null
    attendees?: Array<{ email: string }>
  }) {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
        input.calendarId,
      )}/events`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${input.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: input.summary,
          description: input.description,
          start: {
            dateTime: input.startTime,
            timeZone: input.timeZone || undefined,
          },
          end: {
            dateTime: input.endTime,
            timeZone: input.timeZone || undefined,
          },
          attendees: input.attendees,
        }),
      },
    )

    return parseJsonResponse<{
      id: string
      htmlLink?: string
      status?: string
    }>(response)
  }

  private async getUserInfo(accessToken: string) {
    const response = await fetch(GOOGLE_USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    return parseJsonResponse<{ email: string }>(response)
  }

  private async getCalendarList(accessToken: string) {
    const response = await fetch(GOOGLE_CALENDAR_LIST_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    return parseJsonResponse<{
      items: Array<{
        id: string
        summary: string
        primary?: boolean
        timeZone?: string
      }>
    }>(response)
  }
}
