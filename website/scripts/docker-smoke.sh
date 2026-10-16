#!/usr/bin/env bash
# Smoke test for the Docker image: builds from an existing dist/, starts it via
# compose, waits for the healthcheck and checks routing, headers and redirects.
# Usage: website/scripts/docker-smoke.sh   (needs a prior `pnpm build`)
set -euo pipefail
# compose.yaml and its .env live in the repo root.
cd "$(dirname "$0")/../.."

BASE="http://localhost:${PORT:-4321}"
fail=0

# Only `web` is under test. Compose interpolates the whole file, so the
# required vars of `postgres`/`cms` need (dummy) values even when they don't start.
export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-smoke}" PAYLOAD_SECRET="${PAYLOAD_SECRET:-smoke}" \
  PAYLOAD_SERVER_URL="${PAYLOAD_SERVER_URL:-http://localhost:3001}"

# The server validates its required runtime secrets on start: give it a dummy one unless a real .env exists.
made_env=0
if [[ ! -f .env ]]; then printf 'IMAGOR_SECRET=smoke\n' > .env; made_env=1; fi
# A postgres that already runs (the local dev database) stays up: only what this script started goes down.
pg_was_up=$(docker compose ps -q --status running postgres 2>/dev/null || true)
cleanup() {
  if [[ -n $pg_was_up ]]; then
    docker compose rm -sf web >/dev/null 2>&1 || true
  else
    docker compose down --remove-orphans >/dev/null 2>&1 || true
  fi
  if [[ $made_env -eq 1 ]]; then rm -f .env; fi
}
trap cleanup EXIT

# Pages render from the database: migrate a fresh, dedicated database and fill it with the invented e2e data
# first (needs `pnpm install`). Never the dev database: the seed overwrites words by slug.
export POSTGRES_DB=bs_smoke
docker compose up -d --wait --wait-timeout 60 postgres
docker compose exec -T postgres psql -U "${POSTGRES_USER:-berliner}" -d postgres \
  -c "drop database if exists ${POSTGRES_DB}" -c "create database ${POSTGRES_DB}"
export DATABASE_URL="postgres://${POSTGRES_USER:-berliner}:${POSTGRES_PASSWORD}@127.0.0.1:${POSTGRES_PORT:-5432}/${POSTGRES_DB}"
NODE_ENV=production pnpm --filter payload-app migrate
pnpm --filter payload-app seed:e2e
docker compose up -d --build --wait --wait-timeout 60 web

check() { # name, actual, expected
  if [[ "$2" == "$3" ]]; then echo "ok   $1"; else echo "FAIL $1: got '$2', want '$3'"; fail=1; fi
}
status() { curl -s -o /dev/null -w '%{http_code}' "$BASE$1"; }
header() { curl -s -D - -o /dev/null "$BASE$1" | tr -d '\r' | grep -i "^$2:" | cut -d' ' -f2- || true; }

check "home 200" "$(status /)" 200
check "word page 200" "$(status /wort/aasen)" 200
check "unknown 404" "$(status /gibts-nicht-xyz)" 404
check "unknown word 404" "$(status /wort/gibts-nicht-xyz)" 404
check "sitemap 200" "$(status /sitemap-0.xml)" 200
check "og image 200" "$(status /og/aasen.png)" 200
check "og image type" "$(header /og/aasen.png content-type)" image/png
check "word of the day 200" "$(status /api/word-of-the-day)" 200
check "search index 200" "$(status /api/search/index.json)" 200
# Index and listing pages (formerly a.html next to an a/ folder, see the @astrojs/node patch).
for page in /wort /magazin /themen /changelog /settings /anki /games/berliner-oder-nicht; do
  check "page $page 200" "$(status "$page")" 200
done
check "folder slash 301" "$(status /magazin/)" 301
check "malformed query 200" "$(status '/games/berliner-oder-nicht/share?r=abc.%%%')" 200
check "malformed path 400" "$(status '/wort/%E0%A4%A')" 400
check "sw.js 200" "$(status /sw.js)" 200
check "trailing slash 301" "$(status /wort/aasen/)" 301
check "_redirects 301" "$(status /suggest-word)" 301
check "index redirect 301" "$(status /index)" 301
check "index redirect target" "$(header /index location)" /
check "_redirects target" "$(header /suggest-word location)" /wort-vorschlagen
check "_headers X-Frame-Options" "$(header /wort/aasen x-frame-options)" DENY
[[ -n "$(header / content-security-policy)" ]] && echo "ok   _headers CSP" || { echo "FAIL _headers CSP missing"; fail=1; }

# sed reads all input: `head -1` would SIGPIPE grep, and pipefail + set -e would exit silently.
asset=$(curl -s "$BASE/" | grep -o '/_astro/[^"]*\.js' | sed -n 1p)
check "_astro immutable" "$(header "$asset" cache-control)" "public, max-age=31536000, immutable"
[[ "$(header /_astro/missing.js cache-control)" != *immutable* ]] && echo "ok   _astro 404 not immutable" || { echo "FAIL _astro 404 is immutable"; fail=1; }

if [[ $fail -ne 0 ]]; then docker compose logs web; exit 1; fi
echo "Docker smoke test passed"
