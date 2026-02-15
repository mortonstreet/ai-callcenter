# Revcenter Master V1 Production Spec

Status: Draft v1
Owner: Revcenter product + platform
Last Updated: February 14, 2026
Target Launch Window: 2026 Q2 (first paid customers)

## 1. Objective

Ship Revcenter as a production-grade AI agent platform for home services businesses with a self-hosted backbone (Hetzner + Coolify), hardened auth and onboarding, CRM integrations (Jobber, Workiz, ServiceTitan), scalable agent lifecycle management, and multichannel outbound campaigns (SMS, Voice, Email).

This v1 is explicitly optimized for:

1. Fast path to paid customer onboarding.
2. Reuse of proven Omnidial logic to reduce implementation risk.
3. Operational control and cost predictability on self-hosted infrastructure.

## 2. Business Outcomes Required For V1 GA

1. A new customer can sign up with secure magic link auth, complete onboarding, and activate at least one production-ready agent in under 20 minutes.
2. Organization owners can connect at least one CRM integration using client credentials/OAuth and validate sync health from an integrations dashboard.
3. Users can create and run campaigns across SMS, Voice, and Email channels with auditable delivery outcomes.
4. Platform supports paid operations with tenant-safe data boundaries, observability, incident runbooks, and rollback paths.

## 3. Scope

### 3.1 In Scope

1. Self-host deployment stack on Hetzner + Coolify for backend API, worker, Postgres, Redis.
2. Auth migration to hardened magic-link flow + invitation-safe onboarding.
3. Revcenter onboarding continuation after auth for organization/agent setup.
4. Integrations framework and v1 connectors: Jobber, Workiz, ServiceTitan.
5. Agent lifecycle:
- ElevenLabs agent provisioning flow.
- Manual agent creation/edit flow parity from existing Revcenter agents tab.
- Agent config, voice selection, prompt templates, and health checks.
6. Campaigns tab for outbound automation:
- Voice campaigns.
- SMS sequenced campaigns.
- Email outreach campaigns.
7. Production controls:
- Role/tenant authorization.
- Rate limits and abuse protection.
- Metrics, logs, error tracking, alerting.
- Launch checklists and cutover/rollback runbooks.

### 3.2 Out Of Scope (V1)

1. Full replacement of every Omnidial dialer-specific feature not needed by home services workflows.
2. Multi-region active-active infrastructure.
3. Advanced enterprise features (SSO/SCIM, custom contract billing, white-label portals).

## 4. Revcenter Current Baseline (As Of February 14, 2026)

1. Monorepo exists with `frontend/`, `backend/`, `shared/db/`, `shared/types/`.
2. Better Auth is present, but frontend auth UX is still primarily email/password + Google.
3. Revcenter onboarding exists at `frontend/app/onboarding/page.tsx` and creates org + initial ElevenLabs agent.
4. Agent creation and configuration flows already exist under `frontend/app/dashboard/agents/*` and `backend/src/services/agent.service.ts`.
5. Campaigns and CRM integrations are not yet present in Revcenter route/schema surfaces.
6. Queue infrastructure exists but only example worker is implemented.

## 5. Omnidial Reuse Strategy

Revcenter v1 should reuse Omnidial modules as a controlled migration, not a blind copy.

| Capability | Omnidial Source | Revcenter Target | Reuse Mode |
|---|---|---|---|
| Magic-link auth and hardening | `backend/src/lib/better-auth.ts`, `backend/src/api/routes/auth.ts`, `backend/src/api/middlewares/authHardening.ts` | `backend/src/lib/better-auth.ts`, `backend/src/api/routes/auth.ts`, new `backend/src/api/middlewares/authHardening.ts` | Adapt + merge |
| Frontend auth UX and error taxonomy | `frontend/app/(auth)/*`, `frontend/lib/auth-errors.ts`, `frontend/lib/auth-client.ts`, `frontend/hooks/api/useAuth.ts` | Same paths in Revcenter | Adapt + merge |
| Integrations domain | `backend/src/api/routes/integrations.ts`, `backend/src/api/controllers/integration.controller.ts`, `backend/src/services/integration.service.ts`, `frontend/components/settings/IntegrationsSettings.tsx` | New `/integrations` route family + settings UI in Revcenter | Copy + provider swap |
| Integrations schema/types | `shared/db/prisma/schema.prisma` (`Integration`, `EnrichEngineConnection`), `shared/types/src/requests/integration.ts` | Add equivalent Revcenter tables/types for home-services connectors | Adapt |
| Voice campaign backbone | `backend/src/api/routes/campaigns.ts`, `backend/src/services/campaign.service.ts`, `frontend/app/dashboard/campaigns/*` | New Revcenter campaigns module | Copy + simplify |
| SMS sequencer | `backend/src/api/routes/smsCampaigns.ts`, `backend/src/services/smsCampaign.service.ts`, `backend/src/services/smsCampaignExecution.service.ts`, `backend/src/queues/sms-campaign.*` | New Revcenter worker + SMS campaign routes/services | Copy + adapt |
| Email outreach primitives | `backend/src/services/agentEmail.service.ts`, schema `AgentEmailConfig`, `AgentMessage` | New email campaign submodule in Revcenter | Adapt |
| Launch readiness ops templates | `docs/launch-readiness/*`, `specs/launch-readiness/*` | `specs/v1/*` + Revcenter runbooks | Adapt |

## 6. Architecture Decision Summary

1. Revcenter remains monorepo and TypeScript-first.
2. Postgres remains source of truth; Redis handles queues, cache, and rate-limit primitives.
3. API remains Express in v1 to minimize migration risk.
4. Better Auth remains auth substrate with hardened magic-link model.
5. Campaign execution moves to dedicated worker processes in Coolify (separate from API container).
6. Integrations use provider adapter pattern with encrypted credentials and per-org config.

## 7. Delivery Phases

### Phase 0: Spec, architecture, and migration prep

1. Finalize this v1 spec set and implementation backlog.
2. Set up Coolify projects/environments: `dev`, `stage`, `prod`.
3. Build migration batch plan and rollback protocols.

Exit criteria:

1. Sign-off on specs.
2. Infra plan accepted by engineering owner.

### Phase 1: Self-host platform + auth migration

1. Deploy backend/frontend/worker services on Hetzner + Coolify.
2. Implement hardened magic-link and callback safety.
3. Ship auth + invite + onboarding sequence.

Exit criteria:

1. New org can sign up and complete onboarding in stage.
2. Auth abuse/replay tests pass.

### Phase 2: Integrations framework and v1 CRM connectors

1. Add integrations schema, APIs, adapter layer, and settings UI.
2. Implement Jobber, Workiz, ServiceTitan connectors.
3. Add sync status, test connection, disconnect, and logs.

Exit criteria:

1. Each provider can connect and sync a smoke dataset in stage.

### Phase 3: Agent lifecycle hardening

1. Preserve/upgrade existing agent wizard and detail tabs.
2. Add ElevenLabs lifecycle checks and richer provisioning telemetry.
3. Ensure onboarding-created agents and manual-created agents share core pipeline.

Exit criteria:

1. Agent creation success rate > 99% in stage smoke runs.

### Phase 4: Campaigns (SMS/Voice/Email)

1. Introduce campaigns tab and channel-specific execution engines.
2. Add scheduling, enrollment, send-window rules, delivery tracking, and stop/unsubscribe controls.
3. Add operational dashboards and campaign logs.

Exit criteria:

1. End-to-end campaign run across all three channels in stage.

### Phase 5: Launch hardening and paid-customer readiness

1. Run load, security, and UAT matrix.
2. Finalize runbooks (incident, rollback, backup restore).
3. Enable billing gates and production launch checklist.

Exit criteria:

1. No open P0 issues.
2. P1 exceptions documented with owner/date.

## 8. Top Risks And Controls

1. Auth regression during migration.
- Control: dual-path feature flag + deterministic auth error taxonomy + stage soak.
2. Data migration complexity for campaign/integration models.
- Control: additive migrations, backfills, and compatibility windows.
3. Provider API variability (Jobber/Workiz/ServiceTitan).
- Control: adapter interface + per-provider circuit breaker + retry policy.
4. Campaign deliverability/compliance risk.
- Control: send windows, opt-out enforcement, audit trails, and template approval rules.
5. Operational blind spots in self-host cutover.
- Control: SLO dashboards, alert policies, and rollback drills before production.

## 9. KPIs For V1 Success

1. Time-to-first-live-agent: median < 20 minutes.
2. Auth completion rate (signup -> dashboard): > 85%.
3. Integration connection success rate: > 95%.
4. Campaign execution reliability (job success): > 99%.
5. API p95 latency under normal load: < 400 ms for non-bulk endpoints.
6. MTTR for P1 incidents: < 60 minutes.

## 10. Subspec Index

1. `specs/v1/01-platform-architecture-and-self-hosting.md`
2. `specs/v1/02-auth-and-onboarding-migration.md`
3. `specs/v1/03-crm-integrations-platform.md`
4. `specs/v1/04-agent-lifecycle-and-elevenlabs.md`
5. `specs/v1/05-campaigns-multichannel-orchestration.md`
6. `specs/v1/06-data-model-and-migration-plan.md`
7. `specs/v1/07-api-contracts-and-route-map.md`
8. `specs/v1/08-operations-security-and-observability.md`
9. `specs/v1/09-launch-readiness-and-go-live.md`
10. `specs/v1/10-implementation-roadmap.md`
11. `specs/v1/11-omnidial-reuse-migration-map.md`

## 11. Execution Control (Active)

1. The active parallel branch and wave execution logic is defined in `specs/v1/10-implementation-roadmap.md` section 10.
2. No subspec is complete until its designated feature branch has commit proof logged in `specs/v1/10-implementation-roadmap.md` section 10.3.
