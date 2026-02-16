# Agent Factory Parallel Execution Matrix (Industries)

Status: Active v1
Date: February 16, 2026
Owner: Engineering + Agent Ops
Parent Specs:
1. `specs/v1/13-elevenlabs-agent-factory-system.md`
2. `specs/v1/14-elevenlabs-v3-prompt-workflow-tab-governance.md`

## 1. Purpose

Run all industry tracks in parallel with predictable branch/worktree isolation, low merge conflict risk, and clear promotion gates.

## 2. Global Rules

1. One lane per industry worktree branch for specs.
2. One lane per industry worktree branch for implementation.
3. Keep owner scope enforcement unchanged (`greeting` + `voice` only).
4. Keep endpoint/domain conventions on `api.revcenter.ai`.
5. Every lane logs commit SHA + PR link before marked complete.

## 3. Wave A: Spec Lanes

| Lane | Industry | Branch | Worktree | Primary Scope |
|---|---|---|---|---|
| S-HVAC | HVAC | `feature/spec-hvac` | `../revcenter-worktrees/spec-hvac` | `specs/v1/agent-factory/industry/hvac*`, `specs/v1/agent-factory/core-tabs/hvac*` |
| S-PLMB | Plumbing | `feature/spec-plumbing` | `../revcenter-worktrees/spec-plumbing` | `specs/v1/agent-factory/industry/plumbing*`, `specs/v1/agent-factory/core-tabs/plumbing*` |
| S-ROOF | Roofing | `feature/spec-roofing` | `../revcenter-worktrees/spec-roofing` | `specs/v1/agent-factory/industry/roofing*`, `specs/v1/agent-factory/core-tabs/roofing*` |
| S-ELEC | Electrical | `feature/spec-electrical` | `../revcenter-worktrees/spec-electrical` | `specs/v1/agent-factory/industry/electrical*`, `specs/v1/agent-factory/core-tabs/electrical*` |
| S-FIRE | Fire Safety | `feature/spec-fire-safety` | `../revcenter-worktrees/spec-fire-safety` | `specs/v1/agent-factory/industry/fire-safety*`, `specs/v1/agent-factory/core-tabs/fire-safety*` |
| S-PEST | Pest Control | `feature/spec-pest-control` | `../revcenter-worktrees/spec-pest-control` | `specs/v1/agent-factory/industry/pest-control*`, `specs/v1/agent-factory/core-tabs/pest-control*` |
| S-GRGE | Garage Doors | `feature/spec-garage-doors` | `../revcenter-worktrees/spec-garage-doors` | `specs/v1/agent-factory/industry/garage-doors*`, `specs/v1/agent-factory/core-tabs/garage-doors*` |
| S-CLNG | Cleaning Services | `feature/spec-cleaning-services` | `../revcenter-worktrees/spec-cleaning-services` | `specs/v1/agent-factory/industry/cleaning-services*`, `specs/v1/agent-factory/core-tabs/cleaning-services*` |

Spec lane rules:

1. Do not edit another industry’s files in lane branches.
2. Defer shared files (`industry-index.md`, `specs/v1/README.md`) to integration lane only.

## 4. Wave B: Implementation Lanes

| Lane | Industry | Branch | Worktree | Starts From |
|---|---|---|---|---|
| I-HVAC | HVAC | `feature/impl-hvac` | `../revcenter-worktrees/impl-hvac` | `feature/spec-hvac` |
| I-PLMB | Plumbing | `feature/impl-plumbing` | `../revcenter-worktrees/impl-plumbing` | `feature/spec-plumbing` |
| I-ROOF | Roofing | `feature/impl-roofing` | `../revcenter-worktrees/impl-roofing` | `feature/spec-roofing` |
| I-ELEC | Electrical | `feature/impl-electrical` | `../revcenter-worktrees/impl-electrical` | `feature/spec-electrical` |
| I-FIRE | Fire Safety | `feature/impl-fire-safety` | `../revcenter-worktrees/impl-fire-safety` | `feature/spec-fire-safety` |
| I-PEST | Pest Control | `feature/impl-pest-control` | `../revcenter-worktrees/impl-pest-control` | `feature/spec-pest-control` |
| I-GRGE | Garage Doors | `feature/impl-garage-doors` | `../revcenter-worktrees/impl-garage-doors` | `feature/spec-garage-doors` |
| I-CLNG | Cleaning Services | `feature/impl-cleaning-services` | `../revcenter-worktrees/impl-cleaning-services` | `feature/spec-cleaning-services` |

Implementation lane rules:

1. Prefer isolated industry config files/modules per lane.
2. Keep shared runtime-wiring edits minimal and schedule them in integration order.
3. Rebase each `feature/impl-*` on latest integration before merge.

## 5. Shared-Core Lane (Conflict Control)

Use one shared lane for cross-industry/common runtime files:

1. Branch: `feature/impl-shared-core`
2. Worktree: `../revcenter-worktrees/impl-shared-core`
3. Scope:
`backend/src/services/agent.service.ts`
`backend/src/clients/elevenlabs.client.ts`
`shared/types/src/requests/agent.ts`
`frontend/hooks/api/useAgent.ts`
`frontend/components/agent/tabs/AgentTab.tsx`
`frontend/components/agent/tabs/ToolsTab.tsx`
`frontend/components/agent/tabs/AdvancedTab.tsx`

Rule:

1. Industry lanes avoid these files unless explicitly approved in daily coordination.

## 6. Bootstrap Commands

Spec wave:

```bash
scripts/bootstrap-industry-worktrees.sh \
  --mode spec \
  --base-branch feature/agent-factory-baseline \
  --worktree-root ../revcenter-worktrees
```

Implementation wave:

```bash
scripts/bootstrap-industry-worktrees.sh \
  --mode impl \
  --impl-from-prefix feature/spec- \
  --worktree-root ../revcenter-worktrees
```

Spec regeneration helper (if packs change):

```bash
scripts/generate-industry-spec-artifacts.sh
```

## 7. Merge Strategy

1. Merge all `feature/spec-*` into `feature/spec-integration`.
2. Run spec validation (`YAML` parse + docs review) on integration branch.
3. Rebase all `feature/impl-*` onto latest `feature/spec-integration`.
4. Merge `feature/impl-shared-core` first into `feature/impl-integration`.
5. Merge industry `feature/impl-*` branches one by one into `feature/impl-integration`.
6. Run backend/frontend typechecks and smoke tests.
7. Promote to main only when all gates pass.

## 8. Gate Checklist (Per Lane)

1. Industry artifacts present (prompt, workflow, core-tabs, blueprint, capability map).
2. Owner-editable fields unchanged from governance contract.
3. Tooling policy uses docs-aligned `tool_ids` + `built_in_tools`.
4. Security posture includes private-agent/signed URL policy.
5. Baseline tests listed and mapped for industry flows.

## 9. Commit Proof Ledger

| Lane | Branch | Commit SHA | PR Link | Status |
|---|---|---|---|---|
| S-HVAC | `feature/spec-hvac` | pending | pending | open |
| S-PLMB | `feature/spec-plumbing` | pending | pending | open |
| S-ROOF | `feature/spec-roofing` | pending | pending | open |
| S-ELEC | `feature/spec-electrical` | pending | pending | open |
| S-FIRE | `feature/spec-fire-safety` | pending | pending | open |
| S-PEST | `feature/spec-pest-control` | pending | pending | open |
| S-GRGE | `feature/spec-garage-doors` | pending | pending | open |
| S-CLNG | `feature/spec-cleaning-services` | pending | pending | open |
| I-HVAC | `feature/impl-hvac` | pending | pending | open |
| I-PLMB | `feature/impl-plumbing` | pending | pending | open |
| I-ROOF | `feature/impl-roofing` | pending | pending | open |
| I-ELEC | `feature/impl-electrical` | pending | pending | open |
| I-FIRE | `feature/impl-fire-safety` | pending | pending | open |
| I-PEST | `feature/impl-pest-control` | pending | pending | open |
| I-GRGE | `feature/impl-garage-doors` | pending | pending | open |
| I-CLNG | `feature/impl-cleaning-services` | pending | pending | open |
| I-CORE | `feature/impl-shared-core` | pending | pending | open |
