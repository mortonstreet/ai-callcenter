# Provider Outage Handling (ElevenLabs, Twilio, CRM APIs)

## Trigger Conditions
- Elevated provider API timeout/failure rate
- Webhook delivery failures from provider
- Provider status page confirms incident

## Roles
- IC
- Integration Owner

## Standard Response
1. Mark affected provider as degraded in incident channel.
2. Throttle or pause non-critical traffic to provider.
3. Keep idempotent retry behavior enabled for queued jobs.
4. For outbound campaigns, avoid repeated sends while provider is degraded.

## Provider-Specific Actions
- ElevenLabs:
- pause non-critical conversation automation jobs
- monitor webhook signature failures vs transport failures
- Twilio:
- check alert logs and status callback success
- disable high-volume send jobs if failure threshold breached
- CRM APIs:
- stop push sync if repeated 401/429/5xx errors continue

## Exit Criteria
- Provider recovers and success rate is stable
- Deferred jobs replay successfully
- No sustained retry storm
