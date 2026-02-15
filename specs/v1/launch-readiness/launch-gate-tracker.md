# Launch Gate Tracker (Revcenter V1)

Status values: `open`, `in_progress`, `blocked`, `excepted`, `complete`
Exception allowed for: P1 only (never P0)
Last reviewed: `YYYY-MM-DD`

## 1. Severity Policy

### 1.1 P0 (Launch Blocker)

1. Cross-tenant unauthorized data access.
2. Auth compromise or replay bypass.
3. Campaign sends ignoring unsubscribe/send-window safeguards.
4. Billing or entitlement logic allowing unpaid unrestricted usage.
5. Irrecoverable production outage risks without tested rollback.

Rule: Any open P0 blocks launch.

### 1.2 P1 (Conditional Blocker)

1. Major reliability or reporting defects with bounded workaround.
2. Integration connector instability affecting more than one provider.
3. Missing observability on critical paths.

Rule: P1 may be excepted only when owner, mitigation, due date, and rollback plan are documented.

## 2. Launch Gate Table

| Gate | Owner | Required Evidence | Status | Evidence Link | Last Updated | Notes |
|---|---|---|---|---|---|---|
| Self-host infra readiness | Platform | Stage/prod topology validated, rollback tested | open | pending | pending | pending |
| Auth + onboarding hardening | Auth team | replay/rate-limit/invite test matrix passing | open | pending | pending | pending |
| Integrations readiness | Integrations team | Jobber/Workiz/ServiceTitan connect + sync smoke | open | pending | pending | pending |
| Agent lifecycle readiness | AI platform | onboarding + manual agent flows passing | open | pending | pending | pending |
| Campaigns readiness | Campaign team | SMS/Voice/Email end-to-end stage runs | open | pending | pending | pending |
| Security and audit | Security | tenant tests + audit event coverage | open | pending | pending | pending |
| Observability and on-call | Ops | dashboards + alert routes + runbooks | open | pending | pending | pending |
| Go-live QA/UAT | QA | signed UAT report with no P0 | open | pending | pending | pending |

Launch gate exit condition:
1. Every gate is `complete` or `excepted`.
2. No gate with P0 risk is `excepted`.

## 3. P1 Exception Register

| Exception ID | Defect Summary | Owner | Mitigation | Due Date | Rollback Plan | Approved By | Status |
|---|---|---|---|---|---|---|---|
| P1-001 | pending | pending | pending | pending | pending | pending | open |

Required fields for each exception:
1. Explicit impacted scope and user impact.
2. Time-bound mitigation deadline.
3. Rollback or containment procedure if impact widens.

## 4. Launch Decision Record

| Decision Date | Decision | Participants | Open P0 Count | Open P1 Count | Notes |
|---|---|---|---|---|---|
| YYYY-MM-DD | pending | pending | pending | pending | pending |
