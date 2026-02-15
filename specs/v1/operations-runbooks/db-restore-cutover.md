# DB Restore And Cutover Procedure

## Trigger Conditions
- Primary DB unavailable
- Corruption/data-loss event requiring backup restore

## Roles
- IC
- DB Owner
- Application On-call

## Preconditions
- Most recent successful backup verified in last 24 hours
- Restore target environment available

## Procedure
1. Halt writes from API and workers (maintenance mode or scale-to-zero writer pods).
2. Validate backup artifact integrity.
3. Restore backup into standby target.
4. Run data integrity checks:
- user/session counts
- latest integration sync job rows
- latest campaign message rows
5. Update connection endpoints/secrets for cutover target.
6. Bring API and workers online gradually.
7. Monitor:
- DB connection pool utilization
- slow query spikes
- API error rate

## Rollback
- If integrity checks fail, abort cutover and keep services in maintenance mode.
- Restore previous DB endpoint configuration.

## Exit Criteria
- Read/write smoke tests pass
- Queue consumers process normally
- No elevated DB errors for 30 minutes
