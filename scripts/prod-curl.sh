#!/usr/bin/env bash
# Read-only request to the production site behind its basic-auth gate. The credential (PROD_BASIC_AUTH, "user:password")
# lives in Infisical (dev environment, folder /agent) and is injected at run time: it is never typed, printed or stored.
# Allowlist, not denylist: only -I/-i/-s/-S and exactly one https URL on berliner-schnauze.wtf (or a subdomain), so the
# credential cannot be sent to another host, written to a file, or echoed (-v, -H, -o, -x, --config … are refused).
# No redirects are followed. Usage: scripts/prod-curl.sh [-I] [-i] [-s] [-S] https://berliner-schnauze.wtf/…
set -euo pipefail

flags=()
url=""
for arg in "$@"; do
  case "$arg" in
    -I|-i|-s|-S) flags+=("$arg") ;;
    -*) echo "prod-curl.sh: option $arg is not allowed (read-only, allowed: -I -i -s -S)" >&2; exit 1 ;;
    *) [ -z "$url" ] || { echo "prod-curl.sh: exactly one URL" >&2; exit 1; }; url="$arg" ;;
  esac
done
# after the host only "/", "?" or the end may follow: no user@host, no #fragment tricks
[[ "$url" =~ ^https://([a-z0-9-]+\.)?berliner-schnauze\.wtf(/[^[:space:]]*|\?[^[:space:]]*)?$ ]] \
  || { echo "prod-curl.sh: the URL must be https://berliner-schnauze.wtf/… (or a subdomain)" >&2; exit 1; }

inf=(infisical)
command -v infisical >/dev/null || inf=(pnpm exec infisical)

# -q: ignore ~/.curlrc (could add a proxy); the credential is read from the injected env by the inner shell only
exec "${inf[@]}" run --env=dev --path=/agent -- bash -c '
  url="$1"; shift
  exec curl -q -sS --proto =https --max-redirs 0 --user "$PROD_BASIC_AUTH" "$@" -- "$url"
' _ "$url" "${flags[@]}"
