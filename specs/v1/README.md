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
14. `parallel-lifecycle-fixes/*` - S0-S8 branch-per-subspec execution pack for invite/auth lifecycle gates, onboarding orchestration, billing, demo provisioning, Twilio/ElevenLabs automation, Google Calendar, and rollout controls.
15. `12-v1-gap-audit-and-subspecs.md` - 28-item implementation audit (complete/started/not-started) and sub-spec backlog aligned to onboarding-first priorities.
16. `13-elevenlabs-agent-factory-system.md` - system design for repeatable programmatic ElevenLabs onboarding and provisioning.
17. `agent-factory/*` - reusable templates for blueprint schema, per-industry pack definitions, and release checklist.
18. `agent-factory/industry/hvac.*` - HVAC pack with compiled prompt, workflow instance, blueprint starter, capability map, and release checklist (`v1.0.0`).
19. `agent-factory/industry/{pest-control,plumbing,electrical}*` - implemented packs with compiled prompts, workflow instances, blueprints, capability maps, and release checklists (`v1.0.0` each).
20. `agent-factory/industry/{roofing,fire-safety,garage-doors,cleaning-services}*` - implemented packs with compiled prompts, workflow instances, blueprints, capability maps, and release checklists (`v1.0.0` each).
21. `14-elevenlabs-v3-prompt-workflow-tab-governance.md` - v3 prompt composition, workflow/branch mapping, and core-tab governance with minimal owner controls.
22. `agent-factory/templates/{elevenlabs-v3-system-prompt,elevenlabs-workflow,core-agent-tabs-config}*` - templates for prompt generation, workflow settings, and full tab profiles.
23. `agent-factory/{workflows,core-tabs}/*` - default common-request workflow and default core-tab configuration profile for provisioning.
24. `agent-factory/parallel-execution-matrix.md` - branch/worktree lane matrix for parallel industry spec and implementation execution.

Execution note:
1. The active wave/parallel branch source of truth is `specs/v1/10-implementation-roadmap.md` section 10.
2. Every subspec listed above must have commit proof (branch + commit SHA + PR link) in the section 10.3 ledger before completion.
