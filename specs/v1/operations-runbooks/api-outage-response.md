# API Outage Response

## Trigger Conditions
- `/api/health` fails for more than 2 minutes
- API 5xx error rate exceeds P0 threshold
- Authentication endpoints are unavailable

## Roles
- Incident Commander (IC)
- Comms Lead
- On-call API Engineer

## Immediate Actions (0-5 minutes)
1. IC declares incident and sets severity (`P0` unless proven otherwise).
2. Freeze deploys.
3. Validate outage scope:
- `GET /api/health`
- `GET /api/admin/operations/metrics`
4. Confirm worker health and queue depth from operations metrics endpoint.

## Containment (5-15 minutes)
1. If latest deploy is suspected, rollback to previous release.
2. If DB or Redis dependency is failing, follow dependency runbooks.
3. Route traffic to healthy instance group if available.

## Recovery
1. Verify auth, admin, and core API routes return expected status.
2. Verify queue drain resumes.
3. Keep incident open for at least 15 minutes of stable metrics.

## Exit Criteria
- Health check stable for 15+ minutes
- Error rate returned below alert threshold
- No queue backlog growth

## Post-Incident
- Publish timeline and root cause within 24 hours.
- Add follow-up tasks with owner and due date.
