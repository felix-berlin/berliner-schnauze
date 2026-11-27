#!/usr/bin/env bash
# The Prompt API code must stay out of the /wort page entry (design doc Suche v1, „Bedeutungssuche“):
# walks the static imports of the SearchApp island chunk and fails when any of them contains
# `LanguageModel`; also fails when no chunk contains it (the check would be empty).
# Run after a build: `pnpm build:local && website/scripts/check-semantic-chunk.sh`. Not part of test:unit.
set -euo pipefail

dir="${1:-$(dirname "$0")/../dist/client/_astro}"
[ -d "$dir" ] || { echo "no build output in $dir: build first" >&2; exit 2; }

node - "$dir" <<'EOF'
const { readFileSync, readdirSync } = require("node:fs");
const { join } = require("node:path");

const dir = process.argv[2];
const files = readdirSync(dir).filter((f) => f.endsWith(".js"));
const read = (f) => readFileSync(join(dir, f), "utf8");
const entries = files.filter((f) => /^SearchApp\..*\.js$/.test(f));
if (!entries.length) throw new Error(`no SearchApp chunk in ${dir}`);

// Static imports only (`from"./x.js"`, `import"./x.js"`); `import("./x.js")` is the lazy path.
const statics = (code) =>
  [...code.matchAll(/(?:\bfrom\s*|\bimport\s*)["']\.\/([^"']+\.js)["']/g)].map((m) => m[1]);
const seen = new Set();
const queue = [...entries];
while (queue.length) {
  const f = queue.shift();
  if (seen.has(f)) continue;
  seen.add(f);
  queue.push(...statics(read(f)));
}

const leaks = [...seen].filter((f) => read(f).includes("LanguageModel"));
const lazy = files.filter((f) => !seen.has(f) && read(f).includes("LanguageModel"));
if (leaks.length) {
  console.error(`LanguageModel in the /wort entry graph: ${leaks.join(", ")}`);
  process.exit(1);
}
if (!lazy.length) {
  console.error("no chunk contains LanguageModel: the check found nothing to guard");
  process.exit(1);
}
console.log(`ok: ${seen.size} entry chunks clean, LanguageModel only in ${lazy.join(", ")}`);
EOF
