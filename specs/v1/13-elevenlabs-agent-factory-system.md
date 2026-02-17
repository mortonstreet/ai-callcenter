# V1 ElevenLabs Agent Factory System

Status: Draft
Date: February 16, 2026
Owner: Product + Engineering
Scope: Programmatic onboarding and provisioning for industry-specific customer service agents

## 1. Goal

Create a templated, repeatable, admin-governed factory process that can spin up a production-ready ElevenLabs agent quickly while preserving quality and control.

## 2. Factory Output Contract

Every provisioned agent must include:

1. System prompt (admin-managed, industry + services aware).
2. Greeting (owner-editable).
3. Voice profile (owner-selectable from curated catalog).
4. Knowledge base (website URLs and docs ingested from Firecrawl pipeline).
5. Post-call webhook (enabled, signed, and verified).
6. MCP tool connection (booking, lookup, and behavior tools).
7. Data collection schema (resolution, follow-up status, customer sentiment, notes).
8. Evaluation criteria (quality, compliance, booking quality, escalation quality).
9. Branch/workflow graph (intent routing and repetitive request handling).
10. Test suite (baseline + regression; admin-owned updates).
11. Health checks (dev smoke, scheduled daily, and on-demand).

## 3. Permissions Model

`admin`:

1. System prompt templates and fragments.
2. Tool policies and MCP connection settings.
3. Evaluation criteria and test definitions.
4. Learning queue approvals/rejections.
5. Scheduled health checks and rollout controls.

`owner`:

1. Greeting text.
2. Voice selection and approved voice parameters.
3. Business metadata and service toggles.
4. Calendar/integration connections allowed by policy.

## 4. Onboarding Input Contract

Required onboarding inputs:

1. Owner name and contact.
2. Company name and domain.
3. Industry.
4. Service selections.
5. Website URL(s) for knowledge ingestion.
6. Greeting preference.
7. Voice choice from curated options.
8. Team routing details (dispatch/calendar destination).

Optional onboarding inputs:

1. Preferred language(s).
2. Escalation numbers and transfer policy.
3. Service area notes and business rules.
4. Brand tone preferences.

## 5. Provisioning Pipeline (Programmatic)

Provisioning stages:

1. Validate lifecycle gate and entitlement.
2. Build `agent_blueprint_v1` from onboarding + industry pack.
3. Compose system prompt from core + industry + selected service fragments.
4. Create/update ElevenLabs agent (including branch/workflow graph).
5. Configure post-call webhook and validate callback signature path.
6. Configure MCP connection and tool inventory for booking/behaviors.
7. Start Firecrawl domain crawl and persist crawl manifest.
8. Ingest crawl output into knowledge base and attach to agent.
9. Apply data collection and evaluation criteria.
10. Register baseline tests + health checks.
11. Run smoke test bundle.
12. Mark provisioning complete only after required checks pass.

## 6. Agent Setup Checklist (Per Agent)

For every newly provisioned agent, all items must pass:

1. System prompt assembled from approved templates only.
2. Greeting present and editable by owner.
3. Voice selected from curated list and validated.
4. Knowledge base contains crawled source URLs or explicit fallback source list.
5. Post-call webhook receives signed test payload successfully.
6. MCP tools execute test calls (booking and core behaviors).
7. Data collection fields are persisted in post-call payload.
8. Evaluation criteria return structured scores.
9. Workflow branches route core intents correctly.
10. Baseline tests pass; failed tests block activation.
11. Health endpoint reports healthy or approved degraded mode with action plan.

## 7. Learning Loop (Admin Approval Queue)

Flow:

1. Score calls and detect low-quality outcomes.
2. Generate candidate regression test(s).
3. De-duplicate against existing tests.
4. Produce suggested patch (prompt fragment, workflow branch, tool policy, or criteria update).
5. Queue for admin review.
6. Admin approves/rejects with notes.
7. Approved updates deploy to draft branch first, then promoted after test pass.

## 8. Scheduled Quality Operations

Required operations:

1. Dev-time: run smoke tests on every provisioning change.
2. Daily: run full test suite per active agent.
3. Daily: run webhook and MCP connection health checks.
4. Daily: surface failed tests and degraded agents in admin queue.

## 9. Industry-By-Industry Build Process

For each industry:

1. Create a new industry pack from template.
2. Define service taxonomy and core intent map.
3. Define required data collection fields.
4. Define evaluation criteria and pass thresholds.
5. Define workflow branch map and fallback routes.
6. Define test scenarios (happy path, edge, failure, escalation).
7. Approve and publish pack version.

Use:

1. `specs/v1/agent-factory/templates/industry-pack.template.md`
2. `specs/v1/agent-factory/templates/agent-blueprint.template.yaml`
3. `specs/v1/agent-factory/templates/agent-release-checklist.md`
4. `specs/v1/agent-factory/industry-index.md`
5. `specs/v1/agent-factory/templates/elevenlabs-v3-system-prompt.template.md`
6. `specs/v1/agent-factory/templates/elevenlabs-workflow.template.yaml`
7. `specs/v1/agent-factory/templates/core-agent-tabs-config.template.yaml`
8. `specs/v1/agent-factory/workflows/common-customer-request-workflow.v1.yaml`
9. `specs/v1/agent-factory/core-tabs/default-core-tabs-profile.v1.yaml`
