# V1 Subspec: Agent Lifecycle And ElevenLabs

Status: Draft v1
Owner: AI platform engineering
Parent: `specs/v1/master-v1-spec.md`

Git Delivery Branch: `feature/agent-lifecycle-and-elevenlabs`
Subspec Completion Gate:
1. Start implementation with `git switch -c feature/agent-lifecycle-and-elevenlabs` from the current base branch.
2. Keep all code, tests, and docs for this subspec on `feature/agent-lifecycle-and-elevenlabs`.
3. Create at least one intentional commit that references this subspec scope.
4. Push the branch to GitHub with `git push -u origin feature/agent-lifecycle-and-elevenlabs`.
5. Do not mark this subspec complete until the implementation commit is present on `feature/agent-lifecycle-and-elevenlabs` in GitHub.

## 1. Purpose

Define the full agent lifecycle for Revcenter v1:

1. Agent provisioning during onboarding.
2. Manual agent creation/edit lifecycle from Agents tab.
3. ElevenLabs synchronization and fail-safe local behavior.
4. Runtime configuration, analytics, and deactivation controls.

## 2. Current Revcenter Baseline

1. `createElevenLabsAgent` exists in `backend/src/services/agent.service.ts`.
2. Onboarding already creates an org and agent through `/organization/onboarding`.
3. Manual wizard exists in `frontend/components/agent/CreateAgentWizard.tsx`.
4. Agent details and update APIs exist under `/agent/:organizationId/*`.

## 3. V1 Target Behavior

### 3.1 Onboarding Agent Provisioning

1. New org onboarding automatically provisions first production agent via ElevenLabs API.
2. If ElevenLabs fails, fallback local agent is created with explicit degraded-status marker.
3. User sees success with warning banner when fallback occurs.

### 3.2 Manual Agent Creation (Direct Parity)

1. Preserve and refine existing “New Agent” wizard in agents tab.
2. Required fields:
- name
- use case
- primary objective

3. Optional fields:
- industry
- website
- voice ID
- opening line
- system prompt override

4. Default templates remain industry/use-case driven.

### 3.3 Agent Lifecycle States

1. `draft`
2. `active`
3. `paused`
4. `archived`
5. `error` (sync or provider failures)

## 4. API Contract

### 4.1 Create And Configure

1. `POST /agent/:organizationId/create-agent`
2. `PATCH /agent/:organizationId/:id/update-agent`
3. `PATCH /agent/:organizationId/:id/owner-update`
4. `GET /agent/:organizationId/:id/config`

### 4.2 Runtime And Monitoring

1. `GET /agent/:organizationId/:id/analytics`
2. `GET /agent/:organizationId/:id/conversations`
3. `GET /agent/:organizationId/:id/mcp-config`
4. `PUT /agent/:organizationId/:id/mcp-config`

### 4.3 Deletion

1. `DELETE /agent/:organizationId/:id/delete-agent`
2. On delete:
- attempt provider deletion.
- always clean local state even if provider delete fails.

## 5. ElevenLabs Integration Requirements

1. Provider API calls must be idempotent where possible (store external IDs and correlation keys).
2. Voice list API cached for 5 minutes (existing behavior retained).
3. Prompt and voice changes must update provider and local DB atomically from caller perspective.
4. Webhook ingestion must classify and persist call outcomes with audit-safe payload storage.

## 6. Template System

1. Continue using template resolver (`backend/src/utils/agent-templates.ts`).
2. Introduce home-services-specific template packs:
- HVAC
- Pest Control
- Electrical
- Roofing
- Cleaning Services

3. Template contract fields:
- systemPrompt
- firstMessage
- suggestedVoiceId
- key service questions

## 7. MCP/Tooling Contract

1. Each agent can hold unique MCP credentials and webhook secret.
2. Credentials generated/rotated via secure endpoints only.
3. API never returns sensitive fields to unauthorized users.
4. Audit log events on credential generation and updates.

## 8. UI Requirements

1. Agents list should expose status, created date, industry, and phone information.
2. Agent detail page must include:
- prompt and voice settings
- tool/knowledge tabs
- analytics and conversation history
- health section (provider sync status)

3. Add “Clone Agent” action in v1.1 for rapid setup reuse.

## 9. Failure Modes And Recovery

1. ElevenLabs unavailable at create time:
- create fallback local agent.
- queue background retry to provision external agent.

2. ElevenLabs unavailable at update time:
- mark `syncPending` and retry.

3. Webhook processing failure:
- retry queue with dead-letter capture.

## 10. Acceptance Criteria

1. New user onboarding successfully provisions first agent in stage.
2. Manual agent creation path works for admin/owner roles.
3. ElevenLabs config updates round-trip and persist locally.
4. Provider outage handling is non-destructive and visible.
5. Agent analytics and conversation endpoints are reliable for support debugging.
