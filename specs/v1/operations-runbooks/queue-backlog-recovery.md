# Queue Backlog Recovery

## Trigger Conditions
- Queue backlog exceeds critical threshold
- Worker heartbeat missing
- Job latency crosses SLO for sustained window

## Roles
- IC
- Worker On-call

## Diagnostic Steps
1. Check worker heartbeat and queue snapshots via `/api/admin/operations/metrics`.
2. Identify affected queue(s):
- `campaign_voice`
- `campaign_sms`
- `campaign_email`
- `integration_sync`
- `webhook_ingest`
3. Identify failure mode:
- worker crash
- provider timeout
- dependency outage

## Recovery Actions
1. Restart worker process.
2. Increase queue concurrency within safe limits.
3. Prioritize critical queue classes first.
4. Requeue dead-lettered jobs after root cause mitigation.
5. Pause non-critical queue producers if backlog continues to grow.

## Exit Criteria
- Backlog returns under threshold
- Failure rate normalizes
- Dead-letter queue no longer growing
