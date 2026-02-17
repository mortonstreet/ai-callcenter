# S5: Health Checks, Smoke Tests, And Readiness

Status: Implementation-ready v1
Date: February 16, 2026
Owner: Platform Reliability + Voice AI Platform
Parent: `specs/v1/wizard-v2-handoff/00-execution-roadmap.md`
Git Delivery Branch: `feature/wizard-v2-health-readiness`

## 1. Purpose

Expand health checks from provider-only status into full readiness gating for onboarding and wizard-created agents.

## 2. Current Gap

1. `getAgentHealth` returns only provider check status (`backend/src/services/agent.service.ts`).
2. Health response type only models `checks.provider` (`shared/types/src/requests/agent.ts`).
3. Agent details UI displays provider status only (`frontend/app/dashboard/agents/[id]/page.tsx`).

## 3. Scope

In scope:

1. Expanded health contract with multiple checks.
2. Blocking/non-blocking check policy for activation.
3. Smoke test bundle executed on create/update provisioning.
4. Scheduled runtime checks and degraded-state handling.

Out of scope:

1. Rollout dashboards/alerts wiring beyond wizard scope (S6).

## 4. Health Contract v2

Top-level status:

1. `healthy`
2. `degraded`
3. `blocked`

Required checks:

1. `provider`: provider reachability and sync state.
2. `profile`: profile/version/hash integrity.
3. `workflow`: canonical nodes and fallback routes present.
4. `knowledge_base`: ingest completion and minimum source threshold.
5. `tools_mcp`: baseline tools enabled and MCP ping success.
6. `webhook`: signed test callback success.
7. `tests`: baseline smoke/regression pass state.
8. `queues`: retry backlog threshold status.

Per-check fields:

1. `status` (`ok|degraded|failed|blocked`)
2. `checkedAt`
3. `message`
4. `blocking` (boolean)
5. `remediationAction` (optional)

## 5. Readiness Policy

1. Any failed blocking check => `blocked` and activation denied.
2. Non-blocking failed checks => `degraded` and retries scheduled.
3. Full pass => `healthy` and activation allowed.

Blocking checks by default:

1. `provider`
2. `workflow`
3. `webhook`
4. `tests`

## 6. Smoke Test Bundle

Run during provisioning completion:

1. Greeting + prompt compile sanity test.
2. Intent routing sample scenarios.
3. Tool invocation dry-run for required tools.
4. Webhook signature test call.
5. Knowledge retrieval sanity prompt.

If smoke bundle fails:

1. Mark step failed.
2. Keep agent in `blocked` or `degraded` based on failure class.
3. Surface remediation metadata in provisioning status.

## 7. Acceptance Criteria

1. Health endpoint returns multi-check contract with blocking semantics.
2. Activation gate uses readiness policy, not provider-only status.
3. Smoke tests run automatically on create-time provisioning.
4. Agent page surfaces check-level state and remediation hints.

## 8. Test Plan

1. Unit tests for readiness status resolver.
2. API contract tests for health response shape.
3. Integration tests for smoke test failure -> blocked status.
4. UI tests for multi-check rendering and remediation copy.

## 9. Implementation Artifacts

1. `backend/src/services/agent.service.ts`
2. `backend/src/api/controllers/agent.controller.ts`
3. `shared/types/src/requests/agent.ts`
4. `frontend/app/dashboard/agents/[id]/page.tsx`
5. New smoke/health modules under `backend/src/services/`
