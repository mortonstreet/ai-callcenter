# V1 Subspec: Launch Readiness And Go-Live

Status: Implementation-ready v1
Owner: Product + engineering + ops
Parent: `specs/v1/master-v1-spec.md`

Git Delivery Branch: `feature/launch-readiness-and-go-live`
Subspec Completion Gate:
1. Start implementation with `git switch -c feature/launch-readiness-and-go-live` from the current base branch.
2. Keep all code, tests, and docs for this subspec on `feature/launch-readiness-and-go-live`.
3. Create at least one intentional commit that references this subspec scope.
4. Push the branch to GitHub with `git push -u origin feature/launch-readiness-and-go-live`.
5. Do not mark this subspec complete until the implementation commit is present on `feature/launch-readiness-and-go-live` in GitHub.

## 0. Implementation Artifacts (Required)

Use the artifact pack below as the execution source of truth for this subspec:

1. `specs/v1/launch-readiness/README.md`
2. `specs/v1/launch-readiness/launch-gate-tracker.md`
3. `specs/v1/launch-readiness/uat-execution-matrix.md`
4. `specs/v1/launch-readiness/go-live-day-runbook.md`
5. `specs/v1/launch-readiness/rollback-playbook.md`
6. `specs/v1/launch-readiness/post-launch-7-day-tracker.md`

Completion workflow:

1. Fill launch gate evidence and exceptions in `launch-gate-tracker.md`.
2. Run and sign off UAT evidence in `uat-execution-matrix.md`.
3. Execute production cutover from `go-live-day-runbook.md`.
4. If incident occurs, execute `rollback-playbook.md`.
5. Track the first 7 days in `post-launch-7-day-tracker.md`.

## 1. Purpose

Define the launch gating framework for Revcenter v1 to begin serving paid customers safely.

## 2. Severity Policy

### 2.1 P0 (Launch Blocker)

1. Cross-tenant unauthorized data access.
2. Auth compromise or replay bypass.
3. Campaign sends ignoring unsubscribe/send-window safeguards.
4. Billing or entitlement logic allowing unpaid unrestricted usage.
5. Irrecoverable production outage risks without tested rollback.

### 2.2 P1 (Conditional Blocker)

1. Major reliability or reporting defects with bounded workaround.
2. Integration connector instability affecting > 1 provider.
3. Missing observability on critical paths.

P1 exception requires owner, mitigation, deadline, and rollback plan.

## 3. Launch Gates

| Gate | Owner | Required Evidence | Status |
|---|---|---|---|
| Self-host infra readiness | Platform | Stage/prod topology validated, rollback tested | Open |
| Auth + onboarding hardening | Auth team | replay/rate-limit/invite test matrix passing | Open |
| Integrations readiness | Integrations team | Jobber/Workiz/ServiceTitan connect + sync smoke | Open |
| Agent lifecycle readiness | AI platform | onboarding + manual agent flows passing | Open |
| Campaigns readiness | Campaign team | SMS/Voice/Email end-to-end stage runs | Open |
| Security and audit | Security | tenant tests + audit event coverage | Open |
| Observability and on-call | Ops | dashboards + alert routes + runbooks | Open |
| Go-live QA/UAT | QA | signed UAT report with no P0 | Open |

## 4. UAT Matrix

### 4.1 Customer Onboarding Journey

1. Signup via magic link.
2. Invitation accept flow.
3. Organization creation and onboarding wizard.
4. First agent creation and test interaction.

### 4.2 Integrations Journey

1. Connect CRM.
2. Run initial sync.
3. Validate lead mapping and status.
4. Disconnect/reconnect test.

### 4.3 Campaign Journey

1. Create campaign.
2. Enroll leads.
3. Activate campaign.
4. Validate sends/calls.
5. Process reply/unsubscribe.
6. Confirm stats visibility.

### 4.4 Admin/Support Journey

1. Observe error logs.
2. Correlation-based troubleshooting.
3. Resolve/acknowledge workflow.

## 5. Performance Targets

1. API p95 < 400ms on standard endpoints.
2. Campaign scheduler lag < 60 seconds.
3. Integration sync job queue latency < 120 seconds under normal load.
4. Dashboard render p95 < 2.5 seconds on broadband connections.

## 6. Go-Live Runbook (Production Day)

1. Freeze non-essential merges.
2. Confirm latest backup and restore point.
3. Run predeploy checklist in stage, then prod.
4. Deploy DB migrations.
5. Deploy API and worker.
6. Deploy frontend.
7. Run smoke tests:
- auth
- onboarding
- agent create
- integrations status
- campaign activation

8. Monitor first 2 hours with heightened alert posture.

## 7. Rollback Criteria

Trigger rollback when any of the following occurs:

1. P0 defect observed.
2. Sustained API error rate above critical threshold.
3. Queue backlog indicates campaign safety risk.
4. Unrecoverable auth regression affecting sign-in.

Rollback plan:

1. pause campaign workers if needed.
2. roll back app images.
3. maintain schema compatibility window.
4. communicate incident and mitigation ETA.

## 8. Post-Launch 7-Day Objectives

1. Monitor onboarding completion funnel.
2. Track integration connect failure reasons.
3. Monitor campaign delivery/reply metrics.
4. Close urgent P1 issues discovered in production.

## 9. Acceptance Criteria

1. All launch gates complete or formally excepted.
2. No open P0 issues at production cutover.
3. On-call team can execute incident and rollback runbooks.
4. First paid customers onboard successfully with no manual DB intervention.
