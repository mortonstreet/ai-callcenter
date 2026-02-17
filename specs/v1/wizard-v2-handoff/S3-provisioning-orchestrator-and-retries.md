# S3: Provisioning Orchestrator And Retries

Status: Implementation-ready v1
Date: February 16, 2026
Owner: Backend Platform
Parent: `specs/v1/wizard-v2-handoff/00-execution-roadmap.md`
Git Delivery Branch: `feature/wizard-v2-orchestrator-retries`

## 1. Purpose

Replace synchronous agent creation with an idempotent async provisioning orchestrator and make retry queues actually executable.

## 2. Current Gap

1. Onboarding creates org/member/agent inline in request path (`backend/src/api/controllers/organization.controller.ts`).
2. Agent retry jobs are enqueued but worker `integration_sync` handler does not dispatch those job names (`backend/src/services/agent.service.ts`, `backend/src/queues/workers.ts`).
3. Webhook retry job is enqueued but webhook queue worker currently only logs and returns processed (`backend/src/api/controllers/agent.controller.ts`, `backend/src/queues/workers.ts`).

## 3. Scope

In scope:

1. Async provisioning start endpoint with immediate `202` response.
2. Persistent job/step state machine.
3. Step orchestration with resume/retry behavior.
4. Worker dispatch for:
- `agent-provision-retry`
- `agent-update-retry`
- `elevenlabs-webhook-retry`
5. Dead-letter + retry classification for recoverable vs non-recoverable failures.

Out of scope:

1. Detailed tab profile application logic (S4).
2. Health/readiness scoring contract (S5).

## 4. Orchestration Steps

Ordered steps:

1. Validate request and role policy.
2. Build `wizard_intent_profile_v1`.
3. Compile prompt and greeting.
4. Create/update provider baseline agent.
5. Apply core-tab profile.
6. Ingest KB sources.
7. Attach webhooks and MCP.
8. Register smoke tests and run create-time bundle.
9. Persist final versions/hash/sync metadata.
10. Mark `completed`, `retrying`, `failed`, or `blocked_manual`.

## 5. Idempotency And Correlation

1. Start endpoint requires idempotency key.
2. Every step write includes `correlationId`.
3. Duplicate start requests return existing active job.
4. Retry endpoint increments attempt counter and appends step events.

## 6. Lifecycle Integration

1. Update org and agent lifecycle/provisioning states as steps progress.
2. Do not mark workspace or agent ready based only on provider create success.
3. Final activation depends on smoke-test and blocking-check outcomes.

## 7. Acceptance Criteria

1. Wizard submit returns quickly with provisioning job metadata.
2. Worker executes retry jobs for agent sync and webhook reprocessing.
3. Failed steps are resumable without duplicate resource creation.
4. Dead-letter entries include actionable error metadata.

## 8. Test Plan

1. Integration tests for full job state transition path.
2. Worker tests for job-name dispatch routing.
3. Idempotency tests for duplicate start calls.
4. Failure-injection tests for provider timeout and step resume.

## 9. Implementation Artifacts

1. `backend/src/api/controllers/organization.controller.ts`
2. `backend/src/api/controllers/agent.controller.ts`
3. `backend/src/services/agent.service.ts`
4. `backend/src/services/agent-webhook.service.ts`
5. `backend/src/queues/workers.ts`
6. `backend/src/types/queues.ts`
7. `backend/src/queues/index.ts`
8. New provisioning orchestration modules under `backend/src/services/`
9. New provisioning APIs under `backend/src/api/routes/`
