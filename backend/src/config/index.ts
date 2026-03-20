import dotenv from 'dotenv'
import { z } from 'zod'
import { existsSync } from 'fs'
import { resolve } from 'path'

const runtimeNodeEnv =
  process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test'
    ? process.env.NODE_ENV
    : 'development'

const defaultCorsOrigins =
  runtimeNodeEnv === 'production'
    ? 'https://www.revcenter.ai,https://revcenter.ai,https://app.revcenter.ai'
    : 'http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001'

const defaultBackendUrl =
  runtimeNodeEnv === 'production'
    ? 'https://api.revcenter.ai'
    : 'http://localhost:8000'

const defaultCookieDomain =
  runtimeNodeEnv === 'production' ? 'revcenter.ai' : 'localhost'

const defaultRedisUrl =
  runtimeNodeEnv === 'production'
    ? 'redis://redis.revcenter.ai:6379'
    : 'redis://localhost:6380'

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

const envSchema = z.object({
  PORT: z.coerce.number().default(8000),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  TIMEZONE: z.string().default('America/New_York'),
  CORS_ORIGIN: z
    .string()
    .default(defaultCorsOrigins)
    .transform((val) => {
      if (val === '*') return '*'
      return val.includes(',') ? val.split(',').map((s) => s.trim()) : val
    }),
  BACKEND_URL: z.string().url().default(defaultBackendUrl),
  FRONTEND_URL: z.string().url(),
  COOKIE_DOMAIN: z.string().default(defaultCookieDomain),
  DATABASE_URL: z.string().url(),
  DB_HOST: z.string(),
  DB_PORT: z.coerce.number(),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),
  DB_NAME: z.string(),
  REDIS_URL: z.string().url().default(defaultRedisUrl),
  BETTERSTACK_TOKEN: z.string(),
  BETTERSTACK_HOST: z.string(),
  SENTRY_DSN: z.string(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_METERED_MONTHLY_BASE: z.string().optional(),
  STRIPE_PRICE_METERED_MONTHLY_USAGE: z.string().optional(),
  STRIPE_PRICE_ENTERPRISE_QUARTERLY_BASE: z.string().optional(),
  STRIPE_PRICE_ENTERPRISE_QUARTERLY_OVERAGE: z.string().optional(),
  JWT_SECRET: z.string(),
  BETTER_AUTH_SECRET: z.string().default('revcenter-dev-better-auth-secret'),
  WEBHOOK_API_KEY: z.string(),
  ENCRYPTION_KEY: z.string().min(1).default('revcenter-dev-encryption-key'),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  RESEND_API_KEY: z.string(),
  JOBBER_CLIENT_ID: z.string().optional(),
  JOBBER_CLIENT_SECRET: z.string().optional(),
  WORKIZ_API_KEY: z.string().optional(),
  SERVICETITAN_CLIENT_ID: z.string().optional(),
  SERVICETITAN_CLIENT_SECRET: z.string().optional(),
  // Cal.com integration
  CALCOM_API_KEY: z.string().optional(),
  EMBEDDED_WORKER_ENABLED: z.coerce.boolean().default(true),
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
  // Twilio ISV master credentials for per-org subaccount provisioning
  TWILIO_ISV_ACCOUNT_SID: z.string().optional(),
  TWILIO_ISV_AUTH_TOKEN: z.string().optional(),
  TWILIO_ISV_API_KEY_SID: z.string().optional(),
  TWILIO_ISV_API_KEY_SECRET: z.string().optional(),
  TWILIO_ISV_DEFAULT_AREA_CODE: z.string().default('415'),
  TWILIO_ISV_DEFAULT_COUNTRY_CODE: z.string().default('US'),
  TWILIO_ISV_PROVISIONING_ENABLED: z.coerce.boolean().default(false),
})

const env = envSchema.parse(process.env)

const getTrustedOrigins = (corsOrigin: string | string[]): string[] => {
  if (corsOrigin === '*') return [env.FRONTEND_URL]
  if (Array.isArray(corsOrigin)) return corsOrigin
  return [corsOrigin]
}

// Set timezone globally
process.env.TZ = env.TIMEZONE

// Parse MCP providers from env
const mcpProviders = parseMcpProviders()

export const config = {
  timezone: env.TIMEZONE,
  webhookApiKey: env.WEBHOOK_API_KEY,
  betterAuth: {
    secret: env.BETTER_AUTH_SECRET,
    cookieDomain: env.COOKIE_DOMAIN,
  },
  security: {
    encryptionKey: env.ENCRYPTION_KEY,
  },
  jwt: {
    secret: env.JWT_SECRET,
  },
  port: env.PORT,
  nodeEnv: env.NODE_ENV,
  frontendUrl: env.FRONTEND_URL,
  backendUrl: env.BACKEND_URL,
  corsOrigin: env.CORS_ORIGIN,
  trustedOrigins: getTrustedOrigins(env.CORS_ORIGIN),
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
  workers: {
    embeddedEnabled: env.EMBEDDED_WORKER_ENABLED,
  },
  logger: {
    betterstackToken: env.BETTERSTACK_TOKEN,
    betterstackHost: env.BETTERSTACK_HOST,
  },
  sentry: {
    dsn: env.SENTRY_DSN,
  },
  stripe: {
    publishableKey: env.STRIPE_PUBLISHABLE_KEY || '',
    secretKey: env.STRIPE_SECRET_KEY || '',
    webhookSecret: env.STRIPE_WEBHOOK_SECRET || '',
    offers: {
      meteredMonthly: {
        basePriceId: env.STRIPE_PRICE_METERED_MONTHLY_BASE || '',
        usagePriceId: env.STRIPE_PRICE_METERED_MONTHLY_USAGE || '',
      },
      enterpriseQuarterly: {
        basePriceId: env.STRIPE_PRICE_ENTERPRISE_QUARTERLY_BASE || '',
        overagePriceId: env.STRIPE_PRICE_ENTERPRISE_QUARTERLY_OVERAGE || '',
      },
    },
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
    isv: {
      accountSid: env.TWILIO_ISV_ACCOUNT_SID || '',
      authToken: env.TWILIO_ISV_AUTH_TOKEN || '',
      apiKeySid: env.TWILIO_ISV_API_KEY_SID || '',
      apiKeySecret: env.TWILIO_ISV_API_KEY_SECRET || '',
      defaultAreaCode: env.TWILIO_ISV_DEFAULT_AREA_CODE,
      defaultCountryCode: env.TWILIO_ISV_DEFAULT_COUNTRY_CODE,
      provisioningEnabled: env.TWILIO_ISV_PROVISIONING_ENABLED,
    },
  },
}

export type Config = typeof config
