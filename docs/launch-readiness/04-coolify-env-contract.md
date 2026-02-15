# Coolify Environment Contract (Revcenter V1)

Status: active for v1 self-hosting baseline
Owner: Platform engineering

## 1. Environment topology

1. `dev`: shared low-cost integration environment.
2. `stage`: production-like release validation.
3. `prod`: customer-facing production.

Hard rule: each environment has independent Postgres and Redis credentials.

## 2. Services per environment

1. `revcenter-frontend`
- Build: `pnpm --filter revcenter-frontend build`
- Start: `pnpm --filter revcenter-frontend start`
- Public domain: `app.<env>.revcenter.ai`

2. `revcenter-api`
- Build: `pnpm --filter @shared/db db:generate && pnpm --filter revcenter-backend build`
- Start: `pnpm --filter revcenter-backend start:api`
- Public domain: `api.<env>.revcenter.ai`

3. `revcenter-worker`
- Build artifact: same as API backend build.
- Start: `pnpm --filter revcenter-backend start:worker`
- Public ingress: none.
- Internal health check: `GET /worker/health` on worker health port.

4. `revcenter-postgres`
- Managed Postgres 16+.
- Private networking only.

5. `revcenter-redis`
- Redis 7+ with authentication.
- Private networking only.

## 3. Required backend env vars

### Runtime

- `NODE_ENV`
- `DEPLOY_ENV` (`dev|stage|prod`)
- `PORT`
- `BACKEND_URL`
- `FRONTEND_URL`
- `CORS_ORIGIN`
- `COOKIE_DOMAIN`

### Data

- `DATABASE_URL`
- `DIRECT_URL`
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `REDIS_URL`

### Security

- `BETTER_AUTH_SECRET`
- `JWT_SECRET`
- `WEBHOOK_API_KEY`
- `ENCRYPTION_KEY`

### Provider secrets

- `ELEVEN_LABS_API_KEY`
- `ELEVEN_LABS_WEBHOOK_KEY`
- `TWILIO_*`
- `RESEND_API_KEY`
- `JOBBER_*`
- `WORKIZ_*`
- `SERVICETITAN_*`

### Observability

- `SENTRY_DSN`
- `BETTERSTACK_TOKEN`
- `BETTERSTACK_HOST`

### Worker and queue tuning

- `WORKER_HEALTH_PORT`
- `WORKER_HEARTBEAT_INTERVAL_MS`
- `WORKER_HEARTBEAT_TTL_MS`
- `QUEUE_METRICS_FLUSH_INTERVAL_MS`
- `QUEUE_DEFAULT_CONCURRENCY`
- `QUEUE_CAMPAIGN_VOICE_CONCURRENCY`
- `QUEUE_CAMPAIGN_SMS_CONCURRENCY`
- `QUEUE_CAMPAIGN_EMAIL_CONCURRENCY`
- `QUEUE_INTEGRATION_SYNC_CONCURRENCY`
- `QUEUE_WEBHOOK_INGEST_CONCURRENCY`

## 4. Frontend build-time variables (Coolify build vars)

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_APP_URL`

## 5. Security baseline

1. Public ingress only for frontend and API.
2. Postgres and Redis are private-network only.
3. TLS for all public domains.
4. No wildcard CORS in `stage` and `prod`.

## 6. Stage/prod predeploy gate

Run before promoting API/worker/frontend images:

1. `pnpm --filter @shared/db db:deploy`
2. `pnpm --filter @shared/db db:generate`
3. Migration status check: `pnpm --filter @shared/db exec prisma migrate status`
4. Smoke query against critical tables (`user`, `organization`, `session`).

## 7. Rollout sequence

1. Deploy database migrations.
2. Deploy API service.
3. Deploy worker service.
4. Deploy frontend service.
