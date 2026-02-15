# V1 Subspec: Auth And Onboarding Migration

Status: Draft v1
Owner: Backend + frontend auth owners
Parent: `specs/v1/master-v1-spec.md`

Git Delivery Branch: `feature/auth-and-onboarding-migration`
Subspec Completion Gate:
1. Start implementation with `git switch -c feature/auth-and-onboarding-migration` from the current base branch.
2. Keep all code, tests, and docs for this subspec on `feature/auth-and-onboarding-migration`.
3. Create at least one intentional commit that references this subspec scope.
4. Push the branch to GitHub with `git push -u origin feature/auth-and-onboarding-migration`.
5. Do not mark this subspec complete until the implementation commit is present on `feature/auth-and-onboarding-migration` in GitHub.

## 1. Purpose

Migrate Revcenter from the current email/password-first auth UX to a hardened magic-link flow, preserve Google OAuth, secure invitation handling, and guarantee onboarding progression into existing Revcenter organization and agent setup.

## 2. Current Revcenter Baseline

1. Backend uses Better Auth with email/password and Google.
2. Frontend `auth-client` currently includes `organizationClient()` only.
3. Login and signup pages are password-based (`frontend/app/(auth)/login/page.tsx`, `frontend/app/(auth)/signup/page.tsx`).
4. Invitation acceptance is client-triggered via direct endpoint call in `frontend/app/(auth)/accept-invitation/[id]/page.tsx`.
5. Onboarding wizard exists at `frontend/app/onboarding/page.tsx` and should remain the post-auth destination for newly created accounts.

## 3. Target Auth Model

### 3.1 Sign-In Methods

1. Magic link (primary for email).
2. Google OAuth (secondary).
3. Email/password hidden or deprecated for v1 unless explicitly retained for admin accounts.

### 3.2 Security Invariants

1. Callback URLs are allowlisted and normalized server-side.
2. Magic link issuance has per-IP/per-email rate limits and cooldowns.
3. Magic token verify enforces one-time consumption and replay protection.
4. Invitation acceptance enforces invited email match.
5. Session `activeOrganizationId` is membership-valid or recovered.

## 4. Omnidial Reuse Components

1. Backend:
- `backend/src/api/routes/auth.ts` (middleware chain + response rewrite for deterministic transient auth failures).
- `backend/src/api/middlewares/authHardening.ts` (callback guard, abuse protection, replay protection).
- hardened `backend/src/lib/better-auth.ts` patterns (magic-link plugin, session org recovery).

2. Frontend:
- `frontend/lib/auth-client.ts` with `magicLinkClient()` plugin.
- `frontend/hooks/api/useAuth.ts` magic-link hooks.
- auth page patterns for login/signup/onboarding and deterministic auth errors.
- `frontend/lib/auth-errors.ts` and callback helper utilities.

## 5. Revcenter Implementation Plan

### 5.1 Backend Changes

1. Add `magicLink` plugin to Better Auth config.
2. Keep org plugin and invitation email delivery.
3. Add `authHardening` middleware and mount in auth route.
4. Add deterministic auth error taxonomy:
- `AUTH_TOKEN_EXPIRED`
- `AUTH_TOKEN_CONSUMED`
- `AUTH_TOKEN_INVALID`
- `AUTH_RATE_LIMITED`
- `AUTH_INVITE_EMAIL_MISMATCH`
- `AUTH_INVITE_INVALID`
- `AUTH_CALLBACK_REJECTED`
- `AUTH_ACTIVE_ORG_INVALID`
- `AUTH_FAILURE_TRANSIENT`

5. Add correlation ID propagation in auth responses.

### 5.2 Frontend Changes

1. Update `frontend/lib/auth-client.ts` to include `magicLinkClient()`.
2. Replace password-first login form with magic-link-first UX.
3. Replace signup with magic-link + social flow.
4. Add user-facing auth error mapping utilities.
5. Preserve onboarding redirection logic:
- new users -> `/onboarding`
- existing users -> `/dashboard`
- invited users -> `/accept-invitation/:id`

### 5.3 Invitation Flow

1. Invitation links must carry invitation ID and invited email.
2. Accept-invitation route must validate session email against invitation email.
3. On successful acceptance:
- set org membership.
- set active organization.
- redirect to dashboard or onboarding as required.

## 6. Onboarding Sequencing Contract

### 6.1 New User Sequence

1. User requests magic link.
2. User verifies link.
3. Session created and org context validated.
4. User lands in onboarding flow.
5. Onboarding creates organization and initial agent (existing Revcenter behavior retained).
6. User redirected to dashboard.

### 6.2 Invited User Sequence

1. User lands from invitation URL.
2. User signs in with invited email via magic link.
3. Invitation acceptance endpoint validates invitation state.
4. Org membership activated.
5. User redirected to dashboard.

## 7. Abuse Protection And Reliability

1. Rate limiting tiers:
- per-IP.
- per-email.
- per-email+IP.
- resend cooldown.

2. Redis outage behavior:
- degrade to in-memory limiter fallback.
- continue safe failure behavior.

3. Replay protection:
- consumed token keys in Redis with TTL.
- verify endpoint blocks token replay.

4. Transient failure normalization:
- rewrite ambiguous 5xx to deterministic `AUTH_FAILURE_TRANSIENT` with correlation ID.

## 8. API And Contract Adjustments

1. Ensure frontend only targets Better Auth endpoints for magic link operations.
2. Add onboarding status endpoint if needed to control post-auth route resolution.
3. Add/extend invitation status endpoint for robust invitation lifecycle handling.

## 9. QA Matrix

1. Magic link requested, received, consumed successfully.
2. Expired link.
3. Replayed link.
4. Rate limited request.
5. Invitation with correct email.
6. Invitation with incorrect email.
7. Invalid callback URL in query.
8. Missing/invalid active org recovery.
9. Redis unavailable during magic-link issuance.

## 10. Acceptance Criteria

1. Passwordless login and signup are production-ready in stage.
2. Replay and abuse protections verified by automated tests.
3. Invitation acceptance is email-safe and deterministic.
4. New user onboarding path lands in existing `/onboarding` flow and completes without manual intervention.
5. Auth errors are user-readable and traceable via correlation ID.
