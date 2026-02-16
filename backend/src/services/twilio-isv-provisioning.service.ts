import { randomUUID } from 'crypto'
import { config } from '@/config'
import { db } from '@/lib/db'
import logger from '@/lib/logger'
import {
  findTwilioConfig,
  upsertTwilioConfig,
} from '@/repositories/call-center.repository'
import { QUEUE_NAMES, QueueJobPayload } from '@/types/queues'

export const TWILIO_ISV_PROVISION_ORG_JOB_NAME = 'twilio-isv-provision-org'

type ProvisioningState = 'pending' | 'running' | 'failed' | 'completed'

type JsonRecord = Record<string, unknown>
type UpsertTwilioConfigInput = Parameters<typeof upsertTwilioConfig>[1]

type TwilioConfigRecord = {
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
}

export interface TwilioIsvProvisionOrgPayload extends QueueJobPayload {
  organizationId: string
  areaCode?: string
}

export interface TwilioIsvProvisioningDependencies {
  fetchImpl?: typeof fetch
  findTwilioConfigImpl?: (
    organizationId: string,
  ) => Promise<TwilioConfigRecord | undefined>
  upsertTwilioConfigImpl?: (
    organizationId: string,
    data: UpsertTwilioConfigInput,
  ) => Promise<TwilioConfigRecord>
  getOrganizationImpl?: (
    organizationId: string,
  ) => Promise<{ id: string; name: string } | undefined>
  setOrganizationProvisioningStateImpl?: (
    organizationId: string,
    status: ProvisioningState,
    errorMessage: string | null,
  ) => Promise<void>
  assignPrimaryPhoneNumberToFirstAgentImpl?: (
    organizationId: string,
    phoneNumber: string,
  ) => Promise<unknown>
  resolveMasterCredentialsImpl?: () => { accountSid: string; authToken: string }
  loggerImpl?: Pick<typeof logger, 'info' | 'warn' | 'error'>
}

export const enqueueTwilioIsvProvisioning = async (
  payload: TwilioIsvProvisionOrgPayload,
) => {
  const { enqueueQueueJob } = await import('@/queues')
  return enqueueQueueJob(
    QUEUE_NAMES.INTEGRATION_SYNC,
    TWILIO_ISV_PROVISION_ORG_JOB_NAME,
    payload,
  )
}

export const getTwilioProvisioningSnapshot = async (organizationId: string) => {
  const twilioConfig = await findTwilioConfig(organizationId)
  return {
    organizationId,
    status: twilioConfig?.provisioningStatus || 'pending',
    error: twilioConfig?.provisioningError || null,
    isIsvManaged: twilioConfig?.isIsvManaged || false,
    accountSid: twilioConfig?.accountSid || null,
    twilioSubaccountSid: twilioConfig?.twilioSubaccountSid || null,
    twilioSubaccountFriendlyName:
      twilioConfig?.twilioSubaccountFriendlyName || null,
    apiKeySid: twilioConfig?.apiKeySid || null,
    twimlAppSid: twilioConfig?.twimlAppSid || null,
    phoneNumber: twilioConfig?.phoneNumber || null,
    phoneNumberSid: twilioConfig?.phoneNumberSid || null,
    provisioningAttemptCount: twilioConfig?.provisioningAttemptCount || 0,
    lastProvisioningAttemptAt: twilioConfig?.lastProvisioningAttemptAt || null,
    provisionedAt: twilioConfig?.provisionedAt || null,
  }
}

export const retryTwilioIsvProvisioning = async (input: {
  organizationId: string
  areaCode?: string
}) => {
  await upsertTwilioConfig(input.organizationId, {
    isIsvManaged: true,
    provisioningStatus: 'pending',
    provisioningError: null,
  })

  await setOrganizationProvisioningState(input.organizationId, 'pending', null)

  return enqueueTwilioIsvProvisioning({
    organizationId: input.organizationId,
    areaCode: input.areaCode,
    correlationId: randomUUID(),
  })
}

export const processTwilioIsvProvisioningJob = async (
  payload: TwilioIsvProvisionOrgPayload,
  dependencies: TwilioIsvProvisioningDependencies = {},
) => {
  const fetchImpl = dependencies.fetchImpl || fetch
  const findTwilioConfigFn =
    dependencies.findTwilioConfigImpl || findTwilioConfig
  const upsertTwilioConfigFn =
    dependencies.upsertTwilioConfigImpl || upsertTwilioConfig
  const getOrganizationFn =
    dependencies.getOrganizationImpl || findOrganizationForProvisioning
  const setOrganizationProvisioningStateFn =
    dependencies.setOrganizationProvisioningStateImpl ||
    setOrganizationProvisioningState
  const assignPrimaryPhoneNumberToFirstAgentFn =
    dependencies.assignPrimaryPhoneNumberToFirstAgentImpl ||
    assignPrimaryPhoneNumberToFirstAgentDefault
  const resolveMasterCredentialsFn =
    dependencies.resolveMasterCredentialsImpl || resolveMasterCredentials
  const loggerImpl = dependencies.loggerImpl || logger
  const now = new Date()

  const organization = await getOrganizationFn(payload.organizationId)

  if (!organization) {
    throw new Error(
      `Unable to provision Twilio ISV resources: organization ${payload.organizationId} not found`,
    )
  }

  const existing = await findTwilioConfigFn(payload.organizationId)
  if (isProvisioningComplete(existing)) {
    return {
      skipped: true,
      reason: 'already_provisioned',
      organizationId: payload.organizationId,
      phoneNumber: existing?.phoneNumber || null,
    }
  }

  const currentAttemptCount = existing?.provisioningAttemptCount || 0

  await upsertTwilioConfigFn(payload.organizationId, {
    isIsvManaged: true,
    provisioningStatus: 'running',
    provisioningError: null,
    provisioningAttemptCount: currentAttemptCount + 1,
    lastProvisioningAttemptAt: now,
  })
  await setOrganizationProvisioningStateFn(
    payload.organizationId,
    'running',
    null,
  )

  try {
    const masterCredentials = resolveMasterCredentialsFn()
    const isvConfig = resolveIsvEnvironmentConfig()
    const areaCode =
      payload.areaCode ||
      isvConfig.defaultAreaCode ||
      config.twilio.phoneNumber.slice(2, 5) ||
      '415'

    const backendUrl = config.backendUrl.replace(/\/$/, '')
    const voiceWebhookUrl = `${backendUrl}/api/call-center/voice`
    const statusWebhookUrl = `${backendUrl}/api/call-center/webhook`

    const twilioConfig = await findTwilioConfigFn(payload.organizationId)

    const subaccountFriendlyName =
      twilioConfig?.twilioSubaccountFriendlyName ||
      `RevCenter ${organization.name} (${organization.id.slice(0, 8)})`

    let subaccountSid =
      twilioConfig?.twilioSubaccountSid || twilioConfig?.accountSid
    let subaccountAuthToken = twilioConfig?.authToken || null

    if (!subaccountSid || !subaccountAuthToken) {
      const subaccount = await createTwilioSubaccount({
        fetchImpl,
        masterAccountSid: masterCredentials.accountSid,
        masterAuthToken: masterCredentials.authToken,
        friendlyName: subaccountFriendlyName,
      })

      subaccountSid = subaccount.sid
      subaccountAuthToken = subaccount.authToken

      await upsertTwilioConfigFn(payload.organizationId, {
        accountSid: subaccountSid,
        authToken: subaccountAuthToken,
        twilioSubaccountSid: subaccountSid,
        twilioSubaccountFriendlyName: subaccountFriendlyName,
        isIsvManaged: true,
        provisioningStatus: 'running',
      })
    }

    if (!subaccountSid || !subaccountAuthToken) {
      throw new Error('Missing subaccount credentials after provisioning step')
    }

    const latestConfig = await findTwilioConfigFn(payload.organizationId)

    let apiKeySid = latestConfig?.apiKeySid || null
    let apiKeySecret = latestConfig?.apiKeySecret || null

    if (!apiKeySid || !apiKeySecret) {
      const apiKey = await createTwilioApiKey({
        fetchImpl,
        accountSid: subaccountSid,
        authToken: subaccountAuthToken,
      })
      apiKeySid = apiKey.sid
      apiKeySecret = apiKey.secret

      await upsertTwilioConfigFn(payload.organizationId, {
        apiKeySid,
        apiKeySecret,
        provisioningStatus: 'running',
      })
    }

    let twimlAppSid = latestConfig?.twimlAppSid || null
    if (!twimlAppSid) {
      const twimlApp = await createTwimlApp({
        fetchImpl,
        accountSid: subaccountSid,
        authToken: subaccountAuthToken,
        voiceUrl: voiceWebhookUrl,
        statusCallbackUrl: statusWebhookUrl,
      })
      twimlAppSid = twimlApp.sid

      await upsertTwilioConfigFn(payload.organizationId, {
        twimlAppSid,
        provisioningStatus: 'running',
      })
    }

    const refreshedConfig = await findTwilioConfigFn(payload.organizationId)

    let phoneNumber = refreshedConfig?.phoneNumber || null
    let phoneNumberSid = refreshedConfig?.phoneNumberSid || null

    if (!phoneNumber || !phoneNumberSid) {
      const selectedNumber = await searchAvailableLocalNumber({
        fetchImpl,
        accountSid: subaccountSid,
        authToken: subaccountAuthToken,
        areaCode,
        countryCode: isvConfig.defaultCountryCode,
      })

      if (!selectedNumber) {
        throw new Error(
          `No Twilio numbers are available for area code ${areaCode}`,
        )
      }

      const purchasedNumber = await purchaseSpecificNumber({
        fetchImpl,
        accountSid: subaccountSid,
        authToken: subaccountAuthToken,
        phoneNumber: selectedNumber.phoneNumber,
      })

      phoneNumber = purchasedNumber.phoneNumber
      phoneNumberSid = purchasedNumber.sid

      await upsertTwilioConfigFn(payload.organizationId, {
        phoneNumber,
        phoneNumberSid,
        provisioningStatus: 'running',
      })
    }

    if (!phoneNumber || !phoneNumberSid || !twimlAppSid) {
      throw new Error('Phone number provisioning did not complete successfully')
    }

    await configurePhoneNumberVoiceApplication({
      fetchImpl,
      accountSid: subaccountSid,
      authToken: subaccountAuthToken,
      phoneNumberSid,
      twimlAppSid,
    })

    await verifyProvisioningConfiguration({
      fetchImpl,
      accountSid: subaccountSid,
      authToken: subaccountAuthToken,
      phoneNumberSid,
      expectedPhoneNumber: phoneNumber,
      twimlAppSid,
      expectedVoiceUrl: voiceWebhookUrl,
    })

    await upsertTwilioConfigFn(payload.organizationId, {
      accountSid: subaccountSid,
      authToken: subaccountAuthToken,
      twilioSubaccountSid: subaccountSid,
      twilioSubaccountFriendlyName: subaccountFriendlyName,
      apiKeySid,
      apiKeySecret,
      twimlAppSid,
      phoneNumber,
      phoneNumberSid,
      isIsvManaged: true,
      provisioningStatus: 'completed',
      provisioningError: null,
      provisionedAt: new Date(),
    })

    await setOrganizationProvisioningStateFn(
      payload.organizationId,
      'completed',
      null,
    )

    const updatedFirstAgent = await assignPrimaryPhoneNumberToFirstAgentFn(
      payload.organizationId,
      phoneNumber,
    )

    if (!updatedFirstAgent) {
      loggerImpl.warn(
        { organizationId: payload.organizationId, phoneNumber },
        'Twilio provisioning completed but no agent exists for primary number assignment',
      )
    }

    loggerImpl.info(
      {
        organizationId: payload.organizationId,
        subaccountSid,
        phoneNumber,
      },
      'Twilio ISV provisioning completed',
    )

    return {
      skipped: false,
      organizationId: payload.organizationId,
      subaccountSid,
      phoneNumber,
    }
  } catch (error) {
    const errorMessage = toErrorMessage(error)

    await upsertTwilioConfigFn(payload.organizationId, {
      isIsvManaged: true,
      provisioningStatus: 'failed',
      provisioningError: errorMessage,
      lastProvisioningAttemptAt: new Date(),
    })

    await setOrganizationProvisioningStateFn(
      payload.organizationId,
      'failed',
      errorMessage,
    )

    loggerImpl.error(
      {
        organizationId: payload.organizationId,
        error,
      },
      'Twilio ISV provisioning failed',
    )

    throw error
  }
}

const findOrganizationForProvisioning = async (organizationId: string) => {
  return db
    .selectFrom('organization')
    .select(['id', 'name'])
    .where('id', '=', organizationId)
    .executeTakeFirst()
}

const assignPrimaryPhoneNumberToFirstAgentDefault = async (
  organizationId: string,
  phoneNumber: string,
) => {
  const { assignPrimaryPhoneNumberToFirstAgent } = await import(
    '@/services/agent.service'
  )
  return assignPrimaryPhoneNumberToFirstAgent(organizationId, phoneNumber)
}

const resolveMasterCredentials = () => {
  const isvConfig = resolveIsvEnvironmentConfig()

  if (!isvConfig.provisioningEnabled) {
    throw new Error(
      'Twilio ISV provisioning is disabled. Set TWILIO_ISV_PROVISIONING_ENABLED=true.',
    )
  }

  const accountSid = isvConfig.accountSid || config.twilio.accountSid
  const authToken = isvConfig.authToken || config.twilio.authToken

  if (!accountSid || !authToken) {
    throw new Error(
      'Twilio ISV master credentials missing. Set TWILIO_ISV_ACCOUNT_SID and TWILIO_ISV_AUTH_TOKEN.',
    )
  }

  return {
    accountSid,
    authToken,
  }
}

const resolveIsvEnvironmentConfig = () => {
  const provisioningEnabledRaw =
    process.env.TWILIO_ISV_PROVISIONING_ENABLED || ''
  const provisioningEnabled =
    provisioningEnabledRaw.toLowerCase() === 'true' ||
    provisioningEnabledRaw === '1'

  return {
    accountSid: process.env.TWILIO_ISV_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_ISV_AUTH_TOKEN || '',
    defaultAreaCode: process.env.TWILIO_ISV_DEFAULT_AREA_CODE || '415',
    defaultCountryCode: process.env.TWILIO_ISV_DEFAULT_COUNTRY_CODE || 'US',
    provisioningEnabled,
  }
}

const isProvisioningComplete = (configRow: TwilioConfigRecord | undefined) => {
  if (!configRow) {
    return false
  }

  return (
    configRow.provisioningStatus === 'completed' &&
    !!configRow.accountSid &&
    !!configRow.authToken &&
    !!configRow.phoneNumber &&
    !!configRow.phoneNumberSid &&
    !!configRow.apiKeySid &&
    !!configRow.apiKeySecret &&
    !!configRow.twimlAppSid &&
    !!configRow.twilioSubaccountSid
  )
}

const toErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  return 'Twilio ISV provisioning failed'
}

const isRecord = (value: unknown): value is JsonRecord => {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

const parseOrganizationMetadata = (value: string | null): JsonRecord => {
  if (!value) {
    return {}
  }

  try {
    const parsed = JSON.parse(value)
    if (isRecord(parsed)) {
      return parsed
    }
  } catch {
    return {}
  }

  return {}
}

const setOrganizationProvisioningState = async (
  organizationId: string,
  status: ProvisioningState,
  errorMessage: string | null,
) => {
  const organization = await db
    .selectFrom('organization')
    .select(['id', 'metadata'])
    .where('id', '=', organizationId)
    .executeTakeFirst()

  if (!organization) {
    return
  }

  const metadata = parseOrganizationMetadata(organization.metadata)
  const lifecycle = isRecord(metadata.lifecycle) ? metadata.lifecycle : {}

  const nextMetadata: JsonRecord = {
    ...metadata,
    provisioningStatus: status,
    lifecycle: {
      ...lifecycle,
      provisioningStatus: status,
    },
  }

  if (errorMessage) {
    nextMetadata.provisioningError = errorMessage
  } else {
    delete nextMetadata.provisioningError
  }

  await db
    .updateTable('organization')
    .set({
      metadata: JSON.stringify(nextMetadata),
    })
    .where('id', '=', organizationId)
    .executeTakeFirst()
}

const createTwilioSubaccount = async (input: {
  fetchImpl: typeof fetch
  masterAccountSid: string
  masterAuthToken: string
  friendlyName: string
}) => {
  const data = await twilioRequest({
    fetchImpl: input.fetchImpl,
    url: 'https://api.twilio.com/2010-04-01/Accounts.json',
    method: 'POST',
    accountSid: input.masterAccountSid,
    authToken: input.masterAuthToken,
    body: {
      FriendlyName: input.friendlyName,
    },
  })

  return {
    sid: getRequiredString(data, 'sid'),
    authToken: getRequiredString(data, 'auth_token'),
  }
}

const createTwilioApiKey = async (input: {
  fetchImpl: typeof fetch
  accountSid: string
  authToken: string
}) => {
  const data = await twilioRequest({
    fetchImpl: input.fetchImpl,
    url: `https://api.twilio.com/2010-04-01/Accounts/${input.accountSid}/Keys.json`,
    method: 'POST',
    accountSid: input.accountSid,
    authToken: input.authToken,
    body: {
      FriendlyName: 'RevCenter Provisioned Key',
    },
  })

  return {
    sid: getRequiredString(data, 'sid'),
    secret: getRequiredString(data, 'secret'),
  }
}

const createTwimlApp = async (input: {
  fetchImpl: typeof fetch
  accountSid: string
  authToken: string
  voiceUrl: string
  statusCallbackUrl: string
}) => {
  const data = await twilioRequest({
    fetchImpl: input.fetchImpl,
    url: `https://api.twilio.com/2010-04-01/Accounts/${input.accountSid}/Applications.json`,
    method: 'POST',
    accountSid: input.accountSid,
    authToken: input.authToken,
    body: {
      FriendlyName: 'RevCenter Provisioned TwiML App',
      VoiceUrl: input.voiceUrl,
      VoiceMethod: 'POST',
      StatusCallback: input.statusCallbackUrl,
      StatusCallbackMethod: 'POST',
    },
  })

  return {
    sid: getRequiredString(data, 'sid'),
  }
}

const searchAvailableLocalNumber = async (input: {
  fetchImpl: typeof fetch
  accountSid: string
  authToken: string
  areaCode: string
  countryCode: string
}) => {
  const query = new URLSearchParams({
    AreaCode: input.areaCode,
    VoiceEnabled: 'true',
    Limit: '1',
  }).toString()

  const data = await twilioRequest({
    fetchImpl: input.fetchImpl,
    url: `https://api.twilio.com/2010-04-01/Accounts/${input.accountSid}/AvailablePhoneNumbers/${input.countryCode}/Local.json?${query}`,
    method: 'GET',
    accountSid: input.accountSid,
    authToken: input.authToken,
  })

  const numbers = Array.isArray(data.available_phone_numbers)
    ? data.available_phone_numbers
    : []

  const first = numbers[0]
  if (!isRecord(first)) {
    return null
  }

  const phoneNumber = first.phone_number
  if (typeof phoneNumber !== 'string' || !phoneNumber) {
    return null
  }

  return {
    phoneNumber,
  }
}

const purchaseSpecificNumber = async (input: {
  fetchImpl: typeof fetch
  accountSid: string
  authToken: string
  phoneNumber: string
}) => {
  const data = await twilioRequest({
    fetchImpl: input.fetchImpl,
    url: `https://api.twilio.com/2010-04-01/Accounts/${input.accountSid}/IncomingPhoneNumbers.json`,
    method: 'POST',
    accountSid: input.accountSid,
    authToken: input.authToken,
    body: {
      PhoneNumber: input.phoneNumber,
    },
  })

  return {
    sid: getRequiredString(data, 'sid'),
    phoneNumber: getRequiredString(data, 'phone_number'),
  }
}

const configurePhoneNumberVoiceApplication = async (input: {
  fetchImpl: typeof fetch
  accountSid: string
  authToken: string
  phoneNumberSid: string
  twimlAppSid: string
}) => {
  await twilioRequest({
    fetchImpl: input.fetchImpl,
    url: `https://api.twilio.com/2010-04-01/Accounts/${input.accountSid}/IncomingPhoneNumbers/${input.phoneNumberSid}.json`,
    method: 'POST',
    accountSid: input.accountSid,
    authToken: input.authToken,
    body: {
      VoiceApplicationSid: input.twimlAppSid,
    },
  })
}

const verifyProvisioningConfiguration = async (input: {
  fetchImpl: typeof fetch
  accountSid: string
  authToken: string
  phoneNumberSid: string
  expectedPhoneNumber: string
  twimlAppSid: string
  expectedVoiceUrl: string
}) => {
  const [numberConfig, appConfig] = await Promise.all([
    twilioRequest({
      fetchImpl: input.fetchImpl,
      url: `https://api.twilio.com/2010-04-01/Accounts/${input.accountSid}/IncomingPhoneNumbers/${input.phoneNumberSid}.json`,
      method: 'GET',
      accountSid: input.accountSid,
      authToken: input.authToken,
    }),
    twilioRequest({
      fetchImpl: input.fetchImpl,
      url: `https://api.twilio.com/2010-04-01/Accounts/${input.accountSid}/Applications/${input.twimlAppSid}.json`,
      method: 'GET',
      accountSid: input.accountSid,
      authToken: input.authToken,
    }),
  ])

  const configuredApplicationSid = getRequiredString(
    numberConfig,
    'voice_application_sid',
  )
  const configuredPhoneNumber = getRequiredString(numberConfig, 'phone_number')
  const configuredVoiceUrl = getRequiredString(appConfig, 'voice_url')

  if (configuredApplicationSid !== input.twimlAppSid) {
    throw new Error(
      `Twilio number verification failed: expected voice application ${input.twimlAppSid}, got ${configuredApplicationSid}`,
    )
  }

  if (configuredPhoneNumber !== input.expectedPhoneNumber) {
    throw new Error(
      `Twilio number verification failed: expected number ${input.expectedPhoneNumber}, got ${configuredPhoneNumber}`,
    )
  }

  if (
    normalizeUrl(configuredVoiceUrl) !== normalizeUrl(input.expectedVoiceUrl)
  ) {
    throw new Error(
      `Twilio TwiML app verification failed: expected voice URL ${input.expectedVoiceUrl}, got ${configuredVoiceUrl}`,
    )
  }
}

const twilioRequest = async (input: {
  fetchImpl: typeof fetch
  url: string
  method: 'GET' | 'POST'
  accountSid: string
  authToken: string
  body?: Record<string, string>
}) => {
  const bodyParams = input.body ? new URLSearchParams(input.body) : undefined

  const response = await input.fetchImpl(input.url, {
    method: input.method,
    headers: {
      Authorization: buildBasicAuth(input.accountSid, input.authToken),
      ...(bodyParams
        ? {
            'Content-Type': 'application/x-www-form-urlencoded',
          }
        : {}),
    },
    body: bodyParams,
  })

  if (!response.ok) {
    const rawErrorBody = await response.text()
    const message = rawErrorBody || `${response.status} ${response.statusText}`
    throw new Error(
      `Twilio API request failed (${input.method} ${input.url}): ${message}`,
    )
  }

  return (await response.json()) as JsonRecord
}

const buildBasicAuth = (sid: string, token: string) => {
  return `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`
}

const getRequiredString = (data: JsonRecord, key: string) => {
  const value = data[key]
  if (typeof value !== 'string' || !value) {
    throw new Error(`Twilio API response missing required field: ${key}`)
  }
  return value
}

const normalizeUrl = (value: string) => value.replace(/\/$/, '')
