# Wizard V2 Rollout And Provisioning Incident Response

## Trigger Conditions

- Spike in wizard provisioning jobs stuck in `running` or `retrying`.
- Increase in blocked or degraded readiness rates.
- Repeated retries on the same provisioning step.
- Rollout pause/rollback initiated for canary cohort safety.

## Roles

- IC
- Platform On-call
- Product On-call

## Detection Sources

1. `GET /api/admin/operations/metrics`
2. Provisioning status API:

- `GET /api/provisioning/:jobId`
- `GET /api/provisioning/:jobId/steps`
- `GET /api/provisioning/agent/:agentId/latest`

3. Dashboard provisioning page timeline and failure panel.

## Immediate Triage

1. Confirm scope:

- number of stuck jobs
- blocked activation rate
- repeated degraded retries by step

2. Pull a failing `jobId` and capture:

- `correlationId`
- failed `stepId`
- `lastError.code`

3. Determine if issue is:

- provider outage
- rollout/feature flag pause
- bad profile/template change
- queue dispatch saturation

## Recovery Actions

1. If provider instability:

- keep rollout limited to canary cohorts
- retry only recoverable failures via `POST /api/provisioning/:jobId/retry`

2. If release regression:

- pause rollout for impacted cohort in org metadata (`wizardV2.rollout.paused=true`)
- disable feature flag (`wizardV2.rollout.featureEnabled=false`) if rollback is needed

3. If queue pressure:

- follow `queue-backlog-recovery.md` first, then resume retries.

4. For legacy agents:

- verify metadata backfill exists with `profileVersion=legacy_unknown`
- run baseline health checks before moving cohort forward.

## Exit Criteria

- No P0 stuck-job alerts.
- Blocked activation rate below incident threshold.
- Retry loop for repeated degraded step is resolved.
- Rollout state explicitly reviewed before resuming broad cohort enablement.
