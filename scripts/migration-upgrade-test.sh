#!/usr/bin/env bash
# Upgrade test: migrate a throwaway database with the BASE ref's code and seed it, then migrate it with this
# checkout, read every collection, roll the new migrations back and apply them again.
# That is what a deploy does (existing rows + only the new migrations), which docker-smoke's fresh database does not cover.
# Usage: DATABASE_URL=postgres://…/<name>_e2e scripts/migration-upgrade-test.sh [base-ref=origin/main]
set -euo pipefail
cd "$(dirname "$0")/.."

BASE_REF="${1:-origin/main}"
: "${DATABASE_URL:?set DATABASE_URL to a throwaway database whose name ends in _e2e}"
export PAYLOAD_SECRET="${PAYLOAD_SECRET:-upgrade-test-secret}"
export NODE_ENV=production

base_dir="$(mktemp -d)"
cleanup() { git worktree remove --force "$base_dir" 2>/dev/null || true; rm -rf "$base_dir"; }
trap cleanup EXIT

echo "== base: $BASE_REF"
git worktree add --detach "$base_dir" "$BASE_REF" >/dev/null
# A base whose lockfile pnpm's minimumReleaseAge gate rejects cannot be installed, so there is nothing to upgrade from.
# That is the base's problem (this PR may be the fix for it), not a migration failure: skip with a warning. Any other failure stays fatal.
rc=0
(
  cd "$base_dir"
  install_log="$(mktemp)"
  if ! pnpm install --frozen-lockfile >"$install_log" 2>&1; then
    cat "$install_log"
    grep -q ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION "$install_log" && exit 75
    exit 1
  fi
  pnpm --filter payload-app migrate
  pnpm --filter payload-app seed:e2e
) || rc=$?
if [ "$rc" -eq 75 ]; then
  echo "::warning::Upgrade test skipped: $BASE_REF does not install (minimumReleaseAge violation in its lockfile)."
  exit 0
fi
[ "$rc" -eq 0 ] || exit "$rc"

echo "== upgrade: this checkout on top of $BASE_REF"
pnpm --filter payload-app migrate
pnpm --filter payload-app verify:db

echo "== rollback of the new migrations, then forward again"
pnpm --filter payload-app migrate:down
pnpm --filter payload-app migrate
pnpm --filter payload-app verify:db
echo "== upgrade test passed"
