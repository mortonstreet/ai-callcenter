# Wizard V2 Execution Roadmap (S0-S6)

Status: Implementation-ready v1
Date: February 16, 2026
Owner: Product + Voice AI Platform + Backend Platform
Parent: `specs/v1/15-elevenlabs-wizard-v2-handoff-spec.md`

## 1. Purpose

Convert the concise wizard v2 handoff into a staged, no-context-loss execution plan that adds missing health checks and operational controls needed for reliable onboarding and agent provisioning.

## 2. Complexity Assessment (Why More Specs Were Required)

Complexity is high enough to require decomposition because current implementation is split across frontend wizard UI, onboarding lifecycle, provider integration, queue workers, and health/status UX.

Current evidence of cross-cutting gaps:

1. Wizard surface and request schema still carry direct prompt override fields (`frontend/components/agent/CreateAgentWizard.tsx`, `shared/types/src/requests/agent.ts`).
2. Onboarding still performs inline agent provisioning instead of async orchestration (`backend/src/api/controllers/organization.controller.ts`).
3. Agent retry and webhook retry jobs are defined/enqueued but not actually processed by workers (`backend/src/services/agent.service.ts`, `backend/src/services/agent-webhook.service.ts`, `backend/src/queues/workers.ts`).
4. Health contract only checks provider reachability and sync state (`backend/src/services/agent.service.ts`, `shared/types/src/requests/agent.ts`).
5. Provisioning status UX exists as placeholder text with no timeline contract (`frontend/app/dashboard/provisioning/page.tsx`).

## 3. Required Health Check Expansion

Wizard v2 must add checks across three layers, not just provider uptime:

1. Build-time: profile load, prompt compile, role-policy validation.
2. Provision-time: workflow/branches, KB ingest, tools/MCP, webhook signing, smoke tests.
3. Runtime: scheduled checks for provider drift, webhook delivery, MCP reachability, queue backlog, and test regressions.

Activation policy:

1. `ready`: all blocking checks pass.
2. `degraded`: only non-blocking checks failed; retries and owner-facing warning required.
3. `blocked`: any blocking check failed; activation denied until resolved.

## 4. Wave Plan

| Wave | Spec | File | Designated Branch | Can Run In Parallel With | Must Wait For |
|---|---|---|---|---|---|
| Wave 0 | S0 | `S0-contract-and-state-lock.md` | `feature/wizard-v2-contract-lock` | none | none |
| Wave 1 | S1 | `S1-wizard-surface-and-role-enforcement.md` | `feature/wizard-v2-surface-and-rbac` | S2 | S0 |
| Wave 1 | S2 | `S2-profile-engine-and-prompt-compiler.md` | `feature/wizard-v2-profile-compiler` | S1 | S0 |
| Wave 2 | S3 | `S3-provisioning-orchestrator-and-retries.md` | `feature/wizard-v2-orchestrator-retries` | none | S1 and S2 |
| Wave 3 | S4 | `S4-core-tab-auto-provisioning.md` | `feature/wizard-v2-core-tab-autoprov` | S5 | S3 |
| Wave 3 | S5 | `S5-health-checks-smoke-and-readiness.md` | `feature/wizard-v2-health-readiness` | S4 | S3 |
| Wave 4 | S6 | `S6-status-observability-and-rollout.md` | `feature/wizard-v2-rollout-controls` | none | S4 and S5 |

## 5. Shared Contracts Across All Specs

All specs must keep these stable:

1. `wizard_intent_profile_v1` is the only input to provisioning orchestration.
2. `agent_profile_v1` is the only source of default tab settings.
3. Role contract: owner can only set wizard business inputs, greeting, and voice selection; admin controls raw prompt/workflow/analysis/security internals.
4. Provisioning state machine: `queued|running|retrying|failed|completed|blocked_manual`.
5. Activation gate depends on readiness checks, not only provider create success.

## 6. Delivery Gate

For each S-spec:

1. Implement only that scope in its branch.
2. Add/adjust tests for contract + failure paths.
3. Update docs and runbook references.
4. Log commit SHA and PR in section 7 before marking complete.

## 7. Commit Ledger

| Spec | Branch | Commit SHA | PR Link | Status |
|---|---|---|---|---|
| S0 | `feature/wizard-v2-contract-lock` | pending | pending | open |
| S1 | `feature/wizard-v2-surface-and-rbac` | pending | pending | open |
| S2 | `feature/wizard-v2-profile-compiler` | pending | pending | open |
| S3 | `feature/wizard-v2-orchestrator-retries` | pending | pending | open |
| S4 | `feature/wizard-v2-core-tab-autoprov` | pending | pending | open |
| S5 | `feature/wizard-v2-health-readiness` | pending | pending | open |
| S6 | `feature/wizard-v2-rollout-controls` | pending | pending | open |
