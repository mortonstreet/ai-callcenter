# Subspec S6: ElevenLabs Advanced Provisioning

Status: Implementation-ready v1
Owner: Voice AI platform
Parent: `specs/v1/parallel-lifecycle-fixes/00-execution-roadmap.md`

Git Delivery Branch: `feature/elevenlabs-custom-voice-automation`
Subspec Completion Gate:
1. Start implementation with `git switch -c feature/elevenlabs-custom-voice-automation` from `main`.
2. Keep all code, tests, and docs for this subspec on `feature/elevenlabs-custom-voice-automation`.
3. Create at least one intentional commit that references this subspec scope.
4. Push with `git push -u origin feature/elevenlabs-custom-voice-automation`.
5. Do not mark this subspec complete until commit SHA and PR link are logged.

## 1. Purpose

Automate custom voice creation/training and attach voice profiles during first-agent setup.

## 2. Current Gap

1. ElevenLabs support is currently list/select only.
2. No programmatic custom-voice creation from onboarding context.

## 3. Scope

In scope:

1. Custom voice creation API path in ElevenLabs client.
2. Optional voice training pipeline from admin-provided assets.
3. Prompt bootstrapping from onboarding business context.
4. Automatic voice assignment on first agent provisioning.

Out of scope:

1. Full UI for advanced voice lab management beyond first-agent automation.

## 4. Implementation Tasks

1. Extend `backend/src/clients/elevenlabs.client.ts` with create/train methods.
2. Add backend orchestration step tied to provisioning pipeline.
3. Add persistence for voice IDs and training status per org/agent.
4. Update agent creation workflow to attach generated voice when available.

## 5. Acceptance Criteria

1. Provisioned org can produce an attached custom voice without manual API calls.
2. Agent bootstrapping uses onboarding-derived prompt seed.
3. Failures degrade gracefully to approved fallback voice selection.

## 6. Test Plan

1. ElevenLabs client contract tests.
2. Provisioning job tests for success/fallback branches.
3. Agent creation integration test verifying attached voice ID.

## 7. Implementation Artifacts

1. `backend/src/clients/elevenlabs.client.ts`
2. `backend/src/services/agent.service.ts`
3. `backend/src/services` (voice provisioning orchestration)
4. `shared/db/prisma/schema.prisma`
