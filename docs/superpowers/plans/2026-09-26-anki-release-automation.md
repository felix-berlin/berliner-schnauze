# Anki Release Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically build, version, and distribute the Anki decks on every production release — Lite to the GitHub Release, Full to Polar — plus a local dev workflow to test the same build/upload steps against Polar's sandbox.

**Architecture:** Extend the existing `scripts/build_anki_decks.py` to accept a `--version` flag that flows into filenames and the deck's in-file description. A new `scripts/upload_anki_to_polar.py` handles the Polar file-upload/benefit-replace flow and is shared by CI and a local sandbox command. A new GitHub Actions workflow triggers on `release: published` (filtered to non-prerelease) and drives both scripts. The live site fetches its Lite download link from the GitHub Releases API at build time instead of linking a static file.

**Tech Stack:** Python 3.13 (stdlib `urllib`, existing `genanki` dependency), GitHub Actions, `gh` CLI, TypeScript/Astro (existing service-layer pattern), Vitest.

**Spec:** `docs/superpowers/specs/2026-09-26-anki-release-automation-design.md`

## Global Constraints

- Deck build/upload only runs for non-prerelease (`main`) releases — `beta` releases must not build or upload anything.
- Full-deck upload uses a separate, minimally-scoped `POLAR_UPLOAD_TOKEN` (`files:write`, `benefits:write`) — never the existing read-only `POLAR_ORG_TOKEN`.
- `POLAR_SANDBOX` (existing env var) continues to select the API host; unset/`false` means production.
- Version format: CI passes the release tag with its leading `v` stripped (e.g. `3.52.0`); local builds use `<package.json version>-dev`.
- Deck filenames: `dist-anki/berlinerisch-{full,lite}-v<version>.apkg`.
- No astro.config.mjs changes are needed for this feature — the new `githubRelease.ts` service calls the public, unauthenticated GitHub REST API and needs no env var.

## Review Focus

- **Polar upload failing partway through** (e.g. network drop after the file uploads but before the benefit PATCH) — the script must not delete the *old* file until the new one is confirmed attached to the benefit, so a partial failure never leaves the benefit with zero files.
- **A release with no matching Lite asset yet** (workflow hasn't run, or failed) — `getLiteDeckDownloadUrl()` must return `undefined` rather than throw, so the Astro build doesn't fail and the button just doesn't render.
- **GitHub API rate limiting / transient 5xx** on the unauthenticated `releases/latest` call at build time — must degrade the same way as a missing asset (`undefined`, no thrown error, no failed production build).
- **Re-running the workflow for the same release** (e.g. after a fix) — the benefit-file replace logic must be idempotent: if the "old" file id already equals the freshly uploaded one there is nothing to delete, and the code must not delete the file it just attached.
- **Empty `--version` propagating into deck filenames unnoticed** — the CLI default (`"dev"`) must never silently ship as a real release version; the workflow always passes an explicit value derived from `github.event.release.tag_name`, and this is asserted in the workflow task's manual check.

---

## Task 1: Version support in `build_anki_decks.py`

**Files:**
- Modify: `scripts/build_anki_decks.py`
- Test: `scripts/test_build_anki_decks.py`

**Interfaces:**
- Produces: `build_decks(words, full_url, version="dev")` (now takes an optional third arg; existing two-arg call sites keep working); CLI `python scripts/build_anki_decks.py --version <str>` (default `"dev"`), writing `dist-anki/berlinerisch-{full,lite}-v<version>.apkg` and setting each deck's `description` to `"Version <version> · <ISO date>"`.

- [ ] **Step 1: Write the failing test for the versioned description and filenames**

Add to `scripts/test_build_anki_decks.py` (new `DeckTests` method, alongside the existing ones in that class):

```python
    def test_description_includes_version(self):
        full, lite = b.build_decks(self.words, "https://example.test/anki", version="9.9.9")
        self.assertIn("Version 9.9.9", full.description)
        self.assertIn("Version 9.9.9", lite.description)

    def test_build_decks_defaults_version_to_dev(self):
        full, _ = b.build_decks(self.words, "https://example.test/anki")
        self.assertIn("Version dev", full.description)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `.venv-anki/bin/python -m unittest scripts/test_build_anki_decks.py -v 2>&1 | tail -20`
Expected: `FAIL`/`ERROR` for `test_description_includes_version` and `test_build_decks_defaults_version_to_dev` (`build_decks() got an unexpected keyword argument 'version'`), all other 17 existing tests still pass.

- [ ] **Step 3: Implement version support**

In `scripts/build_anki_decks.py`, add near the top imports:

```python
import argparse
from datetime import date
```

Change the `build_decks` signature and body:

```python
def build_decks(words, full_url, version="dev"):
    words = sorted((w for w in words if is_publishable(w)), key=lambda w: (w["title"].lower(), w["id"]))
    lite_ids = {w["id"] for w in select_lite(words)}
    hint = 'Lite-Version mit 10 %% der Wörter. Alle Wörter: <a href="%s">%s</a>' % (
        html.escape(full_url),
        html.escape(full_url),
    )
    description = "Version %s · %s" % (version, date.today().isoformat())
    full = genanki.Deck(FULL_DECK_ID, "Berliner Schnauze Full", description=description)
    lite = genanki.Deck(LITE_DECK_ID, "Berliner Schnauze Lite", description=description)
    for w in words:
        full.add_note(make_note(w, ""))
        if w["id"] in lite_ids:
            lite.add_note(make_note(w, hint))
    check_decks(full, lite, words)
    return full, lite
```

Change `main()`:

```python
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--version", default="dev")
    args = parser.parse_args()

    full_url = os.environ.get("ANKI_FULL_URL") or SITE + "/anki"
    words = [normalize_word(n) for n in fetch_words()]
    assert words, "keine Wörter geladen"
    full, lite = build_decks(words, full_url, args.version)
    os.makedirs(OUT_DIR, exist_ok=True)
    for deck, name in ((full, "full"), (lite, "lite")):
        genanki.Package(deck).write_to_file("%s/berlinerisch-%s-v%s.apkg" % (OUT_DIR, name, args.version))
    print("Wörter gesamt %d, Full %d Karten, Lite %d Karten" % (len(words), len(full.notes), len(lite.notes)))
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `.venv-anki/bin/python -m unittest scripts/test_build_anki_decks.py -v 2>&1 | tail -25`
Expected: all 19 tests `OK`.

- [ ] **Step 5: Commit**

```bash
git add scripts/build_anki_decks.py scripts/test_build_anki_decks.py
git commit -m "feat(anki): add --version flag to deck build script"
```

---

## Task 2: Polar upload script

**Files:**
- Create: `scripts/upload_anki_to_polar.py`
- Test: `scripts/test_upload_anki_to_polar.py`

**Interfaces:**
- Consumes: nothing from Task 1 (takes a plain file path).
- Produces: CLI `python scripts/upload_anki_to_polar.py <apkg_path> --version <str>`, reading env vars `POLAR_UPLOAD_TOKEN` (required), `ANKI_DECK_FULL_BENEFIT_ID` (required), `POLAR_SANDBOX` (optional, `"true"`/`"false"`, default prod). Exits non-zero with a message on any failure. Exposes `upload_full_deck(path, token, benefit_id, version=None) -> str` (returns the new file id) for the test and for Task 4's local command.

- [ ] **Step 1: Write the failing test**

Create `scripts/test_upload_anki_to_polar.py`:

```python
import os
import sys
import unittest
from unittest import mock

sys.path.insert(0, os.path.dirname(__file__))
import upload_anki_to_polar as u


class UploadFullDeckTests(unittest.TestCase):
    def setUp(self):
        self.tmp_file = os.path.join(os.path.dirname(__file__), "_tmp_test_deck.apkg")
        with open(self.tmp_file, "wb") as f:
            f.write(b"fake-apkg-bytes")

    def tearDown(self):
        os.remove(self.tmp_file)

    def test_replaces_old_file_and_updates_benefit(self):
        calls = []

        def fake_request(method, url, token=None, body=None):
            calls.append((method, url, body))
            if method == "POST" and url.endswith("/v1/files/"):
                return {
                    "id": "new-file-id",
                    "upload": {
                        "id": "upload-1",
                        "path": "up/path",
                        "parts": [{"number": 1, "url": "https://s3.example/part1"}],
                    },
                }
            if method == "POST" and url.endswith("/uploaded"):
                return {"id": "new-file-id", "is_uploaded": True}
            if method == "GET" and "/v1/benefits/" in url:
                return {"properties": {"files": ["old-file-id"]}}
            if method == "PATCH":
                return {"properties": {"files": ["new-file-id"]}}
            if method == "DELETE":
                return {}
            raise AssertionError("unexpected request %s %s" % (method, url))

        with mock.patch.object(u, "_request", side_effect=fake_request), mock.patch.object(
            u, "upload_part", return_value="etag-123"
        ):
            file_id = u.upload_full_deck(self.tmp_file, "tok", "benefit-1", version="1.2.3")

        self.assertEqual(file_id, "new-file-id")
        methods_urls = [(m, url) for m, url, _ in calls]
        self.assertIn(("DELETE", u.api_host() + "/v1/files/old-file-id"), methods_urls)
        patch_call = next(c for c in calls if c[0] == "PATCH")
        self.assertEqual(patch_call[2]["properties"]["files"], ["new-file-id"])
        create_call = next(c for c in calls if c[0] == "POST" and c[1].endswith("/v1/files/"))
        self.assertEqual(create_call[2]["version"], "1.2.3")

    def test_does_not_delete_the_file_it_just_attached(self):
        def fake_request(method, url, token=None, body=None):
            if method == "POST" and url.endswith("/v1/files/"):
                return {
                    "id": "same-id",
                    "upload": {"id": "u1", "path": "p", "parts": [{"number": 1, "url": "https://s3.example/part1"}]},
                }
            if method == "POST" and url.endswith("/uploaded"):
                return {}
            if method == "GET":
                return {"properties": {"files": ["same-id"]}}
            if method == "PATCH":
                return {}
            if method == "DELETE":
                raise AssertionError("must not delete the file that is still attached")
            raise AssertionError("unexpected request")

        with mock.patch.object(u, "_request", side_effect=fake_request), mock.patch.object(
            u, "upload_part", return_value="etag"
        ):
            u.upload_full_deck(self.tmp_file, "tok", "benefit-1")

    def test_old_file_survives_if_benefit_update_fails(self):
        deleted = []

        def fake_request(method, url, token=None, body=None):
            if method == "POST" and url.endswith("/v1/files/"):
                return {
                    "id": "new-file-id",
                    "upload": {"id": "u1", "path": "p", "parts": [{"number": 1, "url": "https://s3.example/part1"}]},
                }
            if method == "POST" and url.endswith("/uploaded"):
                return {}
            if method == "GET":
                return {"properties": {"files": ["old-file-id"]}}
            if method == "PATCH":
                # Mirrors what the real _request does on a Polar HTTP error: exits.
                raise SystemExit("Polar-API-Fehler PATCH ...: 500 boom")
            if method == "DELETE":
                deleted.append(url)
                return {}
            raise AssertionError("unexpected request")

        with mock.patch.object(u, "_request", side_effect=fake_request), mock.patch.object(
            u, "upload_part", return_value="etag"
        ):
            with self.assertRaises(SystemExit):
                u.upload_full_deck(self.tmp_file, "tok", "benefit-1")

        self.assertEqual(deleted, [])


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv-anki/bin/python -m unittest scripts/test_upload_anki_to_polar.py -v 2>&1 | tail -20`
Expected: `ERROR` — `ModuleNotFoundError: No module named 'upload_anki_to_polar'`.

- [ ] **Step 3: Write the implementation**

Create `scripts/upload_anki_to_polar.py`:

```python
#!/usr/bin/env python3
"""Laedt ein gebautes Full-Anki-Deck zu Polar hoch und ersetzt die Datei,
die am Full-Deck-Downloadable-Benefit haengt.

Aufruf (Secrets ueber Infisical):
    npx infisical run -- .venv-anki/bin/python scripts/upload_anki_to_polar.py \
        dist-anki/berlinerisch-full-v3.52.0.apkg --version 3.52.0

Benoetigt POLAR_UPLOAD_TOKEN (Scopes files:write, benefits:write) und
ANKI_DECK_FULL_BENEFIT_ID. POLAR_SANDBOX=true nutzt die Polar-Sandbox statt Prod.
"""
import argparse
import json
import mimetypes
import os
import sys
import urllib.error
import urllib.request

API_HOSTS = {"prod": "https://api.polar.sh", "sandbox": "https://sandbox-api.polar.sh"}


def api_host():
    return API_HOSTS["sandbox"] if os.environ.get("POLAR_SANDBOX") == "true" else API_HOSTS["prod"]


def _request(method, url, token=None, body=None):
    data = json.dumps(body).encode() if body is not None else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            raw = r.read()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        sys.exit("Polar-API-Fehler %s %s: %s" % (method, url, e.read().decode(errors="replace")))


def create_file(token, name, size, version=None):
    # ponytail: chunk_end als inklusiver letzter Byte-Index angenommen (0..size-1) -
    # unverifiziert, da noch kein files:write-Token live getestet wurde. Schlaegt
    # der erste echte CI-Lauf hier fehl, ist das der erste Punkt zum Nachschauen.
    body = {
        "service": "downloadable",
        "name": name,
        "mime_type": mimetypes.guess_type(name)[0] or "application/octet-stream",
        "size": size,
        "upload": {"parts": [{"number": 1, "chunk_start": 0, "chunk_end": size - 1}]},
    }
    if version:
        body["version"] = version
    return _request("POST", api_host() + "/v1/files/", token=token, body=body)


def upload_part(part, data):
    req = urllib.request.Request(part["url"], data=data, headers=part.get("headers") or {}, method="PUT")
    with urllib.request.urlopen(req, timeout=120) as r:
        etag = (r.headers.get("ETag") or "").strip('"')
    if not etag:
        sys.exit("Kein ETag von S3 nach dem Upload erhalten.")
    return etag


def complete_upload(token, file_id, upload_id, upload_path, etag):
    body = {"id": upload_id, "path": upload_path, "parts": [{"number": 1, "checksum_etag": etag}]}
    return _request("POST", "%s/v1/files/%s/uploaded" % (api_host(), file_id), token=token, body=body)


def get_benefit_file_ids(token, benefit_id):
    benefit = _request("GET", "%s/v1/benefits/%s" % (api_host(), benefit_id), token=token)
    return list((benefit.get("properties") or {}).get("files") or [])


def update_benefit_file(token, benefit_id, file_id):
    body = {"type": "downloadables", "properties": {"files": [file_id]}}
    _request("PATCH", "%s/v1/benefits/%s" % (api_host(), benefit_id), token=token, body=body)


def delete_file(token, file_id):
    _request("DELETE", "%s/v1/files/%s" % (api_host(), file_id), token=token)


def upload_full_deck(path, token, benefit_id, version=None):
    name = os.path.basename(path)
    size = os.path.getsize(path)
    with open(path, "rb") as f:
        data = f.read()

    created = create_file(token, name, size, version=version)
    etag = upload_part(created["upload"]["parts"][0], data)
    complete_upload(token, created["id"], created["upload"]["id"], created["upload"]["path"], etag)

    # Neue Datei zuerst anhaengen, dann erst die alte(n) loeschen - so haengt bei
    # einem Abbruch zwischendrin nie eine leere Datei-Liste am Benefit.
    old_file_ids = get_benefit_file_ids(token, benefit_id)
    update_benefit_file(token, benefit_id, created["id"])
    for old_id in old_file_ids:
        if old_id != created["id"]:
            delete_file(token, old_id)
    return created["id"]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("apkg_path")
    parser.add_argument("--version", default=None)
    args = parser.parse_args()

    token = os.environ.get("POLAR_UPLOAD_TOKEN")
    benefit_id = os.environ.get("ANKI_DECK_FULL_BENEFIT_ID")
    if not token or not benefit_id:
        sys.exit("POLAR_UPLOAD_TOKEN und ANKI_DECK_FULL_BENEFIT_ID muessen gesetzt sein.")

    file_id = upload_full_deck(args.apkg_path, token, benefit_id, version=args.version)
    print("Full-Deck hochgeladen (Version %s), neue Datei-ID: %s" % (args.version or "?", file_id))


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `.venv-anki/bin/python -m unittest scripts/test_upload_anki_to_polar.py -v 2>&1 | tail -20`
Expected: both tests `OK`.

- [ ] **Step 5: Commit**

```bash
git add scripts/upload_anki_to_polar.py scripts/test_upload_anki_to_polar.py
git commit -m "feat(anki): add Polar full-deck upload script"
```

---

## Task 3: GitHub Actions release workflow

**Files:**
- Create: `.github/workflows/anki-release.yml`

**Interfaces:**
- Consumes: Task 1's `build_anki_decks.py --version <str>` CLI and Task 2's `upload_anki_to_polar.py <path> --version <str>` CLI.
- Produces: nothing consumed by later tasks — this is the CI wiring.

- [ ] **Step 1: Write the workflow**

Create `.github/workflows/anki-release.yml`:

```yaml
name: Anki Release

on:
  release:
    types: [published]

permissions:
  contents: write

jobs:
  build-and-publish:
    name: Build & publish Anki decks
    if: ${{ !github.event.release.prerelease }}
    runs-on: ubuntu-latest

    steps:
      - name: Checkout ✅
        uses: actions/checkout@v7

      - name: Fetch secrets from Infisical 🔐
        uses: Infisical/secrets-action@v1.0.18
        with:
          method: "oidc"
          identity-id: "5f0ad8b7-0224-48ca-b233-abbd59f2eb68"
          project-slug: "berliner-schnauze"
          env-slug: "prod"
          domain: "https://infisical.kasimir.dev"

      - name: Setup Python 🛠️
        uses: actions/setup-python@v5
        with:
          python-version: "3.13"

      - name: Install deck-build dependencies
        run: pip install -r scripts/requirements-anki.txt

      - name: Build decks 🏗️
        env:
          VERSION: ${{ github.event.release.tag_name }}
        run: python scripts/build_anki_decks.py --version "${VERSION#v}"

      - name: Attach Lite deck to the GitHub Release 📎
        env:
          GH_TOKEN: ${{ github.token }}
          VERSION: ${{ github.event.release.tag_name }}
        run: gh release upload "$VERSION" "dist-anki/berlinerisch-lite-v${VERSION#v}.apkg"

      - name: Upload Full deck to Polar 📦
        env:
          VERSION: ${{ github.event.release.tag_name }}
        run: python scripts/upload_anki_to_polar.py "dist-anki/berlinerisch-full-v${VERSION#v}.apkg" --version "${VERSION#v}"
```

- [ ] **Step 2: Validate the YAML syntax**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/anki-release.yml')); print('valid')"`
Expected: `valid`

- [ ] **Step 3: Confirm the new Infisical secrets exist before this can run for real**

This step has no automated check — note it for the human operator: `POLAR_UPLOAD_TOKEN` and `ANKI_DECK_FULL_BENEFIT_ID` must be added to the `prod` Infisical environment for `berliner-schnauze` before the first real release after merging this. Until then the workflow will run and fail at the "Upload Full deck to Polar" step with a clear "must be set" message (Task 2's `main()` guard) rather than silently doing nothing.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/anki-release.yml
git commit -m "ci(anki): publish decks to GitHub Release and Polar on production release"
```

---

## Task 4: Local dev slash commands

**Files:**
- Create: `.claude/commands/anki-build.md`
- Create: `.claude/commands/anki-push-sandbox.md`

**Interfaces:**
- Consumes: Task 1's `build_anki_decks.py --version <str>` CLI and Task 2's `upload_anki_to_polar.py <path> --version <str>` CLI.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Create the build command**

Create `.claude/commands/anki-build.md`:

```markdown
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
```

- [ ] **Step 2: Create the sandbox push command**

Create `.claude/commands/anki-push-sandbox.md`:

```markdown
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
```

- [ ] **Step 3: Manually verify both commands end-to-end**

Run `/anki-build`, confirm `dist-anki/berlinerisch-full-v<pkg-version>-dev.apkg` and
`dist-anki/berlinerisch-lite-v<pkg-version>-dev.apkg` exist and
`public/downloads/berlinerisch-lite.apkg` was overwritten (check its mtime).
Then run `/anki-push-sandbox` against Polar sandbox credentials and confirm
the printed new file id, and separately verify in the Polar sandbox
dashboard that the Full product's downloadable benefit now points at that
file.

- [ ] **Step 4: Commit**

```bash
git add .claude/commands/anki-build.md .claude/commands/anki-push-sandbox.md
git commit -m "chore(anki): add local build/sandbox-push slash commands"
```

---

## Task 5: `githubRelease.ts` service

**Files:**
- Create: `src/services/githubRelease.ts`
- Test: `src/tests/unit/services/githubRelease.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `export const getLiteDeckDownloadUrl = (): Promise<string | undefined>`.

- [ ] **Step 1: Write the failing test**

Create `src/tests/unit/services/githubRelease.test.ts`:

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function makeResponse(ok: boolean, body: unknown): Response {
  return { json: vi.fn().mockResolvedValue(body), ok } as unknown as Response;
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getLiteDeckDownloadUrl", () => {
  it("returns the lite asset's download URL", async () => {
    const release = {
      assets: [
        { browser_download_url: "https://example.com/full", name: "berlinerisch-full-v3.52.0.apkg" },
        { browser_download_url: "https://example.com/lite", name: "berlinerisch-lite-v3.52.0.apkg" },
      ],
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeResponse(true, release)));
    const { getLiteDeckDownloadUrl } = await import("@services/githubRelease.ts");
    expect(await getLiteDeckDownloadUrl()).toBe("https://example.com/lite");
  });

  it("returns undefined when no lite asset is attached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeResponse(true, { assets: [] })));
    const { getLiteDeckDownloadUrl } = await import("@services/githubRelease.ts");
    expect(await getLiteDeckDownloadUrl()).toBeUndefined();
  });

  it("returns undefined on a non-ok response", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    const { getLiteDeckDownloadUrl } = await import("@services/githubRelease.ts");
    expect(await getLiteDeckDownloadUrl()).toBeUndefined();
  });

  it("returns undefined on a network error", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const { getLiteDeckDownloadUrl } = await import("@services/githubRelease.ts");
    expect(await getLiteDeckDownloadUrl()).toBeUndefined();
  });

  it("requests the repo's latest release with the correct Accept header", async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeResponse(true, { assets: [] }));
    vi.stubGlobal("fetch", fetchMock);
    const { getLiteDeckDownloadUrl } = await import("@services/githubRelease.ts");
    await getLiteDeckDownloadUrl();

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.github.com/repos/felix-berlin/berliner-schnauze/releases/latest");
    const headers = init.headers as Record<string, string>;
    expect(headers["Accept"]).toBe("application/vnd.github+json");
  });

  it("memoizes the result across calls within the same module instance", async () => {
    const release = {
      assets: [{ browser_download_url: "https://example.com/lite", name: "berlinerisch-lite-v1.apkg" }],
    };
    const fetchMock = vi.fn().mockResolvedValue(makeResponse(true, release));
    vi.stubGlobal("fetch", fetchMock);
    const { getLiteDeckDownloadUrl } = await import("@services/githubRelease.ts");
    await getLiteDeckDownloadUrl();
    await getLiteDeckDownloadUrl();
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/tests/unit/services/githubRelease.test.ts`
Expected: `FAIL` — cannot find module `@services/githubRelease.ts`.

- [ ] **Step 3: Write the implementation**

Create `src/services/githubRelease.ts`:

```typescript
const GITHUB_RELEASES_API =
  "https://api.github.com/repos/felix-berlin/berliner-schnauze/releases/latest";
const FETCH_TIMEOUT_MS = 5000;

interface GithubRelease {
  assets?: { browser_download_url: string; name: string }[];
}

async function loadLiteDeckDownloadUrl(): Promise<string | undefined> {
  try {
    const res = await fetch(GITHUB_RELEASES_API, {
      headers: { Accept: "application/vnd.github+json" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.log(`GitHub releases request failed with status ${res.status}.`);
      return undefined;
    }

    const release = (await res.json()) as GithubRelease;
    return release.assets?.find((asset) => asset.name.startsWith("berlinerisch-lite"))
      ?.browser_download_url;
  } catch {
    console.log("GitHub release info could not be fetched.");
    return undefined;
  }
}

// Resolve once per process — the release doesn't change within a build/server lifetime.
let liteDeckUrlPromise: Promise<string | undefined> | undefined;
export const getLiteDeckDownloadUrl = (): Promise<string | undefined> =>
  (liteDeckUrlPromise ??= loadLiteDeckDownloadUrl());
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/tests/unit/services/githubRelease.test.ts`
Expected: all 6 tests `PASS`.

- [ ] **Step 5: Lint and commit**

```bash
pnpm exec oxlint --format=agent src/services/githubRelease.ts src/tests/unit/services/githubRelease.test.ts
git add src/services/githubRelease.ts src/tests/unit/services/githubRelease.test.ts
git commit -m "feat(anki): add githubRelease service for the live Lite download link"
```

---

## Task 6: Wire `anki.astro` to the real Lite download link

**Files:**
- Modify: `src/pages/anki.astro`

**Interfaces:**
- Consumes: Task 5's `getLiteDeckDownloadUrl(): Promise<string | undefined>` from `@services/githubRelease.ts`.

- [ ] **Step 1: Swap the import and the constant**

In `src/pages/anki.astro`, add the import next to the existing `polar.ts` one:

```diff
 import { getPolarFullDeckPrice } from '@services/polar.ts';
+import { getLiteDeckDownloadUrl } from '@services/githubRelease.ts';
```

Replace the static constant:

```diff
-const LITE_URL = '/downloads/berlinerisch-lite.apkg';
+const LITE_URL = await getLiteDeckDownloadUrl();
```

- [ ] **Step 2: Guard the hero actions download button**

```diff
-          <a class='c-button c-button--center-icon' href={LITE_URL} download>
-            <Download width='20' height='20' />
-            <span>Lite kostenlos laden</span>
-          </a>
+          {
+            LITE_URL && (
+              <a class='c-button c-button--center-icon' href={LITE_URL} download>
+                <Download width='20' height='20' />
+                <span>Lite kostenlos laden</span>
+              </a>
+            )
+          }
```

- [ ] **Step 3: Guard the Lite plan card's CTA (with a fallback note, matching the Full card's pattern)**

```diff
           <div class='c-anki__plan-cta'>
-            <a class='c-button c-button--center-icon' href={LITE_URL} download>
-              <Download width='20' height='20' /><span>Lite runterladen (.apkg)</span>
-            </a>
+            {
+              LITE_URL ? (
+                <a class='c-button c-button--center-icon' href={LITE_URL} download>
+                  <Download width='20' height='20' /><span>Lite runterladen (.apkg)</span>
+                </a>
+              ) : (
+                <span class='c-anki__plan-note'>Download derzeit nicht verfügbar.</span>
+              )
+            }
           </div>
```

- [ ] **Step 4: Guard the farewell section's download button**

```diff
-        <a class='c-button c-button--center-icon' href={LITE_URL} download>
-          <Download width='20' height='20' /><span>Erst mal Lite</span>
-        </a>
+        {
+          LITE_URL && (
+            <a class='c-button c-button--center-icon' href={LITE_URL} download>
+              <Download width='20' height='20' /><span>Erst mal Lite</span>
+            </a>
+          )
+        }
```

- [ ] **Step 5: Lint and type-check**

Run: `pnpm exec oxlint --format=agent src/pages/anki.astro`
Expected: no output (clean).

Run: `timeout 150 npx astro check 2>&1 | grep -iB2 -A5 "anki.astro"`
Expected: no errors reported for this file.

- [ ] **Step 6: Manual verification with the dev server**

Start (or reuse) the dev server per `CLAUDE.md` (`NO_DEV_TOOLBAR=1 ASTRO_DEV_BACKGROUND=0 npx infisical run -- pnpm exec astro dev --ignore-lock`) and open `/anki`. Since no GitHub release with a `berlinerisch-lite*` asset exists yet, `getLiteDeckDownloadUrl()` will resolve to `undefined` — confirm all three Lite download buttons are absent (hero actions, Lite plan card shows "Download derzeit nicht verfügbar.", farewell section) and nothing else on the page broke (Full-Deck button/price section still render as before).

- [ ] **Step 7: Commit**

```bash
git add src/pages/anki.astro
git commit -m "feat(anki): link the Lite download to the latest GitHub Release asset"
```
