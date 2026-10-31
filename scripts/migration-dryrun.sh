#!/usr/bin/env bash
# Dry run before a deploy: restores a production backup into a throwaway Postgres container, applies the
# pending migrations of this checkout and reads every collection. Nothing touches a real database.
# Usage: scripts/migration-dryrun.sh <backup.dump|backup.sql> [postgres-image=postgres:18]
set -euo pipefail
cd "$(dirname "$0")/.."

dump="${1:?usage: migration-dryrun.sh <backup.dump|backup.sql> [image]}"
image="${2:-postgres:18}"
[ -f "$dump" ] || { echo "no such file: $dump" >&2; exit 1; }
dump="$(realpath "$dump")"

name="bs-migration-dryrun-$$"
cleanup() { docker rm -f "$name" >/dev/null 2>&1 || true; }
trap cleanup EXIT

docker run -d --name "$name" -e POSTGRES_PASSWORD=dryrun -e POSTGRES_DB=dryrun -p 127.0.0.1:0:5432 \
  -v "$dump:/backup:ro" "$image" >/dev/null
until docker exec "$name" pg_isready -U postgres -d dryrun >/dev/null 2>&1; do sleep 1; done
port="$(docker port "$name" 5432/tcp | head -1 | sed 's/.*://')"

echo "== restoring $(basename "$dump")"
if [[ "$dump" == *.sql ]]; then
  docker exec "$name" psql -v ON_ERROR_STOP=1 -q -U postgres -d dryrun -f /backup
else
  docker exec "$name" pg_restore --no-owner --no-privileges -U postgres -d dryrun /backup
fi

export DATABASE_URL="postgres://postgres:dryrun@127.0.0.1:${port}/dryrun"
export PAYLOAD_SECRET="${PAYLOAD_SECRET:-dryrun-secret}"
export NODE_ENV=production
echo "== migrate"
pnpm --filter payload-app migrate
echo "== verify"
pnpm --filter payload-app verify:db
echo "== dry run passed: the migrations apply to this backup and every collection reads"
