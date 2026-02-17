# V1 Parallel Subspec Pack: Lifecycle Fixes

Status: Active
Owner: Engineering management
Parent: `specs/v1/10-implementation-roadmap.md`
Pack Kickoff Date: February 15, 2026

This pack defines a branch-per-subspec execution plan for invite/auth lifecycle gates, onboarding orchestration, billing entitlements, and provisioning hardening.

## Subspec Files

1. `specs/v1/parallel-lifecycle-fixes/00-execution-roadmap.md`
2. `specs/v1/parallel-lifecycle-fixes/S0-contract-repair.md`
3. `specs/v1/parallel-lifecycle-fixes/S1-invite-auth-lifecycle-gates.md`
4. `specs/v1/parallel-lifecycle-fixes/S2-onboarding-orchestration.md`
5. `specs/v1/parallel-lifecycle-fixes/S3-billing-entitlements.md`
6. `specs/v1/parallel-lifecycle-fixes/S4-admin-demo-provisioning.md`
7. `specs/v1/parallel-lifecycle-fixes/S5-twilio-isv-provisioning.md`
8. `specs/v1/parallel-lifecycle-fixes/S6-elevenlabs-advanced-provisioning.md`
9. `specs/v1/parallel-lifecycle-fixes/S7-google-calendar-integration.md`
10. `specs/v1/parallel-lifecycle-fixes/S8-observability-rollout-controls.md`

## Branch Mapping

1. S0 -> `feature/admin-org-create-contract-fix`
2. S1 -> `feature/invite-only-auth-lifecycle-gates`
3. S2 -> `feature/onboarding-provisioning-orchestrator`
4. S3 -> `feature/billing-entitlements-and-access-control`
5. S4 -> `feature/admin-demo-tenant-provisioning`
6. S5 -> `feature/twilio-isv-subaccount-provisioning`
7. S6 -> `feature/elevenlabs-custom-voice-automation`
8. S7 -> `feature/google-calendar-integration-sync`
9. S8 -> `feature/onboarding-billing-provisioning-observability`

Execution source of truth is `specs/v1/parallel-lifecycle-fixes/00-execution-roadmap.md`.
