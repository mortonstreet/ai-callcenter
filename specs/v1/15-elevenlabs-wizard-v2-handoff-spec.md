# V1 ElevenLabs Wizard V2 Handoff Spec (Concise)

Status: Draft  
Date: February 16, 2026  
Owner: Product + Engineering  
Purpose: Copy/paste-ready source of truth for next implementation session.

## 1. Goal

Build a simplified wizard UI that collects only business-relevant inputs while fully automating ElevenLabs depth in the background (Agent, LLM, Voice, Workflow, Branches, Knowledge Base, Analysis, Tools, Tests, Security, Advanced).

## 2. Design Principle

1. Frontstage (user): simple, low-friction, non-technical.
2. Backstage (system): full, deterministic, production-grade agent provisioning.
3. Owner sees minimal controls; admin controls prompt/system governance.

## 3. Tab Map From 13 Screens

Required automated coverage from wizard:

1. `Agent` (system prompt, first message, language/timezone behavior).
2. `LLM` (primary model, backup behavior, temperature, token limit).
3. `Agent voice` (voice, model family, expressive mode, tags).
4. `Workflow` (intent graph and transitions).
5. `Branches` (main branch and traffic split).
6. `Knowledge Base` (RAG config + document ingestion).
7. `Analysis` (evaluation criteria + data collection).
8. `Tools` (system tools + MCP/custom tools).
9. `Tests` (baseline + run strategy).
10. `Security` (text/voice security toggles + post-call webhook).
11. `Advanced` (turn-taking, silence, limits, responsiveness).

## 4. Wizard Inputs (Only Variable Inputs)

Expose to user:

1. Agent name.
2. Industry.
3. Primary use case.
4. Service selections.
5. Discovery/service questions (preset + custom).
6. Main objective.
7. Website URL(s) / docs for knowledge ingestion.
8. Voice selection (from curated workspace-visible voices).
9. Greeting preference:
   1. Use generated greeting.
   2. Provide custom greeting.
10. Optional routing inputs:
   1. Transfer number / escalation contact.
   2. Business timezone.
   3. Language choice(s) if enabled.

Not user-editable in wizard:

1. Raw LLM controls.
2. Raw TTS tuning complexity.
3. Workflow graph editor.
4. Analysis schema editor.
5. Tool policy matrix.
6. Security/advanced internals.

## 5. Hard-Coded / Profile-Driven Defaults (Apply Every Time)

Use a single internal config profile (e.g. `agent_profile_v1`) applied at create time:

1. LLM:
   1. Primary model fixed by profile.
   2. Backup LLM mode fixed by profile.
   3. Temperature fixed by profile.
   4. Token limit fixed by profile.
2. Voice:
   1. TTS model family fixed by profile (v3 family).
   2. Expressive mode fixed by profile.
   3. Suggested audio tags generated from industry/use case profile.
3. Workflow:
   1. Canonical intent detection node.
   2. Canonical intent branches (info, billing, refund, purchase, etc.).
   3. Deterministic fallback/end paths.
4. Branches:
   1. `main` branch created/updated.
   2. Traffic split defaults to 100% main on create.
5. Knowledge Base:
   1. Default RAG config.
   2. Automatic ingestion from provided URLs/docs.
6. Analysis:
   1. Default evaluation criteria set.
   2. Default data collection schema set.
7. Tools:
   1. Baseline system tools enabled by profile.
   2. MCP tools attached by capability policy.
8. Security:
   1. Post-call webhook automatically attached (HMAC signed).
   2. Required security toggles set by profile.
9. Advanced:
   1. Eagerness, spelling patience, speculative turn, silence thresholds, and duration limits fixed by profile.

## 6. Prompt And Greeting Compiler

`system_prompt = compile(base + industry + use_case + services + discovery_questions + objective + policy_blocks + tool_rules + escalation_rules)`

`first_message = generated_from(profile_tone, company, industry, use_case)` unless custom greeting supplied.

Rules:

1. Admin-only can override raw system prompt text.
2. Owner/user inputs are transformed into prompt fragments, not direct unrestricted prompt editing.
3. Prompt output is versioned (`prompt_profile_version`) and auditable.

## 7. Voice Selection Policy

1. Pull voices from workspace-visible catalog (`My Voices` + curated allowlist).
2. If user picks a voice, store `voice_id`.
3. If not picked, apply profile default voice per industry/use case.
4. Keep model family + advanced voice behavior profile-driven.

## 8. Provisioning Pipeline (Wizard -> Production Agent)

1. Validate request + role policy.
2. Build normalized `wizard_intent_profile`.
3. Compile prompt + greeting.
4. Create/update ElevenLabs agent baseline config.
5. Apply workflow + branch + tool + analysis + security + advanced configs.
6. Ingest KB sources (website/docs).
7. Attach webhooks + MCP endpoints.
8. Register baseline tests and run smoke tests.
9. Persist local metadata, version hash, and sync status.
10. Mark ready or degraded with retry queue.

## 9. Permissions Contract

1. `admin`:
   1. Prompt templates, system prompt override, workflow/templates, analysis schema, security/advanced profiles.
2. `owner`:
   1. Greeting + voice + business-level wizard inputs only.
3. Enforce in both UI and backend.

## 10. Second-Pass Implementation Targets

1. Create `agent_profile_v1` config object and apply at create-time (not only edit-time).
2. Replace ad-hoc prompt assembly with structured prompt compiler.
3. Add curated voice filtering and fallback logic.
4. Add automated workflow/branches provisioning from templates.
5. Add automatic KB ingest from website/docs during create.
6. Add default analysis criteria + data collection provisioning.
7. Add default tools + webhook + MCP wiring.
8. Add default tests and run-on-create smoke validation.
9. Persist `prompt_profile_version` and `config_profile_version` for audit/rollback.

## 11. New Session Bootstrap (Copy/Paste)

Use `specs/v1/15-elevenlabs-wizard-v2-handoff-spec.md` as the source of truth.  
Implement second pass by enforcing profile-driven defaults and exposing only the variable wizard inputs listed in section 4.  
All ElevenLabs tab complexity must be auto-provisioned from section 5/8, with role enforcement from section 9.

## 12. Detailed Execution Pack (Anti-Context-Rot)

Use the split handoff pack for implementation sequencing and acceptance tracking:

1. `specs/v1/wizard-v2-handoff/README.md`
2. `specs/v1/wizard-v2-handoff/00-execution-roadmap.md`
3. `specs/v1/wizard-v2-handoff/S0-contract-and-state-lock.md`
4. `specs/v1/wizard-v2-handoff/S1-wizard-surface-and-role-enforcement.md`
5. `specs/v1/wizard-v2-handoff/S2-profile-engine-and-prompt-compiler.md`
6. `specs/v1/wizard-v2-handoff/S3-provisioning-orchestrator-and-retries.md`
7. `specs/v1/wizard-v2-handoff/S4-core-tab-auto-provisioning.md`
8. `specs/v1/wizard-v2-handoff/S5-health-checks-smoke-and-readiness.md`
9. `specs/v1/wizard-v2-handoff/S6-status-observability-and-rollout.md`
