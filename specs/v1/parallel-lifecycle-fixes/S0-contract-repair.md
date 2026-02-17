# Subspec S0: Contract Repair (Admin Org Create)

Status: Implementation-ready v1
Owner: Platform backend + admin UI
Parent: `specs/v1/parallel-lifecycle-fixes/00-execution-roadmap.md`

Git Delivery Branch: `feature/admin-org-create-contract-fix`
Subspec Completion Gate:
1. Start implementation with `git switch -c feature/admin-org-create-contract-fix` from `main`.
2. Keep all code, tests, and docs for this subspec on `feature/admin-org-create-contract-fix`.
3. Create at least one intentional commit that references this subspec scope.
4. Push with `git push -u origin feature/admin-org-create-contract-fix`.
5. Do not mark this subspec complete until commit SHA and PR link are logged.

## 1. Purpose

Repair admin org creation contract mismatch and unblock baseline provisioning.

## 2. Current Gap

1. Frontend admin call currently sends `{ name, slug }`.
2. Backend contract and controller expect `{ name, ownerEmail }`.
3. Result is failed admin org-creation and broken downstream setup flow.

## 3. Scope

In scope:

1. Align request/response types across `shared/types`, backend controller, and frontend hook.
2. Make `ownerEmail` required and `slug` optional (server-generated if absent).
3. Return normalized org + owner data in one stable response shape.
4. Add explicit validation and typed error response for invalid owner email.

Out of scope:

1. Demo plan policy.
2. Billing state transitions.
3. Twilio/ElevenLabs automation.

## 4. Implementation Tasks

1. Update request schema in `shared/types/src/requests/admin.ts`.
2. Update backend parsing/validation in `backend/src/api/controllers/admin.controller.ts`.
3. Update frontend request payload construction in `frontend/hooks/api/useAdmin.ts`.
4. Add compatibility handling if a legacy `slug`-only payload appears.
5. Add unit/integration tests for success and validation failures.

## 5. Acceptance Criteria

1. Admin org create succeeds with `{ name, ownerEmail, slug? }`.
2. API rejects missing/invalid `ownerEmail` with a clear 4xx error.
3. Frontend admin flow sends the canonical payload.
4. Shared types and generated clients compile without type drift.

## 6. Test Plan

1. Controller unit tests for validation and happy path.
2. Contract test verifying frontend hook payload matches shared type.
3. Manual API smoke: create org with and without `slug`.

## 7. Implementation Artifacts

1. `shared/types/src/requests/admin.ts`
2. `backend/src/api/controllers/admin.controller.ts`
3. `frontend/hooks/api/useAdmin.ts`
4. `backend/src/api/routes/admin.ts` (if route contract changes)
