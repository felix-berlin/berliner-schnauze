# Anki Release Automation

## Context

`scripts/build_anki_decks.py` builds the Lite/Full `.apkg` decks locally but is
not wired into CI. The Lite deck is served from a statically committed file
(`public/downloads/berlinerisch-lite.apkg`); the Full deck has no distribution
mechanism at all (`src/services/polar.ts` only reads the price, it doesn't
manage the product's downloadable file). Both need to become part of the
release process, carry the release version, and stay easy to test locally
before anything touches production.

## Goals

- Every `main` release (semantic-release, non-prerelease) builds both decks,
  named and tagged with that release's version.
- The Lite deck is attached to the GitHub Release as an asset.
- The Full deck is uploaded to Polar (production org/product), replacing the
  previous file on the existing downloadable benefit.
- The live site's Lite download button always points at the current
  release's asset — no static file to keep in sync.
- A local workflow (new slash commands) lets the developer build both decks
  and push the Full deck to the Polar **sandbox** for testing, without
  touching the release pipeline or production credentials.

## Non-goals

- Beta/staging releases do not build or upload decks at all.
- No change to deck content/selection logic (`letter()`, `select_lite()`) —
  only versioning and distribution.

## Design

### A. Version handling — `scripts/build_anki_decks.py`

Add a required-with-default CLI arg:

```
python scripts/build_anki_decks.py --version 3.52.0
```

- Default: `"dev"` (safety net if a caller forgets the flag; not used by any
  real caller — both CI and the local command always pass one explicitly).
- Output filenames become `dist-anki/berlinerisch-{full,lite}-v<version>.apkg`.
- `genanki.Deck(..., description=...)` gets set to
  `f"Version {version} · {date.today().isoformat()}"` for both decks — the
  only place a version fact can live inside the `.apkg` itself (genanki has
  no dedicated version field).

### B. Polar upload — `scripts/upload_anki_to_polar.py` (new)

Shared by CI (prod) and the local sandbox command. Reads:

- `POLAR_UPLOAD_TOKEN` — write-scoped (`files:write`, `benefits:write`),
  separate from the existing read-only `POLAR_ORG_TOKEN` used for price
  display.
- `ANKI_DECK_FULL_BENEFIT_ID` — the downloadable benefit to update.
- `POLAR_SANDBOX` — reused from the existing price-fetch feature to pick the
  API host (`sandbox-api.polar.sh` vs `api.polar.sh`).
- CLI args: path to the `.apkg` file, version string.

Flow (Polar file API, confirmed against `polar.sh/docs/api-reference/2026-10/files/*`):

1. `POST /v1/files/` with `service: "downloadable"`, `name`, `mime_type:
   "application/octet-stream"`, `size`, a single-part `upload.parts` entry
   covering the whole file (decks are a few MB, well under any chunking
   need), and `version` (Polar's own file metadata field — free bookkeeping,
   no extra call).
2. `PUT` the file bytes to the returned part URL; capture the `ETag`
   response header.
3. `POST /v1/files/{id}/uploaded` with the part number + that ETag to
   finalize the upload.
4. `GET /v1/benefits/{id}` to read the currently attached file id(s) (for
   cleanup in step 6).
5. `PATCH /v1/benefits/{id}` with `{"type": "downloadables", "properties":
   {"files": ["<new file id>"]}}` — single-file benefit, full replace.
6. `DELETE /v1/files/{old id}` for each previously attached file — avoids
   accumulating orphaned uploads on every release.

Errors at any step abort with a non-zero exit and a clear message (this is a
release-blocking action for the Full deck — no silent fallback here, unlike
the read-side `polar.ts`).

### C. CI — `.github/workflows/anki-release.yml` (new)

```yaml
on:
  release:
    types: [published]

jobs:
  anki:
    if: ${{ !github.event.release.prerelease }}
    runs-on: ubuntu-latest
    permissions:
      contents: write # gh release upload
    steps:
      - checkout (fetch-depth: 0 not needed — no git history use)
      - Infisical secrets (prod env, root path — add POLAR_UPLOAD_TOKEN and
        ANKI_DECK_FULL_BENEFIT_ID alongside the existing
        WP_API/WP_AUTH_USER/WP_AUTH_PASS already there; POLAR_SANDBOX is
        omitted here so the upload script defaults to the production host)
      - setup Python + `pip install -r scripts/requirements-anki.txt`
      - VERSION="${GITHUB_REF_NAME#v}" (tag_name is e.g. "v3.52.0")
      - python scripts/build_anki_decks.py --version "$VERSION"
      - gh release upload "${{ github.event.release.tag_name }}" \
          dist-anki/berlinerisch-lite-v$VERSION.apkg
      - python scripts/upload_anki_to_polar.py \
          dist-anki/berlinerisch-full-v$VERSION.apkg --version "$VERSION"
```

Triggering on `release: published` (rather than hooking into
`semantic-release`'s own plugin lifecycle) keeps this fully decoupled from
the fragile prepare/publish ordering of `@semantic-release/exec` and
`@semantic-release/github`, and `prerelease` is already the correct main-vs-beta
signal — no branch-name string matching needed.

### D. Local dev commands (new Claude Code slash commands)

`.claude/commands/anki-build.md`:
- Reads `package.json` version, appends `-dev`.
- Runs `npx infisical run -- .venv-anki/bin/python scripts/build_anki_decks.py --version "<version>-dev"`.
- Copies the built Lite file to the fixed path
  `public/downloads/berlinerisch-lite.apkg` (overwrite) so `pnpm dev` serves
  the current content locally — this fixed-name copy is now dev-only
  scaffolding, no longer linked from the live site (see E).

`.claude/commands/anki-push-sandbox.md`:
- Runs `scripts/upload_anki_to_polar.py` against the most recently built
  `dist-anki/berlinerisch-full-v*-dev.apkg` with `POLAR_SANDBOX=true` and the
  existing sandbox `POLAR_UPLOAD_TOKEN`/`ANKI_DECK_FULL_BENEFIT_ID` values
  (set locally via Infisical, sandbox environment).

### E. Live site — real release link instead of a static file

New `src/services/githubRelease.ts`, same shape as `wakapiStats.ts`/`polar.ts`
(memoized per-process, graceful `undefined` on failure, `AbortSignal.timeout`):

```ts
export const getLiteDeckDownloadUrl = (): Promise<string | undefined>
```

- `GET https://api.github.com/repos/felix-berlin/berliner-schnauze/releases/latest`
  — unauthenticated (repo is public; one build-time call, well under the
  60/hr unauthenticated rate limit).
- Find the asset whose name starts with `berlinerisch-lite`, return its
  `browser_download_url`.
- On any failure (network, no matching asset, rate-limited): return
  `undefined`.

`anki.astro`: `LITE_URL` becomes `await getLiteDeckDownloadUrl()`. Every
place that renders the Lite download button/link is wrapped the same way
`FULL_CHECKOUT_URL` already is (`LITE_URL && (...)` / `LITE_URL ? ... : "Kommt
bald."`) — no download link shown at all if the fetch fails, same pattern
already established for `PRICE`.

## Error handling summary

| Failure | Behavior |
|---|---|
| Polar upload fails in CI | Job fails loudly (release-blocking for that asset; the GitHub release itself already exists by the time this runs, so a failure here doesn't roll back the release — it's a distribution step, not a gate) |
| `gh release upload` fails | Job fails loudly, same reasoning |
| GitHub releases API unreachable at Astro build time | `LITE_URL` is `undefined`, button hidden, build still succeeds |
| Local sandbox push fails | Command prints the error; no cleanup needed, nothing production-facing touched |

## Testing

- `scripts/upload_anki_to_polar.py`: one `test_*.py` exercising the request
  sequence against mocked HTTP (no real network), asserting the old file id
  gets deleted after a successful benefit update.
- `githubRelease.ts`: unit test mirroring the existing `wakapiStats`/`polar`
  test pattern — success case, missing-asset case, fetch-failure case.
- Manual: `/anki-build` then `/anki-push-sandbox` end-to-end against the
  Polar sandbox before ever touching the real workflow.
