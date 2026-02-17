# V1 ElevenLabs V3 Prompt, Workflow, And Tab Governance

Status: Draft
Date: February 16, 2026
Owner: Product + Voice AI Platform + Agent Ops
Scope: Hard governance for ElevenLabs v3 agent configuration across all core tabs with minimal owner control.

## 1. Goal

Define and enforce a single admin-governed configuration system for ElevenLabs v3 agents that:

1. Produces hyper-specific, industry-aware system prompts from a repeatable template.
2. Encodes common customer request types into explicit workflow and branch routing.
3. Configures all core agent tabs with pre-defined platform defaults.
4. Restricts owner controls to minimal safe personalization (`greeting`, `voice`) only.

## 2. Core Tab Governance Contract

Core ElevenLabs tabs in scope:

1. Agent
2. Workflow
3. Branches
4. Knowledge Base
5. Analysis
6. Tools
7. Tests
8. Widget
9. Security
10. Advanced

Role policy:

1. `admin` can configure all tab settings.
2. `owner` can edit only:
   1. Greeting / first message
   2. Voice selection (from curated catalog) and bounded voice params
3. Any other owner-side changes are blocked at both UI and API layers.

## 3. Prompt Engineering System (V3)

Input:

1. ElevenLabs v3 master prompt supplied by Revcenter.
2. Industry pack (`specs/v1/agent-factory/industry/*.md`).
3. Service selection from onboarding.
4. Policy fragments (safety, compliance, escalation, out-of-scope).

Compilation flow:

1. Start from v3 base prompt.
2. Inject organization identity and service area context.
3. Inject industry persona + compliance fragment.
4. Inject service-specific discovery and booking fragments for selected services.
5. Inject workflow intent map and escalation boundaries.
6. Inject tools policy (allowed/disallowed tool usage).
7. Inject required data collection and evaluation criteria.
8. Inject strict negative constraints (no unsafe advice, no unsupported guarantees).

Output constraints:

1. Prompt must be deterministic and versioned.
2. Prompt sections are traceable to source fragments.
3. Prompt is admin-managed and not owner-editable.

Template source:

1. `specs/v1/agent-factory/templates/elevenlabs-v3-system-prompt.template.md`

## 4. Workflow And Branch Architecture

Each industry must map common customer requests into explicit branches.

Required canonical intents:

1. Safety/life-safety emergency
2. Urgent service outage or incident
3. Routine booking request
4. Pricing/plan or estimate request
5. Reschedule/cancel
6. Warranty/dispute/manager escalation
7. Human handoff request
8. Out-of-scope request

Required workflow properties:

1. Primary node per intent.
2. Fallback node when confidence/tooling is insufficient.
3. Escalation-required flag per intent.
4. Expected data capture fields per path.
5. Tool invocation policy per node.

Template source:

1. `specs/v1/agent-factory/templates/elevenlabs-workflow.template.yaml`

## 5. Core Tab Pre-Defined Settings Profile

All tabs must be configured from a dev-team profile with explicit lock-state:

1. `Agent`: prompt, model, temperature, token budget, greeting, voice.
2. `Workflow`: root intent routes and fallback behavior.
3. `Branches`: branch graph and transition conditions.
4. `Knowledge Base`: crawl policy, source policy, ingest strategy.
5. `Analysis`: data collection schema + evaluation criteria thresholds.
6. `Tools`: system tools, MCP tools, and webhook tool policy.
7. `Tests`: baseline suite, schedule, blocking criteria.
8. `Widget`: channel mode, deployment domain restrictions, branding policy.
9. `Security`: auth, allowed origins, webhook signatures, secrets policy.
10. `Advanced`: call limits, timeout policy, privacy retention, post-call events.

Template source:

1. `specs/v1/agent-factory/templates/core-agent-tabs-config.template.yaml`

## 6. Minimal Owner Controls

Owner-editable fields:

1. `conversation_config.agent.first_message`
2. `conversation_config.tts.voice_id`
3. `conversation_config.tts.stability` (bounded range)
4. `conversation_config.tts.similarity_boost` (bounded range)
5. `conversation_config.tts.speed` (bounded range)

Owner-blocked fields:

1. System prompt and all prompt fragments
2. Workflow and branch graph
3. Knowledge base policy and ingestion settings
4. Tool inventory, MCP settings, and webhook policy
5. Evaluation criteria and data collection schema
6. Security, widget, and advanced platform settings

Enforcement requirements:

1. Frontend role-based tab access and field visibility.
2. API role-based schemas and route authorization.
3. Audit log entries for admin-side configuration updates.

## 7. Delivery Artifacts

1. Prompt template: `specs/v1/agent-factory/templates/elevenlabs-v3-system-prompt.template.md`
2. Workflow template: `specs/v1/agent-factory/templates/elevenlabs-workflow.template.yaml`
3. Tab config template: `specs/v1/agent-factory/templates/core-agent-tabs-config.template.yaml`
4. Default workflow profile: `specs/v1/agent-factory/workflows/common-customer-request-workflow.v1.yaml`
5. Default core-tab profile: `specs/v1/agent-factory/core-tabs/default-core-tabs-profile.v1.yaml`
6. Industry workflow instances generated from template under `specs/v1/agent-factory/industry/`

## 8. Acceptance Criteria

1. Every active industry pack includes a prompt pack and workflow map mapped to common request types.
2. Every agent can be provisioned with a full core-tab config profile from templates.
3. Owner attempts to modify non-allowed fields are blocked.
4. Agent behavior is testable by baseline and regression suites tied to workflows.
5. Prompt/workflow changes follow admin approval and rollback process.
