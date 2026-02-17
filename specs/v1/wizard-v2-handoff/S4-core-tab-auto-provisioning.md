# S4: Core-Tab Auto-Provisioning

Status: Implementation-ready v1
Date: February 16, 2026
Owner: Voice AI Platform + Integrations
Parent: `specs/v1/wizard-v2-handoff/00-execution-roadmap.md`
Git Delivery Branch: `feature/wizard-v2-core-tab-autoprov`

## 1. Purpose

Automatically provision full ElevenLabs tab depth from profile/template sources while keeping wizard inputs minimal.

## 2. Current Gap

Current create flow sets baseline prompt/greeting/voice and does not deterministically apply workflow, branches, analysis, tools, security, advanced, and test profiles (`backend/src/services/agent.service.ts`, `backend/src/clients/elevenlabs.client.ts`).

## 3. Scope

In scope:

1. Apply profile-driven defaults for all required tabs:
- Agent
- LLM
- Agent voice
- Workflow
- Branches
- Knowledge Base
- Analysis
- Tools
- Tests
- Security
- Advanced
2. Convert knowledge sources into ingestion jobs.
3. Attach webhook and MCP defaults.
4. Persist per-step provisioning evidence.

Out of scope:

1. Status page and health scoring APIs (S5/S6).

## 4. Template Sources

Provision from existing artifacts:

1. `specs/v1/agent-factory/core-tabs/default-core-tabs-profile.v1.yaml`
2. `specs/v1/agent-factory/workflows/common-customer-request-workflow.v1.yaml`
3. Industry pack refs under `specs/v1/agent-factory/industry/`

## 5. Provisioning Detail By Domain

### 5.1 Workflow + Branches

1. Create canonical intent nodes.
2. Apply low-confidence fallback behavior.
3. Validate all required intent routes are present.

### 5.2 Knowledge Base

1. Normalize and dedupe source URLs/docs.
2. Enforce crawl/ingest allow/deny policy.
3. Persist ingest manifest and per-source outcome.

### 5.3 Analysis

1. Apply default data collection schema.
2. Apply default evaluation criteria.
3. Verify schema compatibility with webhook payload processing.

### 5.4 Tools + Security

1. Enable baseline system tools per profile.
2. Attach MCP endpoint + policy.
3. Attach post-call webhook with signing requirements.
4. Apply required security toggles and advanced limits.

### 5.5 Tests

1. Register baseline tests per profile.
2. Enforce activation blocking on test failures.

## 6. Acceptance Criteria

1. Freshly provisioned agent has all required tab settings populated from profile defaults.
2. Knowledge ingest executes from wizard-provided sources with progress tracking.
3. Webhook and MCP defaults are attached and verifiable.
4. Baseline tests are registered before readiness evaluation.

## 7. Test Plan

1. Contract tests for payloads sent to provider per tab domain.
2. Integration tests for KB ingestion pipeline (success/failure paths).
3. Workflow validation tests for required canonical intents.
4. Security/tool policy tests for expected defaults.

## 8. Implementation Artifacts

1. `backend/src/services/agent.service.ts`
2. `backend/src/clients/elevenlabs.client.ts`
3. New auto-provisioning modules under `backend/src/services/`
4. `specs/v1/agent-factory/core-tabs/default-core-tabs-profile.v1.yaml` (if profile updates required)
5. `specs/v1/agent-factory/workflows/common-customer-request-workflow.v1.yaml` (if workflow updates required)
