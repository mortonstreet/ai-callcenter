# S2: Profile Engine And Prompt Compiler

Status: Implementation-ready v1
Date: February 16, 2026
Owner: Voice AI Platform
Parent: `specs/v1/wizard-v2-handoff/00-execution-roadmap.md`
Git Delivery Branch: `feature/wizard-v2-profile-compiler`

## 1. Purpose

Implement deterministic profile-driven defaults and prompt/greeting compilation so wizard inputs map to a governed production agent config.

## 2. Current Gap

1. Prompt assembly is ad hoc string composition around industry template + optional raw overrides (`backend/src/services/agent.service.ts`, `backend/src/utils/agent-templates.ts`).
2. No persisted prompt/config profile versions on agent records (`shared/db/prisma/schema.prisma`).
3. No reusable profile object loading from `agent-factory` core templates during create-time.

## 3. Scope

In scope:

1. `agent_profile_v1` runtime profile loader.
2. Prompt compiler for deterministic section assembly.
3. Greeting compiler (`generated` + `custom` mode support).
4. Voice fallback resolver tied to curated catalog.
5. Persisted profile/version/hash metadata for audit and rollback.

Out of scope:

1. Async provisioning execution engine.
2. Queue retries and status page.

## 4. Compiler Contract

`system_prompt = compile(base + industry + use_case + services + discovery_questions + objective + policy_blocks + tool_rules + escalation_rules)`

Rules:

1. Inputs are normalized from `wizard_intent_profile_v1`.
2. Compiler output is deterministic and hashable.
3. Source fragments are traceable (`fragmentIds[]`).
4. Store `promptProfileVersion`, `configProfileVersion`, and `profileHash` on agent metadata.

## 5. Profile Sources

Use existing template assets:

1. `specs/v1/agent-factory/core-tabs/default-core-tabs-profile.v1.yaml`
2. `specs/v1/agent-factory/workflows/common-customer-request-workflow.v1.yaml`
3. `specs/v1/agent-factory/templates/elevenlabs-v3-system-prompt.template.md`

Runtime profile object should lock:

1. LLM defaults
2. Voice model family and bounded tuning
3. Workflow defaults
4. Analysis/tools/security/advanced defaults

## 6. Voice Policy

1. Resolve selected `voice_id` from curated catalog.
2. If selected voice unavailable, apply deterministic fallback from profile.
3. Keep model family and advanced tuning profile-driven.

## 7. Acceptance Criteria

1. Same input profile yields same compiled prompt hash.
2. Agent row stores profile/version/hash metadata.
3. Greeting mode behaves correctly (`generated` and `custom`).
4. Missing voice selection produces deterministic fallback.

## 8. Test Plan

1. Prompt compiler unit tests (determinism and section order).
2. Voice resolver tests (selected, missing, fallback cases).
3. Contract tests that wizard payload cannot bypass compiler and inject raw prompt.
4. Metadata persistence tests for version/hash fields.

## 9. Implementation Artifacts

1. `backend/src/services/agent.service.ts`
2. `backend/src/utils/agent-templates.ts` (or replacement compiler module)
3. New profile/compiler modules under `backend/src/services/`
4. `shared/db/prisma/schema.prisma`
5. `shared/types/src/requests/agent.ts`
