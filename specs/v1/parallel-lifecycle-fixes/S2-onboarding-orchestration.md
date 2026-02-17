# Subspec S2: Onboarding Orchestration

Status: Implementation-ready v1
Owner: Onboarding product + backend orchestration
Parent: `specs/v1/parallel-lifecycle-fixes/00-execution-roadmap.md`

Git Delivery Branch: `feature/onboarding-provisioning-orchestrator`
Subspec Completion Gate:
1. Start implementation with `git switch -c feature/onboarding-provisioning-orchestrator` from `main`.
2. Keep all code, tests, and docs for this subspec on `feature/onboarding-provisioning-orchestrator`.
3. Create at least one intentional commit that references this subspec scope.
4. Push with `git push -u origin feature/onboarding-provisioning-orchestrator`.
5. Do not mark this subspec complete until commit SHA and PR link are logged.

## 1. Purpose

Make onboarding stateful, idempotent, and orchestrated through async provisioning jobs.

## 2. Current Gap

1. Onboarding directly creates org/member/first agent synchronously.
2. No provisioning status tracker exists.
3. Onboarding form lacks business role and demo intent fields.

## 3. Scope

In scope:

1. Expand onboarding schema for business role, demo intent, and qualification fields.
2. Split onboarding completion from downstream provisioning.
3. Introduce idempotency keys for onboarding submit.
4. Persist provisioning job state (`pending|running|failed|completed`).
5. Add provisioning status page and redirects.

Out of scope:

1. Twilio subaccount implementation details (S5).
2. ElevenLabs custom voice automation details (S6).

## 4. Implementation Tasks

1. Add onboarding fields and lifecycle status columns in Prisma schema and migrations.
2. Refactor `organization.controller` flow to enqueue orchestration jobs.
3. Add provisioning job table/event log with correlation IDs.
4. Add `frontend/app/onboarding/page.tsx` fields for role/demo inputs.
5. Add frontend provisioning status route and polling/refresh behavior.

## 5. Acceptance Criteria

1. Duplicate onboarding submissions are idempotent.
2. Successful onboarding sets lifecycle to `provisioning_pending` (or `payment_required` for paid plan).
3. Provisioning status page reflects real-time state.
4. Failed provisioning exposes retry action for authorized users.

## 6. Test Plan

1. Controller integration tests for idempotent onboarding.
2. Queue/job tests for transition correctness.
3. Frontend tests for status-page routing and refresh.

## 7. Implementation Artifacts

1. `shared/db/prisma/schema.prisma`
2. `backend/src/api/controllers/organization.controller.ts`
3. `backend/src/services` (new provisioning orchestrator service)
4. `frontend/app/onboarding/page.tsx`
5. `frontend/app/dashboard` (gating changes)
