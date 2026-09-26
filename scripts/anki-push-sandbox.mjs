#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const DIST_DIR = "dist-anki";

const files = readdirSync(DIST_DIR)
  .filter((f) => /^berlinerisch-full-v.+\.apkg$/.test(f))
  .map((f) => ({ file: f, mtime: statSync(join(DIST_DIR, f)).mtimeMs }))
  .sort((a, b) => b.mtime - a.mtime);

if (files.length === 0) {
  console.error(`No ${DIST_DIR}/berlinerisch-full-v*.apkg found. Run \`pnpm anki:build\` first.`);
  process.exit(1);
}

const { file } = files[0];
const version = file.replace(/^berlinerisch-full-v/, "").replace(/\.apkg$/, "");

execFileSync(
  "npx",
  [
    "infisical",
    "run",
    "--",
    ".venv-anki/bin/python",
    "scripts/upload_anki_to_polar.py",
    join(DIST_DIR, file),
    "--version",
    version,
  ],
  { stdio: "inherit" },
);
