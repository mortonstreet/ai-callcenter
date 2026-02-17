# Subspec S3: Billing Entitlements And Access Control

Status: Implementation-ready v1
Owner: Billing backend + frontend platform
Parent: `specs/v1/parallel-lifecycle-fixes/00-execution-roadmap.md`

Git Delivery Branch: `feature/billing-entitlements-and-access-control`
Subspec Completion Gate:
1. Start implementation with `git switch -c feature/billing-entitlements-and-access-control` from `main`.
2. Keep all code, tests, and docs for this subspec on `feature/billing-entitlements-and-access-control`.
3. Create at least one intentional commit that references this subspec scope.
4. Push with `git push -u origin feature/billing-entitlements-and-access-control`.
5. Do not mark this subspec complete until commit SHA and PR link are logged.

## 1. Purpose

Implement Stripe-backed billing lifecycle and enforce entitlement gating before workspace activation.

## 2. Current Gap

1. Billing routes are not mounted in backend runtime.
2. Dashboard gate checks only auth + org presence.
3. No enforced paid entitlement before full dashboard access.

## 3. Scope

In scope:

1. Add billing API routes (checkout session, portal, webhook).
2. Persist subscription/entitlement state transitions.
3. Enforce `payment_required` gate for paid plan orgs.
4. Allow demo plan bypass with explicit demo policy checks.

Out of scope:

1. Admin demo tenant creation UX (S4).
2. Twilio or voice provisioning internals.

## 4. Implementation Tasks

1. Mount billing routes in `backend/src/api/routes/index.ts`.
2. Add billing controller/service with Stripe integration and webhook signature verification.
3. Update lifecycle transitions: onboarding complete -> payment required -> payment verified.
4. Update dashboard layout and middleware to route unpaid orgs to checkout.
5. Add entitlement helpers reusable by backend and frontend gate checks.

## 5. Acceptance Criteria

1. Paid org cannot access full dashboard without verified payment.
2. Stripe webhook updates org entitlement status reliably.
3. Demo orgs bypass checkout but remain subject to provisioning and demo-policy gates.
4. Billing failure or canceled subscription transitions to restricted state.

## 6. Test Plan

1. Billing webhook integration tests.
2. Route-gating tests for paid, unpaid, and demo org states.
3. Frontend redirect tests for checkout and return flow.

## 7. Implementation Artifacts

1. `backend/src/api/routes/index.ts`
2. `backend/src/api/routes/billing.ts` (new)
3. `backend/src/api/controllers/billing.controller.ts` (new)
4. `backend/src/services/billing.service.ts` (new)
5. `frontend/app/dashboard/layout.tsx`
