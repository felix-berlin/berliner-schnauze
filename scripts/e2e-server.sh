#!/usr/bin/env bash
# E2E server of this worktree (port E2E_PORT from .env.worktree, throwaway DB <worktree db>_e2e).
#   scripts/e2e-server.sh setup   fresh DB: migrate + seed:e2e + build (run after code or schema changes)
#   scripts/e2e-server.sh serve   start the built server in the foreground (Ctrl-C stops it)
#   scripts/e2e-server.sh all     setup, then serve
# Then: cd website && ../scripts/with-env.sh npx playwright test <file> --project=chromium
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; . ./.env.worktree; set +a
U=$(echo "$DATABASE_URL" | sed -E 's#postgres://([^:]+):.*#\1#')
E2E_DB="$(basename "${DATABASE_URL%%\?*}")_e2e"
export E2E_DATABASE_URL="${DATABASE_URL%/*}/$E2E_DB"

setup() {
  docker exec bs-dev-postgres psql -U "$U" -d postgres \
    -c "DROP DATABASE IF EXISTS $E2E_DB WITH (FORCE)" -c "CREATE DATABASE $E2E_DB"
  scripts/with-env.sh bash -c '
    export DATABASE_URL="$E2E_DATABASE_URL" NODE_ENV=production
    pnpm --filter payload-app migrate
    pnpm --filter payload-app seed:e2e
    E2E_BUILD=1 pnpm build'
}

serve() {
  lsof -ti ":$E2E_PORT" | xargs -r kill || true   # a stale server on the port
  scripts/with-env.sh bash -c '
    export DATABASE_URL="$E2E_DATABASE_URL" NODE_ENV=production E2E_SERVER=1 \
      PORT=$E2E_PORT PAYLOAD_SERVER_URL=http://localhost:$E2E_PORT SITE_URL=http://localhost:$E2E_PORT
    cd website && exec node server/index.mjs'
}

case "${1:-all}" in
  setup) setup ;;
  serve) serve ;;
  all) setup && serve ;;
  *) echo "usage: $0 setup|serve|all" >&2; exit 2 ;;
esac
