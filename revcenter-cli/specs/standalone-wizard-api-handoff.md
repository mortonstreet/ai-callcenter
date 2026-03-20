# RevCenter CLI Standalone Wizard API Handoff Spec

Status: Draft  
Date: March 6, 2026  
Owner: RevCenter CLI / Agent Gen  
Purpose: Define the target standalone architecture for `revcenter-cli` so wizard one-shot agent generation no longer depends on the current `revcenter` monolith, database, or internal service imports.

## 1. Goal

Turn `revcenter-cli` into a standalone product with:

1. Its own repository.
2. Its own Postgres database.
3. Its own Redis queue layer.
4. Its own API server and worker.
5. Its own Codex skill for one-shot ElevenLabs agent generation.
6. A clean API-first flow for demos, testing, and repeatable provisioning.

## 2. Current State

Today `revcenter-cli` is a workspace package inside the main `revcenter` repo and directly reuses backend modules from that repo.

Current limitations:

1. It bootstraps the monolith config and DB layer.
2. It assumes the RevCenter backend schema and env contract.
3. It cannot be cleanly copied into a separate repo without reimplementing runtime dependencies.
4. The skill currently documents the embedded workflow, not a standalone API workflow.

## 3. Target State

`revcenter-cli` becomes a separate system with two primary surfaces:

1. `CLI`: user-facing commands for template generation, dry runs, submit, polling, retry, and result export.
2. `API`: the only runtime dependency for provisioning and job status.

Codex skill behavior:

1. Build or normalize a wizard-safe request payload.
2. Optionally call a dry-run render endpoint to preview prompt/profile resolution.
3. Submit a one-shot provisioning request through the API.
4. Poll job status until terminal state.
5. Return agent/job/provider identifiers plus any failed step.

## 4. Product Boundary

This standalone system is not the full RevCenter app.

It should own only:

1. Wizard payload intake.
2. Prompt/profile compilation.
3. ElevenLabs provisioning orchestration.
4. Knowledge-source intake manifesting.
5. Smoke checks and provisioning status.
6. API auth, audit logs, and job history needed for CLI and demos.

It should not initially own:

1. Full RevCenter dashboard UI.
2. Billing and subscriptions.
3. CRM/integration sync outside what is strictly needed for one-shot agent provisioning.
4. General campaign orchestration.

## 5. Standalone Repo Layout

Recommended target repo:

```text
revcenter-cli/
├── packages/
│   ├── cli/                # command surface
│   ├── api/                # HTTP server
│   ├── worker/             # async provisioning worker
│   ├── shared/             # types, schemas, helpers
│   └── provider-elevenlabs/# provider adapter
├── skills/
│   └── revcenter-wizard-agent-gen/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── templates/
├── specs/
└── docker-compose.yml
```

## 6. Runtime Components

### 6.1 CLI

Responsibilities:

1. Render starter payloads.
2. Validate wizard-safe JSON before submission.
3. Support dry-run and live submit modes.
4. Poll job status.
5. Save outputs for demos and handoffs.

### 6.2 API

Responsibilities:

1. Authenticate requests with scoped API keys.
2. Validate wizard payloads.
3. Normalize inputs and create provisioning jobs.
4. Expose status and retry endpoints.
5. Persist audit history and provider metadata.

### 6.3 Worker

Responsibilities:

1. Execute the provisioning state machine.
2. Call ElevenLabs APIs.
3. Persist per-step status and event logs.
4. Requeue recoverable failures.
5. Run smoke checks and final sync.

### 6.4 Database

Use a dedicated Postgres database.

The CLI itself should not require direct DB access in normal operation. Only the API and worker talk to the database.

### 6.5 Queue

Use Redis-backed jobs for:

1. Provisioning orchestration.
2. Retry scheduling.
3. Smoke test execution.
4. Webhook processing if provider callbacks are added.

## 7. Minimal Data Model

Recommended first-pass tables:

1. `workspace`
   - logical tenant for API keys, defaults, and audit scope
2. `api_key`
   - hashed token, scope, workspace, status
3. `wizard_request`
   - raw request JSON, normalized request JSON, request hash, source
4. `agent_profile`
   - profile version, prompt template version, defaults
5. `provisioning_job`
   - job status, correlation ID, idempotency key, workspace, agent reference
6. `provisioning_step`
   - step order, status, attempts, last error, event log
7. `agent_instance`
   - local record for provider-backed agent
8. `knowledge_source`
   - URL or document references attached to a request or agent
9. `smoke_test_run`
   - smoke result history
10. `provider_event`
   - request/response and webhook evidence where needed

## 8. API Contract

### 8.1 Create One-Shot Wizard Request

`POST /v1/wizard/agents`

Request body:

```json
{
  "idempotencyKey": "demo-acme-001",
  "request": {
    "name": "Acme Home Services",
    "industry": "hvac",
    "useCase": "inbound_lead_capture",
    "services": ["AC repair", "Heating maintenance"],
    "discoveryQuestions": [
      "What service do you need help with today?",
      "What is the service address?"
    ],
    "mainObjective": "Capture qualified inbound calls and book service appointments.",
    "knowledgeSources": ["https://www.acmehomeservices.com"],
    "voiceSelection": {
      "voiceId": "cgSgspJ2msm6clMCkdW9"
    },
    "greeting": {
      "mode": "generated"
    },
    "routing": {
      "transferNumber": "+14155550199",
      "businessTimezone": "America/Los_Angeles",
      "languages": ["en"]
    },
    "agentName": "Acme Service Desk"
  },
  "options": {
    "testMode": true,
    "requireProvider": true,
    "waitForTerminal": false
  }
}
```

Response:

```json
{
  "jobId": "prov_123",
  "agentId": "agent_123",
  "status": "queued",
  "correlationId": "corr_123",
  "reusedExisting": false
}
```

### 8.2 Dry-Run Render

`POST /v1/wizard/agents/render`

Purpose:

1. Validate payload.
2. Return normalized intent profile.
3. Return compiled prompt summary and selected voice/profile.
4. Do not call ElevenLabs.

This endpoint is important for demos and skill-driven prep work.

### 8.3 Job Status

`GET /v1/provisioning/jobs/:jobId`

Return:

1. Job status.
2. Agent summary.
3. Ordered step statuses.
4. Last error code/message.
5. Provider external ID if present.

### 8.4 Retry

`POST /v1/provisioning/jobs/:jobId/retry`

Use for:

1. recoverable failures
2. provider transient issues
3. knowledge ingest retries

### 8.5 Agent Fetch

`GET /v1/agents/:agentId`

Return:

1. local agent metadata
2. provider agent ID
3. readiness state
4. profile versions
5. most recent successful provisioning job

## 9. Provisioning Pipeline

Target worker steps:

1. `validate_request`
2. `normalize_request`
3. `resolve_profile`
4. `compile_prompt_and_greeting`
5. `plan_knowledge_sources`
6. `create_or_update_provider_agent`
7. `apply_provider_configuration`
8. `run_smoke_checks`
9. `persist_versions_and_finalize`

Each step must be:

1. independently logged
2. retry-aware
3. idempotent where feasible
4. visible through the status API

## 10. Environment Contract

Standalone API and worker env:

1. `REVCENTER_API_PORT`
2. `REVCENTER_DATABASE_URL`
3. `REVCENTER_REDIS_URL`
4. `REVCENTER_API_KEY_SALT`
5. `REVCENTER_JWT_SECRET` if user auth is later added
6. `ELEVENLABS_API_KEY`
7. `ELEVENLABS_WEBHOOK_SECRET`
8. `REVCENTER_STORAGE_BUCKET` or local file storage config if document uploads are needed
9. `REVCENTER_DEFAULT_WORKSPACE_SLUG`
10. `REVCENTER_LOG_LEVEL`

CLI env:

1. `REVCENTER_API_BASE_URL`
2. `REVCENTER_API_KEY`
3. `REVCENTER_CLI_MODE=api`
4. `REVCENTER_OUTPUT_DIR` optional

## 11. CLI Contract

Target command set:

1. `revcenter-cli wizard template`
2. `revcenter-cli wizard render --input <file>`
3. `revcenter-cli wizard submit --input <file>`
4. `revcenter-cli wizard one-shot --input <file> --wait`
5. `revcenter-cli wizard status --job-id <id>`
6. `revcenter-cli wizard retry --job-id <id>`
7. `revcenter-cli wizard export --job-id <id>`

Expected behavior:

1. `one-shot` should call `render`, then `submit`, then `status` polling.
2. `--test-mode` should default to `true` for demos unless the user explicitly disables it.
3. `--require-provider` should default to `true` for real ElevenLabs demos.
4. `--json` should be supported consistently across commands.

## 12. Skill Upgrade Requirements

The Codex skill should become more advanced in these ways:

1. Distinguish `embedded` mode from `api` mode.
2. Default new work to `api` mode for the standalone repo.
3. Support a dry-run first workflow before live provisioning.
4. Always keep wizard payloads within the allowed business-input surface.
5. Capture outputs in a deterministic handoff format:
   - request file path
   - job ID
   - agent ID
   - provider external ID
   - final status
   - failed step if any
6. Prefer test-safe defaults for demos.
7. Treat direct DB access as an implementation detail of the standalone API, not the CLI.

## 13. Migration Strategy

Phase 0: Current embedded bridge

1. Keep the current in-repo `revcenter-cli` working.
2. Document that it is transitional.

Phase 1: Standalone API skeleton

1. Create the separate repo.
2. Move request parsing and shared schemas first.
3. Recreate the status/job model and core provisioning API.

Phase 2: Provider orchestration

1. Implement ElevenLabs adapter.
2. Implement worker and retry logic.
3. Add dry-run render.

Phase 3: Skill-first workflow

1. Point the skill and CLI docs at API mode by default.
2. Keep embedded mode only as a temporary compatibility path.

Phase 4: Remove monolith coupling

1. Delete direct imports from the main `revcenter` backend.
2. Remove any requirement that `revcenter-cli` be run from inside the monolith repo.

## 14. Acceptance Criteria

The standalone system is complete when:

1. A user can run `revcenter-cli wizard one-shot` from the standalone repo.
2. The CLI only depends on the standalone API, not the monolith source tree.
3. Provisioning history is persisted in the standalone database.
4. The system can create a real ElevenLabs-backed agent end to end.
5. The skill can drive dry-run and live submit workflows without relying on hidden repo knowledge.

## 15. Immediate Implementation Backlog

1. Add `api` mode to the CLI runtime so it no longer assumes embedded imports.
2. Move request/response schemas into a standalone shared package.
3. Stand up a minimal API server with:
   - `POST /v1/wizard/agents/render`
   - `POST /v1/wizard/agents`
   - `GET /v1/provisioning/jobs/:jobId`
4. Add Prisma schema and first migration set for the standalone DB.
5. Add Redis-backed worker orchestration.
6. Update the skill to treat standalone API mode as the target default.

