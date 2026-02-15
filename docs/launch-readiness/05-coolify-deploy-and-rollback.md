# Coolify Deploy and Rollback Runbook

Status: active
Owner: Platform engineering
Escalation: Operations on-call

## 1. Preconditions

1. Release branch merged and tagged.
2. All v1 smoke tests pass in `stage`.
3. Coolify secrets are present for API, worker, and frontend.
4. Latest valid database backup exists.

## 2. Deploy procedure

1. Confirm target environment (`stage` first, then `prod`).
2. Execute predeploy gate:
- `pnpm --filter @shared/db db:deploy`
- `pnpm --filter @shared/db db:generate`
- `pnpm --filter @shared/db exec prisma migrate status`
3. Build and deploy `revcenter-api` in Coolify.
4. Verify API health: `GET /api/health`.
5. Build and deploy `revcenter-worker` in Coolify.
6. Verify worker health: `GET /worker/health` (internal endpoint).
7. Build and deploy `revcenter-frontend` in Coolify.
8. Verify frontend root response and dashboard sign-in.
9. Run stage/prod smoke checklist:
- auth session creation
- org lookup query
- queue enqueue + completion

## 3. Rollback triggers

Roll back immediately when one of these occurs:

1. API health fails for more than 2 minutes.
2. Worker cannot process queue jobs after retry.
3. Migration fails and blocks request path.
4. Error rates breach P0/P1 alert thresholds.

## 4. Rollback procedure

1. Freeze writes when required by migration risk.
2. Roll back frontend to last stable image.
3. Roll back API to last stable image.
4. Roll back worker to last stable image.
5. Validate `GET /api/health` and internal `GET /worker/health`.
6. Check queue backlog trend and dead-letter volume.
7. Roll back schema only when a tested backward-compatible migration path exists.

## 5. Post-incident checklist

1. Record incident timeline and root cause.
2. Capture failing release tag and rollback tag.
3. Open follow-up tasks for guardrail improvements.
4. Update this runbook if any manual step was required.
