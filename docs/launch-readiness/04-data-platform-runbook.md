# Data Platform Backup and Restore Runbook

Status: active
Owner: Platform engineering

## 1. Objectives

1. Recovery point objective (RPO): 15 minutes or better.
2. Recovery time objective (RTO): 60 minutes or better.

## 2. Backup policy

1. PITR/WAL backups enabled for PostgreSQL.
2. Daily backups retained for 14 days.
3. Weekly backups retained for 8 weeks.
4. Monthly backups retained for 6 months.
5. Redis persistence enabled with snapshot verification.

## 3. Restore drill cadence

1. Monthly full restore into `stage`.
2. Quarterly point-in-time recovery drill.
3. Drill checklist:
- row counts for core tables (`user`, `organization`, `session`, `agent`, `task`)
- auth/session login validation
- queue consumption validation in worker

## 4. Restore procedure

1. Declare incident and open incident channel.
2. Freeze writes at API level when possible.
3. Select restore target timestamp.
4. Restore Postgres snapshot/PITR target into staging restoration instance.
5. Run validation SQL checks on critical tables.
6. Repoint API and worker to restored instance.
7. Resume write traffic after smoke checks pass.
8. Monitor errors and queue backlog for 30 minutes.

## 5. Ownership matrix

| Function | Primary owner | Backup owner | SLA |
|---|---|---|---|
| Backup policy configuration | Platform engineering | Operations | 1 business day |
| Daily backup verification | Operations | Platform engineering | Same day |
| Restore drill execution | Platform engineering | Backend engineering | Monthly |
| Incident restore command | Operations on-call | Platform on-call | Immediate |
| Post-restore validation | Backend engineering | QA | 60 minutes |

## 6. Audit artifacts

Keep these artifacts for every drill/incident:

1. Backup timestamp and source identifier.
2. Restore start/end timestamps.
3. Validation query outputs.
4. Sign-off from platform and backend owners.
