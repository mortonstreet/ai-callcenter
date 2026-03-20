# RevCenter CLI Standalone Implementation Continuation Handoff

Status: In Progress  
Date: March 6, 2026  
Owner: RevCenter CLI / Agent Gen  
Purpose: Hand off the current `revcenter-cli` implementation state and define the next concrete work needed to get the standalone API mode running end to end.

## 1. Summary

The CLI now has a Phase 1 scaffold inside the current monorepo package:

1. shared request/response schemas for `render`, `submit`, and `status`
2. an `embedded` vs `api` service boundary
3. CLI commands for `template`, `render`, `submit`, `one-shot`, and `status`
4. a local render preview in embedded mode
5. a startup `REVCENTER` banner for the CLI

What is not done yet:

1. no standalone API server exists yet
2. no standalone Postgres schema or migrations exist yet
3. no Redis queue or worker exists yet
4. no ElevenLabs standalone provider adapter exists yet
5. `api` mode is contract-ready client code only

This document is the implementation handoff for the next engineer to complete the runnable standalone path.

## 2. Source Of Truth

Read these in order:

1. `revcenter-cli/specs/standalone-wizard-api-handoff.md`
2. this continuation handoff
3. `revcenter-cli/src/contracts.ts`
4. `revcenter-cli/src/service.ts`
5. `revcenter-cli/src/cli.ts`

The architecture source of truth remains `standalone-wizard-api-handoff.md`. This document explains what already landed and what should be implemented next.

## 3. Current Landed State

### 3.1 CLI Contracts

Implemented in `revcenter-cli/src/contracts.ts`:

1. `wizardAgentRequestSchema`
2. `wizardRenderRequestSchema`
3. `wizardRenderResponseSchema`
4. `wizardSubmitRequestSchema`
5. `wizardSubmitResponseSchema`
6. `wizardStatusResponseSchema`
7. shared forbidden wizard field list

These schemas are now the current contract surface for the CLI and any future standalone API.

### 3.2 Request Parsing

Implemented in `revcenter-cli/src/requests.ts`:

1. CLI payload normalization
2. forbidden-field validation without backend imports
3. dual output shapes:
   - `request` for standalone API mode
   - `startInput` for legacy embedded mode
4. local render preview scaffold for embedded mode

### 3.3 Runtime Split

Implemented in `revcenter-cli/src/service.ts`:

1. `WizardService` interface
2. embedded implementation using current monolith imports
3. API implementation using HTTP calls only
4. generic terminal polling and outcome evaluation

### 3.4 CLI Commands

Implemented in `revcenter-cli/src/cli.ts`:

1. `template`
2. `render`
3. `submit`
4. `one-shot`
5. `status`

Behavior:

1. `one-shot` now does `render -> submit -> poll`
2. `--mode api` or `REVCENTER_CLI_MODE=api` selects standalone mode
3. `--json` suppresses the startup banner

### 3.5 CLI Banner

Implemented in `revcenter-cli/src/banner.ts`.

Requirement:

1. The CLI should open with the `REVCENTER` banner derived from the backend server banner in `backend/src/server.ts`.
2. Do not print the banner for `--json` output.
3. Do not print the banner when stdout is not a TTY.

## 4. Immediate Gap List

These are the blockers for a real runnable standalone flow:

1. No API server is mounted for:
   - `POST /v1/wizard/agents/render`
   - `POST /v1/wizard/agents`
   - `GET /v1/provisioning/jobs/:jobId`
2. No standalone persistence model exists yet.
3. No queue-backed async orchestration exists yet.
4. No worker exists to move jobs through provisioning steps.
5. No API-key auth layer exists yet.
6. No provider adapter exists outside the monolith.
7. No standalone env bootstrap exists yet.

## 5. Recommended Next Build Order

### Phase 2A: Minimal Standalone API Server

Goal: make `api` mode callable against a real process before adding provider orchestration.

Build:

1. `packages/api` or temporary `revcenter-cli/src/api-server.ts`
2. HTTP router for:
   - `POST /v1/wizard/agents/render`
   - `POST /v1/wizard/agents`
   - `GET /v1/provisioning/jobs/:jobId`
3. request/response validation using the existing schemas

Initial behavior is allowed to be stubbed if explicit:

1. `render` returns normalized preview
2. `submit` creates a stored job in `queued` state
3. `status` returns that stored job

Do not fake provider success. If provider orchestration is not wired, report a clearly non-terminal or stub state.

### Phase 2B: Persistence

Goal: replace in-memory state with standalone storage.

Build:

1. Prisma schema for:
   - `workspace`
   - `api_key`
   - `wizard_request`
   - `provisioning_job`
   - `provisioning_step`
   - `agent_instance`
2. first migration set
3. repository layer for jobs and steps

Minimum requirement:

1. `submit` persists a job
2. `status` reloads the same job from DB
3. step ordering and error storage match the shared status schema

### Phase 2C: Queue + Worker

Goal: move `submit` onto a real async execution path.

Build:

1. Redis-backed queue
2. worker process
3. step-state persistence
4. retry-safe job execution shell

First worker version can stop after:

1. `validate_request`
2. `normalize_request`
3. `resolve_profile`
4. `compile_prompt_and_greeting`

That is enough to prove job lifecycle and status reporting before provider work lands.

### Phase 2D: ElevenLabs Provider Adapter

Goal: produce a real provider-backed agent from the standalone system.

Build:

1. provider client wrapper
2. `create_or_update_provider_agent`
3. provider config application
4. provider external ID persistence
5. recoverable error mapping

Only after this phase should `--require-provider` in API mode be expected to pass for live runs.

## 6. Concrete File Plan

If implementation continues inside the current monorepo first:

1. `revcenter-cli/src/contracts.ts`
   - keep as the canonical transport contract until moved into a shared package
2. `revcenter-cli/src/service.ts`
   - keep as the CLI service boundary
3. `revcenter-cli/src/cli.ts`
   - keep focused on argument handling and presentation only
4. `revcenter-cli/src/banner.ts`
   - keep as the CLI banner source
5. `revcenter-cli/specs/`
   - keep specs current as architecture changes

If implementation moves to the target standalone repo:

1. move `contracts.ts` into `packages/shared`
2. move the HTTP implementation into `packages/api`
3. move async orchestration into `packages/worker`
4. keep the CLI banner and command surface in `packages/cli`

## 7. Acceptance Criteria For The Next Handoff

The next implementation step is complete when:

1. `REVCENTER_CLI_MODE=api` can point to a real local API process
2. `render` returns a validated response from that process
3. `submit` creates a persisted provisioning job
4. `status` returns the same job and ordered steps
5. `revcenter-cli wizard one-shot --mode api --no-wait` works against that process
6. the CLI banner still prints on normal interactive startup
7. `--json` output remains banner-free and machine-readable

## 8. Suggested Local Dev Runbook

Current embedded mode:

```bash
pnpm --filter revcenter-cli run wizard:one-shot \
  --input revcenter-cli/requests/acme.json \
  --requester-email you@example.com \
  --wait \
  --require-provider
```

Current API-contract mode:

```bash
pnpm --filter revcenter-cli run wizard:start

REVCENTER_CLI_MODE=api \
REVCENTER_API_BASE_URL=http://localhost:4010 \
pnpm --filter revcenter-cli run wizard:render \
  --input revcenter-cli/requests/acme.json
```

Target smoke path once the API server exists:

```bash
REVCENTER_CLI_MODE=api \
REVCENTER_API_BASE_URL=http://localhost:4010 \
pnpm --filter revcenter-cli run wizard:one-shot \
  --input revcenter-cli/requests/acme.json \
  --wait
```

## 9. Risks And Guardrails

1. Do not reintroduce direct backend imports into API mode.
2. Do not let the CLI talk directly to a standalone DB.
3. Keep `--json` output clean; never prepend banner text there.
4. Keep payloads within the wizard-safe business input surface.
5. Do not report provider success until the standalone provider adapter really exists.

## 10. Final Note

The current state is a valid scaffold, not a runnable standalone product. The next engineer should treat the shared contract and CLI service split as stable and build the standalone server behind them rather than bypassing them.
