# Sitemap Audit — berliner-schnauze.wtf

**Audit date:** 2026-06-29
**Sitemap:** https://berliner-schnauze.wtf/sitemap-index.xml → /sitemap-0.xml

---

## Summary

| Check | Result |
|-------|--------|
| XML well-formed | PASS |
| URL count within 50k limit | PASS (930 URLs) |
| Non-200 URLs in sitemap | PASS (all return 200) |
| Noindexed URLs in sitemap | PASS (none detected) |
| Redirected URLs in sitemap | PASS (no redirects observed) |
| `<priority>` tags present | PASS (none — correct) |
| `<changefreq>` tags present | PASS (none — correct) |
| Per-URL `<lastmod>` present | FAIL — all identical (build timestamp) |
| Inappropriate URLs excluded | FAIL — 4 URLs should be removed |
| Sitemap index necessary | INFO — single child, minor overhead |
| Robots.txt Sitemap directive | PASS |
| Unused XML namespaces declared | FAIL — 4 extra namespaces |

---

## Findings

### F-01 — All `<lastmod>` values are identical (build timestamp)

**Severity: Medium**

Every one of the 930 URLs carries the same `<lastmod>` value: `2026-06-29T15:24:22.235Z`. This is the Astro build time, set via `sitemap({ lastmod: new Date() })` in `astro.config.mjs`. Google explicitly documents that fabricated or inaccurate `<lastmod>` values cause it to stop trusting the field entirely for the whole sitemap. When all 930 pages appear to change simultaneously on every deploy, the signal becomes meaningless.

**Recommendation:** Supply a `customPages` filter or a per-URL `lastmod` callback in the sitemap plugin config. For word entries, use the `modified` date from the WordPress GraphQL response. For static pages (changelog versions, legal pages) use their last known edit date as a static value. Remove `lastmod` entirely from pages that have no reliable modification date rather than using the build timestamp.

---

### F-02 — Application UI pages included in sitemap

**Severity: High**

Two pages represent application state/settings UI with no indexable editorial content:

- `https://berliner-schnauze.wtf/settings` — PWA settings panel (`AppSettings.vue`, `client:only`)
- `https://berliner-schnauze.wtf/settings/cache` — Cache management UI (`PwaCacheOverview.vue`)

Neither page has unique textual content beyond a heading and dynamically rendered Vue components. Google will crawl these, find near-empty HTML (client:only renders nothing server-side), and may interpret them as thin pages. They have no search-worthy content and no inbound linking rationale for organic discovery.

**Recommendation:** Exclude both from the sitemap. In `astro.config.mjs` add a `filter` to the sitemap plugin:

```js
sitemap({
  lastmod: new Date(),
  filter: (page) => !page.includes('/settings'),
})
```

Additionally, add `<meta name="robots" content="noindex">` to both pages as a belt-and-suspenders measure.

---

### F-03 — Share result page included in sitemap

**Severity: High**

`https://berliner-schnauze.wtf/games/berliner-oder-nicht/share` is a dynamic result display page. Its entire content is rendered client-side from URL query parameters by `BonShareView.vue` (`client:only="vue"`). The static HTML shell contains only a title/description meta and an empty Vue mount point. Google will crawl it and see no content — this is a textbook thin page.

**Recommendation:** Exclude from sitemap via the filter and add `<meta name="robots" content="noindex">` to the page's `<Layout>` call.

---

### F-04 — `/wort-vorschlagen` is a form-only action page

**Severity: Low**

The word suggestion page is a user-action form. It has some legitimate content value (explains the contribution process) but is primarily a conversion funnel page with no dictionary content. Whether to include it is a judgment call. If kept, it should have a meaningful description and real prose content, not just a form widget.

**Recommendation:** Keep in sitemap only if the page contains at least a paragraph of explanatory text about the submission process. If the page is mostly just a rendered form component, exclude it.

---

### F-05 — Unused XML namespaces in sitemap-0.xml

**Severity: Low**

The `<urlset>` element declares four namespaces that are never used in the document:

- `xmlns:news` (Google News sitemap)
- `xmlns:xhtml` (hreflang alternate links)
- `xmlns:image` (image sitemap)
- `xmlns:video` (video sitemap)

These are boilerplate from the `@astrojs/sitemap` plugin defaults. They do not cause errors but add noise and imply capabilities the sitemap does not use. Parsers that process sitemaps strictly may warn about this.

**Recommendation:** This is not configurable via the Astro sitemap plugin at present — it is a plugin-level default. No immediate action required; track as a known known.

---

### F-06 — Sitemap index wrapper for a single file

**Severity: Info**

The site uses a sitemap index (`sitemap-index.xml`) that points to a single child file (`sitemap-0.xml`). For 930 URLs this is unnecessary overhead — a sitemap index is only needed when URLs exceed 50,000 or when segmenting by content type. The current setup is valid and harmless; `@astrojs/sitemap` generates it automatically. No action required unless the extra HTTP hop becomes a concern.

---

### F-07 — `/wort` index page coverage

**Severity: Info**

`https://berliner-schnauze.wtf/wort` is the full word index listing all 916 entries grouped by initial letter. It is present in the sitemap. This is appropriate — it is a static, content-rich directory page that provides a useful entry point for crawlers. No action required.

---

## URL Category Breakdown

| Category | Count | Sitemap appropriate |
|----------|-------|-------------------|
| Word entries (`/wort/*`) | 916 | Yes |
| Homepage | 1 | Yes |
| Changelog index | 1 | Yes |
| Changelog versions | 3 | Yes (editorial content per version) |
| Legal pages (`/datenschutz`, `/impressum`) | 2 | Yes |
| Game page (`/games/berliner-oder-nicht`) | 1 | Yes |
| Word index (`/wort`) | 1 | Yes |
| Technical changelog | 1 | Yes |
| Word suggestion form (`/wort-vorschlagen`) | 1 | Marginal |
| Settings pages (`/settings`, `/settings/cache`) | 2 | **No — remove** |
| Share result page (`/games/berliner-oder-nicht/share`) | 1 | **No — remove** |
| **Total** | **930** | **927 after cleanup** |

---

## Missing Pages Check

No pages were identified as missing from the sitemap. The `/og/*` route is a dynamic image endpoint, correctly absent. The `/api/*` routes are JSON endpoints, correctly absent. The `404.astro` page is correctly absent.

---

## Robots.txt

- Sitemap directive present and correct: `Sitemap: https://berliner-schnauze.wtf/sitemap-index.xml`
- `Allow: /` for `User-agent: *` — no crawl blocks affecting indexed content
- AI bot restrictions (`ClaudeBot`, `GPTBot`, `Google-Extended`, etc.) are correctly configured outside the sitemap scope

---

## Recommended Changes to `astro.config.mjs`

```js
sitemap({
  lastmod: new Date(), // replace with per-URL dates once available
  filter: (page) =>
    !page.includes('/settings') &&
    page !== 'https://berliner-schnauze.wtf/games/berliner-oder-nicht/share',
}),
```

Per-URL `lastmod` requires a custom serialization approach or a sitemap plugin that supports it — track as a follow-up improvement once the WordPress `modified` field is plumbed through to build time.
