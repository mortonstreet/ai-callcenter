# V1 Subspec: CRM Integrations Platform

Status: Draft v1
Owner: Integrations engineering
Parent: `specs/v1/master-v1-spec.md`

Git Delivery Branch: `feature/crm-integrations-platform`
Subspec Completion Gate:
1. Start implementation with `git switch -c feature/crm-integrations-platform` from the current base branch.
2. Keep all code, tests, and docs for this subspec on `feature/crm-integrations-platform`.
3. Create at least one intentional commit that references this subspec scope.
4. Push the branch to GitHub with `git push -u origin feature/crm-integrations-platform`.
5. Do not mark this subspec complete until the implementation commit is present on `feature/crm-integrations-platform` in GitHub.

## 1. Purpose

Build a reusable integrations platform in Revcenter, reusing Omnidial integration patterns while replacing providers with home services CRMs:

1. Jobber
2. Workiz
3. ServiceTitan

## 2. Goals

1. Standardize connection lifecycle: connect, status, config, test, disconnect.
2. Store credentials securely per organization.
3. Support bi-directional data sync jobs with visibility into errors and last sync status.
4. Provide UI in Settings > Integrations for owner/admin users.

## 3. Architecture

### 3.1 Provider Adapter Pattern

Define a common interface for each CRM provider:

1. `buildAuthorizeUrl()`
2. `exchangeCode()`
3. `refreshToken()`
4. `testConnection()`
5. `pullCustomers()`
6. `pullJobsOrAppointments()`
7. `pushLead()`
8. `pushAppointment()`

Providers implement this interface in isolated modules.

### 3.2 Service Layers

1. Route layer: request validation + authz.
2. Controller layer: request orchestration + response mapping.
3. Integration service: provider-agnostic logic.
4. Provider adapters: external API specifics.
5. Sync worker: queue-based pulls/pushes and retries.

## 4. Data Model

### 4.1 Core Tables

1. `integration`
- organizationId
- provider
- encrypted access/refresh tokens
- token expiry
- connectedById
- config JSON
- lastSyncAt

2. `integration_sync_job`
- provider
- direction (`pull|push`)
- status
- startedAt/completedAt
- recordsProcessed
- errorSummary

3. `integration_sync_log`
- syncJobId
- entityType
- entityId
- operation
- status
- external reference IDs

### 4.2 Credential Security

1. Tokens encrypted at rest.
2. Never return tokens to frontend.
3. Rotate/refresh tokens in worker context.

## 5. API Contract

### 5.1 Generic Endpoints

1. `GET /integrations?organizationId=...`
2. `GET /integrations/:provider/status?organizationId=...`
3. `POST /integrations/:provider/connect`
4. `GET /integrations/:provider/callback`
5. `PATCH /integrations/:provider/config`
6. `POST /integrations/:provider/test`
7. `DELETE /integrations/:provider`

### 5.2 Sync Endpoints

1. `POST /integrations/:provider/sync/pull`
2. `POST /integrations/:provider/sync/push`
3. `GET /integrations/:provider/sync/jobs`
4. `GET /integrations/:provider/sync/jobs/:jobId`

## 6. UI/UX Requirements

### 6.1 Settings Integrations Tab

Reuse Omnidial patterns:

1. Provider cards with status badges.
2. Connect/disconnect actions.
3. Config modal for provider-specific toggles.
4. Test connection button.
5. Last sync timestamp and recent errors.

### 6.2 Role Access

1. Owner/admin can manage integration credentials.
2. Members can view status only (optional v1 behavior controlled by policy).

## 7. Provider-Specific Notes

### 7.1 Jobber

1. OAuth/client credential setup.
2. Pull customer and job metadata.
3. Push new leads/appointments when configured.

### 7.2 Workiz

1. Token-based integration path.
2. Sync contacts, service requests, and appointment states.

### 7.3 ServiceTitan

1. Client credential + account context mapping.
2. Sync customers/calls/jobs to Revcenter lead timeline.

## 8. Sync Strategy

1. Full initial pull on connect.
2. Incremental sync by cursor/timestamp thereafter.
3. Queue retries with exponential backoff.
4. Dead-letter marking for repeated failures.
5. Idempotent upsert by external ID mapping table.

## 9. Observability And Support

1. Log correlation ID per sync job.
2. Capture provider API errors with normalized error codes.
3. Expose latest failure reason in integration status response.
4. Add admin-facing integration health dashboard in v1.1.

## 10. Migration From Omnidial

### 10.1 Reuse

1. Route/controller/service skeleton from Omnidial integrations module.
2. Integration settings card and modal UX structure.
3. Encryption/decryption token handling patterns.

### 10.2 Replace

1. Provider metadata map: remove non-home-services defaults.
2. OAuth scopes and callback handling specific to Jobber/Workiz/ServiceTitan.
3. Entity mapping layer aligned to Revcenter `Lead` and booking/task models.

## 11. Acceptance Criteria

1. Each of the three v1 CRM providers can connect and pass test connection in stage.
2. Pull sync creates/updates Revcenter leads without duplicates.
3. Push sync writes back lead or booking outcomes where enabled.
4. Owner/admin can disconnect provider and revoke tokens.
5. All failed sync jobs are visible and traceable.
