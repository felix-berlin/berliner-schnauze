#!/usr/bin/env bash
# Orca setup hook (orca.yaml: scripts.setup), runs in every new worktree: dependencies, an own database cloned from
# `bs_template` (scripts/dev-template.sh builds it from a backup), the fixed dev admin, and this worktree's ports and
# database URLs in the git-ignored .env.worktree (read by scripts/with-env.sh). Idempotent; prints no secret.
set -euo pipefail
cd "${ORCA_WORKTREE_PATH:-$(dirname "$0")/..}"
# shellcheck disable=SC1091
. scripts/lib/dev-db.sh

ws="$(dev_db_slug "${ORCA_WORKSPACE_NAME:-$(basename "$PWD")}")"
db="bsw_${ws}" # never collides with bs_template*
echo "== worktree database: $db"

dev_db_require_docker # before the slow install: a stopped Docker should not cost minutes first
pnpm install --frozen-lockfile

dev_db_load_env
dev_db_lock

db_exists "$DEV_DB_TEMPLATE" || bash scripts/dev-template.sh
db_exists "$db" || psql_admin -c "CREATE DATABASE \"$db\" TEMPLATE \"$DEV_DB_TEMPLATE\""
db_exists "${db}_test" || psql_admin -c "CREATE DATABASE \"${db}_test\""
dev_db_unlock

# Stable ports per worktree name (parallel agents must not collide on 4321/3001/4322). shortcut: a hash clash is
# possible (1 in 200); delete .env.worktree and rename the workspace, or edit the ports there.
h="$(printf %s "$ws" | cksum | cut -d' ' -f1)"
off=$((h % 200))
web=$((4400 + off)) cms=$((3100 + off)) e2e=$((5400 + off))
(
  umask 077
  cat >.env.worktree <<EOF
DATABASE_URL=$(dev_db_url "$db")
DATABASE_URL_TEST=$(dev_db_url "${db}_test")
WEBSITE_PORT=$web
CMS_PORT=$cms
E2E_PORT=$e2e
PAYLOAD_SERVER_URL=http://localhost:$cms
SITE_URL=http://localhost:$web
EOF
)

# Bring the clone to this branch's schema (the template may come from another branch). After `pnpm cms:dev` the
# database carries Payload's dev-push marker (batch -1): migrate would then stop at an interactive data-loss prompt and
# hang this hook, and cms:dev syncs the schema itself on its next start.
if [ "$(psql_admin -d "$db" -tAc "SELECT 1 FROM payload_migrations WHERE batch = -1 LIMIT 1")" = 1 ]; then
  echo "== migrate skipped: $db is in dev-push mode (pnpm cms:dev syncs its schema)"
else
  (
    set -a
    # shellcheck disable=SC1091
    . ./.env.worktree
    set +a
    PAYLOAD_SECRET=dev-setup-secret NODE_ENV=production pnpm --filter payload-app migrate
  )
fi

# Fixed dev admin and MCP key from Infisical (DEV_ADMIN_EMAIL, DEV_ADMIN_PASSWORD, DEV_MCP_KEY). Needs `infisical login`.
if ! scripts/with-env.sh env NODE_ENV=production pnpm --filter payload-app dev:access; then
  echo "!! dev admin not created (infisical login? DEV_* secrets set?). Later: scripts/with-env.sh env NODE_ENV=production pnpm --filter payload-app dev:access" >&2
fi

echo "== ready: website :$web, cms :$cms, e2e :$e2e (pnpm dev / pnpm cms:dev)"
