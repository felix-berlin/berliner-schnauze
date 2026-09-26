#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const DIST_DIR = "dist-anki";

const files = readdirSync(DIST_DIR)
  .filter((f) => /^Berliner-Schnauze-Anki-Deck-Full-v.+\.apkg$/.test(f))
  .map((f) => ({ file: f, mtime: statSync(join(DIST_DIR, f)).mtimeMs }))
  .sort((a, b) => b.mtime - a.mtime);

if (files.length === 0) {
  console.error(
    `No ${DIST_DIR}/Berliner-Schnauze-Anki-Deck-Full-v*.apkg found. Run \`pnpm anki:build\` first.`,
  );
  process.exit(1);
}

const { file } = files[0];
const version = file.replace(/^Berliner-Schnauze-Anki-Deck-Full-v/, "").replace(/\.apkg$/, "");

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
