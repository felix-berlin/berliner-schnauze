# SXO Audit — berliner-schnauze.wtf

**Date:** 2026-06-29
**Analyst:** SXO Agent (Claude Sonnet 4.6)
**Scope:** Homepage + word entry pages (sample: /wort/aalen) + games page
**Primary keywords analyzed:** "berlinerisch wörterbuch", "[word] bedeutung berlinerisch", "berliner dialekt [word]"

---

## PageSpeed Data

PageSpeed Insights API rate limit was exceeded during this audit run. No Core Web Vitals data could be collected. Re-run with `pagespeed_check.py` in a separate session for quantitative performance scores. All UX and performance observations below are based on structural signals (PWA manifest, font-display, schema, rendering model) rather than measured field data.

---

## 1. SERP Analysis

### Keyword: "berlinerisch wörterbuch"

**Top 10 organic results observed:**

| # | Domain | Page Type | Notes |
|---|--------|-----------|-------|
| 1 | berliner-schnauze.wtf | Dictionary homepage | Target site — ranks #2 in observed results |
| 2 | berlinstadtservice.de | Static list page | Simple A–Z word list, no definitions |
| 3 | in-berlin-brandenburg.com | Static list page | Thin list, commercial book promotion |
| 4 | deine-woerter.de | Listicle / gift lexicon | Editorial list, not a reference dictionary |
| 5 | spreetaufe.de | Dictionary index (A–Z split pages) | Flat HTML, alphabetical range pages |
| 6 | de.wikipedia.org | Encyclopedia article | Authority page on the dialect itself |
| 7 | berlin.de | Tourism/editorial | Official Berlin portal, thin dialect intro |
| 8 | shop.duden.de | Product page | Physical book for sale |
| 9 | amazon.de | E-commerce | Physical books |
| 10 | de.babbel.com | Editorial / listicle | "Top 17 Berliner words" article |

**SERP dominant page type:** Dictionary / reference index (confidence: 60%). Secondary cluster: editorial listicle (30%). E-commerce (10%).

**SERP features observed:**
- No universal featured snippet for "berlinerisch wörterbuch" (query is navigational/resource-seeking)
- PAA questions likely include: "Was bedeutet Berlinerisch?", "Wie spricht man Berlinerisch?", "Was sind typische Berliner Wörter?"
- Knowledge Panel: none for the site
- Rich results: none observed for competitor word-list pages

### Keyword: "[word] bedeutung berlinerisch" (e.g., "aalen bedeutung berlinerisch", "knorke bedeutung berlinerisch")

**Top results for word-level queries:**

| # | Domain | Page Type | Schema |
|---|--------|-----------|--------|
| 1 | de.wiktionary.org | Dictionary entry | DefinedTerm implied via structured content |
| 2 | dwds.de | Authoritative dictionary entry | Full lexical schema, DWDS corpus data |
| 3 | berliner-schnauze.wtf | Word entry page | DefinedTerm + BreadcrumbList |
| 4 | sprachnudel.de | Dictionary entry | Thin |
| 5 | duden.de | Dictionary entry | Rich schema |
| 6 | wortbedeutung.info | Dictionary entry | Structured entry |
| 7 | berlin.de | Editorial single-word page | Editorial prose |
| 8 | spreetaufe.de | Static list page | No per-word schema |
| 9 | wikipedia.org | Redirect / mention | N/A |
| 10 | havelland-zeitung.de | Article | Editorial |

**SERP dominant page type for word queries:** Dedicated dictionary entry page (confidence: 80%). Target site's page type is ALIGNED for word-level queries.

**Key SERP signals:**
- DWDS and Wiktionary consistently outrank or co-rank on word queries because of corpus depth, citation authority, and established domain age
- No competitor currently holds sitewide rich result snippets (definition boxes) for Berliner dialect terms — this is an untapped opportunity
- PAA boxes regularly appear for word-level queries with questions like "Woher kommt [word]?", "Was bedeutet [word] auf Hochdeutsch?"

---

## 2. Page-Type Mismatch Assessment

### Homepage
**Target type:** Dictionary homepage with brand positioning
**SERP dominant type:** Dictionary / reference index
**Verdict:** ALIGNED — the homepage correctly positions as a dictionary. No critical mismatch.

### Word entry pages (/wort/[word])
**Target type:** Individual dictionary entry (DefinedTerm)
**SERP dominant type:** Individual dictionary entry
**Verdict:** ALIGNED — the page type matches what Google rewards for word-level queries.

### Games page (/games/berliner-oder-nicht)
**Target type:** Interactive game / quiz
**SERP dominant type:** Not applicable (no direct search demand for this specific page)
**Verdict:** INFO — the games page is not a ranking target and should not be evaluated against SERP intent. It functions as an engagement/retention layer.

**Overall mismatch severity: ALIGNED** — no critical structural mismatch detected. Gaps are at the content depth, schema, and CTR optimization layer, not at the page-type layer.

---

## 3. Findings

### Finding 1: Homepage H1 is Opaque to Non-Native Searchers — HIGH

**Severity:** High

**Evidence:**
The current H1 is "Na Keule, keen'n Dunst vom Berlinern?" — a Berlin dialect phrase meaning roughly "Hey buddy, no idea about speaking Berlinisch?" This is charming for repeat visitors and Berlin insiders, but it provides zero semantic clarity for first-time visitors arriving from Google.

Search intent for "berlinerisch wörterbuch" is **informational/navigational**: the user wants a reference tool. When a user lands on the page, the above-the-fold content must confirm within 3 seconds that they have found what they searched for. A dialect headline that requires translation to understand creates a cognitive gap.

Additionally, Google uses the H1 as a primary relevance signal. A dialect H1 with no supporting plain-German keyword phrase makes the homepage harder to associate with queries like "Berliner Dialekt Wörterbuch" or "Berlinerisch übersetzen."

**Recommendation:**
Keep the dialect H1 as brand personality, but add an immediately visible plain-German subtitle (H2 or visually prominent tagline) such as "Das Berlinerisch–Hochdeutsch Wörterbuch — 916 Wörter mit Bedeutung, Etymologie und Beispielen." This subtitle should appear above the fold on both mobile and desktop without scrolling. The dialect H1 then reads as a playful hook; the subtitle delivers the semantic confirmation.

---

### Finding 2: Word Page Title Template is Functionally Correct but CTR-Weak — HIGH

**Severity:** High

**Evidence:**
Current title pattern: `[word] | Bedeutung, Definition, Beispiel`

This template is semantically accurate and keyword-aligned. However, it misses two significant CTR levers:

1. **No differentiation signal.** "Bedeutung, Definition, Beispiel" is generic and appears on Duden, DWDS, and Wortbedeutung.info in identical or near-identical form. In a SERP where the user sees three "Bedeutung" results in a row, there is no reason to click berliner-schnauze.wtf over dwds.de (which has higher perceived authority).

2. **Missing dialect qualifier in title.** A user searching "aalen bedeutung" who wants the *Berlinerisch* meaning specifically gets no signal from the title that this is the Berliner dialect entry, not the standard German one. DWDS covers standard German; berliner-schnauze.wtf covers dialect — but the title does not communicate this.

**Recommendation:**
Test an alternative template: `[word] auf Berlinerisch — Bedeutung, Beispiel & Herkunft | Berliner Schnauze`

This template:
- Differentiates on "auf Berlinerisch" (dialect specificity)
- Replaces the list separator with an em-dash for readability
- Adds "Herkunft" (etymology) as a third hook (users interested in dialect etymology are a high-intent sub-segment)
- Includes the brand name for recognition on repeat SERP exposure
- Fits within ~65 characters for most word lengths

---

### Finding 3: Meta Description Template is Generic and Does Not Drive Clicks — HIGH

**Severity:** High

**Evidence:**
Current meta description pattern: `„[word]" bedeutet auf Berlinerisch: [definition]. Entdecke Berliner Ausdrücke auf Berliner Schnauze.`

The first sentence is strong — it directly answers the query intent and uses a quote mark for visual distinction. However, the second sentence ("Entdecke Berliner Ausdrücke...") is a generic call-to-action that adds no value for a user who already found the word they searched for.

More critically: the description does not mention etymology, usage examples, phonology, or grammatical data — all of which are present on the page and are strong differentiators versus thin competitors. Users who care about "where does this word come from" have no signal that the page contains that data.

**Recommendation:**
Test a two-part template: `„[word]" heißt auf Berlinerisch: [definition]. Mit Etymologie, Aussprache und 3 Beispielsätzen — [unique linguistic hook if available].`

For words with notable etymology (French loan, Yiddish origin, etc.), inject that signal: `Lehnwort aus dem Jiddischen — mit Bedeutung, Etymologie und Beispielen.`

This requires the CMS/API to expose the language-of-origin field per word. If available in the WordPress data, this is a high-ROI template variation to A/B test.

---

### Finding 4: Word Pages Lack Definition Schema Rich Result Markup — HIGH

**Severity:** High

**Evidence:**
The site already implements `DefinedTerm` schema on word pages. However, the observed SERP for dialect word queries shows **no rich result enhancement** (definition snippets, highlighted answers) for berliner-schnauze.wtf, while DWDS and Duden occasionally receive definition-style answer boxes.

`DefinedTerm` alone is not sufficient to trigger Google's definition rich results. Google's definition feature boxes typically require:
- `DefinedTerm` + `name` + `description` (or `definition`) properties
- Clear association with a `DefinitionOrg` or `Glossary` container
- Sufficient domain authority and content quality signals around the definition

The word pages have strong content depth (etymologie, grammatik, phonologie, examples) but it is unclear from the pre-collected schema whether `termCode`, `inDefinedTermSet`, or `description` properties are properly populated.

**Recommendation:**
Audit the current `DefinedTerm` implementation to verify:
1. `name` = the Berliner dialect word
2. `description` = the plain-German definition sentence
3. `inDefinedTermSet` pointing to a `DefinedTermSet` entity for the full dictionary
4. Consider adding `Glossary` or `FAQPage` schema to the homepage for high-frequency words (top 20–30 entries) to compete for PAA and featured snippet slots

Cross-reference: use `/seo schema` for full schema generation.

---

### Finding 5: Games Page Has No SEO Foundation — MEDIUM

**Severity:** Medium

**Evidence:**
The games page (/games/berliner-oder-nicht) has no H1 and no meta description. While this page is unlikely to rank for high-volume head terms, it represents an untapped opportunity for engagement-driven queries:
- "Berliner Dialekt Quiz"
- "Berlinerisch testen"
- "Berliner oder nicht Spiel"

These are low-volume but high-intent queries from users who actively want to engage with the dialect (language learners, Berlin expats, tourists). The page currently cannot even be indexed with a meaningful snippet.

**Recommendation:**
- Add H1: "Berliner oder Nicht? — Erkenne den echten Berliner Dialekt"
- Add meta description: "Teste dein Berlinerisch-Wissen im Swipe-Game. Berliner Slang oder doch Hochdeutsch? Jetzt spielen."
- Add `GamePlayMode`, `Game`, or `SoftwareApplication` schema
- Add internal links from high-traffic word pages to the game (e.g., "Kennst du diese Wörter? Teste dein Wissen im Berliner-oder-nicht-Spiel")

---

### Finding 6: Internal Linking Structure is Narrow and Navigation-Only — MEDIUM

**Severity:** Medium

**Evidence:**
Each word page links to 15 alphabetical neighbors. This is a useful crawl-depth mechanism, but it does not serve user intent or topical authority:

- Alphabetical neighbors are semantically unrelated (the user who reads about "Demse" is not likely interested in "Doppeldecker" next)
- There are no links to semantically related or co-occurring words (slang for similar concepts, words from the same etymological origin, words in the same grammatical category)
- The games page is not linked from word pages at all

Google's helpful content guidelines reward pages that help users complete their task. After reading about a word, the next logical user actions are: (a) read about a related word, (b) see the word in a broader vocabulary context, (c) interact with the dialect (game). None of these are supported.

**Recommendation:**
- Add a "Verwandte Wörter" (related words) section per word entry, linking 3–5 semantically related terms (requires a topic grouping or tag system in the CMS)
- Add a "Auch interessant" block linking to 2–3 thematically grouped words
- Add a persistent inline CTA linking to the game from all word pages
- Bonus: a "Wort des Tages" widget on word pages (the store exists in the codebase) would add cross-page depth

---

### Finding 7: Homepage Content Depth is Thin for Broad "Berlinerisch" Queries — MEDIUM

**Severity:** Medium

**Evidence:**
For the query "berlinerisch wörterbuch", competing results from berlin.de, babbel.com, and wikipedia.org offer:
- Historical and linguistic background of the Berlin dialect
- Etymology of the dialect itself (French, Yiddish, Low German influences)
- Curated vocabulary lists
- Cultural context

The homepage currently has H2 "Fakten zur Berliner Mundart" which may address some of this, but based on the pre-collected data, the homepage primarily functions as a search/browse entry point rather than an authoritative landing page. Wikipedia's dialect article and berlin.de's tourism page have a content authority advantage for broad dialect queries.

**Recommendation:**
Expand the homepage's static content layer to include:
- A 150–200 word overview of the Berlin dialect (what it is, where it comes from, how many speakers)
- 5–8 featured/curated word entries with short definitions (acts as a teaser and provides indexable keyword density)
- A "Wussten Sie?" (Did you know?) factoid block highlighting unique linguistic features

This content should be server-rendered in the Astro static output, not loaded via Vue, to ensure it is indexed reliably.

---

### Finding 8: PWA and App Install UX is a Competitive Differentiator — but Not Marketed in SERP Snippets — MEDIUM

**Severity:** Medium

**Evidence:**
The site is a PWA with dark mode, installable app experience, and full offline support. No competitor in the observed SERP (berlinstadtservice, spreetaufe, deine-woerter, in-berlin-brandenburg) offers a PWA or app.

This is a genuine competitive advantage — but it is invisible in SERP snippets. The meta description of the homepage does not mention the app. There is no Sitelinks, App schema, or breadcrumb trail that signals the PWA to users browsing in search results.

**Recommendation:**
- Add `SoftwareApplication` schema to the homepage with `applicationCategory: "ReferenceApplication"`, `operatingSystem: "Android, iOS, Windows"`, and `offers` (free)
- Mention the app in the homepage meta description: "...als App installierbar, kostenlos."
- Consider adding a dedicated App landing page (`/app`) that can rank for "berlinerisch app" queries and provides a canonical install entry point

---

### Finding 9: TLD (.wtf) is Memorable but May Suppress Brand Trust for Some Segments — LOW

**Severity:** Low

**Evidence:**
The `.wtf` TLD is clever and on-brand. In the observed SERP for "berlinerisch wörterbuch," the domain berliner-schnauze.wtf appears and ranks — so Google does not penalize the TLD. However, for users in professional or educational contexts (language teachers, researchers, journalists) the TLD may signal informality/unreliability and reduce CTR compared to `.de` or `.com` competitors.

DWDS (dwds.de) and Duden (duden.de) both use institutional TLDs and are perceived as authoritative. The .wtf domain reinforces the playful/casual brand but may limit the site's ceiling with authority-seeking user segments.

**Recommendation:**
This is a brand/strategy decision, not a purely technical one. If expanding to educational or professional user segments is a goal, consider registering berliner-schnauze.de and 301-redirecting to .wtf, or vice versa. The .wtf domain should be retained for brand recognition. Low priority unless segment expansion is on the roadmap.

---

### Finding 10: Linguistic Data Sections (Quantitative Linguistik, Phonologie) are High-Differentiation Content with No SERP Signal — LOW

**Severity:** Low / Info

**Evidence:**
Word pages include sections for "Quantitative Linguistik" and "Phonologie" — content that is entirely unique in the competitive set. No competitor (Duden, DWDS for dialect words, Spreetaufe, Wortbedeutung.info) provides quantitative corpus frequency data or phonological transcription for Berliner dialect terms.

This is a significant content quality differentiator, but it is not surfaced in titles, meta descriptions, or schema. Users searching for "berliner dialekt phonologie" or "berlinerisch aussprache [word]" receive no signal that this data exists on berliner-schnauze.wtf.

**Recommendation:**
- Create a dedicated FAQ-style entry in schema: "Wie spricht man [word] auf Berlinerisch aus?" with the phonological data as the answer
- Update the title template to occasionally surface "Aussprache" as a hook for phonology-seeking queries
- Create a taxonomy/filter page for words by etymological origin (French loanwords, Yiddish loanwords) — these would rank for navigational-informational queries like "berlinerische Wörter aus dem Jiddischen"

---

## 4. User Story Analysis

**Derived from SERP signals and observed query patterns:**

### Story 1 — The Confused Newcomer (Awareness stage)
*Signal: SERP for "berliner dialekt wörterbuch" surfaces tourism-adjacent content from berlin.de and babbel.com alongside dictionaries.*

"As someone who has just moved to Berlin or is visiting, I overheard words I don't understand (Keule, Schrippe, Dufte). I search for a way to decode them. I want a site that is clearly about Berlin dialect — not general German — and that I can browse or search quickly without needing to know the exact spelling of the word."

**Gap:** The homepage H1 in dialect may confuse exactly this persona. The search modal (Orama) is the correct tool but its presence above the fold is unclear from SERP snippet alone.

---

### Story 2 — The Specific-Word Looker-Upper (Consideration stage)
*Signal: Word-level queries like "knorke bedeutung berlinerisch", "aalen bedeutung" appear in SERP with dictionary entry pages as the dominant result type.*

"As a German speaker who encountered a specific Berlinerisch word I don't recognize, I search for '[word] bedeutung'. I want an immediate, clear definition. I also want to know if it's still in use today and how old the expression is."

**Gap:** The title and meta description correctly serve this intent. The page structure (definitions + Etymologie + Grammatik) also serves it. The gap is that the SERP snippet does not signal the depth of etymological data, which is what differentiates this entry from Duden/DWDS.

---

### Story 3 — The Language Enthusiast / Linguistics Nerd (Consideration–Decision stage)
*Signal: SERP includes DWDS (corpus linguistics tool) and Wikipedia (linguistic analysis) alongside dictionary entries.*

"As someone interested in German linguistics or regional language, I want more than a bare definition. I want to know where the word came from, how it relates to standard German, and how frequently it appears in text corpora. I am comparing berliner-schnauze.wtf against DWDS."

**Gap:** The Quantitative Linguistik and Phonologie sections directly serve this persona — but these sections are invisible in SERP snippets and schema. DWDS does not cover Berliner dialect words specifically, which is a content moat that is not being exploited.

---

### Story 4 — The Teacher / Educational Context User (Decision stage)
*Signal: berlin.de and Duden appear in SERP — both carry institutional trust signals that attract professional/educational users.*

"As a German teacher or educator preparing materials about regional dialect, I search for 'berliner dialekt wörter bedeutung'. I need reliable, citable information. I look for institutional-seeming sources."

**Gap:** The .wtf TLD and dialect H1 undercut perceived authority for this persona. Adding an "Über das Projekt" or "Quellen & Methodik" page that describes the editorial process and sources would help build trust signals.

---

### Story 5 — The Gamified Learner (Awareness–Consideration stage)
*Signal: Babbel article "17 Berliner words" and quiz-adjacent content appears for dialect queries, indicating a segment that prefers playful, interactive learning.*

"As someone who wants to learn Berliner dialect for fun — maybe ahead of a Berlin trip or because I find regional languages interesting — I would engage with a game or quiz format in addition to a reference dictionary."

**Gap:** The game (/games/berliner-oder-nicht) is a perfect product for this persona, but it is unfindable via search (no H1, no meta, no schema, no inbound internal links from word pages). This persona is currently being acquired only if they discover the game through the homepage or word pages, not through search.

---

## 5. Gap Analysis (SXO Gap Score)

**Total: 62 / 100**

| Dimension | Score | Max | Evidence |
|-----------|-------|-----|----------|
| Page Type | 13 | 15 | Word entry pages are correctly typed (DefinedTerm). Homepage is correctly typed. Games page has no page-type signals. -2 for games page gap. |
| Content Depth | 10 | 15 | Word pages have strong depth (etymologie, phonologie, quantitative data, grammatik, examples). Homepage content depth is thin for "berlinerisch" broad queries. Games page has no content. -5 overall. |
| UX Signals | 11 | 15 | PWA, dark mode, Orama search, Vue islands are strong UX signals. No Core Web Vitals data available (PSI rate-limited). No font-display issues (swap confirmed). Games page entirely missing UX scaffold (no H1, no CTA). -4. |
| Schema | 9 | 15 | DefinedTerm + BreadcrumbList on word pages is correct. WebSite + Organization on homepage is correct. No DefinedTermSet container, no SoftwareApplication schema for PWA, no Game schema for games page, no FAQPage for PAA optimization. -6. |
| Media | 9 | 15 | No information on word illustrations, audio pronunciation, or video content. Phonologie section exists textually. Competitors (Duden) have audio clips. No media schema (AudioObject, ImageObject on words). -6. |
| Authority | 7 | 15 | No external domain authority data available. Niche .wtf TLD. No editorial "about" page, no author schema, no citation of sources or methodology. Competing against DWDS, Duden, Berlin.de which all have strong institutional authority. -8. |
| Freshness | 3 | 10 | No visible last-updated dates on word pages. No blog or changelog. WordPress backend presumably allows updates, but no freshness signals exposed in HTML or schema. -7. |

---

## 6. Persona Scoring

**Sorted by weakest persona first (highest improvement potential):**

### Persona A — Educational / Research User
- Relevance: 18/25 — content is relevant but no citation data, no author attribution
- Clarity: 15/25 — .wtf TLD and dialect H1 create uncertainty about site credibility
- Trust: 10/25 — no "about" page, no editorial methodology, no source citations visible
- Action: 10/25 — no clear path to verifying information quality or sharing academically
- **Total: 53/100**
- **Top improvement:** Add an /ueber-uns or /methodik page explaining data sources and editorial process. Add `author` schema with editorial team. Mention "Wissenschaftlich basiert" in meta description where applicable.

### Persona B — Gamified Learner / Berlin Tourist (casual)
- Relevance: 20/25 — site topic is perfectly relevant
- Clarity: 16/25 — dialect H1 is charming but unclear; game is not discoverable
- Trust: 18/25 — casual audience has lower trust bar; PWA install signal is positive
- Action: 12/25 — game is not internally linked from word pages; no "start exploring" CTA visible in SERP snippet
- **Total: 66/100**
- **Top improvement:** Link to the game from every word page with a contextual CTA. Add game-discoverable meta/H1. Surface the "installable app" benefit in homepage meta description.

### Persona C — Language Enthusiast / Linguist
- Relevance: 23/25 — phonologie + quantitative linguistik sections directly match needs
- Clarity: 20/25 — page structure is clear; section headers are informative
- Trust: 16/25 — no corpus citations, no DWDS-style reference backing
- Action: 18/25 — internal navigation is functional but no related-word discovery path
- **Total: 77/100**
- **Top improvement:** Surface linguistic depth signals (Phonologie, Quantitative Daten) in schema (FAQPage, speakable) and meta descriptions. Add related-word links by etymological category.

### Persona D — Confused Newcomer / New Berliner
- Relevance: 22/25 — exactly the right resource
- Clarity: 17/25 — dialect H1 creates a moment of "wait, am I on the right page?"
- Trust: 20/25 — clean design, PWA, modern UI all signal reliability to casual users
- Action: 19/25 — Orama search is the right tool; assuming it is visible above the fold
- **Total: 78/100**
- **Top improvement:** Add plain-German above-the-fold subtitle. Confirm search input is visible without scrolling on mobile.

### Persona E — Specific-Word Looker-Upper
- Relevance: 24/25 — word pages are precisely what this user needs
- Clarity: 21/25 — H2 structure is clear; definition is immediately visible
- Trust: 19/25 — .wtf TLD may cause a fraction of users to look elsewhere; no corroboration links
- Action: 20/25 — no clear "next word" recommendation path post-definition read
- **Total: 84/100**
- **Top improvement:** Update title/meta to signal dialect specificity. Add "Verwandte Wörter" to create a browsing journey rather than a dead-end single-page visit.

---

## 7. Limitations

- **PageSpeed / Core Web Vitals:** PSI API was rate-limited during this audit. No measured LCP, CLS, FID/INP, or TTFB data. All performance observations are inference from structural signals only.
- **Live SERP position verification:** Search results above are from a single snapshot. Actual SERP positions fluctuate. Featured snippets and PAA boxes were not confirmed live for all target queries.
- **Full homepage DOM not rendered:** The homepage was analyzed from pre-collected structural data, not a live render. Above-the-fold visibility of the search modal and subtitle hierarchy could not be confirmed without a live render.
- **WordPress schema implementation:** The exact properties populated in DefinedTerm schema could not be verified directly. Recommendations on schema gaps are based on known best practices, not a live schema audit.
- **Corpus of 916 pages not sampled:** Only one word page (aalen) was sampled in SERP. Title/meta template effectiveness is assessed on the pattern, not individual entries.
- **Competitor authority metrics:** Domain authority, backlink profiles, and indexed page counts for competitors were not measured in this audit.

---

*Generate a PDF report? Use `/seo google report`*
*Missing schema implementation? Use `/seo schema` for DefinedTermSet and FAQPage generation.*
*E-E-A-T authority gaps detected (Finding 4, Persona A) — use `/seo content` for editorial depth analysis.*
