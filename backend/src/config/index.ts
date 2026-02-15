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
    .default('*')
    .transform((val) => {
      if (val === '*') return '*'
      return val.includes(',') ? val.split(',').map((s) => s.trim()) : val
    }),
  BACKEND_URL: z.string().url().default('http://localhost:8000'),
  FRONTEND_URL: z.string().url(),
  COOKIE_DOMAIN: z.string().default('localhost'),
  DATABASE_URL: z.string().url(),
  DB_HOST: z.string(),
  DB_PORT: z.coerce.number(),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),
  DB_NAME: z.string(),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  BETTERSTACK_TOKEN: z.string(),
  BETTERSTACK_HOST: z.string(),
  SENTRY_DSN: z.string(),
  JWT_SECRET: z.string(),
  BETTER_AUTH_SECRET: z.string().default('revcenter-dev-better-auth-secret'),
  WEBHOOK_API_KEY: z.string(),
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
  },
}

export type Config = typeof config
