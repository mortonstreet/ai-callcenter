# S1: Wizard Surface And Role Enforcement

Status: Implementation-ready v1
Date: February 16, 2026
Owner: Frontend + API Authorization
Parent: `specs/v1/wizard-v2-handoff/00-execution-roadmap.md`
Git Delivery Branch: `feature/wizard-v2-surface-and-rbac`

## 1. Purpose

Deliver the minimal, non-technical wizard surface while enforcing owner/admin boundaries in both UI and backend contracts.

## 2. Current Gap

1. Wizard currently includes admin prompt override in flow (`frontend/components/agent/CreateAgentWizard.tsx`).
2. Onboarding and in-dashboard wizard collect overlapping fields with inconsistent semantics (`frontend/app/onboarding/page.tsx`, `frontend/components/agent/CreateAgentWizard.tsx`).
3. Voice selector currently exposes raw upstream voice list without workspace curation (`frontend/components/agent/VoiceSelector.tsx`, `backend/src/services/agent.service.ts`).

## 3. Scope

In scope:

1. Single wizard field model (as defined in S0).
2. Greeting preference mode (`generated|custom`).
3. Routing optional inputs block (transfer number/timezone/languages).
4. Role-based field visibility and submission filtering.
5. API-side rejection for forbidden fields regardless of UI state.

Out of scope:

1. Profile compiler internals.
2. Provisioning execution internals.

## 4. UX Contract

Expose only:

1. Agent name
2. Industry
3. Use case
4. Service selections
5. Discovery questions
6. Main objective
7. Knowledge sources (URLs/docs)
8. Voice selection (curated)
9. Greeting mode + optional custom greeting
10. Optional routing inputs

Do not expose in wizard:

1. Raw prompt text
2. LLM params
3. Workflow editor
4. Analysis schema editor
5. Security/tool internals

## 5. Authorization Contract

1. Owner can submit only wizard business fields.
2. Admin can manage templates/profiles outside wizard management surfaces.
3. API strips/blocks forbidden fields and emits contract error codes.
4. Existing owner-update endpoint remains limited to greeting + voice on edit surfaces.

## 6. Endpoint Behavior

1. Wizard create endpoints accept only `wizard_input_v2`.
2. Any payload containing forbidden internals is rejected with `400` and field list.
3. Include `correlationId` in all responses for audit/debug.

## 7. Acceptance Criteria

1. Wizard UI no longer contains prompt override input.
2. Owner cannot mutate blocked fields through direct API calls.
3. Admin/owner role checks are consistent in UI and backend responses.
4. Voice dropdown shows curated catalog results only.

## 8. Test Plan

1. Frontend component tests for role-based field visibility.
2. API authorization tests for owner/admin payload constraints.
3. E2E flow for onboarding wizard completion with minimal field set.
4. Regression test that direct `systemPrompt` injection via wizard endpoint is rejected.

## 9. Implementation Artifacts

1. `frontend/components/agent/CreateAgentWizard.tsx`
2. `frontend/app/onboarding/page.tsx`
3. `frontend/components/agent/VoiceSelector.tsx`
4. `frontend/hooks/api/useAgent.ts`
5. `frontend/hooks/api/useOrganization.ts`
6. `backend/src/api/controllers/agent.controller.ts`
7. `backend/src/api/controllers/organization.controller.ts`
8. `shared/types/src/requests/agent.ts`
