# Content Quality Audit — berliner-schnauze.wtf

**Audit date:** 2026-06-29
**Auditor:** Content Quality specialist (Sept 2025 QRG)
**Scope:** Homepage, word detail pages (~916 entries), games page, wort-index, legal pages

---

## Overall Score: 62 / 100

The site has a solid structural foundation — correct language tagging, DefinedTerm schema, breadcrumbs, internal linking, and freshness signals via dateCreated/dateModified. The primary drag on the score is the formulaic, data-driven nature of most word pages (~339 words, largely auto-assembled from field values), two hard-breaking gaps on the games page (missing H1 + meta description), missing noindex on legal pages, and thin E-E-A-T authority signals beyond the founder's name.

---

## E-E-A-T Breakdown

| Factor | Score | Weight | Weighted |
|---|---|---|---|
| Experience | 52 / 100 | 20% | 10.4 |
| Expertise | 58 / 100 | 25% | 14.5 |
| Authoritativeness | 48 / 100 | 25% | 12.0 |
| Trustworthiness | 70 / 100 | 30% | 21.0 |
| **Composite E-E-A-T** | | | **57.9 / 100** |

### Experience (52)

First-hand signals are sparse. The dialect facts on the homepage link to external sources (Statista, TU Dortmund) rather than presenting original research or editorial commentary from a native speaker's perspective. Word pages contain usage examples and audio recordings, which are positive experience markers, but there is no editorial voice explaining *why* a word matters, in what context it was collected, or any curator's note. The `infoText` field is optional and unevenly populated — many entries render only translation + mechanical linguistic data.

### Expertise (58)

Technical execution is high (schema, NLP tags, phonological similarity, morphological grammar data). This demonstrates deep Berlinerisch domain knowledge. However, the expertise is implicit; it is never surfaced to the reader or to a quality rater as an explicit credential. There is no author bio, no editorial team page, and no "about this dictionary" methodology page. Wikipedia-style editorial transparency is absent. The Statista and TU Dortmund citations on the homepage add credibility but are isolated to two fact cards.

### Authoritativeness (48)

The Organization schema lists Mastodon, Facebook, and GitHub as `sameAs` — all self-operated. There are no inbound citation signals surfaced in the page content (no press mentions, no academic references, no community awards). The founder's link points to a personal portfolio (`webshaped.de`) rather than a dialect-expertise context. No Wikipedia page or Wikidata entity is referenced. Backlink profile cannot be assessed from static analysis, but the on-page authority signals are weak.

### Trustworthiness (70)

Strong signals: `lang="de"`, `de_DE` OG locale, HTTPS (assumed), Impressum and Datenschutz pages present (German legal requirement met), fediverse creator meta, dateModified exposed on every word page. Weaker: legal pages carry no `noindex` (see finding CF-06), and there is no About page or contact page beyond what Impressum mandates. The missing meta description on the games page (CF-01) is also a minor trust signal gap.

---

## Findings

### CF-01 — Games page: Missing H1 and meta description
**Severity: Critical**

`/games/berliner-oder-nicht` has neither an `<h1>` element nor a `<meta name="description">`. The Astro component renders only `<BerlinerOderNicht client:only="vue" />` inside Layout with a bare `{ description, title }` object. The description field is present in the page object (`'Echtes Berlinerisch oder erfunden? Swipe-Game mit Streak-Multiplikator und Highscore.'`) but is not wired into a `<meta name="description">` tag via the Layout's SEO plumbing — the Layout's `seoData()` helper expects the field under `seo.opengraphDescription`, not top-level `description`. The game component itself renders no static H1 because it is `client:only="vue"`, so Google's crawler sees a page with a `<title>` but no accessible document heading.

**Recommendation:** Pass the page data through `seoData()` so the meta description is rendered in the `<head>`. Add a visible static `<h1>` in the `.astro` file (outside the Vue island) that Google can crawl — e.g. `<h1 class="c-game-title">Berliner oder nicht?</h1>` — since `client:only` components do not produce server-rendered HTML.

---

### CF-02 — Word pages: Thin content risk from formulaic template assembly
**Severity: High**

916 word pages each contain approximately 339 words. Per the Sept 2025 QRG and the content minimums for complex service/reference pages (400+ words for content-rich entries), the word count alone is borderline — but more importantly, the content structure is entirely driven by CMS field population. Sections like Etymologie, Phonologie, Grammatik, and Quantitative Linguistik are rendered only when their data fields are non-empty. Pages for words with fewer populated fields will fall well below 300 words and present nothing beyond: term name, one or two translations, mechanical letter-frequency statistics, and alphabetic neighbours. These are the dictionary equivalent of thin product pages.

Large-scale template duplication is a documented risk under the March 2024 core update's helpfulness signals: pages that differ only in the substituted term, with no unique editorial value per entry, can receive a sitewide helpfulness discount.

**Recommendation:** Audit the bottom quartile of word pages by populated field count. For entries where `infoText`, `examples`, and `relatedWords` are all empty, require at minimum one editorial sentence before publishing. Consider a minimum content gate in the build: warn (or withhold from sitemap) any page whose extracted text falls below 200 words. The `WordSectionLinguistik` and `WordSectionOrthographie` components produce mechanical data that counts toward word count but offers low informational value in isolation.

---

### CF-03 — Word pages: H1 contains only the bare dialect term
**Severity: Medium**

The `<h1>` on every word page is the raw Berlinerisch term wrapped in `<dfn>` — e.g. `<h1><dfn>aalen</dfn></h1>`. This is semantically correct HTML but misses the opportunity to reinforce the primary keyword phrase in the H1. For queries such as "aalen Berlinerisch Bedeutung" or "was bedeutet aalen auf Berlinisch", the H1 contributes nothing to the keyword signal. The title tag already carries the format `"aalen | Bedeutung, Definition, Beispiel"` — the H1 should echo this to align on-page signals.

**Recommendation:** Extend the H1 to include the translation signal inline, for example: `aalen — Bedeutung auf Berlinerisch` or keep the term as the primary text with a visually subordinate subtitle (`<p class="c-word-hero__subtitle">Berlinerisch für: sich rekeln</p>`) that Google treats as part of the lead content. The `wortartLabel` and article (`der/die/das`) already appear as badges — surfacing the primary translation in or directly below the H1 strengthens both keyword relevance and user comprehension.

---

### CF-04 — Homepage H1: Dialectal phrasing reduces keyword clarity
**Severity: Medium**

The homepage H1 `"Na Keule, keen'n Dunst vom Berlinern?"` is a charming brand statement but carries zero keyword signal. Google's quality raters assess whether a page's main heading matches user intent for the target query. The target query for this page is `Berlinerisch Wörterbuch` or `Berliner Dialekt`. The title tag carries those terms correctly, but when title tag and H1 are semantically disconnected, the on-page topical relevance signal is weakened.

**Recommendation:** This is a low-disruption change: add a visually hidden or visually subordinate H1 variant that includes the target phrase, or restructure so the existing dialectal heading is a decorative element (`<p aria-hidden="true">`) and a keyword-bearing H1 is inserted. Alternatively, ensure the `<h2>Fakten zur Berliner Mundart</h2>` is treated as the nearest authoritative heading and that the page's structured data (WebSite schema) reinforces the topical context — which it does — partially offsetting this gap.

---

### CF-05 — Meta description overrun on 2 of 15 sampled pages
**Severity: Low**

Two pages carry meta descriptions of 163 characters, three characters above the practical 160-character truncation threshold. Google typically rewrites descriptions that are truncated, which can result in a snippet that cuts off mid-sentence — particularly problematic for German compound nouns that often appear at the end of a sentence.

**Recommendation:** The word page meta description is generated in `[...wordSlug].astro` with a truncation guard: `raw.slice(0, 157) + '…'`. This guard is correct in principle but the `raw` string uses the template `„${berlinerisch}" bedeutet auf Berlinerisch: ${translations}. Entdecke Berliner Ausdrücke auf Berliner Schnauze.` — long `berlinerisch` values or multiple translations can still push the total over 160 before the guard fires because the guard trims to 157+ellipsis (160 total). Review whether the trailing sentence `Entdecke Berliner Ausdrücke auf Berliner Schnauze.` should be dropped or shortened for entries where translations are verbose.

---

### CF-06 — Legal pages lack noindex directive
**Severity: Low**

`/datenschutz` and `/impressum` are built via `[legalPages].astro` which passes the WP page's SEO object directly to Layout without injecting `robots: noindex, nofollow`. Both pages will appear in Google's index. While not a ranking penalty, legal boilerplate pages consume crawl budget and may appear in branded SERPs, diluting the UX. German courts require these pages to be accessible and linkable, but they do not need to be indexed.

**Recommendation:** In `[legalPages].astro`, inject `<meta name="robots" content="noindex, nofollow" />` unconditionally for the `datenschutz` and `impressum` slugs, or add a `robots` field to the `pageContent` SEO object that the Layout component renders.

---

### CF-07 — No About/editorial methodology page
**Severity: Medium**

The site has no About page, no "Über das Wörterbuch" page, and no editorial methodology page. For a reference/dictionary site, this is a significant E-E-A-T gap. Quality raters are explicitly instructed to look for "who is responsible for this content" signals. The founder is named in Organization schema (machine-readable only) and the GitHub repository is linked — but neither is surfaced to a human visitor.

**Recommendation:** Create a short `/ueber` or `/ueber-das-projekt` page covering: who curates the dictionary, the collection methodology (how entries are sourced/verified), the target audience, and how users can contribute (the word suggestion feature exists but is not contextualised). This page should be linked from the footer and referenced in the Organization schema as `url` or `description`.

---

### CF-08 — AI citation readiness: passage-level citability is moderate
**Severity: Info**

AI citation readiness scores approximately 58/100. Positive factors: structured data (DefinedTerm with `description`, `comment` array for examples, `inLanguage`, `inDefinedTermSet`), clear passage hierarchy (H2 sections with IDs and `aria-labelledby`), German-language content with explicit locale markup. Gaps: the `description` field in DefinedTerm is often identical to the meta description (a short translation phrase), providing no paragraph-level citable claim for an AI to excerpt. The `infoText` editorial field — where populated — is the only passage with genuine citability, but it is present on a minority of entries. Example comments (`Comment` type) are the strongest citation candidates since they are usage-in-context, but they are also only present on a subset of entries.

**Recommendation:** For entries with `infoText`, ensure the text is structured as a standalone factual claim (one to three sentences, subject–predicate–object) rather than a fragment. This maximises passage-level extractability for AI overviews. For entries without `infoText`, consider auto-generating a minimal editorial sentence from structured data fields (e.g. etymology origin, word type, usage register) and storing it in the CMS rather than leaving it empty.

---

### CF-09 — Content freshness signals: present but unverifiable per-entry
**Severity: Info**

Every word page exposes `dateCreated` and `dateModified` in both the DefinedTerm schema and the `<WordPageFooter>` component. The OG modified time is also set. This is a good implementation. However, if entries are never edited after initial publication, `dateModified` will equal `dateCreated` across the entire corpus — a signal that content is not maintained. Google's freshness signals reward recent modification dates for reference content where accuracy is expected to change over time (e.g. usage frequency data, cultural context).

**Recommendation:** Implement a periodic review cycle — even minor editorial additions (an example sentence, a usage note) should trigger a `dateModified` update in the CMS. Consider surfacing a "zuletzt aktualisiert" stamp prominently on word pages (currently it is in the footer) to signal freshness to both users and crawlers.

---

### CF-10 — Language consistency: strong overall, one dialect/standard mixing edge case
**Severity: Info**

`lang="de"` is set on `<html>`, OG locale is `de_DE`, and the DefinedTerm schema uses `inLanguage: 'de-DE'`. The `infoText` editorial field may contain Berlinerisch dialect phrases — if these are quoted without being wrapped in an element carrying a different language tag or appropriate semantic markup (e.g. `<q lang="de-DE-berlin">` or a `<dfn>`), screen readers and NLP parsers may misparse them. The H1's use of `<dfn>` for the dialect term is semantically correct. The homepage H1 dialect phrase is unmarked.

**Recommendation:** Where Berlinerisch dialect phrases appear inline in editorial prose, wrap them in `<span lang="de">` (no sub-tag exists for Berlinerisch, but isolating them prevents incorrect stem-matching by search engines). This is a minor refinement with low implementation cost.

---

## AI Citation Readiness Score: 58 / 100

| Factor | Score |
|---|---|
| Structured data coverage (DefinedTerm, schema.org) | 82 |
| Passage-level citability (quotable factual claims) | 42 |
| Content hierarchy clarity (H2 IDs, aria-labelledby) | 75 |
| Locale and language precision | 90 |
| Freshness of cited facts | 45 |

---

## Summary Table

| ID | Finding | Severity |
|---|---|---|
| CF-01 | Games page missing H1 and meta description | Critical |
| CF-02 | Word pages thin content risk — formulaic template assembly | High |
| CF-03 | Word page H1 contains only bare dialect term | Medium |
| CF-04 | Homepage H1 dialectal phrasing reduces keyword clarity | Medium |
| CF-05 | Meta description overrun on 2/15 sampled pages | Low |
| CF-06 | Legal pages (Datenschutz, Impressum) lack noindex | Low |
| CF-07 | No About / editorial methodology page | Medium |
| CF-08 | AI citation readiness: passage-level citability moderate | Info |
| CF-09 | Content freshness signals present but unverifiable per-entry | Info |
| CF-10 | Language consistency: dialect phrases unmarked in prose | Info |
