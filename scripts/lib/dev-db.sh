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
    echo "!! Docker is not running. Start it, then run this script again (safe to repeat)" >&2
    return 1
  }
}

# Creates the password file on first use, starts (or creates) the container, waits for it and checks the password;
# sets POSTGRES_USER / POSTGRES_PASSWORD (not exported: each script loads them)
dev_db_load_env() {
  dev_db_require_docker || return 1
  if [ ! -f "$DEV_PG_ENV" ]; then
    mkdir -p "$(dirname "$DEV_PG_ENV")"
    (umask 077 && printf 'POSTGRES_PASSWORD=%s\n' "$(openssl rand -hex 24)" >"$DEV_PG_ENV")
  fi
  # shellcheck disable=SC1090
  . "$DEV_PG_ENV"
  POSTGRES_USER="bs"
  # dev_db_url puts the password into a URL unencoded: only the generated hex form is safe there
  [[ "$POSTGRES_PASSWORD" =~ ^[0-9a-f]+$ ]] || { echo "!! $DEV_PG_ENV: POSTGRES_PASSWORD must be hex (openssl rand -hex 24)" >&2; return 1; }

  if docker container inspect "$DEV_PG_NAME" >/dev/null 2>&1; then
    docker start "$DEV_PG_NAME" >/dev/null || return 1
  else
    docker run -d --name "$DEV_PG_NAME" --restart unless-stopped \
      -e POSTGRES_USER="$POSTGRES_USER" -e POSTGRES_PASSWORD="$POSTGRES_PASSWORD" -e POSTGRES_DB=postgres \
      -v bs-dev-pgdata:/var/lib/postgresql -p "127.0.0.1:${DEV_PG_PORT}:5432" postgres:18 >/dev/null || return 1
  fi
  local i
  for i in $(seq 60); do
    docker exec "$DEV_PG_NAME" pg_isready -q -U "$POSTGRES_USER" -d postgres && break
    [ "$i" = 60 ] && { echo "!! $DEV_PG_NAME not ready after 60 s:" >&2; docker logs --tail 20 "$DEV_PG_NAME" >&2; return 1; }
    sleep 1
  done
  # The volume keeps the password of its first start: a regenerated $DEV_PG_ENV would put a wrong one into .env.worktree.
  # Checked over the container's own network address: the image trusts the socket and 127.0.0.1 without a password.
  docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" "$DEV_PG_NAME" sh -c 'psql -h "$(hostname -i)" -U "$POSTGRES_USER" -d postgres -tAc "SELECT 1"' >/dev/null 2>&1 ||
    { echo "!! the password in $DEV_PG_ENV does not match the volume bs-dev-pgdata (restore the file or recreate the volume)" >&2; return 1; }
}

# psql as the superuser, inside the container (no password on the wire); stdin passes through for dumps
psql_admin() { docker exec -i "$DEV_PG_NAME" psql -v ON_ERROR_STOP=1 -q -U "$POSTGRES_USER" -d postgres "$@"; }

db_exists() { [ "$(psql_admin -tAc "SELECT 1 FROM pg_database WHERE datname = '$1'")" = 1 ]; }

# Workspace name -> database name part: lower case [a-z0-9_], at most 54 characters (63 minus "bsw_" and "_test")
dev_db_slug() { printf %s "$1" | tr 'A-Z-' 'a-z_' | tr -cd 'a-z0-9_' | cut -c1-54; }

# URL of a database on that Postgres (user and password are URL-safe, see dev_db_load_env)
dev_db_url() { printf 'postgres://%s:%s@127.0.0.1:%s/%s' "$POSTGRES_USER" "$POSTGRES_PASSWORD" "$DEV_PG_PORT" "$1"; }

# One setup/template build at a time: parallel worktrees would race on bs_template. A child script of a locked
# script (orca-setup.sh -> dev-template.sh) must not lock again: flock on a second descriptor would block forever.
dev_db_lock() {
  [ -z "${DEV_DB_LOCKED:-}" ] || return 0
  exec 9>"${XDG_RUNTIME_DIR:-/tmp}/bs-dev-db.lock"
  flock 9
  export DEV_DB_LOCKED=1
}

# Releases the lock once the shared databases are done, so later per-worktree steps don't serialise parallel setups
dev_db_unlock() {
  exec 9>&-
  unset DEV_DB_LOCKED
}
