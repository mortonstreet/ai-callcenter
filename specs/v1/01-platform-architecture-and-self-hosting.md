# V1 Subspec: Platform Architecture And Self-Hosting

Status: Draft v1
Owner: Platform engineering
Parent: `specs/v1/master-v1-spec.md`

Git Delivery Branch: `feature/platform-architecture-and-self-hosting`
Subspec Completion Gate:
1. Start implementation with `git switch -c feature/platform-architecture-and-self-hosting` from the current base branch.
2. Keep all code, tests, and docs for this subspec on `feature/platform-architecture-and-self-hosting`.
3. Create at least one intentional commit that references this subspec scope.
4. Push the branch to GitHub with `git push -u origin feature/platform-architecture-and-self-hosting`.
5. Do not mark this subspec complete until the implementation commit is present on `feature/platform-architecture-and-self-hosting` in GitHub.

## 1. Purpose

Define the production infrastructure and deployment contract for Revcenter on Hetzner + Coolify, including API/worker split, Postgres/Redis strategy, environments, migrations, and disaster recovery.

## 2. Target Topology

### 2.1 Environments

1. `dev`: low-cost shared environment for integration and smoke checks.
2. `stage`: production-like environment for release candidate validation.
3. `prod`: paid-customer production.

Hard rule: no shared DB/Redis credentials across environments.

### 2.2 Services Per Environment

1. `revcenter-frontend`
- Next.js app.
- Public domain: `app.<env>.revcenter.ai` (or equivalent).

2. `revcenter-api`
- Express backend.
- Public domain: `api.<env>.revcenter.ai`.

3. `revcenter-worker`
- BullMQ worker process for campaigns and async jobs.
- No public ingress required.

4. `revcenter-postgres`
- Managed Postgres 16+.
- Private network only.

5. `revcenter-redis`
- Redis 7+ with auth/TLS.
- Private network only.

Optional v1.1:

1. `revcenter-beat` (scheduler-only process if worker load warrants isolation).

## 3. Coolify Deployment Contract

### 3.1 Build And Runtime

1. Frontend build:
- Install dependencies.
- `pnpm --filter frontend build`.

2. API build:
- `pnpm --filter @shared/db db:generate`.
- `pnpm --filter revcenter-backend build`.

3. Worker build:
- Same code artifact as backend build; different start command.

### 3.2 Start Commands

1. API:
- run migrations in controlled mode.
- start `backend/dist/server.mjs`.

2. Worker:
- start worker bootstrap entrypoint (new file required, for example `backend/src/worker.ts`).
- register campaign queue workers and recurring schedulers.

### 3.3 Health Checks

1. API: `GET /api/health`.
2. Frontend: `GET /`.
3. Worker: heartbeat metric and queue liveness check (no HTTP required, but recommended to expose `/worker/health` internal endpoint).

## 4. Environment Variable Contract

Revcenter currently lacks a committed backend `.env.example`; this subspec makes it mandatory.

### 4.1 Shared Runtime

1. `NODE_ENV`
2. `DEPLOY_ENV` (`dev|stage|prod`)
3. `PORT`
4. `BACKEND_URL`
5. `FRONTEND_URL`
6. `CORS_ORIGIN`
7. `COOKIE_DOMAIN`

### 4.2 Data Layer

1. `DATABASE_URL`
2. `DIRECT_URL` (for Prisma migration workflows)
3. `DB_HOST`
4. `DB_PORT`
5. `DB_USER`
6. `DB_PASSWORD`
7. `DB_NAME`
8. `REDIS_URL`

### 4.3 Auth/Security

1. `BETTER_AUTH_SECRET`
2. `JWT_SECRET`
3. `WEBHOOK_API_KEY`
4. `ENCRYPTION_KEY`

### 4.4 Provider Secrets

1. `ELEVEN_LABS_API_KEY`
2. `ELEVEN_LABS_WEBHOOK_KEY`
3. `TWILIO_*`
4. `RESEND_API_KEY`
5. CRM integration keys (`JOBBER_*`, `WORKIZ_*`, `SERVICETITAN_*`)

### 4.5 Observability

1. `SENTRY_DSN`
2. `BETTERSTACK_TOKEN`
3. `BETTERSTACK_HOST`

### 4.6 Frontend Build Variables

These must be configured in Coolify build-time vars, not runtime-only:

1. `NEXT_PUBLIC_API_URL`
2. `NEXT_PUBLIC_APP_URL`

## 5. Networking And Security Baseline

1. All Postgres and Redis access on private network interfaces.
2. Public ingress only for frontend and API.
3. TLS enforced for all public domains.
4. Restrict CORS to explicit app origins in stage/prod.
5. Disable wildcard origins in production.

## 6. Data Safety And DR

### 6.1 Targets

1. RPO <= 15 minutes.
2. RTO <= 60 minutes.

### 6.2 Backup Policy

1. PITR/WAL-enabled backups.
2. Daily backups retained 14 days.
3. Weekly backups retained 8 weeks.
4. Monthly backups retained 6 months.

### 6.3 Restore Drills

1. Monthly stage restore verification.
2. Quarterly point-in-time drill.
3. Validation checklist:
- row counts for core tables.
- auth/session integrity.
- active campaign continuity.

## 7. Migration And Release Safety

1. `dev` can use migration authoring workflow.
2. `stage` and `prod` use deploy-only migrations.
3. Predeploy gate must run in `stage` and `prod`:
- migration status check.
- schema generation validation.
- smoke query against critical tables.

4. Rollout sequence:
- deploy DB migrations.
- deploy API.
- deploy worker.
- deploy frontend.

5. Rollback sequence:
- freeze writes where needed.
- rollback app image first.
- rollback schema only when backward-compatible rollback path exists.

## 8. Worker And Queue Architecture

Revcenter currently has example queue scaffolding only. V1 requires production queue setup:

1. Queue names:
- `campaign_voice`
- `campaign_sms`
- `campaign_email`
- `integration_sync`
- `webhook_ingest`

2. Required worker behavior:
- bounded concurrency.
- exponential retry with dead-letter handling.
- idempotency keys for external provider calls.
- metrics per queue (processed, failed, retry, latency).

3. Scheduler behavior:
- recurring job for ready-enrollment processing every minute.
- explicit startup registration and duplicate-scheduler cleanup.

## 9. Observability Baseline

1. Structured logs with correlation IDs for auth, integrations, campaigns, webhooks.
2. Sentry error capture for API and worker processes.
3. Metrics required:
- API latency p50/p95/p99.
- DB connection and query error rates.
- Redis timeout/error rates.
- queue depth and job failure rates.

4. Alert classes:
- P0: API outage, DB outage, worker dead, no restorable backup.
- P1: elevated error rate, queue backlog growth, migration failure.

## 10. Implementation Tasks

1. Add backend env template and environment validation schema updates.
2. Add dedicated worker entrypoint and startup process.
3. Add queue metrics emitter and alert wiring.
4. Add release runbook docs for Coolify deploy/rollback.
5. Add backup/restore runbook and ownership matrix.

## 11. Acceptance Criteria

1. Stage environment mirrors production topology with separate API and worker services.
2. Production deploy can complete without manual shell intervention.
3. Backups and restore tests meet RPO/RTO targets.
4. Queue workers survive restart without duplicate scheduler drift.
5. All secrets are injected from Coolify and absent from repository files.
