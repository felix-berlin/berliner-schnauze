#!/bin/sh
# Regenerates Kalle into the website: component, SCSS partial, keyframes. Run from anywhere: sh docs/design/kalle/tools/build.sh
set -e
here=$(cd "$(dirname "$0")" && pwd)
root=$(cd "$here/../../../.." && pwd)
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
mkdir "$tmp/tools" "$tmp/src"
cp "$here"/*.py "$tmp/tools/"
(cd "$tmp/tools" && python3 kalle_svg.py >/dev/null && python3 make_vue.py)
web="$root/website/src"
cp "$tmp/src/BerlinerBaer.vue" "$web/components/kalle/BerlinerBaer.vue"
cp "$tmp/src/_berliner-baer.scss" "$web/styles/components/_berliner-baer.scss"
cp "$tmp/src/_berliner-baer-keyframes.scss" "$web/styles/utilities/_berliner-baer-keyframes.scss"
cd "$root" && pnpm exec oxfmt website/src/styles/components/_berliner-baer.scss website/src/styles/utilities/_berliner-baer-keyframes.scss >/dev/null
echo "Kalle regenerated"
