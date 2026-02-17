# Subspec S5: Twilio ISV Subaccount Provisioning Port

Status: Implementation-ready v1
Owner: Telecom platform
Parent: `specs/v1/parallel-lifecycle-fixes/00-execution-roadmap.md`

Git Delivery Branch: `feature/twilio-isv-subaccount-provisioning`
Subspec Completion Gate:
1. Start implementation with `git switch -c feature/twilio-isv-subaccount-provisioning` from `main`.
2. Keep all code, tests, and docs for this subspec on `feature/twilio-isv-subaccount-provisioning`.
3. Create at least one intentional commit that references this subspec scope.
4. Push with `git push -u origin feature/twilio-isv-subaccount-provisioning`.
5. Do not mark this subspec complete until commit SHA and PR link are logged.

## 1. Purpose

Port/adapt Omnidial ISV provisioning logic for automated Twilio subaccount and number setup.

## 2. Source References

1. `/Users/mortonstreet/omnidial/backend/src/services/phoneProvisioning.service.ts`
2. `/Users/mortonstreet/omnidial/shared/db/prisma/schema.prisma`

## 3. Scope

In scope:

1. Create org-level Twilio subaccount + API key + TwiML app.
2. State-aware number search and purchase flow.
3. Verification checks before marking provisioning complete.
4. Replace placeholder phone assignment path.

Out of scope:

1. Carrier compliance workflows beyond current Twilio baseline.
2. Non-Twilio telephony providers.

## 4. Implementation Tasks

1. Add Twilio provisioning service and queue worker jobs.
2. Persist subaccount/number metadata in org telephony config.
3. Add failure handling and safe retry for purchase/assignment.
4. Wire first agent number assignment to real purchased number.

## 5. Acceptance Criteria

1. New org can be provisioned with real Twilio subaccount credentials.
2. Purchased number is persisted and attached to first agent/call flows.
3. No default placeholder number is written for newly provisioned orgs.
4. Provisioning failures are visible and retryable.

## 6. Test Plan

1. Twilio service unit tests with mocked API responses.
2. Integration tests for subaccount create and number purchase flow.
3. Negative tests for unavailable numbers and API errors.

## 7. Implementation Artifacts

1. `backend/src/services` (new Twilio ISV provisioning service)
2. `backend/src/api/routes/call-center.ts`
3. `backend/src/services/agent.service.ts`
4. `shared/db/prisma/schema.prisma`
