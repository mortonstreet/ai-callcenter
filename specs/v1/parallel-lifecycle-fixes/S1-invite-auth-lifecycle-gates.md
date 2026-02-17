# Subspec S1: Invite-Only Auth And Lifecycle Gates

Status: Implementation-ready v1
Owner: Auth backend + frontend auth
Parent: `specs/v1/parallel-lifecycle-fixes/00-execution-roadmap.md`

Git Delivery Branch: `feature/invite-only-auth-lifecycle-gates`
Subspec Completion Gate:
1. Start implementation with `git switch -c feature/invite-only-auth-lifecycle-gates` from `main`.
2. Keep all code, tests, and docs for this subspec on `feature/invite-only-auth-lifecycle-gates`.
3. Create at least one intentional commit that references this subspec scope.
4. Push with `git push -u origin feature/invite-only-auth-lifecycle-gates`.
5. Do not mark this subspec complete until commit SHA and PR link are logged.

## 1. Purpose

Enforce invite-only onboarding entry and establish lifecycle-aware access checks.

## 2. Current Gap

1. Invite-only enforcement is disabled in Better Auth config.
2. Public signup route is currently open.
3. Signup can proceed without invite context.
4. Invite acceptance does not reliably set active organization context.

## 3. Scope

In scope:

1. Turn on invite-only policy in auth layer.
2. Restrict frontend middleware and signup routes to invitation context.
3. Harden invitation acceptance flow (token/state checks, one-time use).
4. Set active org after successful invite acceptance.
5. Add baseline lifecycle gate checks in API and client layout flow.

Out of scope:

1. Stripe checkout logic (S3).
2. Async provisioning orchestration (S2/S5/S6/S7).

## 4. Implementation Tasks

1. Enable invite-only in `backend/src/lib/better-auth.ts`.
2. Update route guards in `frontend/middleware.ts`.
3. Enforce invite context in `frontend/app/(auth)/signup/page.tsx`.
4. Harden acceptance path in `frontend/app/(auth)/accept-invitation/[id]/page.tsx` and corresponding backend endpoint checks.
5. Ensure org context is persisted for post-accept redirects.
6. Add lifecycle gate utility shared by dashboard and API middleware.

## 5. Acceptance Criteria

1. Public signup without valid invitation is blocked.
2. Invitation acceptance is idempotent and rejects expired/replayed tokens.
3. User lands in the correct post-accept lifecycle route.
4. Gate checks enforce onboarding/payment/provisioning route rules.

## 6. Test Plan

1. Auth integration tests: no-invite signup denied.
2. Invite acceptance tests: valid, expired, already accepted.
3. Frontend middleware tests for redirect decisions.

## 7. Implementation Artifacts

1. `backend/src/lib/better-auth.ts`
2. `frontend/middleware.ts`
3. `frontend/app/(auth)/signup/page.tsx`
4. `frontend/app/(auth)/accept-invitation/[id]/page.tsx`
5. `backend/src/api/middlewares/auth.ts` (or gate middleware location)
