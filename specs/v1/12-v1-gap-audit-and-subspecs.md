# V1 Gap Audit And Sub-Spec Backlog

Status: Draft
Date: February 16, 2026
Owner: Product + Engineering
Source Inputs: Founder walkthrough (invite-only onboarding, programmatic agent provisioning, Twilio + ElevenLabs + calendar + learning loop)

## 1. Priority Statement

P0 focus for next implementation sprint:

1. Onboarding orchestration and lifecycle gating.
2. Programmatic industry prompt composition and governance.
3. Programmatic agent provisioning hardening with ElevenLabs.
4. Automated website crawl to knowledge base ingest.

## 2. 28-Item Implementation Matrix

Status legend:

1. `Complete`: implemented and usable for v1 target behavior.
2. `Started`: partial implementation exists, but not v1-complete.
3. `Not started`: no meaningful implementation found.

| Req ID | Capability | Status | Evidence | Gap Summary |
|---|---|---|---|---|
| R1 | Invite-only signup enforcement | Started | `backend/src/lib/better-auth.ts`, `frontend/app/(auth)/signup/page.tsx` | Invite flow exists but public signup is still enabled. |
| R2 | Payment-link-before-invite sales workflow | Not started | No backend workflow found | Manual process only, no productized state machine. |
| R3 | Invitation acceptance to workspace access | Started | `frontend/app/(auth)/accept-invitation/[id]/page.tsx` | Accept flow exists but lacks hardening and end-to-end lifecycle checks. |
| R4 | Onboarding baseline capture (name/domain/industry/services/questions) | Complete | `frontend/app/onboarding/page.tsx`, `backend/src/api/controllers/organization.controller.ts` | Baseline fields are collected and persisted. |
| R5 | Async onboarding provisioning orchestrator | Not started | `backend/src/api/controllers/organization.controller.ts` | Onboarding is synchronous and blocks on immediate agent create. |
| R6 | Lifecycle progression from provisioning pending to active | Started | `backend/src/lib/lifecycle-gates.core.ts`, `frontend/lib/lifecycle-gates.ts` | Gate model exists but provisioning completion transitions are missing. |
| R7 | Industry prompt library coverage (HVAC, plumbing, roofing, fire safety, etc.) | Started | `backend/src/utils/agent-templates.ts` | Only a subset of industries exists. |
| R8 | Service-level prompt fragment composition | Started | `backend/src/utils/agent-templates.ts`, `frontend/app/onboarding/page.tsx` | Basic interpolation exists, not full modular prompt assembly. |
| R9 | Admin-only control of system prompts | Started | `shared/types/src/requests/agent.ts`, `frontend/app/dashboard/agents/[id]/page.tsx` | Owner/admin boundaries are inconsistent in UI/API usage. |
| R10 | Programmatic ElevenLabs agent creation/update | Started | `backend/src/services/agent.service.ts` | Core API integration exists but provisioning reliability is incomplete. |
| R11 | Queue worker execution for agent retry jobs | Started | `backend/src/services/agent.service.ts`, `backend/src/queues/workers.ts` | Retry jobs are enqueued but worker handler path is mismatched. |
| R12 | Firecrawl crawl of customer domain URLs | Not started | No Firecrawl integration found | No domain crawl pipeline. |
| R13 | Auto ingest crawled URLs/docs into ElevenLabs knowledge base | Started | `backend/src/clients/elevenlabs.client.ts`, `frontend/components/agent/tabs/KnowledgeBaseTab.tsx` | Manual KB editing exists, auto-ingest pipeline missing. |
| R14 | Curated voice catalog for customer-support use | Not started | `frontend/components/agent/VoiceSelector.tsx` | UI lists all provider voices instead of curated presets. |
| R15 | Preconfigured voice quality profiles (stability/speed/similarity) | Started | `backend/src/services/agent.service.ts`, advanced settings UI | Controls exist but no curated profile packs per voice. |
| R16 | Tool-calling and webhook plumbing for agent behaviors | Started | `frontend/components/agent/tabs/ToolsTab.tsx`, `backend/src/api/routes/webhook.ts` | Basic tooling exists, not standardized by tenant capability contract. |
| R17 | Booking tool routing to dispatcher/team calendars | Started | `backend/src/lib/mcp.ts`, `backend/src/clients/calcom.client.ts` | Booking exists via Cal.com, not role-based dispatcher routing. |
| R18 | Google Calendar integration | Not started | No Google Calendar provider routes/services found | Required provider missing. |
| R19 | Team-member calendar readiness notifications | Not started | `frontend/app/dashboard/settings/page.tsx` | Team invites exist, calendar readiness notifications do not. |
| R20 | Twilio ISV subaccount provisioning per workspace | Not started | `backend/src/config/index.ts`, no implementing service | Config exists only; automation not implemented. |
| R21 | Auto Twilio number purchase after onboarding | Not started | `backend/src/clients/twilio.client.ts` | No number purchase/assignment flow exists. |
| R22 | Twilio number assignment bound to agent configuration | Started | `backend/src/services/agent.service.ts`, `backend/src/api/routes/call-center.ts` | Agents still default to placeholder numbers. |
| R23 | Demo/free-trial lifecycle automation | Started | `backend/src/services/admin-demo.core.ts`, `backend/src/services/admin-demo.service.ts` | Admin demo policy exists but runtime provisioning automation is partial. |
| R24 | Demo usage cap (for example 100 calls) enforcement | Not started | `backend/src/services/admin-demo.core.ts` | Usage limits are metadata only, not enforced in call path. |
| R25 | Billing required for full access (credit card on file) | Started | `backend/src/services/billing.service.ts`, `frontend/app/dashboard/billing/page.tsx` | Checkout gating exists; onboarding completion/payment sequencing is not strict. |
| R26 | Provisioning API + live provisioning status page | Started | `frontend/app/dashboard/provisioning/page.tsx`, lifecycle gate allowlist | UI placeholder exists, backend provisioning endpoints absent. |
| R27 | Failed-call to test generation with dedupe | Not started | `backend/src/services/agent-webhook.service.ts` | Call quality tagging exists, no auto test generation pipeline. |
| R28 | Admin approval queue for learning/test updates | Not started | No review queue model found | No PR-style approval flow for learning changes. |

## 3. Sub-Spec Backlog For All Non-Complete Items

### SS-01 (R1) Invite-Only Auth Enforcement

- Current state: invitation and accept-invite UX exists, direct signup still enabled.
- Build: disable direct signup in auth config, require valid invite token for account creation, add token expiration and replay checks.
- Done when: non-invited signup attempts fail; invited signup passes; automated tests cover happy path and rejection cases.

### SS-02 (R2) Payment Link To Invite Workflow

- Current state: sales workflow is manual and not represented in application state.
- Build: add pre-invite commercial state machine (`invoice_sent`, `payment_pending`, `payment_verified`, `invite_sent`) with admin actions and audit log.
- Done when: invite issuance is blocked until payment verification state is true unless explicit demo bypass is approved.

### SS-03 (R3) Invitation Acceptance Hardening

- Current state: invitation acceptance endpoint exists.
- Build: enforce invitation ownership checks, single-use acceptance semantics, acceptance telemetry, and explicit lifecycle transition on accept.
- Done when: duplicate accept attempts are rejected and lifecycle transitions are deterministic.

### SS-04 (R5) Onboarding Provisioning Orchestrator

- Current state: onboarding performs immediate synchronous provisioning calls.
- Build: introduce orchestrator job with stages (`collect_inputs`, `compose_prompt`, `create_agent`, `provision_number`, `attach_tools`, `complete`) and retry policies.
- Done when: onboarding request returns quickly with job id and provisioning progresses asynchronously with resumable retries.

### SS-05 (R6) Lifecycle Transition Engine

- Current state: lifecycle statuses are modeled but not fully advanced by provisioning events.
- Build: central transition service with idempotent updates for `provisioningStatus` and `lifecycleStatus`.
- Done when: organizations transition from `payment_required` to `provisioning_pending` to `workspace_active` based on actual provisioning completion.

### SS-06 (R7) Industry Prompt Registry Expansion

- Current state: industry template set is limited.
- Build: add versioned prompt registry for target industries (including plumbing and fire safety) with metadata and release tagging.
- Done when: every v1 industry in GTM scope has approved prompt templates and can be selected in onboarding.

### SS-07 (R8) Service Fragment Prompt Composer

- Current state: service questions are appended in a basic way.
- Build: create modular prompt fragment system with reusable service blocks, safety blocks, and escalation blocks.
- Done when: prompt output is deterministically assembled from selected services with test coverage for composition rules.

### SS-08 (R9) Admin-Only Prompt Governance

- Current state: owner/admin capability boundaries are inconsistent.
- Build: enforce prompt-edit permissions at API and UI layers, add prompt change audit trail and rollback support.
- Done when: only admin role can edit system prompts; owners can only configure allowed surface settings.

### SS-09 (R10) ElevenLabs Provisioning Contract Hardening

- Current state: create/update/delete integration exists.
- Build: formalize provider contract, idempotency keys, correlation ids, fallback behaviors, and explicit provisioning error taxonomy.
- Done when: repeated create/update requests are safe, traceable, and consistent across retries.

### SS-10 (R11) Queue Worker Handlers For Retry Jobs

- Current state: retry jobs are enqueued but worker path does not execute intended retry handlers.
- Build: route `agent-provision-retry`, `agent-update-retry`, and webhook retry job names to dedicated processors.
- Done when: failed provider calls are replayed by worker and reflected in agent sync status.

### SS-11 (R12) Firecrawl Domain Crawl Pipeline

- Current state: no crawl pipeline.
- Build: add crawl job that discovers and deduplicates site URLs with allow/deny controls and crawl budget.
- Done when: onboarding can trigger crawl and persist crawl result manifest per workspace.

### SS-12 (R13) Auto Knowledge-Base Ingest

- Current state: manual knowledge base editing exists.
- Build: convert crawl manifest into ElevenLabs knowledge base ingest jobs with progress tracking and retries.
- Done when: website content is automatically attached to agent knowledge base after onboarding.

### SS-13 (R14) Curated Voice Catalog

- Current state: UI surfaces full upstream voice list.
- Build: create managed voice catalog table with curated labels, tags, and enabled flags per environment.
- Done when: onboarding/agent UI shows curated voices only, with controlled rollouts.

### SS-14 (R15) Voice Preset Profiles

- Current state: raw voice tuning fields exist.
- Build: define preset profiles (for example `friendly_support`, `dispatch_fast`, `after_hours_calm`) mapped to voice parameter bundles.
- Done when: selecting a preset applies consistent tested settings for stability/speed/similarity.

### SS-15 (R16) Tool And Webhook Capability Contract

- Current state: tool config can be edited but capabilities are not productized per tenant mode.
- Build: define capability matrix by plan/lifecycle, validate tool payload schema, and sign outbound webhook requests.
- Done when: tool availability is deterministic and webhook integration passes contract tests.

### SS-16 (R17) Dispatcher Booking Routing

- Current state: booking exists through Cal.com but not role-aware dispatch routing.
- Build: add dispatch roster model and routing strategy (`round_robin`, `least_loaded`, `service_area`) for booking targets.
- Done when: booked calls are assigned to the correct dispatcher/team calendar path.

### SS-17 (R18) Google Calendar Integration

- Current state: no Google Calendar integration provider.
- Build: implement OAuth connect flow, token storage/refresh, calendar read/write operations, and organization/team mapping.
- Done when: team members can connect Google Calendar and agent booking writes events into mapped calendars.

### SS-18 (R19) Team Calendar Readiness Notifications

- Current state: workspace member invites exist but no calendar readiness checks.
- Build: add readiness checks and notifications for pending team joins and disconnected calendars.
- Done when: owner sees actionable readiness state before enabling full booking automation.

### SS-19 (R20) Twilio ISV Subaccount Provisioning

- Current state: ISV config keys exist without implementation.
- Build: create Twilio ISV provisioning service to create subaccount, API key, TwiML app, and persisted credentials per workspace.
- Done when: each workspace gets isolated Twilio resources with secure credential storage.

### SS-20 (R21) Auto Number Purchase And Assignment

- Current state: no automated number procurement.
- Build: purchase number during provisioning with fallback area code logic and compliance checks.
- Done when: onboarding/provisioning assigns a real number automatically or fails with recoverable error state.

### SS-21 (R22) Agent-Telephony Binding

- Current state: agent rows still default to placeholder phone numbers.
- Build: bind purchased number to agent record, configure inbound voice URL/TwiML app, and verify routing health.
- Done when: every active agent has a verified bound production number.

### SS-22 (R23) Demo Lifecycle Automation

- Current state: admin demo policy and metadata support are present.
- Build: integrate demo policy lifecycle with provisioning pipeline and feature flags by state.
- Done when: demo creation, approval, expiry, and conversion automatically control workspace capabilities.

### SS-23 (R24) Demo Usage Cap Enforcement

- Current state: usage caps are stored as metadata only.
- Build: enforce call caps in runtime call path with metering counters and graceful over-limit behavior.
- Done when: demo agents stop accepting calls beyond configured cap and produce clear UI/API feedback.

### SS-24 (R25) Strict Billing-Onboarding Gate

- Current state: billing is enforced for dashboard access but sequencing is not fully strict to onboarding completion.
- Build: block `workspace_active` transition until payment method and subscription state are verified (unless demo approved).
- Done when: unpaid paid-plan orgs cannot complete activation regardless of partially completed provisioning.

### SS-25 (R26) Provisioning API And Status UX

- Current state: provisioning page is placeholder and backend provisioning routes are missing.
- Build: implement provisioning endpoints (`GET status`, `GET steps`, `POST retry`) and dynamic frontend status timeline.
- Done when: lifecycle-gated users can track real provisioning state and retry recoverable failures.

### SS-26 (R27) Failed-Call Test Generation And Dedupe

- Current state: call quality classification exists only.
- Build: generate candidate regression tests from bad outcomes, dedupe against existing tests, and map each test to prompt/tool delta.
- Done when: each eligible failure produces a unique actionable test proposal tied to an agent version.

### SS-27 (R28) Admin Approval Queue For Learning Updates

- Current state: no human-in-the-loop approval queue for model behavior updates.
- Build: implement review queue similar to pull request flow with approve/reject/comment and deploy gates.
- Done when: no self-learning change is applied without explicit admin approval and audit history.

## 4. Recommended Execution Order

1. Wave P0-A: SS-01, SS-04, SS-05, SS-24, SS-25.
2. Wave P0-B: SS-06, SS-07, SS-08, SS-09, SS-10, SS-11, SS-12.
3. Wave P1: SS-13, SS-14, SS-15, SS-16, SS-17, SS-18.
4. Wave P1: SS-19, SS-20, SS-21, SS-22, SS-23.
5. Wave P2: SS-26, SS-27.

## 5. Immediate Build Checklist For Your Requested Priority

1. Lock invite-only auth and lifecycle gates first (SS-01 + SS-04 + SS-05).
2. Expand and version the industry prompt registry (SS-06 + SS-07 + SS-08).
3. Harden ElevenLabs provisioning contract and worker retries (SS-09 + SS-10).
4. Implement Firecrawl to auto knowledge-base ingest (SS-11 + SS-12).

