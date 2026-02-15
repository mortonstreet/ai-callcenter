# V1 Subspec: API Contracts And Route Map

Status: Draft v1
Owner: API platform engineering
Parent: `specs/v1/master-v1-spec.md`

Git Delivery Branch: `feature/api-contracts-and-route-map`
Subspec Completion Gate:
1. Start implementation with `git switch -c feature/api-contracts-and-route-map` from the current base branch.
2. Keep all code, tests, and docs for this subspec on `feature/api-contracts-and-route-map`.
3. Create at least one intentional commit that references this subspec scope.
4. Push the branch to GitHub with `git push -u origin feature/api-contracts-and-route-map`.
5. Do not mark this subspec complete until the implementation commit is present on `feature/api-contracts-and-route-map` in GitHub.

## 1. Purpose

Define the API surface required for Revcenter v1 production release, including preserved existing routes and new route families for integrations and campaigns.

## 2. Existing Route Families (Keep)

1. `/api/auth/*`
2. `/api/agent/*`
3. `/api/organization/*`
4. `/api/leads/*`
5. `/api/pipeline/*`
6. `/api/call-center/*`
7. `/api/admin/*`

## 3. New Route Families (Add)

1. `/api/integrations/*`
2. `/api/campaigns/*`
3. `/api/sms-campaigns/*` (if not folded into `/campaigns`)
4. `/api/email-campaigns/*` (or `/campaigns` channel endpoints)
5. `/api/webhooks/integrations/*`
6. `/api/webhooks/campaigns/*`

## 4. Authorization Model

### 4.1 Common Rules

1. All mutating routes require authenticated session.
2. Organization scoping is server-authoritative from session/membership.
3. Client-provided org IDs are validated and overridden when required.

### 4.2 Role Guard Baseline

1. `owner`/`admin`:
- integration credential operations.
- campaign activation/pause/delete.
- credential rotation.

2. `member`:
- view campaigns and assigned execution results.
- limited lead enrollment where policy allows.

## 5. Auth Contracts

### 5.1 Magic Link

1. `POST /api/auth/sign-in/magic-link`
2. `GET /api/auth/magic-link/verify`

Response requirements for error cases:

1. `code`
2. `retryable`
3. `userMessage`
4. `correlationId`

## 6. Integrations Contracts

### 6.1 Connection Lifecycle

1. `GET /api/integrations?organizationId=...`
2. `GET /api/integrations/:provider/status?organizationId=...`
3. `POST /api/integrations/:provider/connect`
4. `GET /api/integrations/:provider/callback`
5. `PATCH /api/integrations/:provider/config`
6. `POST /api/integrations/:provider/test`
7. `DELETE /api/integrations/:provider`

### 6.2 Sync

1. `POST /api/integrations/:provider/sync/pull`
2. `POST /api/integrations/:provider/sync/push`
3. `GET /api/integrations/:provider/sync/jobs`
4. `GET /api/integrations/:provider/sync/jobs/:jobId`

## 7. Campaign Contracts

### 7.1 Campaign CRUD

1. `GET /api/campaigns`
2. `POST /api/campaigns`
3. `GET /api/campaigns/:id`
4. `PATCH /api/campaigns/:id`
5. `DELETE /api/campaigns/:id`

### 7.2 Activation

1. `POST /api/campaigns/:id/activate`
2. `POST /api/campaigns/:id/pause`

### 7.3 Steps

1. `POST /api/campaigns/:id/steps`
2. `PATCH /api/campaigns/:id/steps/:stepId`
3. `DELETE /api/campaigns/:id/steps/:stepId`

### 7.4 Enrollment

1. `GET /api/campaigns/:id/enrollments`
2. `POST /api/campaigns/:id/enrollments`
3. `POST /api/campaigns/:id/enrollments/from-list`
4. `DELETE /api/campaigns/:id/enrollments/:enrollmentId`

### 7.5 Reporting

1. `GET /api/campaigns/:id/stats`
2. `GET /api/campaigns/:id/events`

## 8. Agent Contracts (V1 Adjustments)

1. Keep existing agent routes and request schemas.
2. Add explicit degraded-mode metadata for fallback local-only agents.
3. Add endpoint for agent health:
- `GET /api/agent/:organizationId/:id/health`

## 9. Webhook Contracts

### 9.1 Inbound

1. CRM/provider webhooks for integrations.
2. Twilio SMS status + inbound replies.
3. Email provider delivery/open/click callbacks.

### 9.2 Requirements

1. Signature verification.
2. Idempotent event processing by provider event ID.
3. Store raw payload for audit/debug.

## 10. Error Contract Standard

All non-2xx responses should include:

1. `error` or `code`.
2. `message` (user-safe).
3. `correlationId`.
4. optional `details` for support diagnostics.

## 11. Versioning Policy

1. V1 keeps single API namespace (`/api`) with additive endpoint rollout.
2. Breaking changes are deferred or guarded behind compatibility toggles.
3. Any request/response changes must update shared request schemas.

## 12. Acceptance Criteria

1. Route-level authz tests pass for all new route families.
2. Shared types align with backend validation schemas.
3. Frontend hooks compile against final contracts without any-casts for v1 routes.
4. Webhook ingestion is idempotent and observable.
