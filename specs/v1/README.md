# Revcenter V1 Spec Pack

1. `master-v1-spec.md` - master scope, architecture, reuse strategy, and launch objectives.
2. `01-platform-architecture-and-self-hosting.md` - Hetzner + Coolify + Postgres + Redis production contract.
3. `02-auth-and-onboarding-migration.md` - magic-link hardening and onboarding flow sequencing.
4. `03-crm-integrations-platform.md` - integrations framework for Jobber, Workiz, ServiceTitan.
5. `04-agent-lifecycle-and-elevenlabs.md` - onboarding and manual agent lifecycle with ElevenLabs.
6. `05-campaigns-multichannel-orchestration.md` - SMS, Voice, Email campaigns architecture.
7. `06-data-model-and-migration-plan.md` - schema additions, migration batching, rollback strategy.
8. `07-api-contracts-and-route-map.md` - route-level contract map and authz rules.
9. `08-operations-security-and-observability.md` - security, monitoring, alerting, and runbooks.
10. `09-launch-readiness-and-go-live.md` - launch gates, UAT matrix, production cutover checklist.
11. `10-implementation-roadmap.md` - phased execution timeline and dependencies.
12. `11-omnidial-reuse-migration-map.md` - file-level copy/adapt migration map.
13. `launch-readiness/*` - executable gate tracker, UAT matrix, go-live runbook, rollback playbook, and first-week tracker.

Execution note:
1. The active wave/parallel branch source of truth is `specs/v1/10-implementation-roadmap.md` section 10.
2. Every subspec listed above must have commit proof (branch + commit SHA + PR link) in the section 10.3 ledger before completion.
