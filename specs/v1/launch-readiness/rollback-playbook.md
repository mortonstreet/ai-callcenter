# Rollback Playbook (Revcenter V1)

Scope: launch-day and post-launch rollback events
Owner: Operations on-call
Escalation owner: Platform on-call

## 1. Rollback Triggers

Trigger rollback when any condition is true:

1. P0 defect observed.
2. Sustained API error rate above critical threshold.
3. Queue backlog indicates campaign safety risk.
4. Unrecoverable auth regression affecting sign-in.
5. Provisioning failures cannot be recovered through DLQ replay controls.

## 2. Initial Response (0-5 Minutes)

1. Open incident bridge and assign incident commander.
2. Declare severity (`P0` or `P1`) and impacted scope.
3. Pause campaign workers if campaign safety is at risk.
4. Capture current release tag, active migration version, and first error timestamp.
5. Capture failing `organizationId` + `correlationId` from transition audit feed.

## 3. Rollback Procedure

| Order | Owner | Action | Status (`pending|done|blocked`) | Timestamp | Notes |
|---|---|---|---|---|---|
| 1 | Ops | freeze risky writes if required | pending | pending | pending |
| 2 | Platform | roll back frontend image to last stable tag | pending | pending | pending |
| 3 | Platform | roll back API image to last stable tag | pending | pending | pending |
| 4 | Platform | roll back worker image to last stable tag | pending | pending | pending |
| 5 | Backend | validate schema compatibility window | pending | pending | pending |
| 6 | Ops | inspect provisioning DLQ and attempt controlled replay before hard rollback | pending | pending | pending |
| 7 | QA + Ops | run health + auth + queue smoke checks | pending | pending | pending |
| 8 | Ops | communicate mitigation ETA and next update time | pending | pending | pending |

Schema rollback rule:
1. Roll back schema only when a tested backward-compatible path exists.

## 4. Recovery Validation

Required checks before closing incident:

1. `GET /api/health` is stable.
2. Worker heartbeat and queue consumption are healthy.
3. Auth sign-in and invitation flows recover.
4. Campaign safety controls (unsubscribe/send-window) enforce as expected.
5. Key integrations can connect and sync.
6. Lifecycle/billing/provisioning transitions remain queryable by `organizationId` + `correlationId`.

## 5. Incident Communication Template

| Field | Value |
|---|---|
| Incident ID | pending |
| Severity | pending |
| Start Time (UTC) | pending |
| Impact Summary | pending |
| Customer Impact | pending |
| Mitigation In Progress | pending |
| Next Update ETA | pending |
| Owner | pending |

## 7. Paid vs Demo Recovery Paths

Paid lifecycle rollback checks:

1. Confirm paid tenants blocked at `payment_required` if entitlement state is uncertain.
2. Replay failed provisioning jobs for paid tenants before reopening traffic.
3. Confirm paid tenants only move forward after successful provisioning transition emission.

Demo lifecycle rollback checks:

1. Confirm demo tenants preserve approval/expiry guardrails after rollback.
2. Replay provisioning failures for demo tenants with the same DLQ workflow.
3. Confirm demo tenants do not bypass provisioning completion checks.

## 6. Post-Incident Actions

1. Record timeline, root cause, and rollback decision points.
2. Capture gaps in alerts, dashboards, and runbooks.
3. Create corrective tasks with owners and due dates.
4. Update launch artifacts before next release window.
