# S0: Wizard V2 Contract And State Lock

Status: Implementation-ready v1
Date: February 16, 2026
Owner: Platform Architecture + API
Parent: `specs/v1/wizard-v2-handoff/00-execution-roadmap.md`
Git Delivery Branch: `feature/wizard-v2-contract-lock`

## 1. Purpose

Freeze canonical payloads, enums, and persistence fields before changing UI or orchestrator logic.

## 2. Current Gap

1. Wizard fields are spread across onboarding and create-agent flows with mismatched required/optional behavior (`frontend/app/onboarding/page.tsx`, `frontend/components/agent/CreateAgentWizard.tsx`, `shared/types/src/requests/agent.ts`, `backend/src/api/controllers/organization.controller.ts`).
2. No persisted profile/version fields for audit/rollback on agent rows (`shared/db/prisma/schema.prisma`).
3. No first-class provisioning job/step state model exists.

## 3. Scope

In scope:

1. Canonical `wizard_input_v2` schema and validator.
2. Canonical `wizard_intent_profile_v1` schema.
3. Canonical provisioning state enums + step enums.
4. Agent metadata fields for profile/version/hash tracking.
5. API contracts for create/start/status/retry.

Out of scope:

1. UI redesign.
2. Provisioning execution logic.

## 4. Canonical Contracts

### 4.1 `wizard_input_v2`

Fields:

1. `agentName` (required)
2. `industry` (required)
3. `useCase` (required)
4. `services[]` (required, min 1)
5. `discoveryQuestions[]` (optional)
6. `mainObjective` (required)
7. `knowledgeSources[]` (URLs/docs, optional but recommended)
8. `voiceSelection.voiceId` (optional)
9. `greeting.mode` (`generated|custom`)
10. `greeting.customText` (required if mode is `custom`)
11. `routing.transferNumber` (optional)
12. `routing.businessTimezone` (optional, IANA)
13. `routing.languages[]` (optional)

Forbidden in wizard payload:

1. Raw `systemPrompt`
2. Raw `llmModel`, `temperature`, `maxTokens`
3. Raw workflow/analysis/security/tool internals

### 4.2 `wizard_intent_profile_v1`

Derived object persisted for replay:

1. Normalized business context.
2. Selected services/questions.
3. Routing/escalation rules.
4. Sanitized knowledge source manifest.
5. Selected voice/fallback candidate.
6. `inputSchemaVersion` and `generatedAt`.

### 4.3 Provisioning enums

1. Job status: `queued|running|retrying|failed|completed|blocked_manual`
2. Step status: `pending|running|failed|completed|skipped`
3. Step IDs:
- `validate_request`
- `compile_intent_profile`
- `compile_prompt`
- `create_or_update_agent`
- `apply_core_tabs_profile`
- `ingest_knowledge_sources`
- `attach_webhooks_and_mcp`
- `register_and_run_smoke_tests`
- `persist_versions_and_sync`

## 5. Data Model Additions

Additions (naming can follow repo conventions):

1. `agent.promptProfileVersion`
2. `agent.configProfileVersion`
3. `agent.profileHash`
4. `agent.wizardIntentProfile` (json/text)
5. `agent.readinessStatus` (`ready|degraded|blocked`)
6. `agent_provisioning_job` table.
7. `agent_provisioning_step` table.

Each provisioning row must store:

1. `organizationId`, `agentId`, `correlationId`, `idempotencyKey`
2. `status`, `attempt`, `lastErrorCode`, `lastErrorMessage`
3. timestamps (`createdAt`, `startedAt`, `completedAt`, `updatedAt`)

## 6. API Contract Adjustments

1. Create/start endpoint returns `202` with `jobId`, `agentId`, `status`.
2. Status endpoint returns job + ordered step timeline.
3. Retry endpoint only available for recoverable states and role-authorized users.
4. All writes support idempotency keys.

## 7. Acceptance Criteria

1. A single schema package validates wizard payloads for onboarding and in-dashboard create flows.
2. Blocked fields are rejected server-side with explicit contract errors.
3. Agent rows persist profile/version metadata.
4. Provisioning job and step rows can represent end-to-end execution history.

## 8. Test Plan

1. Schema contract tests for allow/deny field sets.
2. Migration tests for new columns/tables.
3. API contract tests for `202` start + status/retry shape.
4. Idempotency tests for duplicate start requests.

## 9. Implementation Artifacts

1. `shared/types/src/requests/agent.ts`
2. `backend/src/api/controllers/organization.controller.ts`
3. `backend/src/api/controllers/agent.controller.ts`
4. `backend/src/api/routes/organization.ts`
5. `backend/src/api/routes/agent.ts`
6. `shared/db/prisma/schema.prisma`
7. New migration files under `shared/db/prisma/migrations/`
