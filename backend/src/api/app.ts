import express from 'express'
import cors from 'cors'
import { errorHandler } from './middlewares/errorHandler'
import { requestLogger } from './middlewares/requestLogger'
import { initializeAuth } from './middlewares/auth'
import { apiRoutes } from './routes'
import authRoutes from './routes/auth'
import bodyParser from 'body-parser'
import { config } from '@/config'
import Sentry from '@/lib/sentry'
import webhookRoutes from './routes/webhook'
import integrationWebhookRoutes from './routes/webhooks-integrations'
import campaignWebhookRoutes from './routes/webhooks-campaigns'

const app = express()
const BILLING_WEBHOOK_PATH = '/api/billing/webhook'
const JSON_BODY_LIMIT = '1mb'

const captureRawBillingWebhookBody = (
  req: express.Request & { rawBodyText?: string },
  _res: express.Response,
  buf: Buffer,
) => {
  const requestPath = req.originalUrl || req.url || ''
  if (requestPath.startsWith(BILLING_WEBHOOK_PATH)) {
    req.rawBodyText = buf.toString('utf8')
  }
}

// Middleware
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Cookie',
      'X-Requested-With',
    ],
    exposedHeaders: ['Set-Cookie'],
  }),
)

app.use(requestLogger)
app.use('/api/auth', authRoutes)
app.use('/api/webhook', webhookRoutes)
app.use('/api/webhooks/integrations', integrationWebhookRoutes)
app.use('/api/webhooks/campaigns', campaignWebhookRoutes)
app.use('/api/campaigns/webhooks', campaignWebhookRoutes)

app.use(
  express.json({
    limit: JSON_BODY_LIMIT,
    verify: captureRawBillingWebhookBody,
  }),
)
app.use(express.urlencoded({ extended: false, limit: JSON_BODY_LIMIT }))
app.use(
  bodyParser.json({
    limit: JSON_BODY_LIMIT,
    verify: captureRawBillingWebhookBody,
  }),
)

// Routes
app.use('/api', apiRoutes)

Sentry.setupExpressErrorHandler(app)

// Error handling
app.use(errorHandler)

export { app }
