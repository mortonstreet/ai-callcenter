# Go-Live Day Runbook (Revcenter V1)

Environment: production
Execution owner: Operations on-call
Contributors: Platform, backend, frontend, QA, product

## 1. Launch Inputs (Must Be Ready)

1. Launch gates are `complete` or approved `excepted` in `launch-gate-tracker.md`.
2. Signed UAT report exists in `uat-execution-matrix.md`.
3. Latest backup and restore point verified.
4. Release tag and migration package are approved.

## 2. Production Day Timeline

| Step | Owner | Command/Action | Status (`pending|done|blocked`) | Timestamp | Notes |
|---|---|---|---|---|---|
| Freeze non-essential merges | Engineering manager | enable release freeze | pending | pending | pending |
| Confirm latest backup + restore point | Platform | validate backup age and drill results | pending | pending | pending |
| Stage predeploy checklist rerun | QA + Platform | run final stage smoke matrix | pending | pending | pending |
| Deploy DB migrations | Backend | `pnpm --filter @shared/db db:deploy` | pending | pending | pending |
| Validate migration state | Backend | `pnpm --filter @shared/db exec prisma migrate status` | pending | pending | pending |
| Deploy API | Platform | Coolify deploy `revcenter-api` | pending | pending | pending |
| API health check | QA + Ops | `GET /api/health` | pending | pending | pending |
| Deploy worker | Platform | Coolify deploy `revcenter-worker` | pending | pending | pending |
| Worker health check | QA + Ops | `GET /worker/health` (internal) | pending | pending | pending |
| Deploy frontend | Platform | Coolify deploy `revcenter-frontend` | pending | pending | pending |
| Frontend smoke check | QA | dashboard login + key route check | pending | pending | pending |
| Auth smoke | QA | signup/login + invite accept | pending | pending | pending |
| Onboarding smoke | QA | org + first agent setup | pending | pending | pending |
| Transition audit smoke | QA + Ops | verify `organizationId` + `correlationId` in `/api/admin/operations/lifecycle-transitions` | pending | pending | pending |
| Agent create smoke | AI platform | create/manual edit/check voice config | pending | pending | pending |
| Provisioning retry drill | Ops | force one provisioning failure and verify DLQ placement + replay | pending | pending | pending |
| Integrations status smoke | Integrations | provider status + sync check | pending | pending | pending |
| Campaign activation smoke | Campaign team | activate test campaign and confirm safeguards | pending | pending | pending |
| Heightened monitoring window start | Ops | 2-hour high-alert posture | pending | pending | pending |
| Heightened monitoring window end | Ops | close launch bridge if stable | pending | pending | pending |

## 3. Two-Hour Monitoring Focus

1. API error rate and p95 latency.
2. Queue backlog growth and worker throughput.
3. Auth failure and invite flow errors.
4. Integration sync failures by provider.
5. Campaign send failures and unsubscribe enforcement signals.
6. Provisioning transition audit continuity (`organizationId` + `correlationId`).
7. Dead-letter queue growth for provisioning retry jobs.

## 4. Launch Success Declaration

| Field | Value |
|---|---|
| Launch declared at | pending |
| Declared by | pending |
| Open P0 count | pending |
| Open P1 count | pending |
| Customer onboarding validated | pending |

## 5. Lifecycle Gate Drills (Stage And Production Canary)

Paid path drill:

1. Trigger `account_created -> onboarding_completed -> payment_required`.
2. Complete payment verification to advance paid tenant path.
3. Force provisioning retry once, confirm transition to DLQ on exhaustion, then replay via `/api/admin/operations/provisioning/failures/:queueName/:deadLetterJobId/replay`.
4. Confirm terminal `provisioning` transition reaches `completed`.

Demo path drill:

1. Trigger demo onboarding path with admin approval gate.
2. Validate `billing` transition records demo bypass decision.
3. Force one provisioning failure and replay; confirm transition trace continuity.
4. Confirm demo tenant reaches active workspace state and can access expected routes.

Alerting validation:

1. Ensure P0 backlog and P1 failure-rate alerts fire for synthetic queue stress.
2. Verify incident channel receives alert payload containing queue name and correlation handle.
