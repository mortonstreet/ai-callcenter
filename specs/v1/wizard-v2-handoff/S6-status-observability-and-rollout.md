# S6: Status UX, Observability, And Rollout Controls

Status: Implementation-ready v1
Date: February 16, 2026
Owner: Product + Platform Operations
Parent: `specs/v1/wizard-v2-handoff/00-execution-roadmap.md`
Git Delivery Branch: `feature/wizard-v2-rollout-controls`

## 1. Purpose

Provide production-safe status visibility and rollout controls so wizard provisioning failures are diagnosable and recoverable.

## 2. Current Gap

1. Provisioning UI is placeholder-only and does not show real step data (`frontend/app/dashboard/provisioning/page.tsx`).
2. No dedicated provisioning status/retry API surface exists for wizard jobs.
3. Operational alerts are generic and not tied to wizard step failure classes.

## 3. Scope

In scope:

1. Provisioning status API endpoints and timeline model.
2. Provisioning page UI with polling/retry/remediation actions.
3. Wizard-specific observability metrics and alerts.
4. Gradual rollout controls and legacy-agent backfill plan.

Out of scope:

1. Core profile compiler logic (S2).
2. Core step execution details (S3/S4/S5).

## 4. Provisioning Status API

Add endpoints:

1. `GET /api/provisioning/:jobId`
2. `GET /api/provisioning/:jobId/steps`
3. `POST /api/provisioning/:jobId/retry`
4. `GET /api/provisioning/agent/:agentId/latest`

Response includes:

1. Top-level status and readiness.
2. Ordered step timeline.
3. Last error code/message.
4. Retry eligibility and recommended action.
5. Correlation ID for support/debug.

## 5. Provisioning Page UX

Replace placeholder with:

1. Step timeline with real-time status badges.
2. Failure panel with actionable remediation.
3. Manual retry trigger for authorized roles.
4. Link-outs to agent health details and recent logs.

## 6. Observability And Alerts

Wizard-specific metrics:

1. Provisioning start/completion latency.
2. Step-level failure rate.
3. Retry attempt distribution.
4. Blocked vs degraded vs healthy rates.

Alerts:

1. P0: stuck running jobs > threshold.
2. P0: spike in blocked activations.
3. P1: repeated degraded retries for same step.

## 7. Rollout Strategy

1. Feature flag wizard v2 by org cohort.
2. Canary rollout to internal/demo orgs first.
3. Backfill existing agents with `profileVersion=legacy_unknown` and health baseline run.
4. Promote to general availability only after target SLOs are met.

## 8. Acceptance Criteria

1. Users can see real provisioning progress and failure reasons.
2. Authorized users can retry recoverable failures from UI/API.
3. Ops can monitor wizard-specific SLOs and failure trends.
4. Rollout can be paused/rolled back with feature flags.

## 9. Test Plan

1. API integration tests for status and retry endpoints.
2. Frontend E2E tests for timeline states (running/failed/completed).
3. Metrics tests verifying counters for success/failure/retry paths.
4. Feature-flag rollout tests for cohort enable/disable behavior.

## 10. Implementation Artifacts

1. `frontend/app/dashboard/provisioning/page.tsx`
2. New provisioning status hooks under `frontend/hooks/api/`
3. New provisioning routes/controllers under `backend/src/api/routes/` and `backend/src/api/controllers/`
4. `backend/src/services/operations-metrics.service.ts`
5. `backend/src/api/routes/admin.ts` (if metrics surface updates are needed)
6. Runbook updates under `specs/v1/operations-runbooks/`
