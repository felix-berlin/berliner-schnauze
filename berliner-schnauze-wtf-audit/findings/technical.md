# Technical SEO Audit — berliner-schnauze.wtf

**Audit Date**: 2026-06-29
**Site Type**: Static Astro site, Cloudflare Pages
**Pages in scope**: 930 (916 word entries + utility pages)
**Technical Score**: 64 / 100

---

## Summary

berliner-schnauze.wtf is a well-structured static site with strong fundamentals: HTTP/2, HSTS with preload, correct canonical implementation, a complete XML sitemap, and a clearly declared robots.txt with appropriate AI crawler controls. The most impactful issues are a systematic structured-data bug affecting all 916 word pages (relative and suffixed `@id` in BreadcrumbList), double CSS loading on every page visit, absent security headers (CSP, X-Frame-Options, Permissions-Policy), zero browser-side HTML caching, and a missing meta description on the games page. These are all fixable without infrastructure changes.

---

## Category Results

| Category | Status | Score |
|---|---|---|
| Crawlability | Pass | 90 |
| Indexability | Pass | 85 |
| Security Headers | Partial | 55 |
| URL Structure | Pass | 95 |
| Mobile | Pass | 90 |
| HTTP/2 & Transport | Pass | 95 |
| Sitemap Quality | Pass | 90 |
| Canonical Implementation | Pass | 90 |
| Structured Data | Fail | 20 |
| Core Web Vitals risk (static analysis) | Partial | 60 |
| Cache & Performance | Partial | 50 |
| JavaScript Rendering | Pass | 95 |
| Agent / AI Crawler UX | Pass | 85 |

---

## Findings

### Critical

#### C1 — BreadcrumbList `@id` uses `.html` suffix on all 916 word pages

**Affected pages**: All `/wort/*` pages (e.g. `/wort/aalen`, `/wort/zwitschern`)

The last BreadcrumbList `ListItem` carries an `@id` of `/wort/aalen.html` while the canonical URL and every internal link use `/wort/aalen`. This is a systematic mismatch across 916 pages. Google's Rich Results validator flags an `@id` that does not resolve to the item's canonical URL as an error, which can suppress breadcrumb rich results for the entire word-entry section of the site — the dominant page type.

**Recommendation**: Strip `.html` from the `@id` value in the BreadcrumbList template. Because this is a build-time Astro page, the fix is a one-line change in the component or utility that constructs the structured-data object. After deploying, submit the sitemap in Search Console to trigger re-indexing.

---

#### C2 — BreadcrumbList `@id` values are relative paths, not absolute URLs

**Affected pages**: All pages with BreadcrumbList (all word pages, and likely all other pages)

The JSON-LD spec requires `@id` in BreadcrumbList `ListItem` to be an absolute IRI. Relative paths such as `/wort/aalen` are non-conforming. Google's structured data documentation states that `item.id` (equivalent to `@id`) must be a full URL. Relative values can cause validators to reject the markup and suppress rich results.

**Recommendation**: Prefix every breadcrumb `@id` with the canonical origin (`https://berliner-schnauze.wtf`). This should be combined with the fix for C1 above. One shared helper that constructs the absolute URL from a path solves both issues at once.

---

### High

#### H1 — CSS loaded twice on every page

Every stylesheet is included twice in the HTML: once as `<link rel="stylesheet" media="print" onload="this.media='all'">` (the loadCSS async pattern) and once as a standard synchronous `<link rel="stylesheet">`. Both requests resolve to the same file. The browser downloads, parses, and applies each stylesheet twice, wasting bandwidth and adding unnecessary render-blocking work.

The async pattern was originally designed for render performance but when a synchronous link is also present, the async copy adds no benefit and only doubles the resource load. On a 930-page static site with Cloudflare edge caching this matters primarily for first-visit cold cache and for users on constrained connections.

**Recommendation**: Remove the duplicate. Either keep only the synchronous `<link rel="stylesheet">` (simplest, correct for a static site served over HTTP/2 where render-blocking impact is minimal) or keep only the async variant and add a `<noscript>` fallback. Do not include both.

---

#### H2 — No `Content-Security-Policy` header

A CSP header is absent across all tested pages. Without it, any injected or third-party script can access the full page DOM and exfiltrate data. Cloudflare Pages supports setting response headers via `_headers` file or a Transform Rule. For a static Astro site with a known asset inventory, a tight policy is achievable.

**Recommendation**: Add a CSP via the `_headers` file in the project root. A starting point for this site (Cloudflare CDN, no inline scripts, urql GraphQL calls to the WordPress API):

```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.berliner-schnauze.wtf https://*.ingest.sentry.io; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
```

Adjust `connect-src` to include the actual WordPress GraphQL API origin and any analytics endpoints. Use `Report-Only` mode first to catch violations before enforcing.

---

#### H3 — `Cache-Control: max-age=0, must-revalidate` on HTML — no browser cache for navigations

HTML pages are served with `max-age=0`, meaning every navigation (including Back/Forward) triggers a conditional revalidation request to the CDN. While Cloudflare's edge serves the 304 quickly, this eliminates back-forward cache (bfcache) eligibility and adds latency on repeated visits — measurable for users navigating between word entries.

For a static site regenerated at deploy time, HTML can safely be cached for at least the average deploy interval.

**Recommendation**: Set `Cache-Control: public, max-age=3600, stale-while-revalidate=86400` on HTML responses. On Cloudflare Pages use the `_headers` file:

```
/*
  Cache-Control: public, max-age=3600, stale-while-revalidate=86400
```

If zero-stale freshness is required on deploys, use Cloudflare Cache Purge via the deploy hook instead of `max-age=0`.

---

#### H4 — `/games/berliner-oder-nicht` has no H1 and no meta description

The games page is a functional, linkable page with its own URL and is included in the sitemap. Absence of an H1 means search engines receive no on-page heading signal for the primary topic. Absence of a meta description means Google will generate a snippet from body text, which is often suboptimal for click-through rate.

**Recommendation**:
- Add an H1 that describes the game, e.g. "Berliner oder Nicht — Das Dialekt-Quiz".
- Add a `<meta name="description">` of 130–160 characters summarising the game and its value to Berlin dialect learners.

---

### Medium

#### M1 — Missing `X-Frame-Options` header

`X-Frame-Options: DENY` (or `SAMEORIGIN`) prevents the site from being embedded in iframes on other origins, guarding against clickjacking. It is a low-friction header to add and is expected by security scanners.

**Recommendation**: Add to `_headers`:

```
/*
  X-Frame-Options: DENY
```

Note: if a CSP with `frame-ancestors 'none'` (H2 above) is implemented, `X-Frame-Options` becomes redundant for modern browsers but is still recommended for legacy browser coverage.

---

#### M2 — Missing `Permissions-Policy` header

No `Permissions-Policy` header is present. This header controls access to browser features (camera, microphone, geolocation, etc.) and is an expected defence-in-depth signal.

**Recommendation**: Add a restrictive policy to `_headers`:

```
/*
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
```

---

#### M3 — Meta descriptions slightly over 160 characters on some pages

At least some pages were observed with meta descriptions of ~163 characters. While Google truncates at approximately 155–160 characters in SERPs, descriptions over this length are not penalised. However, the visible snippet is truncated mid-sentence, degrading click-through appeal.

**Recommendation**: Trim affected descriptions to ≤155 characters and ensure the most important information appears in the first 120 characters to accommodate mobile snippet truncation (shorter display).

---

#### M4 — `font-display: fallback` instead of `swap` for body fonts

`font-display: fallback` gives fonts a 100 ms block period followed by a 3-second swap window. On a cold cache first visit the 100 ms invisible-text phase is perceptible and can slightly worsen LCP if the web font is the LCP element. The CLAUDE.md notes `font-display: swap` as intentional for specific fonts and cautions against `optional`, but `fallback` for body fonts is a middle-ground that may introduce small CLS when the font loads within the swap window.

**Recommendation**: Evaluate whether `swap` is acceptable for body fonts given the FOUT trade-off. The existing note in CLAUDE.md about `swap` causing 0.65 CLS on cold cache suggests the current `fallback` choice was deliberate — document this decision explicitly. If CLS from font swap is the concern, consider self-hosting fonts with accurate `size-adjust` and `ascent-override` fallback descriptors to minimise layout shift.

---

#### M5 — No `llms.txt` file (404)

`/llms.txt` returns 404. While not an established W3C or Google standard, `llms.txt` is a rapidly adopted convention for communicating site content structure and licensing intent to LLM-based crawlers and agents. The site already declares `ai-train=no` in robots.txt Content-Signal headers; a companion `llms.txt` provides richer structured guidance.

**Recommendation**: Create a `/llms.txt` at the site root with a brief description of the site, its content licence, and a pointer to key sections (word entries, games, API). This is a static text file — add it to the Astro `public/` directory.

---

### Low

#### L1 — Datenschutz and Impressum pages are indexable (no noindex)

The `/datenschutz` (privacy policy) and `/impressum` (legal notice) pages are fully indexable. These pages are legally required in Germany but typically add no search value and can dilute crawl budget. Blocking them prevents them from consuming index slots.

**Recommendation**: Add `<meta name="robots" content="noindex, follow">` to both pages, or add them to the robots.txt `Disallow` list if crawling is also unnecessary. Note: German law requires these pages to be accessible to users but does not require them to be indexed by search engines.

---

#### L2 — Single sitemap file for 930 URLs (no pagination concern yet)

The sitemap is a single `/sitemap-0.xml` file referenced from `/sitemap-index.xml`. At 930 URLs this is well within the 50,000 URL per-file limit. No action is needed now, but the sitemap index structure is correctly in place to accommodate growth.

**Recommendation**: No action required. Re-evaluate if the site grows beyond ~10,000 URLs and sitemap file size approaches 10 MB.

---

#### L3 — `Cache-Control: public, max-age=0` on homepage may affect Googlebot crawl efficiency

Related to H3 but specifically: frequent Googlebot recrawls of pages that haven't changed consume crawl budget unnecessarily. Cloudflare's edge still caches by default at the CDN level, but the `must-revalidate` directive forces origin validation for every CDN node re-request.

**Recommendation**: Addressed by H3 fix. Ensure `stale-while-revalidate` is used so CDN nodes can serve stale content while revalidating in the background.

---

### Info

#### I1 — HTTP/2 active

All responses are served over HTTP/2. This is correct and expected for Cloudflare Pages.

---

#### I2 — HSTS with preload

`Strict-Transport-Security: max-age=15552000; includeSubDomains; preload` is set. The `max-age` of 15552000 seconds (180 days) meets the minimum for HSTS preload list submission. `includeSubDomains` and `preload` are present. Verify the domain is submitted at https://hstspreload.org.

---

#### I3 — `X-Content-Type-Options: nosniff` present

MIME-sniffing protection is active on all responses.

---

#### I4 — Referrer-Policy: strict-origin-when-cross-origin

Referrer policy is set to a sensible default. Outgoing links to external resources will only send the origin, not the full path.

---

#### I5 — Cloudflare Speculation Rules active

`speculation-rules: "/cdn-cgi/speculation"` is present on the homepage, enabling Cloudflare's prefetch/prerender infrastructure. This can positively impact LCP for navigations within the site.

---

#### I6 — Robots.txt AI crawler controls

The site blocks: AmazonBot, Applebot-Extended, Bytespider, CCBot, ClaudeBot, CloudflareBrowserRenderingCrawler, Google-Extended, GPTBot, meta-externalagent, FacebookBot, Omgilibot, ChatGPT-User. The `Content-Signal: search=yes, ai-train=no` declaration is present. This policy is consistent and well-maintained.

---

#### I7 — Canonical tags correctly implemented

All tested pages carry absolute self-referencing canonical tags with clean paths (no `.html` suffix). No duplicate canonical conflicts were found. Canonical URLs in the sitemap match the canonical tags on-page.

---

#### I8 — IndexNow not detected

No `IndexNow` key file was found and no `IndexNow` header was observed. IndexNow enables near-instant URL submission to Bing, Yandex, and Naver on publish. For a static site deployed via Cloudflare Pages, the Cloudflare IndexNow integration can be enabled in the Speed > Optimization panel without any code changes.

**Recommendation**: Enable Cloudflare's built-in IndexNow integration (Speed > Optimization > IndexNow) to notify Bing and Yandex of new/updated pages at each deploy.

---

## Prioritised Action List

| Priority | Finding | Effort | Impact |
|---|---|---|---|
| 1 | C1 + C2: Fix BreadcrumbList `@id` (strip `.html`, make absolute) | Low | High — restores rich results for 916 pages |
| 2 | H1: Add CSP header via `_headers` | Medium | High — security posture |
| 3 | H1 (CSS double-load): Remove duplicate stylesheet link | Low | Medium — bandwidth + render |
| 4 | H3: Set `Cache-Control` with positive `max-age` on HTML | Low | Medium — repeat visit performance |
| 5 | H4: Add H1 and meta description to games page | Low | Medium — crawl signal + CTR |
| 6 | M1 + M2: Add `X-Frame-Options` and `Permissions-Policy` | Low | Medium — security |
| 7 | M3: Trim meta descriptions to ≤155 chars | Low | Low — CTR quality |
| 8 | L1: Add noindex to Datenschutz and Impressum | Low | Low — index hygiene |
| 9 | M5: Add `llms.txt` | Low | Low — future-proofing |
| 10 | I8: Enable IndexNow via Cloudflare | Minimal | Medium — Bing/Yandex freshness |

---

*Report generated by Technical SEO audit agent — berliner-schnauze.wtf — 2026-06-29*
