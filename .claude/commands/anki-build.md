---
description: Build both Anki decks locally with a "-dev" version suffix and copy the Lite deck into public/downloads/ for local testing.
---

Run these steps in order:

1. Read the current version from `package.json` (the `version` field) and
   append `-dev` to it, e.g. `3.51.0-dev`.
2. Run:
   ```bash
   npx infisical run -- .venv-anki/bin/python scripts/build_anki_decks.py --version "<version>-dev"
   ```
   substituting the actual version. This writes
   `dist-anki/berlinerisch-{full,lite}-v<version>-dev.apkg`.
3. Copy the Lite deck to the fixed path the dev server serves:
   ```bash
   cp dist-anki/berlinerisch-lite-v<version>-dev.apkg public/downloads/berlinerisch-lite.apkg
   ```
4. Report the two file paths under `dist-anki/` and confirm the copy to
   `public/downloads/berlinerisch-lite.apkg` succeeded, so the user can
   restart/reload their local dev server and test the download.
