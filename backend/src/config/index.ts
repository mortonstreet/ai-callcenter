import dotenv from 'dotenv'
import { z } from 'zod'
import { existsSync } from 'fs'
import { resolve } from 'path'

// Load .env.local first if it exists (for local development), then .env
const envLocalPath = resolve(process.cwd(), '.env.local')
if (existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath })
} else {
  dotenv.config()
}

// Schema for individual MCP provider configuration
const McpProviderSchema = z.object({
  name: z.string(),
  slug: z.string(),
  apiKey: z.string(),
  webhookKey: z.string(),
  ngrokUrl: z.string().url().optional(),
})

export type McpProvider = z.infer<typeof McpProviderSchema>
type DeployEnv = 'dev' | 'stage' | 'prod'
type CorsOrigin = '*' | string | string[]

// Parse MCP_PROVIDERS from JSON env var, with fallback to legacy single provider
const parseMcpProviders = (): McpProvider[] => {
  const mcpProvidersJson = process.env.MCP_PROVIDERS

  if (mcpProvidersJson) {
    try {
      const parsed = JSON.parse(mcpProvidersJson)
      return z.array(McpProviderSchema).parse(parsed)
    } catch (e) {
      console.error('Failed to parse MCP_PROVIDERS:', e)
      return []
    }
  }

  // Fallback to legacy single provider config for backwards compatibility
  if (process.env.ELEVEN_LABS_API_KEY && process.env.ELEVEN_LABS_WEBHOOK_KEY) {
    return [
      {
        name: 'ElevenLabs',
        slug: 'elevenlabs',
        apiKey: process.env.ELEVEN_LABS_API_KEY,
        webhookKey: process.env.ELEVEN_LABS_WEBHOOK_KEY,
        ngrokUrl: process.env.ELEVEN_LABS_NGROK_URL,
      },
    ]
  }

  return []
}

const parseCorsOrigin = (value: string): CorsOrigin => {
  if (value === '*') return '*'

  const origins = value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

  if (origins.length <= 1) {
    return origins[0] ?? '*'
  }

  return origins
}

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(8000),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  DEPLOY_ENV: z.enum(['dev', 'stage', 'prod']).default('dev'),
  TIMEZONE: z.string().default('America/New_York'),
  CORS_ORIGIN: z
    .string()
    .default('http://localhost:3000')
    .transform(parseCorsOrigin),
  BACKEND_URL: z.string().url().default('http://localhost:8000'),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  COOKIE_DOMAIN: z.string().min(1).default('localhost'),
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),
  DB_HOST: z.string(),
  DB_PORT: z.coerce.number().int().positive(),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),
  DB_NAME: z.string(),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  BETTERSTACK_TOKEN: z.string().min(1),
  BETTERSTACK_HOST: z.string().min(1),
  SENTRY_DSN: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  WEBHOOK_API_KEY: z.string().min(1),
  ENCRYPTION_KEY: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  RESEND_API_KEY: z.string(),
  // Cal.com integration
  CALCOM_API_KEY: z.string().optional(),
  // Legacy single provider - now optional
  ELEVEN_LABS_API_KEY: z.string().optional(),
  ELEVEN_LABS_WEBHOOK_KEY: z.string().optional(),
  // Twilio integration for outbound calls
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(), // E.164 format: +17752789755
  TWILIO_API_KEY_SID: z.string().optional(), // For Access Tokens (SK...)
  TWILIO_API_KEY_SECRET: z.string().optional(), // API Key Secret
  TWILIO_TWIML_APP_SID: z.string().optional(), // TwiML App SID (AP...)
  // CRM integration providers
  JOBBER_CLIENT_ID: z.string().optional(),
  JOBBER_CLIENT_SECRET: z.string().optional(),
  WORKIZ_API_KEY: z.string().optional(),
  SERVICETITAN_CLIENT_ID: z.string().optional(),
  SERVICETITAN_CLIENT_SECRET: z.string().optional(),
  // Worker and queue tuning
  WORKER_HEALTH_PORT: z.coerce.number().int().positive().default(8081),
  WORKER_HEARTBEAT_INTERVAL_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(15000),
  WORKER_HEARTBEAT_TTL_MS: z.coerce.number().int().positive().default(45000),
  QUEUE_METRICS_FLUSH_INTERVAL_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(30000),
  QUEUE_DEFAULT_CONCURRENCY: z.coerce.number().int().positive().default(5),
  QUEUE_CAMPAIGN_VOICE_CONCURRENCY: z.coerce
    .number()
    .int()
    .positive()
    .default(5),
  QUEUE_CAMPAIGN_SMS_CONCURRENCY: z.coerce.number().int().positive().default(8),
  QUEUE_CAMPAIGN_EMAIL_CONCURRENCY: z.coerce
    .number()
    .int()
    .positive()
    .default(8),
  QUEUE_INTEGRATION_SYNC_CONCURRENCY: z.coerce
    .number()
    .int()
    .positive()
    .default(4),
  QUEUE_WEBHOOK_INGEST_CONCURRENCY: z.coerce
    .number()
    .int()
    .positive()
    .default(12),
})

const env = envSchema.parse(process.env)

const assertCorsPolicy = (deployEnv: DeployEnv, corsOrigin: CorsOrigin) => {
  const isProtectedEnvironment = deployEnv === 'stage' || deployEnv === 'prod'
  if (isProtectedEnvironment && corsOrigin === '*') {
    throw new Error(
      `CORS_ORIGIN cannot be "*" when DEPLOY_ENV is "${deployEnv}".`,
    )
  }
}

const getTrustedOrigins = (
  corsOrigin: CorsOrigin,
  frontendUrl: string,
): string[] => {
  const trustedOrigins = new Set<string>([frontendUrl])

  if (corsOrigin === '*') {
    return Array.from(trustedOrigins)
  }

  if (Array.isArray(corsOrigin)) {
    for (const origin of corsOrigin) {
      trustedOrigins.add(origin)
    }
    return Array.from(trustedOrigins)
  }

  trustedOrigins.add(corsOrigin)
  return Array.from(trustedOrigins)
}

// Set timezone globally
process.env.TZ = env.TIMEZONE

assertCorsPolicy(env.DEPLOY_ENV, env.CORS_ORIGIN)

// Parse MCP providers from env
const mcpProviders = parseMcpProviders()

export const config = {
  timezone: env.TIMEZONE,
  deployEnv: env.DEPLOY_ENV,
  cookieDomain: env.COOKIE_DOMAIN,
  directUrl: env.DIRECT_URL,
  betterAuth: {
    secret: env.BETTER_AUTH_SECRET,
    cookieDomain: env.COOKIE_DOMAIN,
  },
  security: {
    jwtSecret: env.JWT_SECRET,
    webhookApiKey: env.WEBHOOK_API_KEY,
    encryptionKey: env.ENCRYPTION_KEY,
  },
  webhookApiKey: env.WEBHOOK_API_KEY,
  jwt: {
    secret: env.JWT_SECRET,
  },
  port: env.PORT,
  nodeEnv: env.NODE_ENV,
  frontendUrl: env.FRONTEND_URL,
  backendUrl: env.BACKEND_URL,
  corsOrigin: env.CORS_ORIGIN,
  trustedOrigins: getTrustedOrigins(env.CORS_ORIGIN, env.FRONTEND_URL),
  databaseUrl: env.DATABASE_URL,
  db: {
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
  },
  redis: {
    url: env.REDIS_URL,
    useTLS: env.REDIS_URL.startsWith('rediss://'),
  },
  logger: {
    betterstackToken: env.BETTERSTACK_TOKEN,
    betterstackHost: env.BETTERSTACK_HOST,
  },
  sentry: {
    dsn: env.SENTRY_DSN,
  },
  providers: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
    jobber: {
      clientId: env.JOBBER_CLIENT_ID || '',
      clientSecret: env.JOBBER_CLIENT_SECRET || '',
    },
    workiz: {
      apiKey: env.WORKIZ_API_KEY || '',
    },
    servicetitan: {
      clientId: env.SERVICETITAN_CLIENT_ID || '',
      clientSecret: env.SERVICETITAN_CLIENT_SECRET || '',
    },
  },
  resend: {
    apiKey: env.RESEND_API_KEY,
  },
  worker: {
    healthPort: env.WORKER_HEALTH_PORT,
    heartbeatIntervalMs: env.WORKER_HEARTBEAT_INTERVAL_MS,
    heartbeatTtlMs: env.WORKER_HEARTBEAT_TTL_MS,
  },
  queues: {
    metricsFlushIntervalMs: env.QUEUE_METRICS_FLUSH_INTERVAL_MS,
    defaultConcurrency: env.QUEUE_DEFAULT_CONCURRENCY,
    concurrency: {
      campaignVoice: env.QUEUE_CAMPAIGN_VOICE_CONCURRENCY,
      campaignSms: env.QUEUE_CAMPAIGN_SMS_CONCURRENCY,
      campaignEmail: env.QUEUE_CAMPAIGN_EMAIL_CONCURRENCY,
      integrationSync: env.QUEUE_INTEGRATION_SYNC_CONCURRENCY,
      webhookIngest: env.QUEUE_WEBHOOK_INGEST_CONCURRENCY,
    },
  },
  // Multiple MCP providers support
  mcpProviders,
  // Legacy single provider - backwards compatible
  elevenLabs: {
    apiKey:
      env.ELEVEN_LABS_API_KEY ||
      mcpProviders.find((p) => p.slug === 'elevenlabs')?.apiKey ||
      '',
    webhookKey:
      env.ELEVEN_LABS_WEBHOOK_KEY ||
      mcpProviders.find((p) => p.slug === 'elevenlabs')?.webhookKey ||
      '',
  },
  // Cal.com integration
  calcom: {
    apiKey: env.CALCOM_API_KEY || '',
  },
  // Twilio integration for outbound calls
  twilio: {
    accountSid: env.TWILIO_ACCOUNT_SID || '',
    authToken: env.TWILIO_AUTH_TOKEN || '',
    phoneNumber: env.TWILIO_PHONE_NUMBER || '',
    apiKeySid: env.TWILIO_API_KEY_SID || '',
    apiKeySecret: env.TWILIO_API_KEY_SECRET || '',
    twimlAppSid: env.TWILIO_TWIML_APP_SID || '',
  },
}

export type Config = typeof config
