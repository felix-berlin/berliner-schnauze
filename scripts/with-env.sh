#!/usr/bin/env bash
# Runs a command with the DEV secrets from Infisical plus this worktree's own overrides (.env.worktree: database URLs,
# ports). Always `--env=dev`: the branch mapping in .infisical.yaml must never pick prod (prod Matomo ID, prod
# database) just because a checkout sits on main. Usage: scripts/with-env.sh <command> [args…]
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"

# outside a pnpm script the CLI is not on PATH
inf=(infisical)
command -v infisical >/dev/null || inf=(pnpm exec infisical)

exec "${inf[@]}" run --env=dev -- bash -c '
  if [ -f "$1/.env.worktree" ]; then set -a; . "$1/.env.worktree"; set +a; fi
  shift
  exec "$@"
' _ "$root" "$@"
