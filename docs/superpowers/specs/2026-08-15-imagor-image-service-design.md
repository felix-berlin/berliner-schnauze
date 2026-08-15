# Imagor Image Service — Design

Date: 2026-08-15
Status: approved (pending final spec review)

## Problem

All content images (WordPress media, Wikimedia files, Amazon affiliate book
covers) are currently resized/transcoded locally at build time by Astro's
built-in Sharp/Squoosh image service (`astro:assets`). We have a self-hosted
Imagor instance already deployed at `https://assets.kasimir.dev` and want all
image delivery to go through it instead, for consistent on-demand
resizing/format conversion and offloading transform work from the build.

## Approach

Replace Astro's built-in image service with a **custom external Image
Service** (`image.service.entrypoint` in `astro.config.mjs`) that implements
Astro's `ImageService` interface. This is an "external" service: it never
downloads or transforms image bytes itself, it only computes signed Imagor
URLs as strings. Consequences:

- No network dependency at build time — signing is pure HMAC/string logic,
  so a build never fails or blocks because Imagor is unreachable.
- Every existing call site (`<Picture>` / `getImage()` in
  `src/components/ImageGallery.astro`, `src/components/magazin/ArticleImage.astro`,
  `src/components/word/BookRecommendations.astro`, and everything wired
  through `src/components/word/WordGalleryCol.astro`) keeps working
  unchanged — only the URL-generation layer underneath changes.
- `astro.config.mjs`'s existing `image.domains` allowlist
  (`upload.wikimedia.org`, `cms.berliner-schnauze.wtf`, `m.media-amazon.com`)
  is unchanged and continues to gate which remote `src` values are accepted.

All three existing image sources (WordPress media, Wikimedia, Amazon covers)
route through Imagor identically — one code path, no special-casing.

Alternative considered and rejected: a standalone `buildImagorUrl()` utility
called manually from each component, replacing `Picture`/`getImage` with
plain `<img>`/`<picture>` markup. Rejected because it would require touching
every image-rendering component and hand-rolling responsive `srcset`
generation that `astro:assets` already provides for free via the Image
Service interface.

## Signing

Per Imagor's own docs (docs.imagor.net/security) and the deployed instance's
configuration (`IMAGOR_SIGNER_TYPE=sha256`, `IMAGOR_SIGNER_TRUNCATE=40`):

1. Build the full path string that will appear in the URL after the hash
   segment, e.g.:
   `fit-in/400x200/filters:format(webp):quality(80)/https%3A%2F%2Fcms.berliner-schnauze.wtf%2Fwp-content%2Fuploads%2Ffoo.png`
   — the upstream image URL is **URL-encoded via `encodeURIComponent()`**
   before being embedded (confirmed required by the user — omitting this
   caused prior issues with this Imagor deployment).
2. Compute `HMAC-SHA256(secret, path)`.
3. Encode the digest as base64 URL-safe **without padding** — Node's
   `crypto.createHmac(...).digest("base64url")` produces exactly this
   format natively (no manual `+`/`/` → `-`/`_` replacement or padding
   stripping needed).
4. Truncate the encoded digest to the first 40 characters (truncation
   happens _after_ encoding, per the docs).
5. Assemble the final URL: `{IMAGOR_HOST}/{truncatedHash}/{path}`.

`IMAGOR_SIGNER_TYPE`/`IMAGOR_SIGNER_TRUNCATE` are fixed properties of the
deployed Imagor instance, not runtime-configurable values — they are hardcoded
constants in the signing utility, not environment variables (they'd only
change if the Imagor deployment itself were reconfigured, at which point the
code changes too).

Crop mode: always `fit-in` (never smart-crop) — preserves full image content,
consistent with current no-cropping behavior in the responsive image
pipeline.

## Environment Variables

Added to `env.schema` in `astro.config.mjs`, following the existing
`WAKAPI_HOST`/`WAKAPI_API_KEY` pattern:

```js
IMAGOR_HOST: envField.string({ context: "server", access: "public" }),   // https://assets.kasimir.dev
IMAGOR_SECRET: envField.string({ context: "server", access: "secret" }), // from Infisical
```

Both `context: "server"` — signing only happens inside the Image Service,
which runs at build/SSR time. The secret never reaches the client; the
browser only ever sees fully-signed URLs.

## Files

| File                                        | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `astro.config.mjs`                          | Add `IMAGOR_HOST`/`IMAGOR_SECRET` to `env.schema`. Point `image.service.entrypoint` at the new custom service. Add a `runtimeCaching` entry for `assets.kasimir.dev` (see below). `image.domains` unchanged.                                                                                                                                                                                                                                                                  |
| `src/utils/imagor.ts` (new)                 | `signImagorPath(path: string): string` — HMAC-SHA256 signing per the algorithm above, using `astro:env/server` for `IMAGOR_HOST`/`IMAGOR_SECRET`.                                                                                                                                                                                                                                                                                                                             |
| `src/lib/imagorImageService.ts` (new)       | Implements Astro's `ImageService` interface: `validateOptions`, `getURL`, `getSrcSet` (builds one Imagor URL per width/format/density combination requested by the calling `Picture`/`getImage` call), `getHTMLAttributes`. Builds the Imagor filter path (`fit-in/{w}x{h}/filters:format(...):quality(80)/...`) and delegates signing to `src/utils/imagor.ts`.                                                                                                              |
| `src/tests/unit/utils/imagor.test.ts` (new) | Byte-exact self-check against a known test vector from Imagor's own test suite (`cshum/imagor/imagorpath/params_test.go`, "non url image with hash and custom signer" case): secret `"1234"`, path `meta/10x11:12x13/fit-in/-300x-200/5x6/left/top/smart/filters:some_filter()/img`, expected hash `XBCO7esuLsNQuSF2v9ie36pESRGx2rzLjhUxXWnV`. This verifies the implementation matches Imagor's reference algorithm exactly, not just structurally (correct length/charset). |

No changes needed to `ImageGallery.astro`, `ArticleImage.astro`,
`BookRecommendations.astro`, `WordGalleryCol.astro`, or any GraphQL
fragment/query — they keep passing the same `sourceUrl`/`mediaItemUrl`
values as `src` with the same `widths`/`densities`/`formats` props.

## PWA / Workbox Caching

Imagor-served images are cross-origin (`assets.kasimir.dev`), so Workbox's
default precache (same-origin build output only) won't cover them. Add a new
`runtimeCaching` entry in `astro.config.mjs`, following the existing pattern
used for `api/search`/word-of-the-day, with a `CacheFirst` strategy and an
expiration policy — so word pages remain fully usable (images included) in
the PWA's offline mode, matching current offline behavior for other content.

## Out of Scope

- No fallback/retry logic for Imagor being down at _request_ time (runtime,
  not build time) — not requested, and the existing `image.domains`
  allowlist plus signing already constrain what's servable; treating Imagor
  outages as a monitoring/ops concern rather than app-level fallback code.
- No migration of `astro-og-canvas`-generated OG images (`src/pages/og/[wordSlug].ts`)
  — those are canvas-rendered text/graphics, not a proxy of CMS media, and
  are unrelated to this change.
