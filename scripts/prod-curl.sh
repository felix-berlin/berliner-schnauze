#!/usr/bin/env bash
# Read-only request to the production site behind its basic-auth gate. The credential (PROD_BASIC_AUTH, "user:password")
# lives in Infisical (dev environment, folder /agent) and is injected at run time: it is never typed, printed or stored.
# Allowlist, not denylist: only the options below and exactly one https URL on berliner-schnauze.wtf (or a subdomain), so
# the credential cannot be sent to another host, written to a file, or echoed (-v, -o, -x, -X, -d, --config … are refused).
# No redirects are followed.
#
# Usage: scripts/prod-curl.sh [options] https://berliner-schnauze.wtf/…
#   -I -i -s -S (also combined, e.g. -sI)   HEAD / include headers / silent / show errors
#   -H "Name: value"   request header, names exactly as written (case-sensitive): Accept, Accept-Encoding,
#                      Accept-Language, Cache-Control, If-Modified-Since, If-None-Match, Range
#   --compressed       ask for and decode a compressed body
#   --stats            print response headers + status, transferred bytes and timings; discard the body
set -euo pipefail

flags=()
url=""
while [ $# -gt 0 ]; do
  arg="$1"; shift
  case "$arg" in
    -[IisS]|-[IisS][IisS]|-[IisS][IisS][IisS]|-[IisS][IisS][IisS][IisS]) flags+=("$arg") ;;
    --compressed) flags+=("$arg") ;;
    --stats)
      flags+=(-D - -o /dev/null -w '\nstatus=%{http_code} bytes=%{size_download} ttfb=%{time_starttransfer}s total=%{time_total}s\n') ;;
    -H)
      [ $# -gt 0 ] || { echo "prod-curl.sh: -H needs a value" >&2; exit 1; }
      h="$1"; shift
      # one line, an allowlisted name, no @file form
      [[ "$h" =~ ^(Accept|Accept-Encoding|Accept-Language|Cache-Control|If-Modified-Since|If-None-Match|Range):\ [^[:cntrl:]]*$ ]] \
        || { echo "prod-curl.sh: header not allowed: $h" >&2; exit 1; }
      flags+=(-H "$h") ;;
    -*) echo "prod-curl.sh: option $arg is not allowed (see the usage at the top of the script)" >&2; exit 1 ;;
    *) [ -z "$url" ] || { echo "prod-curl.sh: exactly one URL" >&2; exit 1; }; url="$arg" ;;
  esac
done
# after the host only "/", "?" or the end may follow: no user@host, no #fragment tricks
[[ "$url" =~ ^https://([a-z0-9-]+\.)?berliner-schnauze\.wtf(/[^[:space:]]*|\?[^[:space:]]*)?$ ]] \
  || { echo "prod-curl.sh: the URL must be https://berliner-schnauze.wtf/… (or a subdomain)" >&2; exit 1; }

inf=(infisical)
command -v infisical >/dev/null || inf=(pnpm exec infisical)

# -q: ignore ~/.curlrc (could add a proxy). The credential goes to curl on stdin (-K -), never on its command line,
# where `ps` would show it; --fail-with-body: a 401 from the gate or a 5xx exits non-zero instead of passing as content.
# --silent/--log-level: no Infisical tips or INF lines on stderr (its self-hosted-domain warning stays).
exec "${inf[@]}" run --silent --log-level=error --env=dev --path=/agent -- bash -c '
  set -u
  url="$1"; shift
  : "${PROD_BASIC_AUTH:?missing in Infisical dev, folder /agent}"
  printf "user = \"%s\"\n" "$PROD_BASIC_AUTH" | exec curl -q -K - -sS --fail-with-body --proto =https --max-redirs 0 "$@" -- "$url"
' _ "$url" "${flags[@]}"
