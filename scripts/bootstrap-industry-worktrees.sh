#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Bootstrap per-industry git worktrees for parallel spec or implementation sessions.

Usage:
  scripts/bootstrap-industry-worktrees.sh [options]

Options:
  --mode <spec|impl>               Worktree wave to create (default: spec)
  --base-branch <branch>           Base branch for spec mode (default: current branch)
  --impl-from-prefix <prefix>      Source branch prefix for impl mode (default: feature/spec-)
  --branch-prefix <prefix>         New branch prefix (default: feature/spec- or feature/impl- by mode)
  --worktree-root <path>           Root directory for worktrees (default: ../revcenter-worktrees)
  --industries "<slugs...>"        Space-separated industry slugs
  --dry-run                        Print actions without creating worktrees
  -h, --help                       Show help

Examples:
  scripts/bootstrap-industry-worktrees.sh \
    --mode spec \
    --base-branch feature/agent-factory-baseline

  scripts/bootstrap-industry-worktrees.sh \
    --mode impl \
    --impl-from-prefix feature/spec-
EOF
}

die() {
  echo "Error: $*" >&2
  exit 1
}

log() {
  echo "[bootstrap] $*"
}

MODE="spec"
BASE_BRANCH=""
IMPL_FROM_PREFIX="feature/spec-"
BRANCH_PREFIX=""
WORKTREE_ROOT="../revcenter-worktrees"
DRY_RUN="false"

DEFAULT_INDUSTRIES=(
  "hvac"
  "plumbing"
  "roofing"
  "electrical"
  "fire-safety"
  "pest-control"
  "garage-doors"
  "cleaning-services"
)

INDUSTRIES=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --mode)
      MODE="${2:-}"
      shift 2
      ;;
    --base-branch)
      BASE_BRANCH="${2:-}"
      shift 2
      ;;
    --impl-from-prefix)
      IMPL_FROM_PREFIX="${2:-}"
      shift 2
      ;;
    --branch-prefix)
      BRANCH_PREFIX="${2:-}"
      shift 2
      ;;
    --worktree-root)
      WORKTREE_ROOT="${2:-}"
      shift 2
      ;;
    --industries)
      IFS=' ' read -r -a INDUSTRIES <<< "${2:-}"
      shift 2
      ;;
    --dry-run)
      DRY_RUN="true"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "Unknown argument: $1"
      ;;
  esac
done

if [[ "$MODE" != "spec" && "$MODE" != "impl" ]]; then
  die "--mode must be one of: spec, impl"
fi

if [[ ${#INDUSTRIES[@]} -eq 0 ]]; then
  INDUSTRIES=("${DEFAULT_INDUSTRIES[@]}")
fi

if [[ -z "$BASE_BRANCH" ]]; then
  BASE_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
fi

if [[ -z "$BRANCH_PREFIX" ]]; then
  if [[ "$MODE" == "spec" ]]; then
    BRANCH_PREFIX="feature/spec-"
  else
    BRANCH_PREFIX="feature/impl-"
  fi
fi

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

if ! git rev-parse --verify --quiet "$BASE_BRANCH" >/dev/null; then
  die "Base branch/reference not found: $BASE_BRANCH"
fi

extract_section_list() {
  local file="$1"
  local section_header="$2"
  local section_lines
  section_lines="$(awk -v header="$section_header" '
    $0 ~ "^" header "$" { in_section=1; next }
    in_section && /^## / { exit }
    in_section { print }
  ' "$file")"
  awk -F'|' '
    /^\| `/ {
      gsub(/`/, "", $2)
      gsub(/^ +| +$/, "", $2)
      if ($2 != "") {
        print $2
      }
    }
  ' <<< "$section_lines"
}

ensure_worktree() {
  local branch="$1"
  local path="$2"
  local start_ref="$3"

  if [[ -e "$path" ]]; then
    log "Skipping existing path: $path"
    return
  fi

  if git show-ref --verify --quiet "refs/heads/$branch"; then
    if [[ "$DRY_RUN" == "true" ]]; then
      log "DRY-RUN git worktree add \"$path\" \"$branch\""
    else
      git worktree add "$path" "$branch"
    fi
  else
    if [[ "$DRY_RUN" == "true" ]]; then
      log "DRY-RUN git worktree add -b \"$branch\" \"$path\" \"$start_ref\""
    else
      git worktree add -b "$branch" "$path" "$start_ref"
    fi
  fi
}

write_brief() {
  local wt_path="$1"
  local slug="$2"
  local branch="$3"
  local phase="$4"

  local pack_file="$wt_path/specs/v1/agent-factory/industry/${slug}.md"
  local checklist_file="$wt_path/specs/v1/agent-factory/industry/${slug}-release-checklist.md"
  local brief_file="$wt_path/WORKTREE_BRIEF.md"

  if [[ ! -f "$pack_file" ]]; then
    log "No industry pack found at $pack_file; skipping brief generation."
    return
  fi

  service_ids=()
  while IFS= read -r line; do
    [[ -n "$line" ]] && service_ids+=("$line")
  done < <(extract_section_list "$pack_file" "## 2\\. Service Taxonomy")

  intent_ids=()
  while IFS= read -r line; do
    [[ -n "$line" ]] && intent_ids+=("$line")
  done < <(extract_section_list "$pack_file" "## 3\\. Intent Map")

  local services_display intents_display
  services_display="$(printf '%s\n' "${service_ids[@]:-}" | sed '/^$/d' | paste -sd ', ' -)"
  intents_display="$(printf '%s\n' "${intent_ids[@]:-}" | sed '/^$/d' | paste -sd ', ' -)"

  if [[ -z "$services_display" ]]; then
    services_display="(extract manually from ${pack_file#"$wt_path/"})"
  fi
  if [[ -z "$intents_display" ]]; then
    intents_display="(extract manually from ${pack_file#"$wt_path/"})"
  fi

  local system_prompt_path="specs/v1/agent-factory/industry/${slug}-system-prompt.v1.md"
  local workflow_path="specs/v1/agent-factory/industry/${slug}-workflow.v1.yaml"
  local core_tabs_path="specs/v1/agent-factory/core-tabs/${slug}-core-tabs-profile.v1.yaml"
  local blueprint_path="specs/v1/agent-factory/industry/${slug}-blueprint.v1.yaml"

  cat > "$brief_file" <<EOF
# Worktree Brief

Mode: ${phase}
Industry: ${slug}
Branch: ${branch}

## Goal

Apply per-industry nuances from the industry pack while keeping main agent-factory template logic consistent.

## Main Template Logic (Do Not Diverge)

1. specs/v1/agent-factory/templates/elevenlabs-v3-system-prompt.template.md
2. specs/v1/agent-factory/templates/elevenlabs-workflow.template.yaml
3. specs/v1/agent-factory/templates/core-agent-tabs-config.template.yaml
4. specs/v1/14-elevenlabs-v3-prompt-workflow-tab-governance.md

## Industry Nuance Sources

1. ${pack_file#"$wt_path/"}
2. ${checklist_file#"$wt_path/"}

## Extracted Nuance

Service IDs:
${services_display}

Intent IDs:
${intents_display}

## Target Artifacts

1. ${system_prompt_path}
2. ${workflow_path}
3. ${core_tabs_path}
4. ${blueprint_path}
5. specs/v1/agent-factory/industry-index.md

## Execution Rules

1. Keep owner scope locked to greeting + voice.
2. Keep endpoints standardized to api.revcenter.ai.
3. Keep tool policy docs-aligned (tool_ids + built_in_tools; server tool approval modes).
4. Commit only this industry's files in this branch.
EOF

  local exclude_file
  exclude_file="$(git -C "$wt_path" rev-parse --git-path info/exclude)"
  touch "$exclude_file"
  if ! grep -qxF "WORKTREE_BRIEF.md" "$exclude_file"; then
    echo "WORKTREE_BRIEF.md" >> "$exclude_file"
  fi
}

mkdir -p "$WORKTREE_ROOT"

for slug in "${INDUSTRIES[@]}"; do
  if [[ "$MODE" == "spec" ]]; then
    phase="spec"
    branch="${BRANCH_PREFIX}${slug}"
    wt_path="${WORKTREE_ROOT%/}/spec-${slug}"
    start_ref="$BASE_BRANCH"
  else
    phase="impl"
    branch="${BRANCH_PREFIX}${slug}"
    wt_path="${WORKTREE_ROOT%/}/impl-${slug}"
    start_ref="${IMPL_FROM_PREFIX}${slug}"

    if ! git rev-parse --verify --quiet "$start_ref" >/dev/null; then
      die "Impl source branch/reference not found for ${slug}: ${start_ref}"
    fi
  fi

  log "Preparing ${phase} worktree for ${slug}"
  ensure_worktree "$branch" "$wt_path" "$start_ref"

  if [[ "$DRY_RUN" == "true" ]]; then
    log "DRY-RUN would write brief: ${wt_path}/WORKTREE_BRIEF.md"
  else
    write_brief "$wt_path" "$slug" "$branch" "$phase"
  fi
done

log "Done. Worktrees root: ${WORKTREE_ROOT}"
