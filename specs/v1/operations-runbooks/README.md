# Operations Runbooks (V1)

These runbooks satisfy the operational requirements in `specs/v1/08-operations-security-and-observability.md`.

Runbooks:
- `api-outage-response.md`
- `db-restore-cutover.md`
- `queue-backlog-recovery.md`
- `provider-outage-handling.md`
- `incident-escalation-communication.md`
- `security-and-retention-policy.md`

Owner: Platform + Security
Applies to: Stage and Production

## Drill Cadence

- P0 outage drills: monthly
- DB restore verification: monthly
- Queue backlog recovery drill: bi-weekly
- Provider outage simulation: monthly
- Incident comms tabletop: monthly

## Validation Checklist

- Every runbook has a named incident commander role
- Every runbook has explicit rollback criteria
- Every runbook includes command/API checks that can be run by on-call
