import assert from 'node:assert/strict'
import test from 'node:test'
import { config } from '../src/config'
import {
  processTwilioIsvProvisioningJob,
  TwilioIsvProvisionOrgPayload,
} from '../src/services/twilio-isv-provisioning.service'

type MockFetchStep = {
  method: 'GET' | 'POST'
  urlIncludes: string
  status?: number
  response?: unknown
  textBody?: string
}

type TwilioConfigRow = {
  organizationId: string
  accountSid: string | null
  authToken: string | null
  phoneNumber: string | null
  phoneNumberSid: string | null
  apiKeySid: string | null
  apiKeySecret: string | null
  twimlAppSid: string | null
  twilioSubaccountSid: string | null
  twilioSubaccountFriendlyName: string | null
  isIsvManaged: boolean
  provisioningStatus: string
  provisioningError: string | null
  provisioningAttemptCount: number
  lastProvisioningAttemptAt: Date | null
  provisionedAt: Date | null
  autoRecord: boolean
}

const createQueuedFetch = (steps: MockFetchStep[]) => {
  const pending = [...steps]

  const fetchImpl: typeof fetch = (async (input, init) => {
    const next = pending.shift()
    if (!next) {
      throw new Error(
        'Unexpected Twilio fetch call with no remaining mock steps',
      )
    }

    const method = (init?.method || 'GET').toUpperCase()
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url

    if (method !== next.method) {
      throw new Error(
        `Expected ${next.method} but received ${method} for ${url}`,
      )
    }

    if (!url.includes(next.urlIncludes)) {
      throw new Error(
        `Expected URL containing "${next.urlIncludes}" but received "${url}"`,
      )
    }

    const status = next.status || 200
    if (status >= 400) {
      return new Response(next.textBody || 'request failed', {
        status,
      })
    }

    return new Response(JSON.stringify(next.response || {}), {
      status,
      headers: {
        'content-type': 'application/json',
      },
    })
  }) as typeof fetch

  return {
    fetchImpl,
    assertExhausted: () => {
      assert.equal(
        pending.length,
        0,
        `Expected all mock fetch steps to run, ${pending.length} remaining`,
      )
    },
  }
}

const createTwilioConfigStore = (organizationId: string) => {
  let row: TwilioConfigRow | undefined

  const base = (): TwilioConfigRow => ({
    organizationId,
    accountSid: null,
    authToken: null,
    phoneNumber: null,
    phoneNumberSid: null,
    apiKeySid: null,
    apiKeySecret: null,
    twimlAppSid: null,
    twilioSubaccountSid: null,
    twilioSubaccountFriendlyName: null,
    isIsvManaged: false,
    provisioningStatus: 'pending',
    provisioningError: null,
    provisioningAttemptCount: 0,
    lastProvisioningAttemptAt: null,
    provisionedAt: null,
    autoRecord: true,
  })

  return {
    find: async () => (row ? { ...row } : undefined),
    upsert: async (
      _organizationId: string,
      updates: Partial<TwilioConfigRow>,
    ): Promise<TwilioConfigRow> => {
      row = {
        ...(row || base()),
        ...updates,
      }
      return { ...row }
    },
    seed: (seedRow: Partial<TwilioConfigRow>) => {
      row = {
        ...base(),
        ...seedRow,
      }
    },
    get: () => row,
  }
}

const createTestDeps = (input: {
  payload: TwilioIsvProvisionOrgPayload
  fetchSteps: MockFetchStep[]
}) => {
  const store = createTwilioConfigStore(input.payload.organizationId)
  const organizationStateTransitions: Array<{
    status: string
    error: string | null
  }> = []
  const assignmentCalls: string[] = []

  const { fetchImpl, assertExhausted } = createQueuedFetch(input.fetchSteps)

  const dependencies = {
    fetchImpl,
    findTwilioConfigImpl: store.find,
    upsertTwilioConfigImpl: store.upsert,
    getOrganizationImpl: async (organizationId: string) => ({
      id: organizationId,
      name: 'Acme Services',
    }),
    setOrganizationProvisioningStateImpl: async (
      _organizationId: string,
      status: 'pending' | 'running' | 'failed' | 'completed',
      errorMessage: string | null,
    ) => {
      organizationStateTransitions.push({
        status,
        error: errorMessage,
      })
    },
    assignPrimaryPhoneNumberToFirstAgentImpl: async (
      _organizationId: string,
      phoneNumber: string,
    ) => {
      assignmentCalls.push(phoneNumber)
      return {
        id: 'agent_1',
        phoneNumber,
      }
    },
    resolveMasterCredentialsImpl: () => ({
      accountSid: 'AC_MASTER',
      authToken: 'master_token',
    }),
    loggerImpl: {
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined,
    },
  }

  return {
    store,
    dependencies,
    assignmentCalls,
    organizationStateTransitions,
    assertExhausted,
  }
}

const voiceUrl = `${config.backendUrl.replace(/\/$/, '')}/api/call-center/voice`

test('provisions Twilio subaccount, number, and first-agent assignment', async () => {
  const payload = {
    organizationId: 'org_1',
    areaCode: '415',
  }

  const fixture = createTestDeps({
    payload,
    fetchSteps: [
      {
        method: 'POST',
        urlIncludes: '/2010-04-01/Accounts.json',
        response: {
          sid: 'AC_SUB_1',
          auth_token: 'sub_token_1',
        },
      },
      {
        method: 'POST',
        urlIncludes: '/Accounts/AC_SUB_1/Keys.json',
        response: {
          sid: 'SK_SUB_1',
          secret: 'sk_secret_1',
        },
      },
      {
        method: 'POST',
        urlIncludes: '/Accounts/AC_SUB_1/Applications.json',
        response: {
          sid: 'AP_APP_1',
        },
      },
      {
        method: 'GET',
        urlIncludes: '/Accounts/AC_SUB_1/AvailablePhoneNumbers/US/Local.json',
        response: {
          available_phone_numbers: [{ phone_number: '+14155550123' }],
        },
      },
      {
        method: 'POST',
        urlIncludes: '/Accounts/AC_SUB_1/IncomingPhoneNumbers.json',
        response: {
          sid: 'PN_SUB_1',
          phone_number: '+14155550123',
        },
      },
      {
        method: 'POST',
        urlIncludes: '/Accounts/AC_SUB_1/IncomingPhoneNumbers/PN_SUB_1.json',
        response: {},
      },
      {
        method: 'GET',
        urlIncludes: '/Accounts/AC_SUB_1/IncomingPhoneNumbers/PN_SUB_1.json',
        response: {
          voice_application_sid: 'AP_APP_1',
          phone_number: '+14155550123',
        },
      },
      {
        method: 'GET',
        urlIncludes: '/Accounts/AC_SUB_1/Applications/AP_APP_1.json',
        response: {
          voice_url: voiceUrl,
        },
      },
    ],
  })

  const result = await processTwilioIsvProvisioningJob(
    payload,
    fixture.dependencies,
  )

  assert.deepEqual(result, {
    skipped: false,
    organizationId: 'org_1',
    subaccountSid: 'AC_SUB_1',
    phoneNumber: '+14155550123',
  })

  const finalConfig = fixture.store.get()
  assert.ok(finalConfig)
  assert.equal(finalConfig?.provisioningStatus, 'completed')
  assert.equal(finalConfig?.twilioSubaccountSid, 'AC_SUB_1')
  assert.equal(finalConfig?.apiKeySid, 'SK_SUB_1')
  assert.equal(finalConfig?.twimlAppSid, 'AP_APP_1')
  assert.equal(finalConfig?.phoneNumberSid, 'PN_SUB_1')
  assert.equal(finalConfig?.phoneNumber, '+14155550123')

  assert.deepEqual(fixture.assignmentCalls, ['+14155550123'])
  assert.deepEqual(fixture.organizationStateTransitions, [
    { status: 'running', error: null },
    { status: 'completed', error: null },
  ])

  fixture.assertExhausted()
})

test('reuses existing subaccount credentials on retry and only purchases number', async () => {
  const payload = {
    organizationId: 'org_2',
    areaCode: '212',
  }

  const fixture = createTestDeps({
    payload,
    fetchSteps: [
      {
        method: 'GET',
        urlIncludes:
          '/Accounts/AC_SUB_EXISTING/AvailablePhoneNumbers/US/Local.json',
        response: {
          available_phone_numbers: [{ phone_number: '+12125550123' }],
        },
      },
      {
        method: 'POST',
        urlIncludes: '/Accounts/AC_SUB_EXISTING/IncomingPhoneNumbers.json',
        response: {
          sid: 'PN_SUB_EXISTING',
          phone_number: '+12125550123',
        },
      },
      {
        method: 'POST',
        urlIncludes:
          '/Accounts/AC_SUB_EXISTING/IncomingPhoneNumbers/PN_SUB_EXISTING.json',
        response: {},
      },
      {
        method: 'GET',
        urlIncludes:
          '/Accounts/AC_SUB_EXISTING/IncomingPhoneNumbers/PN_SUB_EXISTING.json',
        response: {
          voice_application_sid: 'AP_EXISTING',
          phone_number: '+12125550123',
        },
      },
      {
        method: 'GET',
        urlIncludes: '/Accounts/AC_SUB_EXISTING/Applications/AP_EXISTING.json',
        response: {
          voice_url: voiceUrl,
        },
      },
    ],
  })

  fixture.store.seed({
    organizationId: 'org_2',
    accountSid: 'AC_SUB_EXISTING',
    authToken: 'sub_token_existing',
    twilioSubaccountSid: 'AC_SUB_EXISTING',
    twilioSubaccountFriendlyName: 'Existing Subaccount',
    apiKeySid: 'SK_EXISTING',
    apiKeySecret: 'secret_existing',
    twimlAppSid: 'AP_EXISTING',
    provisioningAttemptCount: 2,
    provisioningStatus: 'failed',
    provisioningError: 'previous failure',
  })

  const result = await processTwilioIsvProvisioningJob(
    payload,
    fixture.dependencies,
  )

  assert.equal(result.skipped, false)
  assert.equal(result.subaccountSid, 'AC_SUB_EXISTING')
  assert.equal(result.phoneNumber, '+12125550123')

  const finalConfig = fixture.store.get()
  assert.ok(finalConfig)
  assert.equal(finalConfig?.provisioningStatus, 'completed')
  assert.equal(finalConfig?.provisioningAttemptCount, 3)
  assert.equal(finalConfig?.apiKeySid, 'SK_EXISTING')
  assert.equal(finalConfig?.twimlAppSid, 'AP_EXISTING')
  assert.equal(finalConfig?.phoneNumber, '+12125550123')

  fixture.assertExhausted()
})

test('marks provisioning failed when no numbers are available', async () => {
  const payload = {
    organizationId: 'org_3',
    areaCode: '917',
  }

  const fixture = createTestDeps({
    payload,
    fetchSteps: [
      {
        method: 'POST',
        urlIncludes: '/2010-04-01/Accounts.json',
        response: {
          sid: 'AC_SUB_3',
          auth_token: 'sub_token_3',
        },
      },
      {
        method: 'POST',
        urlIncludes: '/Accounts/AC_SUB_3/Keys.json',
        response: {
          sid: 'SK_SUB_3',
          secret: 'sk_secret_3',
        },
      },
      {
        method: 'POST',
        urlIncludes: '/Accounts/AC_SUB_3/Applications.json',
        response: {
          sid: 'AP_APP_3',
        },
      },
      {
        method: 'GET',
        urlIncludes: '/Accounts/AC_SUB_3/AvailablePhoneNumbers/US/Local.json',
        response: {
          available_phone_numbers: [],
        },
      },
    ],
  })

  await assert.rejects(async () => {
    await processTwilioIsvProvisioningJob(payload, fixture.dependencies)
  }, /No Twilio numbers are available for area code 917/)

  const finalConfig = fixture.store.get()
  assert.ok(finalConfig)
  assert.equal(finalConfig?.provisioningStatus, 'failed')
  assert.match(finalConfig?.provisioningError || '', /area code 917/)

  assert.deepEqual(fixture.assignmentCalls, [])
  assert.equal(fixture.organizationStateTransitions[0]?.status, 'running')
  assert.equal(fixture.organizationStateTransitions[1]?.status, 'failed')

  fixture.assertExhausted()
})
