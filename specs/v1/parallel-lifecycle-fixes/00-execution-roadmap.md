# Plan-Mode Subspec Execution Roadmap (S0-S8)

Status: Active v1
Owner: Engineering management
Parent: `specs/v1/10-implementation-roadmap.md`
Effective Date: February 15, 2026

## 1. Purpose

Define a branch-per-subspec delivery plan for lifecycle gating, billing, provisioning automation, and rollout controls.

## 2. End-To-End Target State

Target flow:

1. `invited`
2. `account_created`
3. `invitation_accepted`
4. `onboarding_completed`
5. `payment_verified` (or `demo_approved`)
6. `provisioning_completed`
7. `workspace_active`

Access policy:

1. `workspace_active` required for full dashboard.
2. `onboarding_incomplete` redirects to onboarding.
3. `payment_required` redirects to billing checkout.
4. `provisioning_pending` routes to provisioning status page.
5. Demo plans bypass paid checkout but still require admin approval, provisioning completion, and expiry enforcement.

## 3. Branch-Per-Subspec Global Rules

1. Start work with `git switch -c <designated-branch>` from `main`.
2. Keep implementation, tests, and docs scoped to that branch.
3. Record at least one implementation commit that references the subspec path.
4. Push branch to GitHub and open a PR before marking subspec complete.
5. Record commit SHA and PR link in section 6 before completion.

## 4. Wave Matrix (Parallel Execution)

| Wave | Subspec | Subspec File | Designated Branch | Can Run In Parallel With | Must Wait For |
|---|---|---|---|---|---|
| Wave 0 | S0 | `S0-contract-repair.md` | `feature/admin-org-create-contract-fix` | none | none |
| Wave 1 | S1 | `S1-invite-auth-lifecycle-gates.md` | `feature/invite-only-auth-lifecycle-gates` | none | S0 accepted |
| Wave 2 | S2 | `S2-onboarding-orchestration.md` | `feature/onboarding-provisioning-orchestrator` | S3 | S1 accepted |
| Wave 2 | S3 | `S3-billing-entitlements.md` | `feature/billing-entitlements-and-access-control` | S2 | S1 accepted |
| Wave 3 | S4 | `S4-admin-demo-provisioning.md` | `feature/admin-demo-tenant-provisioning` | S5, S6, S7 | S2 and S3 accepted |
| Wave 3 | S5 | `S5-twilio-isv-provisioning.md` | `feature/twilio-isv-subaccount-provisioning` | S4, S6, S7 | S2 accepted |
| Wave 3 | S6 | `S6-elevenlabs-advanced-provisioning.md` | `feature/elevenlabs-custom-voice-automation` | S4, S5, S7 | S2 accepted |
| Wave 3 | S7 | `S7-google-calendar-integration.md` | `feature/google-calendar-integration-sync` | S4, S5, S6 | S2 accepted |
| Wave 4 | S8 | `S8-observability-rollout-controls.md` | `feature/onboarding-billing-provisioning-observability` | none | S4, S5, S6, and S7 in stage smoke |

Wave policy:

1. S0 and S1 are correctness blockers and remain sequential.
2. S2 and S3 run in parallel with shared lifecycle-state contract alignment.
3. S4-S7 run in parallel after core lifecycle and entitlement states are merged.
4. S8 hardens production readiness and is the final gate before broad rollout.

## 5. Cross-Subspec Shared Contracts

All subspecs must align on the same canonical states and gate checks:

1. `org.lifecycleStatus`: `onboarding_incomplete|payment_required|demo_approved|provisioning_pending|workspace_active|suspended`.
2. `org.planType`: `paid|demo`.
3. `org.provisioningStatus`: `pending|running|failed|completed`.
4. Guard middleware used by API routes and frontend layout/middleware.
5. Every transition emits audit events with `organizationId` and `correlationId`.

## 6. Commit Proof Ledger

| Subspec | Branch | Commit SHA | PR Link | Status |
|---|---|---|---|---|
| S0 | `feature/admin-org-create-contract-fix` | pending | pending | open |
| S1 | `feature/invite-only-auth-lifecycle-gates` | pending | pending | open |
| S2 | `feature/onboarding-provisioning-orchestrator` | pending | pending | open |
| S3 | `feature/billing-entitlements-and-access-control` | pending | pending | open |
| S4 | `feature/admin-demo-tenant-provisioning` | pending | pending | open |
| S5 | `feature/twilio-isv-subaccount-provisioning` | pending | pending | open |
| S6 | `feature/elevenlabs-custom-voice-automation` | pending | pending | open |
| S7 | `feature/google-calendar-integration-sync` | pending | pending | open |
| S8 | `feature/onboarding-billing-provisioning-observability` | pending | pending | open |

## 7. Parallel Worktree Bootstrap (Optional)

Suggested local setup:

1. `git worktree add ../revcenter-s0 feature/admin-org-create-contract-fix`
2. `git worktree add ../revcenter-s1 feature/invite-only-auth-lifecycle-gates`
3. `git worktree add ../revcenter-s2 feature/onboarding-provisioning-orchestrator`
4. `git worktree add ../revcenter-s3 feature/billing-entitlements-and-access-control`
5. `git worktree add ../revcenter-s4 feature/admin-demo-tenant-provisioning`
6. `git worktree add ../revcenter-s5 feature/twilio-isv-subaccount-provisioning`
7. `git worktree add ../revcenter-s6 feature/elevenlabs-custom-voice-automation`
8. `git worktree add ../revcenter-s7 feature/google-calendar-integration-sync`
9. `git worktree add ../revcenter-s8 feature/onboarding-billing-provisioning-observability`
