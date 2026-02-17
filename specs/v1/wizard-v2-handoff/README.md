# V1 Wizard V2 Split Handoff Pack

Status: Active
Date: February 16, 2026
Parent: `specs/v1/15-elevenlabs-wizard-v2-handoff-spec.md`

This pack decomposes the concise wizard v2 handoff into implementation-sized specs that can be executed without context rot.

## Files

1. `specs/v1/wizard-v2-handoff/00-execution-roadmap.md`
2. `specs/v1/wizard-v2-handoff/S0-contract-and-state-lock.md`
3. `specs/v1/wizard-v2-handoff/S1-wizard-surface-and-role-enforcement.md`
4. `specs/v1/wizard-v2-handoff/S2-profile-engine-and-prompt-compiler.md`
5. `specs/v1/wizard-v2-handoff/S3-provisioning-orchestrator-and-retries.md`
6. `specs/v1/wizard-v2-handoff/S4-core-tab-auto-provisioning.md`
7. `specs/v1/wizard-v2-handoff/S5-health-checks-smoke-and-readiness.md`
8. `specs/v1/wizard-v2-handoff/S6-status-observability-and-rollout.md`

## Why This Split Exists

The current codebase already has partial wizard + provider integration paths, but it does not yet satisfy the full profile-driven wizard contract. Key examples:

1. Wizard payloads still include direct prompt override surfaces (`frontend/components/agent/CreateAgentWizard.tsx`, `shared/types/src/requests/agent.ts`).
2. Onboarding still creates the first agent synchronously (`backend/src/api/controllers/organization.controller.ts`).
3. Retry jobs are enqueued, but worker handlers do not execute agent/webhook retry logic (`backend/src/services/agent.service.ts`, `backend/src/queues/workers.ts`).
4. Health checks are provider-only and do not validate workflow/KB/tools/tests readiness (`backend/src/services/agent.service.ts`, `shared/types/src/requests/agent.ts`).

## Execution Rule

Start with `00-execution-roadmap.md`, then execute S0->S6 in order unless a spec explicitly says it can run in parallel.
