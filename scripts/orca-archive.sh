#!/usr/bin/env bash
# Orca archive hook (orca.yaml: scripts.archive): drops this worktree's databases and frees its ports.
# The database name comes from .env.worktree (written by orca-setup.sh), never recomputed: no file, nothing dropped.
set -euo pipefail
cd "${ORCA_WORKTREE_PATH:-$(dirname "$0")/..}"
# shellcheck disable=SC1091
. scripts/lib/dev-db.sh

[ -f .env.worktree ] || { echo "no .env.worktree: nothing to clean up"; exit 0; }
db="$(sed -n 's|^DATABASE_URL=.*/\(bsw_[a-z0-9_]*\)$|\1|p' .env.worktree)"
[ -n "$db" ] || { echo "no bsw_ database in .env.worktree: leaving the databases alone" >&2; exit 0; }

# dev servers of this worktree
# shellcheck disable=SC2046 # one word per port
fuser -k $(sed -n 's/^\(WEBSITE\|CMS\|E2E\)_PORT=\(.*\)/\2\/tcp/p' .env.worktree) >/dev/null 2>&1 || true

# A stopped Docker must not block archiving: leave the databases and say so
dev_db_require_docker || { echo "!! databases $db and ${db}_test stay behind; drop them later (psql on bs-dev-postgres)" >&2; exit 0; }
dev_db_load_env || { echo "!! databases $db and ${db}_test stay behind (dev Postgres not usable)" >&2; exit 0; }
dev_db_lock
for name in "$db" "${db}_test"; do
  psql_admin -c "DROP DATABASE IF EXISTS \"$name\" WITH (FORCE)"
done
rm -f .env.worktree
echo "== dropped $db and ${db}_test"
