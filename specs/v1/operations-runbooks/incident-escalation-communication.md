# Incident Escalation And Communication Flow

## Severity Levels
- `P0`: customer-facing outage, DB unreachable, worker stopped with critical backlog
- `P1`: elevated error rates, repeated integration failures, high campaign failure rates

## Escalation Timeline
1. `T+0`: IC declared, incident channel created.
2. `T+5`: first stakeholder update.
3. `T+15`: escalate to leadership for P0.
4. Every 15 minutes: status updates until resolution.

## Communication Template
- Impact
- Scope (orgs/endpoints/providers)
- Mitigation in progress
- Next update time

## Closure
- Announce resolution with UTC timestamp.
- Share immediate follow-up actions.
- Complete postmortem for P0/P1 incidents.
