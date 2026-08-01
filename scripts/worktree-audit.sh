#!/usr/bin/env bash

set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
worktree_root="${WORKTREE_ROOT:-$HOME/revcenter-worktrees}"
registered_worktrees_file="$(mktemp)"
trap 'rm -f "$registered_worktrees_file"' EXIT

git worktree list --porcelain | awk '
  /^worktree / { print substr($0, 10) }
' >"$registered_worktrees_file"

echo "Repo root: $repo_root"
echo
echo "Registered worktrees:"
git worktree list

echo
echo "Prunable entries:"
if git worktree list --porcelain | rg -q '^prunable '; then
  git worktree list --porcelain | awk '
    /^worktree / { worktree = substr($0, 10) }
    /^prunable / { print "  " worktree " -> " substr($0, 10) }
  '
else
  echo "  none"
fi

echo
echo "Orphan directories under $worktree_root:"
if [[ ! -d "$worktree_root" ]]; then
  echo "  missing"
  exit 0
fi

found_orphan=0
while IFS= read -r path; do
  [[ -d "$path" ]] || continue
  if ! rg -Fqx -- "$path" "$registered_worktrees_file" >/dev/null 2>&1; then
    echo "  $path"
    found_orphan=1
  fi
done < <(find "$worktree_root" -mindepth 1 -maxdepth 1 -type d | sort)

if [[ "$found_orphan" -eq 0 ]]; then
  echo "  none"
fi
