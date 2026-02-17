# Subspec S8: Observability And Rollout Controls

Status: Implementation-ready v1
Owner: Platform operations + SRE
Parent: `specs/v1/parallel-lifecycle-fixes/00-execution-roadmap.md`

Git Delivery Branch: `feature/onboarding-billing-provisioning-observability`
Subspec Completion Gate:
1. Start implementation with `git switch -c feature/onboarding-billing-provisioning-observability` from `main`.
2. Keep all code, tests, and docs for this subspec on `feature/onboarding-billing-provisioning-observability`.
3. Create at least one intentional commit that references this subspec scope.
4. Push with `git push -u origin feature/onboarding-billing-provisioning-observability`.
5. Do not mark this subspec complete until commit SHA and PR link are logged.

## 1. Purpose

Deliver operational confidence for lifecycle-gated rollout with auditability, retries, and rollback controls.

## 2. Scope

In scope:

1. End-to-end audit trail for lifecycle, billing, and provisioning transitions.
2. Correlation IDs propagated from API request through async jobs/webhooks.
3. Queue retry policy and dead-letter queue handling for critical provisioning jobs.
4. Provisioning health dashboards and operator views.
5. Updated launch and rollback runbooks for new gated lifecycle.

Out of scope:

1. Non-critical cosmetic dashboard telemetry.

## 3. Implementation Tasks

1. Add structured event schema for lifecycle transition audit logs.
2. Implement retry + DLQ strategy with explicit max-attempt policies.
3. Build admin/ops views for provisioning state and failed transitions.
4. Update runbooks for incident response and rollback under billing/provisioning gates.

## 4. Acceptance Criteria

1. Every state transition is traceable by `organizationId` + `correlationId`.
2. Failed jobs enter DLQ with operator-replay workflow.
3. Runbooks cover both paid and demo lifecycle incident paths.
4. Stage drills validate alerting and recovery playbooks.

## 5. Test Plan

1. Integration tests for audit event emission on each transition.
2. Queue tests for retry exhaustion and DLQ routing.
3. Operator workflow test for replaying failed provisioning jobs.

## 6. Implementation Artifacts

1. `backend/src/services` (lifecycle audit and metrics services)
2. `backend/src/queues` (retry and DLQ policies)
3. `backend/src/api/routes/admin.ts` (ops endpoints)
4. `specs/v1/launch-readiness/go-live-day-runbook.md`
5. `specs/v1/launch-readiness/rollback-playbook.md`
