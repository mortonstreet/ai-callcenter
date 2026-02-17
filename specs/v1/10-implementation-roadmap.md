# V1 Subspec: Implementation Roadmap

Status: Active v1 (Execution Ready)
Owner: Engineering management
Parent: `specs/v1/master-v1-spec.md`
Execution Kickoff Date: February 15, 2026

Git Delivery Branch: `feature/implementation-roadmap`
Subspec Completion Gate:
1. Start implementation with `git switch -c feature/implementation-roadmap` from the current base branch.
2. Keep all code, tests, and docs for this subspec on `feature/implementation-roadmap`.
3. Create at least one intentional commit that references this subspec scope.
4. Push the branch to GitHub with `git push -u origin feature/implementation-roadmap`.
5. Do not mark this subspec complete until the implementation commit is present on `feature/implementation-roadmap` in GitHub.

Parallel Branch Plan Matrix: Active
Matrix Effective Date: February 14, 2026
Execution Source Of Truth: `specs/v1/10-implementation-roadmap.md` section 10

## 1. Purpose

Provide a delivery roadmap from current Revcenter baseline to v1 production launch, with practical sequencing that minimizes cross-team blocking.

## 2. Assumptions

1. Core team has dedicated owners for platform, auth, integrations, campaigns, and frontend.
2. Workstreams run in parallel after Phase 1 foundation.
3. Existing Revcenter modules remain operational during rollout.

## 3. Milestone Plan

Schedule anchor:

1. Week 1 starts Monday, February 16, 2026.
2. Week boundaries are Monday through Sunday.
3. Milestone overlaps are intentional to keep Wave 1 and Wave 2 preparation unblocked.

### Milestone 0: Spec Finalization (Week 1, February 16-February 22, 2026)

1. Confirm v1 scope and acceptance criteria.
2. Finalize schema migration batch order.
3. Lock route contract changes.

Deliverables:

1. Approved `specs/v1/*` set.
2. Technical RFC comments resolved.

### Milestone 1: Platform + Auth Foundation (Weeks 2-4, February 23-March 15, 2026)

1. Stand up stage/prod self-host stack in Coolify.
2. Implement magic-link auth migration and hardening.
3. Align onboarding routing after auth migration.

Deliverables:

1. Stage deploy pipeline working.
2. Auth QA matrix passing.

### Milestone 2: Integrations Framework (Weeks 4-6, March 9-March 29, 2026)

1. Add integration schema and service adapters.
2. Build Integrations settings tab.
3. Ship Jobber/Workiz/ServiceTitan connection + status + test.

Deliverables:

1. Connector smoke tests passing in stage.
2. Sync job logging visible.

### Milestone 3: Campaign Engine (Weeks 6-9, March 23-April 19, 2026)

1. Add campaign + SMS sequencer schema/services/workers.
2. Add email campaign send path and provider config.
3. Ship campaigns UI with channel tabs.

Deliverables:

1. End-to-end multichannel campaign run in stage.
2. Unsubscribe and suppression controls verified.

### Milestone 4: Hardening And Launch (Weeks 9-12, April 13-May 10, 2026)

1. Observability and runbook completion.
2. Load/chaos/UAT runs.
3. Production launch checklist and cutover.

Deliverables:

1. Launch readiness gates complete.
2. Production go-live executed.

## 4. Workstream Breakdown

### 4.1 Platform

1. Coolify environment setup.
2. Worker runtime and queue process separation.
3. Backup/restore automation and drill execution.

### 4.2 Auth + Onboarding

1. Better Auth plugin and middleware changes.
2. Frontend magic-link UX and error handling.
3. Invitation safety and onboarding continuation.

### 4.3 Integrations

1. Provider registry and adapter implementation.
2. Credential encryption and token refresh.
3. Sync job execution and operational visibility.

### 4.4 Campaigns

1. Voice campaign reuse integration.
2. SMS sequencer migration and worker tuning.
3. Email outreach channel integration.
4. Campaign analytics and reporting.

### 4.5 QA + Ops

1. End-to-end regression suite.
2. Security and tenant isolation tests.
3. Incident response rehearsals.

## 5. Dependency Graph

1. Platform and auth must complete before external pilot.
2. Integrations and campaigns can progress in parallel after schema batch foundations.
3. Launch hardening depends on all functional modules being stage-stable.

## 6. Feature Flag Strategy

1. `AUTH_MAGIC_LINK_ENABLED`
2. `INTEGRATIONS_V1_ENABLED`
3. `CAMPAIGNS_SMS_ENABLED`
4. `CAMPAIGNS_EMAIL_ENABLED`
5. `CAMPAIGNS_VOICE_ENABLED`

Rollout:

1. internal users -> selected beta orgs -> all orgs.

## 7. Team Capacity Notes

1. Avoid coupling large schema migrations with frontend redesign in same release cut.
2. Keep one release train per week during milestone 3 and 4.
3. Reserve explicit on-call capacity during launch week.

### 7.1 Weekly Operating Cadence

1. Monday: wave dependency review and branch proof ledger audit.
2. Wednesday: cross-workstream blocker review with mitigation owners assigned.
3. Friday: stage demo plus milestone deliverable evidence capture.

## 8. Risks And Mitigations

1. Risk: Provider API scope/approval delays.
- Mitigation: parallel early credential setup and sandbox validation.

2. Risk: Worker throughput bottlenecks.
- Mitigation: queue partitioning and concurrency tuning in stage load tests.

3. Risk: Auth migration friction for existing users.
- Mitigation: phased rollout with fallback and clear migration communication.

## 9. Definition Of Done

1. Each milestone deliverable is complete and demoed in stage.
2. Security and reliability tests pass for all critical flows.
3. Launch readiness checklist is signed off by engineering + product + operations.
4. Every subspec branch is committed, pushed, and logged in the section 10 execution ledger before that subspec is marked complete.
5. S10 execution artifacts include dated milestone windows, wave dependency rules, and a commit proof entry for `feature/implementation-roadmap`.

## 10. Active Parallel Subspec Branch Plan Matrix

### 10.1 Global Rules (Every Subspec Row)

1. Start with `git switch -c <designated-branch>` from the current base branch.
2. Keep implementation scoped to that subspec branch; no cross-subspec bundling in the same commit.
3. Create at least one implementation commit that references the subspec file path in the commit body.
4. Push the branch and open/refresh a PR before marking that subspec complete.
5. Record commit SHA and PR link in section 10.3 before changing completion status.
6. Wave promotion is blocked until all required upstream rows have commit proof.

### 10.2 Wave Matrix

| Wave | Subspec ID | Subspec File | Designated Branch | Can Run In Parallel With | Must Wait For | Wave Exit Requirement |
|---|---|---|---|---|---|---|
| Wave 0 | S01 | `01-platform-architecture-and-self-hosting.md` | `feature/platform-architecture-and-self-hosting` | S02, S06, S07, S10, S11 | none | commit + PR logged |
| Wave 0 | S02 | `02-auth-and-onboarding-migration.md` | `feature/auth-and-onboarding-migration` | S01, S06, S07, S10, S11 | none | commit + PR logged |
| Wave 0 | S06 | `06-data-model-and-migration-plan.md` | `feature/data-model-and-migration-plan` | S01, S02, S07, S10, S11 | none | commit + PR logged |
| Wave 0 | S07 | `07-api-contracts-and-route-map.md` | `feature/api-contracts-and-route-map` | S01, S02, S06, S10, S11 | none | commit + PR logged |
| Wave 0 | S10 | `10-implementation-roadmap.md` | `feature/implementation-roadmap` | S01, S02, S06, S07, S11 | none | commit + PR logged |
| Wave 0 | S11 | `11-omnidial-reuse-migration-map.md` | `feature/omnidial-reuse-migration-map` | S01, S02, S06, S07, S10 | none | commit + PR logged |
| Wave 1 | S03 | `03-crm-integrations-platform.md` | `feature/crm-integrations-platform` | S04, S05 | S06 and S07 accepted | commit + PR logged |
| Wave 1 | S04 | `04-agent-lifecycle-and-elevenlabs.md` | `feature/agent-lifecycle-and-elevenlabs` | S03, S05 | S01 and S02 accepted | commit + PR logged |
| Wave 1 | S05 | `05-campaigns-multichannel-orchestration.md` | `feature/campaigns-multichannel-orchestration` | S03, S04 | S01, S06, and S07 accepted | commit + PR logged |
| Wave 2 | S08 | `08-operations-security-and-observability.md` | `feature/operations-security-and-observability` | S09 (late wave) | S03, S04, and S05 in stage smoke | commit + PR logged |
| Wave 2 | S09 | `09-launch-readiness-and-go-live.md` | `feature/launch-readiness-and-go-live` | S08 (late wave) | S03, S04, S05, and S08 stage-stable | commit + PR logged |

Wave execution policy:

1. Wave 0 starts immediately and is the foundation wave.
2. Wave 1 starts only after required Wave 0 dependencies are accepted for each row.
3. Wave 2 starts only after feature modules from Wave 1 are stage-validated.
4. A wave is considered complete only when all rows in that wave show commit proof in section 10.3.

### 10.3 Subspec Commit Proof Ledger (Fill During Implementation)

| Subspec ID | Designated Branch | Required Commit SHA | PR Link | Status |
|---|---|---|---|---|
| S01 | `feature/platform-architecture-and-self-hosting` | pending | pending | open |
| S02 | `feature/auth-and-onboarding-migration` | pending | pending | open |
| S03 | `feature/crm-integrations-platform` | pending | pending | open |
| S04 | `feature/agent-lifecycle-and-elevenlabs` | pending | pending | open |
| S05 | `feature/campaigns-multichannel-orchestration` | pending | pending | open |
| S06 | `feature/data-model-and-migration-plan` | pending | pending | open |
| S07 | `feature/api-contracts-and-route-map` | pending | pending | open |
| S08 | `feature/operations-security-and-observability` | pending | pending | open |
| S09 | `feature/launch-readiness-and-go-live` | pending | pending | open |
| S10 | `feature/implementation-roadmap` | `26ca842` | pending (push branch, open PR) | commit logged (local) |
| S11 | `feature/omnidial-reuse-migration-map` | pending | pending | open |
