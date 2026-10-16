#!/usr/bin/env bash
# Smoke test for the Docker image: builds from an existing dist/, starts it via
# compose, waits for the healthcheck and checks routing, headers and redirects.
# Usage: scripts/docker-smoke.sh   (needs a prior `pnpm build`)
set -euo pipefail

BASE="http://localhost:${PORT:-4321}"
fail=0

cleanup() { docker compose down --remove-orphans >/dev/null 2>&1 || true; }
trap cleanup EXIT

docker compose up -d --build --wait --wait-timeout 60

check() { # name, actual, expected
  if [[ "$2" == "$3" ]]; then echo "ok   $1"; else echo "FAIL $1: got '$2', want '$3'"; fail=1; fi
}
status() { curl -s -o /dev/null -w '%{http_code}' "$BASE$1"; }
header() { curl -s -D - -o /dev/null "$BASE$1" | tr -d '\r' | grep -i "^$2:" | cut -d' ' -f2- || true; }

check "home 200" "$(status /)" 200
check "word page 200" "$(status /wort/aasen)" 200
check "unknown 404" "$(status /gibts-nicht-xyz)" 404
check "sw.js 200" "$(status /sw.js)" 200
check "trailing slash 301" "$(status /wort/aasen/)" 301
check "_redirects 301" "$(status /suggest-word)" 301
check "_redirects target" "$(header /suggest-word location)" /wort-vorschlagen
check "_headers X-Frame-Options" "$(header /wort/aasen x-frame-options)" DENY
[[ -n "$(header / content-security-policy)" ]] && echo "ok   _headers CSP" || { echo "FAIL _headers CSP missing"; fail=1; }

asset=$(curl -s "$BASE/" | grep -o '/_astro/[^"]*\.js' | head -1)
check "_astro immutable" "$(header "$asset" cache-control)" "public, max-age=31536000, immutable"
[[ "$(header /_astro/missing.js cache-control)" != *immutable* ]] && echo "ok   _astro 404 not immutable" || { echo "FAIL _astro 404 is immutable"; fail=1; }

if [[ $fail -ne 0 ]]; then docker compose logs web; exit 1; fi
echo "Docker smoke test passed"
