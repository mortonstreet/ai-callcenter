# V1 Subspec: Operations, Security, And Observability

Status: Draft v1
Owner: Platform + security
Parent: `specs/v1/master-v1-spec.md`

Git Delivery Branch: `feature/operations-security-and-observability`
Subspec Completion Gate:
1. Start implementation with `git switch -c feature/operations-security-and-observability` from the current base branch.
2. Keep all code, tests, and docs for this subspec on `feature/operations-security-and-observability`.
3. Create at least one intentional commit that references this subspec scope.
4. Push the branch to GitHub with `git push -u origin feature/operations-security-and-observability`.
5. Do not mark this subspec complete until the implementation commit is present on `feature/operations-security-and-observability` in GitHub.

## 1. Purpose

Define the minimum production controls required for Revcenter v1 to operate safely with paid customers.

## 2. Security Baseline

### 2.1 Tenant Isolation

1. Every org-scoped query must include organization guardrails in repository/service layer.
2. Route-level authorization checks must precede data access.
3. Admin impersonation paths must log audit events.

### 2.2 Secret Management

1. Secrets are never committed to git.
2. All secrets injected via Coolify environment management.
3. Rotation policy:
- auth/webhook/provider keys every 90 days.
- DB/Redis credentials every 180 days.

### 2.3 Auth Hardening

1. Magic-link abuse and replay controls active.
2. Callback URL allowlist enforcement.
3. Correlation IDs on auth failure responses.

### 2.4 Webhook Security

1. Signature verification per provider.
2. Reject unsigned/invalid signatures.
3. Store verified payload hash and event ID for replay prevention.

## 3. Compliance Controls (US Baseline)

1. SMS unsubscribe enforcement with global suppression list.
2. Campaign send-window enforcement by local timezone.
3. Audit trail for manual overrides (for example contact re-enable).
4. Retention policy for outreach message history and call metadata.

## 4. Observability Baseline

### 4.1 Logging

1. Structured logs in API and worker.
2. Required fields:
- timestamp
- level
- service
- route/job type
- organizationId (if applicable)
- correlationId

### 4.2 Error Monitoring

1. Sentry for uncaught exceptions and worker failures.
2. Error taxonomy tags:
- auth
- integration
- campaigns_sms
- campaigns_voice
- campaigns_email
- webhook

### 4.3 Metrics

1. API latency, throughput, and error rates.
2. DB connection pool utilization and slow queries.
3. Redis command errors/timeouts.
4. Queue depth, job latency, and failure rates.
5. Integration sync success/failure counts.
6. Campaign send success/failure counts per channel.

## 5. Alerting Policy

### 5.1 P0 Alerts

1. API health check failure > 2 minutes.
2. DB unreachable.
3. Worker stopped or queue backlog critical threshold.
4. No valid backup in last 24 hours.

### 5.2 P1 Alerts

1. Elevated error rate for any core endpoint family.
2. Repeated integration sync failures.
3. Campaign message failure rate exceeds threshold.
4. Migration failure in stage/prod.

## 6. Operational Runbooks

Required runbooks:

1. API outage response.
2. DB restore/cutover procedure.
3. Queue backlog recovery.
4. Provider outage handling (ElevenLabs, Twilio, CRM APIs).
5. Incident escalation and communication flow.

## 7. Audit And Admin Controls

1. Audit log events required for:
- integration connect/disconnect.
- credential creation/rotation.
- campaign activation/pause.
- admin impersonation start/end.

2. Admin error log UI should support:
- severity filters.
- status workflow (`open|acknowledged|resolved`).
- correlation linkouts.

## 8. Testing Requirements

1. Auth attack-path test suite (replay, callback poisoning, abuse).
2. Multi-tenant access test suite (cross-org denial tests).
3. Queue worker resilience tests.
4. Webhook signature and replay tests.
5. Chaos test scenarios:
- Redis unavailable.
- provider API timeout.
- partial DB failover.

## 9. Acceptance Criteria

1. P0 alerting is validated in stage with drill events.
2. Correlation IDs present in API errors and critical worker logs.
3. Audit log coverage includes all privileged operations listed above.
4. Runbooks are executable by on-call without engineer-specific tribal knowledge.

## 10. Implementation Artifacts

Code hooks and docs delivered for this subspec:

1. API + worker observability metrics:
- `backend/src/services/operations-metrics.service.ts`
- `backend/src/api/middlewares/requestLogger.ts`
- `backend/src/lib/db.ts`
- `backend/src/lib/redis.ts`
- `backend/src/queues/workers.ts`
- `backend/src/api/routes/admin.ts` (`GET /admin/operations/metrics`)

2. Error taxonomy + correlation tagging:
- `backend/src/lib/error-taxonomy.ts`
- `backend/src/api/middlewares/errorHandler.ts`

3. Webhook replay protection (payload hash + event replay keys):
- `backend/src/api/middlewares/auth.ts`

4. Privileged audit coverage:
- `backend/src/api/controllers/admin.controller.ts`
- `backend/src/api/routes/admin.ts` (impersonation start/end audit events)

5. Operational runbooks:
- `specs/v1/operations-runbooks/README.md`
- `specs/v1/operations-runbooks/api-outage-response.md`
- `specs/v1/operations-runbooks/db-restore-cutover.md`
- `specs/v1/operations-runbooks/queue-backlog-recovery.md`
- `specs/v1/operations-runbooks/provider-outage-handling.md`
- `specs/v1/operations-runbooks/incident-escalation-communication.md`
- `specs/v1/operations-runbooks/security-and-retention-policy.md`
