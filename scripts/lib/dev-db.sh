#!/usr/bin/env bash
# Shared helpers of the worktree scripts (orca-setup.sh, orca-archive.sh, dev-template.sh): one dev-only Postgres
# container (`bs-dev-postgres`, own volume, 127.0.0.1:5433) holds a database per worktree, cloned from the template
# `bs_template`. The scripts start it on demand. Its superuser password is generated once into a private file
# (~/.config/berliner-schnauze/dev-postgres.env, mode 600); nothing here prints it. Source this file.

DEV_PG_NAME="bs-dev-postgres"
DEV_PG_PORT="${BS_DEV_PG_PORT:-5433}"
DEV_PG_ENV="${XDG_CONFIG_HOME:-$HOME/.config}/berliner-schnauze/dev-postgres.env"
DEV_DB_TEMPLATE="bs_template"

# Fails fast with a readable message when the Docker daemon is not running
dev_db_require_docker() {
  docker info >/dev/null 2>&1 || {
    echo "!! Docker is not running. Start it, then run: bash scripts/orca-setup.sh (in this worktree; safe to repeat)" >&2
    return 1
  }
}

# Starts (or creates) the container, then sets PG_CID and exports POSTGRES_USER / POSTGRES_PASSWORD / POSTGRES_PORT
dev_db_load_env() {
  dev_db_require_docker || return 1
  if [ ! -f "$DEV_PG_ENV" ]; then
    mkdir -p "$(dirname "$DEV_PG_ENV")"
    (umask 077 && printf 'POSTGRES_PASSWORD=%s\n' "$(openssl rand -hex 24)" >"$DEV_PG_ENV")
  fi
  # shellcheck disable=SC1090
  . "$DEV_PG_ENV"
  POSTGRES_USER="bs"
  POSTGRES_PORT="$DEV_PG_PORT"

  if [ -z "$(docker ps -q --filter "name=^${DEV_PG_NAME}\$")" ]; then
    if [ -n "$(docker ps -aq --filter "name=^${DEV_PG_NAME}\$")" ]; then
      docker start "$DEV_PG_NAME" >/dev/null
    else
      docker run -d --name "$DEV_PG_NAME" --restart unless-stopped \
        -e POSTGRES_USER="$POSTGRES_USER" -e POSTGRES_PASSWORD="$POSTGRES_PASSWORD" -e POSTGRES_DB=postgres \
        -v bs-dev-pgdata:/var/lib/postgresql -p "127.0.0.1:${DEV_PG_PORT}:5432" postgres:18 >/dev/null
    fi
  fi
  PG_CID="$(docker ps -q --filter "name=^${DEV_PG_NAME}\$")"
  until docker exec "$PG_CID" pg_isready -q -U "$POSTGRES_USER" -d postgres; do sleep 1; done
  export PG_CID POSTGRES_USER POSTGRES_PASSWORD POSTGRES_PORT
}

# psql as the superuser, inside the container (no password on the wire); stdin passes through for dumps
psql_admin() { docker exec -i "$PG_CID" psql -v ON_ERROR_STOP=1 -q -U "$POSTGRES_USER" -d postgres "$@"; }

db_exists() { [ "$(psql_admin -tAc "SELECT 1 FROM pg_database WHERE datname = '$1'")" = 1 ]; }

# Workspace name -> database name part: lower case [a-z0-9_], at most 40 characters
dev_db_slug() { printf %s "$1" | tr 'A-Z-' 'a-z_' | tr -cd 'a-z0-9_' | cut -c1-40; }

# URL of a database on that Postgres, credentials encoded
dev_db_url() {
  local user pass
  user="$(node -e 'process.stdout.write(encodeURIComponent(process.argv[1]))' "$POSTGRES_USER")"
  pass="$(node -e 'process.stdout.write(encodeURIComponent(process.argv[1]))' "$POSTGRES_PASSWORD")"
  printf 'postgres://%s:%s@127.0.0.1:%s/%s' "$user" "$pass" "$POSTGRES_PORT" "$1"
}

# One setup/template build at a time: parallel worktrees would race on bs_template. A child script of a locked
# script (orca-setup.sh -> dev-template.sh) must not lock again: flock on a second descriptor would block forever.
dev_db_lock() {
  [ -z "${DEV_DB_LOCKED:-}" ] || return 0
  exec 9>"${XDG_RUNTIME_DIR:-/tmp}/bs-dev-db.lock"
  flock 9
  export DEV_DB_LOCKED=1
}
