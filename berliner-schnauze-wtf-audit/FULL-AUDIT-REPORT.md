# SEO Audit: berliner-schnauze.wtf
**Date:** 2026-06-29  
**Audited URL:** https://berliner-schnauze.wtf  
**Site type:** Niche reference site — Berlin dialect dictionary (Berlinerisch ↔ Hochdeutsch)  
**Tech stack:** Astro v7 SSG, Vue 3 islands, Cloudflare Pages, WordPress GraphQL backend  
**Total pages:** 930 (916 word entries + utility pages)

---

## Overall SEO Health Score: **59 / 100**

| Category | Score | Weight | Weighted |
|---|---|---|---|
| Technical SEO | 64 | 22% | 14.1 |
| Content Quality | 62 | 23% | 14.3 |
| On-Page SEO (SXO) | 62 | 20% | 12.4 |
| Schema / Structured Data | 58 | 10% | 5.8 |
| Performance (CWV) | 65 | 10% | 6.5 |
| AI Search Readiness | 41 | 10% | 4.1 |
| Images | 90 | 5% | 4.5 |

> **Backlinks**: Insufficient data (Common Crawl shows zero referring domains — Moz API credentials needed for full score). Backlink deficit is a major gap but excluded from weighted score.

---

## Executive Summary

Berliner Schnauze has solid technical foundations — static Astro SSG, Cloudflare Pages, correct canonicals, complete OG/Twitter meta, well-structured DefinedTerm schema — but is held back by a handful of systematic bugs and missed opportunities.

**The three most impactful fixes this week:**

1. **BreadcrumbList schema bug** — all 916 word pages have `.html` suffix in the schema `@id` and use relative URLs. One template fix unblocks breadcrumb rich results site-wide.
2. **AI search crawler blocking** — ChatGPT-User, OAI-SearchBot, and ClaudeBot are blocked in robots.txt. The intent (block AI training) is legitimate via TDMREP, but the implementation accidentally blocks real-time search bots. One robots.txt addition unlocks ChatGPT/Claude/Perplexity search.
3. **Games page has no H1 or meta description** — the only page that is functionally unrankable.

The AI search readiness score (41/100) is the most underperforming category and also the most recoverable: the fixes are primarily configuration changes (robots.txt, llms.txt) rather than content work.

---

## Technical SEO — 64/100

*Full findings: `findings/technical.md`*

### What works
- HTTP/2 via Cloudflare ✅
- HSTS with preload (`max-age=15552000; includeSubDomains; preload`) ✅
- `X-Content-Type-Options: nosniff` and `Referrer-Policy: strict-origin-when-cross-origin` ✅
- All canonical URLs correct and absolute on all tested pages ✅
- No noindex on any public content pages ✅
- Cloudflare Speculation Rules active (prefetch for navigations) ✅
- robots.txt well-structured with Sitemap declaration ✅

### Critical
**C1 — BreadcrumbList `.html` suffix and relative `@id` on all 916 word pages**  
The BreadcrumbList template sets `@id: "/wort/aalen.html"` on the leaf item. Two defects compounded: (a) `.html` suffix not matching canonical URL, (b) relative path instead of required absolute IRI. Result: breadcrumb rich results suppressed across the entire word-entry section.

→ `[...wordSlug].astro` — strip `.html`, prefix origin in BreadcrumbList builder.

### High
- **CSS loaded twice** — each stylesheet included as both `media="print" onload="…"` AND a direct synchronous `<link>`. Browser downloads and parses every CSS file twice per page.
- **Missing Content-Security-Policy** — no CSP on any page. Add via `_headers`.
- **Cache-Control: `max-age=0`** — static site with no browser cache. Set `max-age=3600, stale-while-revalidate=86400` in `_headers`.
- **Games page no H1 + no meta description** — covered in Content section.

### Medium
- Missing `X-Frame-Options: DENY`
- Missing `Permissions-Policy`
- Some meta descriptions at 163 chars (truncation guard threshold too loose)
- `font-display: fallback` on body fonts — 100ms invisible text block on cold cache

### Low / Info
- Datenschutz and Impressum lack noindex
- IndexNow not configured (free, Cloudflare dashboard)
- HSTS preload — verify acceptance at hstspreload.org

---

## Content Quality — 62/100

*Full findings: `findings/content.md`*

### What works
- All 916 word pages have meta descriptions ✅
- All images have alt text ✅
- Rich heading structure per word page (Etymologie, Beispiele, Phonologie, Grammatik) ✅
- 15 internal links per word page (alphabetical neighbors) ✅
- Founder + sameAs (Mastodon, Facebook, GitHub) in Organization schema ✅
- `dateCreated`/`dateModified` in schema and visible on pages ✅

### Critical
**Games page: no H1 and no meta description**  
`/games/berliner-oder-nicht` is a Vue `client:only` island — nothing server-rendered. The page description field is not wired through `seoData()`. Result: no H1 signal, no meta description, no schema.

→ Add static `<h1>` in `.astro` file; pass page props through `seoData()`.

### High
**Thin content risk from formulaic assembly**  
916 pages averaging ~339 words, fully CMS-assembled. Pages with sparse fields (no `infoText`, no etymology, no usage examples) contain only a term, a translation, and mechanical letter-frequency statistics. Pattern matches March 2024 core update thin-content targets.

→ Build-time gate: exclude entries with fewer than N populated fields from sitemap.

### Medium
- Word page H1 is the bare term only (`<h1><dfn>aalen</dfn></h1>`) — add translation subtitle
- Homepage H1 `"Na Keule, keen'n Dunst vom Berlinern?"` has no keyword signal — add server-rendered plain-German subtitle
- No `/ueber` or editorial methodology page (E-E-A-T gap for a reference site)
- Dialect phrases in body text not marked with `lang` attribute

### Low
- 2 of 15 sampled pages at 163-char meta descriptions
- Datenschutz/Impressum lack noindex

---

## On-Page SEO / SXO — 62/100

*Full findings: `findings/sxo.md`*

### What works
- Word page URL structure clean: `/wort/[term]` ✅
- Title tag uses brand suffix: "aalen | Bedeutung, Definition, Beispiel" ✅
- PWA installable — unique competitive differentiator ✅
- Orama full-text search with German stemming ✅

### High
**Word page title template lacks dialect differentiation**  
`[word] | Bedeutung, Definition, Beispiel` is identical in structure to Duden, DWDS, Wortbedeutung.info. No dialect context visible in SERP. Users have no reason to prefer this result.

→ Test: `[word] auf Berlinerisch — Bedeutung, Beispiel & Herkunft | Berliner Schnauze`

**Meta description template doesn't surface unique depth**  
Closing CTA "Entdecke Berliner Ausdrücke auf Berliner Schnauze" is generic. Etymology, phonology, grammatical data are not mentioned.

→ Test: `[word] heißt auf Berlinerisch: [definition]. Mit Etymologie, Aussprache und Beispielsätzen.`

**Homepage H1 opaque to non-native searchers**  
For visitors arriving via "berliner dialekt wörterbuch" queries, the dialect H1 provides no confirmatory signal.

→ Add plain-German server-rendered subtitle below dialectal H1.

### Medium
- Internal links are alphabetical only — no semantic/topical discovery path
- Games page has no SEO foundation (no H1, meta, schema)
- No "Verwandte Wörter" section linking semantically related terms
- Homepage content thin for broad "Berlinerisch" informational queries
- PWA advantage invisible in SERP (no SoftwareApplication schema, not mentioned in meta)

### Low
- `.wtf` TLD may suppress CTR from institutional/educational searchers

---

## Schema / Structured Data — 58/100

*Full findings: `findings/schema.md`*

### What works
- `DefinedTerm` well-implemented: `termCode`, `inDefinedTermSet`, `mainEntityOfPage`, `inLanguage: de-DE`, `dateCreated/Modified`, `comment` (usage examples), `url` ✅
- `WebSite` + `Organization` on homepage ✅
- Organization has `founder`, `logo`, `sameAs` ✅
- `BreadcrumbList` present on all pages (schema present, execution buggy) ✅

> Score would jump to ~78-80 after BreadcrumbList fix alone.

### Critical
**BreadcrumbList: relative `@id` + `.html` suffix on ~916 pages**  
Root cause: `astro-breadcrumbs` generates its own JSON-LD from `Astro.url` before the build rewrite strips the extension, bypassing the `canonicalUrl()` helper.

→ Replace `astro-breadcrumbs` JSON-LD with manually constructed block using `canonicalUrl()` for every `item.@id`.

### High
**WebSite missing `potentialAction SearchAction`**  
Site has Orama-powered full-text search but no Sitelinks Search Box schema. Highest-value missing rich result for a 916-entry dictionary.

→ Add `potentialAction` with `SearchAction` and `urlTemplate` to WebSite schema.

### Medium
- Organization missing `@id` IRI — Google can't unify entity across pages. Add `@id: "https://berliner-schnauze.wtf/#organization"`.
- Games page has zero structured data. Add `VideoGame` schema + `BreadcrumbList`.
- `DefinedTermSet` on `/wort` missing `@id` and `numberOfItems`.

---

## Sitemap — 72/100

*Full findings: `findings/sitemap.md`*

### What works
- Valid sitemap-index + sitemap-0.xml structure ✅
- 930 URLs (well within 50,000 limit) ✅
- No `.html` URLs (matches canonicals) ✅
- Declared in robots.txt ✅
- No `priority` or `changefreq` (Google ignores both — correct omission) ✅

### High
**Application UI pages in sitemap**  
`/settings` and `/settings/cache` are PWA settings pages — client-only shells with no indexable content. Google crawls these, finds no content, flags as thin.

→ Add to sitemap filter exclusion list; add `noindex` meta.

**Share result page in sitemap**  
`/games/berliner-oder-nicht/share` renders entirely from URL query parameters via `client:only` Vue. Static HTML is an empty mount point.

→ Exclude from sitemap; add `noindex`.

### Medium
**All 930 lastmod values are identical build timestamps**  
`sitemap({ lastmod: new Date() })` stamps every URL with the build time. Google stops trusting `lastmod` for an entire sitemap when all values change simultaneously on every deploy.

→ Supply per-URL `lastmod` from WordPress `modified` field for word entries.

---

## AI Search Readiness (GEO) — 41/100

*Full findings: `findings/geo.md`*

**Platform scores:**
| Platform | Score |
|---|---|
| Google AI Overviews | 35 |
| ChatGPT Search | 10 |
| Perplexity | 45 |
| Bing Copilot | 40 |
| Claude | 10 |
| Apple Intelligence | 15 |

### What works
- Astro SSG — all content in static HTML, no JS required for AI crawlers ✅
- `DefinedTerm` schema with `termCode`, `inLanguage`, `inDefinedTermSet` — above-average for a dictionary ✅
- TDMREP `Content-Signal: search=yes, ai-train=no` — legitimate deliberate copyright policy ✅

### Critical
**AI search crawlers blocked alongside training crawlers**  
`GPTBot`, `ClaudeBot`, `ChatGPT-User`, `Google-Extended` are all disallowed. The training opt-out intent (TDMREP) is sound, but `GPTBot` serves both ChatGPT training AND ChatGPT real-time search. Blocking it removes the site from ChatGPT search answers entirely. Same for `ClaudeBot` → Claude search.

→ **robots.txt additions needed:**
```
User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: PerplexityBot
Allow: /
```
Retain `GPTBot Disallow` if training opt-out is desired. Retain TDMREP signal.

### High
**No `llms.txt`**  
`/llms.txt` returns 404. Static file, minutes to create. Enables AI assistants to understand site structure and respect licensing without full crawling.

**No Speakable schema**  
For a dialect dictionary with pronunciation, phonology, and usage examples, Speakable markup enables Google AIO audio and voice agents to extract and read the most relevant passages.

→ Add `Speakable` to `DefinedTerm` marking `description` and `comment` fields.

### Medium
- Section headings are topic labels not question-format (reduces AI answer matching)
- Zero Common Crawl backlink footprint (low authority signal for citation models)
- `.wtf` TLD requires compensating entity signals
- No Wikipedia entity for domain or dialect topic
- No YouTube presence (YouTube has ~0.737 AI citation correlation)

---

## Backlinks — Insufficient Data

*Full findings: `findings/backlinks.md`*

**Common Crawl result:** No PageRank, no Harmonic Centrality, zero referring domains.  
**Moz API:** Not configured (free tier available — 2,500 rows/month).

This is the most critical long-term gap. The site cannot be numerically scored without Moz API data, but the signal from Common Crawl absence is directionally clear: very low external link authority.

**Highest-priority link opportunities:**
1. German Wikipedia `Berliner Dialekt` article citation
2. de.wiktionary.org — 1:1 citation opportunity for 916 word entries
3. DWDS (Digitales Wörterbuch der deutschen Sprache)
4. Babbel Magazine, DW Learn German (DA 60-80)
5. Tagesspiegel, Zeit Online dialect/linguistics articles

---

## Images — 90/100

**What works:** All images have alt text ✅. Per-word OG images at `/og/[word].png` (1200×630) ✅. Complete favicon set ✅.

**Minor gap:** Homepage OG image (`brown-bear-roar.png`) is 900×517 — below the 1200×630 standard. Word pages correctly use 1200×630. Low priority.

---

## Top 5 Quick Wins

| # | Action | Effort | Impact |
|---|---|---|---|
| 1 | Fix BreadcrumbList `.html` + relative `@id` in schema template | 30 min | Unblocks breadcrumb rich results for 916 pages |
| 2 | Add `OAI-SearchBot`, `ChatGPT-User`, `PerplexityBot` Allow in robots.txt | 5 min | Unlocks ChatGPT/Perplexity search visibility |
| 3 | Create `/public/llms.txt` | 15 min | AI discovery, licensing signal |
| 4 | Add H1 + meta description to games page | 20 min | Makes page rankable |
| 5 | Exclude `/settings*`, `/games/.../share` from sitemap; add noindex | 20 min | Removes thin pages from index queue |

---

*Generated by claude-seo:seo-audit · 7 specialist agents · 2026-06-29*
