#!/usr/bin/env bash
# Builds the template database `bs_template` that every worktree database is cloned from: a production backup
# (Portabase or pg_dump) migrated to this checkout's schema, with the login data stripped (see below).
# Without a backup it falls back to the invented e2e data set, loudly. Run it again for a fresh backup;
# existing worktree databases keep their copy.
# Usage: scripts/dev-template.sh [backup.dump|backup.sql]   (default: $BS_DUMP or ~/backups/berliner-schnauze/latest.dump)
set -euo pipefail
cd "$(dirname "$0")/.."
# shellcheck disable=SC1091
. scripts/lib/dev-db.sh
dev_db_load_env
dev_db_lock

dump="${1:-${BS_DUMP:-$HOME/backups/berliner-schnauze/latest.dump}}"
# a backup named on purpose must exist; only the default path may fall back to the e2e data
[ -f "$dump" ] || [ -z "${1:-${BS_DUMP:-}}" ] || { echo "!! no backup at $dump" >&2; exit 1; }
# the e2e seed only writes to databases named *_e2e / *_smoke
if [ -f "$dump" ]; then build="bs_template_build"; else build="bs_template_e2e"; fi

db_exists "$build" && psql_admin -c "DROP DATABASE \"$build\" WITH (FORCE)"
psql_admin -c "CREATE DATABASE \"$build\""

export DATABASE_URL
DATABASE_URL="$(dev_db_url "$build")"
export PAYLOAD_SECRET="${PAYLOAD_SECRET:-dev-template-secret}"
export NODE_ENV=production

if [ -f "$dump" ]; then
  echo "== restoring $(basename "$dump")"
  if [[ "$dump" == *.sql ]]; then
    psql_admin -d "$build" <"$dump"
  else
    docker exec -i "$DEV_PG_NAME" pg_restore --no-owner --no-privileges -U "$POSTGRES_USER" -d "$build" <"$dump"
  fi
  echo "== migrate"
  pnpm --filter payload-app migrate
  # Login data of the production users never lands on a dev machine: hashes, API keys, sessions, MCP keys.
  # The user rows stay (posts, pages and the company global point at them); scripts/orca-setup.sh adds the fixed dev admin.
  echo "== strip login data"
  psql_admin -d "$build" -c "
    UPDATE users SET hash = NULL, salt = NULL, api_key = NULL, api_key_index = NULL, enable_a_p_i_key = false,
      reset_password_token = NULL, reset_password_expiration = NULL, login_attempts = 0, lock_until = NULL;
    TRUNCATE users_sessions, payload_mcp_api_keys, payload_preferences_rels, payload_preferences,
      payload_locked_documents_rels, payload_locked_documents RESTART IDENTITY;
    -- Profile answers (Ortsteil, age, origin) with a visitor hash stay out of dev databases.
    TRUNCATE word_feedback RESTART IDENTITY;"
else
  echo "!! no backup at $dump: building the template from the invented e2e data (no real words, images or audio)" >&2
  pnpm --filter payload-app migrate
  pnpm --filter payload-app seed:e2e
fi

echo "== verify"
pnpm --filter payload-app verify:db

db_exists "$DEV_DB_TEMPLATE" && psql_admin -c "DROP DATABASE \"$DEV_DB_TEMPLATE\" WITH (FORCE)"
psql_admin -c "ALTER DATABASE \"$build\" RENAME TO \"$DEV_DB_TEMPLATE\""
echo "== $DEV_DB_TEMPLATE ready"
