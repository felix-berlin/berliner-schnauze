## Why

The generated `sitemap-index.xml` / `sitemap-0.xml` only carries `lastmod` for
`/wort/` detail pages — magazine articles, Themen pages, changelog entries, and
static pages ship with no date at all. Crawlers therefore can't tell when
content-driven pages (especially newly published magazine articles) changed, and
there is uncertainty whether every magazine article is even being emitted. This
weakens crawl efficiency and freshness signals for exactly the pages we most want
re-indexed.

## What Changes

- Extend the sitemap `serialize` step so `lastmod` is set for the dated
  content routes, not just words:
  - `/magazin/<slug>` — from each post's modified date (`modifiedGmt`)
  - `/wort/<slug>` — unchanged (already covered)
  - `/themen/<slug>` — **no `lastmod`**: Themen are WordPress taxonomy terms with
    no modification timestamp; they stay in the sitemap as archive pages without a
    date (like the `/magazin` and `/wort` index pages).
- Verify and lock in (via spec + a build-time check) that every published
  magazine article is present in the sitemap, and confirm the sitemap `filter`
  isn't inadvertently dropping magazine/themen routes.
- Generalize the current word-only `getWordDates()` fetch into a small
  slug→lastmod lookup reused for words and posts, keeping the single per-build
  cache per content type.
- **Decision: do not split** the sitemap into multiple files. `@astrojs/sitemap`
  already emits a sitemap index and auto-splits at 45 000 URLs; the current corpus
  is far below that. Splitting is recorded as a Non-goal with the threshold that
  would revisit it.

## Non-goals

- No multi-file / per-content-type sitemap split (deferred until URL count
  approaches the 45 000 `entryLimit`; not needed at current scale).
- No `changefreq` / `priority` hints — Google ignores them; not worth the noise.
- No change to which routes are excluded beyond confirming current `filter`
  behavior (`/settings`, BON `/share`).
- No new dependency; keep using `@astrojs/sitemap`.

## Capabilities

### New Capabilities
- `sitemap`: Build-time generation of the XML sitemap — which routes are
  included/excluded and how `lastmod` is derived for each content type.

### Modified Capabilities
<!-- None — no existing OpenSpec specs yet. -->

## Impact

- **Code**: `astro.config.mjs` (sitemap `serialize`/`filter`),
  `src/services/queries/getSitemapWordDates.ts` (generalize + add a post fetcher),
  `src/tests/unit/services/getSitemapWordDates.test.ts`.
- **Data**: one extra paginated build-time query for posts (`slug` + `modifiedGmt`),
  cached per build.
- **Output**: `dist/sitemap-index.xml` + `sitemap-0.xml` gain `lastmod` on magazine
  URLs (words already had it).
- **No runtime impact** — sitemap is static, generated at build only.
