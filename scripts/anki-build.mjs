#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { copyFileSync } from "node:fs";
import { createRequire } from "node:module";

const { version } = createRequire(import.meta.url)("../package.json");
const devVersion = `${version}-dev`;

execFileSync(
  "npx",
  [
    "infisical",
    "run",
    "--",
    ".venv-anki/bin/python",
    "scripts/build_anki_decks.py",
    "--version",
    devVersion,
  ],
  { stdio: "inherit" },
);

const liteFile = `dist-anki/berlinerisch-lite-v${devVersion}.apkg`;
copyFileSync(liteFile, "public/downloads/berlinerisch-lite.apkg");
console.log(`Copied ${liteFile} -> public/downloads/berlinerisch-lite.apkg`);
