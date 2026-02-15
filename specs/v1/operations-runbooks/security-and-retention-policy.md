# Security Rotation And Retention Policy (V1)

## Secret Management
- Secrets are injected through environment management (Coolify).
- Secrets must not be committed to git.

## Rotation Schedule
- Auth/webhook/provider keys: every 90 days
- DB/Redis credentials: every 180 days

## Webhook Security
- Signature verification is mandatory.
- Invalid/unsigned webhook requests are rejected.
- Replay prevention stores payload hash and event identity with TTL.

## Retention Baseline
- Outreach message/call metadata: retain 365 days (default)
- Operational logs: retain 90 days minimum
- Audit logs: retain 365 days minimum

## Manual Override Auditing
- Any manual re-enable override must create an admin audit entry with:
- actor user
- target resource
- before/after state
- timestamp and request context
