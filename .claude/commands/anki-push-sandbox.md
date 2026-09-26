---
description: Upload the most recently built Full Anki deck to the Polar sandbox, for testing the upload flow without touching production.
---

Run these steps in order:

1. Find the most recently modified file matching
   `dist-anki/berlinerisch-full-v*.apkg` (if none exists, tell the user to
   run `/anki-build` first and stop).
2. Confirm with the user that local Infisical secrets include
   `POLAR_UPLOAD_TOKEN`, `ANKI_DECK_FULL_BENEFIT_ID` and `POLAR_SANDBOX=true`
   set to **sandbox** values (not production!). If unsure, ask before
   proceeding — this is a write action against an external service.
3. Run:
   ```bash
   npx infisical run -- .venv-anki/bin/python scripts/upload_anki_to_polar.py \
     "<the file found in step 1>" --version "<version parsed from its filename>"
   ```
4. Report the script's output (new file id) to the user.
