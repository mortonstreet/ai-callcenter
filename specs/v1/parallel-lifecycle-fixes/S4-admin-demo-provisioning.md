# Subspec S4: Admin Demo Tenant Provisioning

Status: Implementation-ready v1
Owner: Admin platform + customer success tooling
Parent: `specs/v1/parallel-lifecycle-fixes/00-execution-roadmap.md`

Git Delivery Branch: `feature/admin-demo-tenant-provisioning`
Subspec Completion Gate:
1. Start implementation with `git switch -c feature/admin-demo-tenant-provisioning` from `main`.
2. Keep all code, tests, and docs for this subspec on `feature/admin-demo-tenant-provisioning`.
3. Create at least one intentional commit that references this subspec scope.
4. Push with `git push -u origin feature/admin-demo-tenant-provisioning`.
5. Do not mark this subspec complete until commit SHA and PR link are logged.

## 1. Purpose

Support controlled demo tenants with explicit approval, expiry, and owner handoff.

## 2. Scope

In scope:

1. Admin API/UI to create demo orgs and owner accounts.
2. Onboarding-on-behalf flow for demo setup.
3. Demo policy model: approver, expiry date, usage limits, extension reason.
4. Owner handoff flow that transitions demo owner to normal org admin login.

Out of scope:

1. Paid billing checkout.
2. Provider-specific deep provisioning internals.

## 3. Implementation Tasks

1. Extend admin endpoints and shared types for demo tenant creation payload.
2. Add demo metadata storage and lifecycle enforcement checks.
3. Add admin actions for approve, extend, suspend, and convert demo.
4. Add audit events for every demo policy mutation.

## 4. Acceptance Criteria

1. Demo tenant cannot become workspace-active without admin approval.
2. Expired demo is automatically restricted by policy enforcement.
3. Admin can handoff owner access without manual DB edits.
4. All policy actions are audit logged.

## 5. Test Plan

1. Admin API tests for create/approve/extend/suspend.
2. Lifecycle gate tests for active vs expired demo.
3. Owner handoff integration test.

## 6. Implementation Artifacts

1. `backend/src/api/controllers/admin.controller.ts`
2. `backend/src/api/routes/admin.ts`
3. `shared/types/src/requests/admin.ts`
4. `frontend/app/dashboard` (admin pages)
