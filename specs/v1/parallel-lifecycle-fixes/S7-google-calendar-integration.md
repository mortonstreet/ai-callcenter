# Subspec S7: Google Calendar Integration Sync

Status: Implementation-ready v1
Owner: Integrations platform
Parent: `specs/v1/parallel-lifecycle-fixes/00-execution-roadmap.md`

Git Delivery Branch: `feature/google-calendar-integration-sync`
Subspec Completion Gate:
1. Start implementation with `git switch -c feature/google-calendar-integration-sync` from `main`.
2. Keep all code, tests, and docs for this subspec on `feature/google-calendar-integration-sync`.
3. Create at least one intentional commit that references this subspec scope.
4. Push with `git push -u origin feature/google-calendar-integration-sync`.
5. Do not mark this subspec complete until commit SHA and PR link are logged.

## 1. Purpose

Add Google Calendar as a first-class integration and project its events into schedule experience.

## 2. Current Gap

1. Integrations registry currently excludes Google Calendar.
2. Schedule view currently depends on internal appointment task records only.
3. Cal.com webhook route has weak/no auth guard.

## 3. Scope

In scope:

1. Add Google Calendar provider types, adapter, and OAuth flow.
2. Add token storage/refresh and disconnect behavior.
3. Add calendar sync jobs and webhook handlers with signature/auth checks.
4. Project synced events into schedule tab with source attribution.

Out of scope:

1. Full two-way conflict resolution beyond defined sync policy.

## 4. Implementation Tasks

1. Extend provider enums/types in shared requests.
2. Implement adapter in provider registry.
3. Add API endpoints for connect/callback/disconnect/status.
4. Add sync worker jobs (initial backfill + incremental updates).
5. Harden webhook auth handling in calendar-related routes.

## 5. Acceptance Criteria

1. User can connect Google Calendar and see status in integrations UI.
2. Events sync into schedule projection with clear source markers.
3. Invalid webhook payloads are rejected and audited.
4. Token refresh failures surface actionable reconnect state.

## 6. Test Plan

1. OAuth callback + token refresh integration tests.
2. Provider adapter tests for create/update/delete event mapping.
3. Schedule projection tests combining internal and calendar events.

## 7. Implementation Artifacts

1. `shared/types/src/requests/integrations.ts`
2. `backend/src/services/integrations/provider-adapters.ts`
3. `backend/src/api/routes/webhook.ts`
4. `frontend/app/dashboard/schedule/page.tsx`
