# GEO Audit: berliner-schnauze.wtf
**Date**: 2026-06-29
**Audited URL**: https://berliner-schnauze.wtf
**Site type**: German Berlin dialect dictionary (Woerterbuch / DefinedTerm catalogue)

---

## GEO Health Score

| Dimension | Weight | Score | Weighted |
|-----------|--------|-------|----------|
| Citability | 25% | 52 | 13.0 |
| Structural Readability | 20% | 68 | 13.6 |
| Multi-Modal Content | 15% | 30 | 4.5 |
| Authority & Brand Signals | 20% | 22 | 4.4 |
| Technical Accessibility | 20% | 28 | 5.6 |
| **Total** | **100%** | | **41 / 100** |

---

## AI Crawler Access Status

| Crawler | Role | Status | Notes |
|---------|------|--------|-------|
| GPTBot | ChatGPT training + search | Disallow | Blocks ChatGPT indexing |
| OAI-SearchBot | ChatGPT search | Disallow | Blocks ChatGPT real-time search |
| ChatGPT-User | ChatGPT browsing | Disallow | Blocks ChatGPT browsing plugin |
| ClaudeBot | Claude training + search | Disallow | Blocks Claude indexing |
| Google-Extended | Gemini / Bard training | Disallow | Blocks Google AI training |
| CCBot | Common Crawl (training data) | Disallow | Intentional training opt-out |
| Amazonbot | Alexa / AWS AI | Disallow | Blocked |
| Applebot-Extended | Apple AI (Siri, Genmoji) | Disallow | Blocked |
| Bytespider | ByteDance / TikTok AI | Disallow | Blocked |
| meta-externalagent | Meta AI | Disallow | Blocked |
| FacebookBot | Meta link preview / AI | Disallow | Blocked |
| Omgilibot | Webz.io AI data provider | Disallow | Blocked |
| PerplexityBot | Perplexity AI search | Not listed | Presumably allowed via `*` |
| User-agent: * | Standard crawlers, Googlebot | Allow: / | Full access |

**TDMREP signal present**: `Content-Signal: search=yes, ai-train=no`

### Interpretation

The robots.txt configuration is a deliberate, well-structured TDMREP policy — not accidental misconfiguration. The site consciously separates:
- **Search crawling**: permitted for all standard bots via `User-agent: * Allow: /`
- **AI training**: blocked for all known training crawlers (CCBot, anthropic-ai pattern, cohere-ai pattern implied)
- **AI search/answer engines**: blocked, which is the critical gap for GEO visibility

The distinction matters: the site opted out of AI *training* data use (a legitimate copyright decision), but the same robots.txt entries also block AI *search* crawlers (GPTBot, ClaudeBot, OAI-SearchBot). These two use cases are conflated by the major AI vendors — GPTBot is used for both training and for ChatGPT's real-time search index. Blocking GPTBot therefore prevents the site from appearing in ChatGPT search answers, regardless of the training opt-out intent.

This is the single highest-impact GEO issue on the site.

---

## llms.txt Status

**Status**: 404 — NOT PRESENT

`/llms.txt` (the emerging standard for machine-readable site summaries, akin to `robots.txt` for LLMs) is absent. This file signals to AI assistants how to navigate and cite the site, lists key pages, and can include licensing context.

For a dictionary site with hundreds of structured word entries, an `llms.txt` file would provide direct value: AI assistants could enumerate the catalogue, understand the scope (Berlin dialect, ~N words), and locate the canonical entry format without crawling every page.

**RSL 1.0 licensing**: No `/license.txt` or RSL 1.0 declaration detected. The TDMREP signal (`ai-train=no`) handles the machine-readable training opt-out, but an explicit human + machine-readable copyright notice for AI consumers is absent.

---

## Content Citability Analysis

### Passage Length

Word pages average approximately 339 words. Individual semantic sections (Etymologie, Beispiele, Grammatik) are likely 40-80 words each — potentially below the optimal 134-167 word range for AI citation extraction. Sections that are too short may not be self-contained enough for AI snippet generation; sections that are too long without sub-structure dilute signal.

**Beispiele (Examples)**: Likely the strongest citability section. Concrete usage examples with dialect terms in context are highly extractable and directly answerable ("How do Berliners say X?").

**Etymologie**: Second strongest. Etymology is a factual, self-contained answer block — AI systems frequently surface etymology for vocabulary queries.

### Direct Answer Structure

The H2/H3 section headings are topic labels (Etymologie, Beispiele, Orthographie) rather than question-format headings. Reformatting as questions ("Woher kommt das Wort X?", "Wie wird X ausgesprochen?") significantly increases probability of matching conversational AI queries. This is a structural gap.

### Schema.org Coverage

Present:
- `DefinedTerm` with `name`, `description`, `url`, `mainEntityOfPage`, `inDefinedTermSet`, `termCode`, `comment` (usage examples), `inLanguage: de-DE`
- `WebSite` + `Organization` with `sameAs` (Mastodon, Facebook, GitHub)

Absent (high-value additions):
- `FAQPage` — no FAQ blocks on word pages or homepage
- `HowTo` — no step-based content
- `Speakable` — critical absence for voice assistants and audio-capable AI agents; dialect pronunciation content is a natural fit
- `BreadcrumbList` — improves AI context about content hierarchy
- `DefinedTermSet` as a standalone discoverable entity with metadata (description, numberOfItems, inLanguage)

The `DefinedTerm` implementation is a genuine strength — it signals to AI systems that word entries are structured lexical data, not arbitrary prose. This is better than most dictionary sites. The `inLanguage: de-DE` and `termCode` fields are particularly well-chosen for a dialect dictionary.

### Self-Contained Answer Blocks

The most AI-citable content pattern for this site would be a combined block per word: definition + example sentence + etymology note in one paragraph of 134-167 words. Currently these are split across H2 sections, which requires AI systems to synthesize across sections to produce a complete answer. A summary block at the top of each word page ("TL;DR" or structured `description` expansion) would substantially improve single-pass extractability.

---

## Authority & Brand Signals for AI Answer Engines

### Wikipedia Entity Presence

No Wikipedia article for "Berliner Schnauze" as a site/brand appears to be present (based on available data). Wikipedia entity presence is one of the strongest AI citation signals — sites with a Wikipedia stub are far more likely to be cited by ChatGPT and Perplexity. A Wikipedia article about Berliner Schnauze (the dialect phenomenon, not just the site) would serve dual purpose: establishing the topic as encyclopedic and creating an entity that AI systems can resolve.

### Reddit Presence

No Reddit community or regular mentions noted in pre-collected data. Reddit is a high-correlation AI citation signal — content discussed on Reddit surfaces disproportionately in AI answers (Reddit's training data density). A presence on r/de, r/germany, r/languagelearning, or r/berlin with periodic word-of-the-day posts or dialect discussions would increase AI citation probability.

### YouTube Presence

No YouTube channel detected. YouTube mention correlation with AI citations is the strongest measured signal (~0.737). Short-form dialect explainer videos ("Das bedeutet 'Icke' auf Berlinisch") would create the strongest possible brand-to-citation link.

### Fediverse / Mastodon

Present: `@berliner_schnauze@mastodon.social` (listed in Organization `sameAs`). This is a positive signal for open-web visibility but Mastodon data is not well-represented in major AI training corpora relative to Twitter/X or Reddit. It establishes entity identity but contributes weakly to citation probability.

### Domain Authority

Common Crawl shows zero referring domains. This is a significant weakness for AI citation engines that weight backlink-derived authority (Perplexity, Bing Copilot use domain rating as a trust signal). Without inbound links from established language or culture sites, the domain is effectively invisible to authority-based ranking. Note: DR/backlink correlation with AI citations is weak (~0.266) compared to social signals, so this is not a blocker for citation — but combined with zero CC data, it means the domain has minimal presence in any AI training or index data currently.

### .wtf TLD Impact

The `.wtf` TLD is non-standard and may reduce trust signals in AI citation models trained primarily on `.de`, `.com`, and `.org` domains. Specific effects:
- AI systems may apply lower implicit authority weighting to unfamiliar TLDs
- Some LLM filters and safety classifiers have historically flagged unusual TLDs
- Perplexity and Bing Copilot prioritise domains with established trust signals; `.wtf` lacks the accumulated trust of `.de`

The playful TLD is brand-consistent and acceptable for a German dialect dictionary with a casual tone, but the site should compensate with stronger entity signals (Wikipedia, structured data, backlinks from `.de` domains) to offset the TLD trust gap.

---

## Technical Accessibility for AI Crawlers

### Server-Side Rendering

As an Astro SSG site deployed to Cloudflare Pages, HTML is fully pre-rendered and static. This is optimal for AI crawler accessibility — no JavaScript execution required to access content. This is a technical strength.

### Content Discoverability

Static JSON at `api/search/index.json` (Orama search index) theoretically exposes the full word catalogue in machine-readable form. If this endpoint is crawlable (not blocked by robots.txt), it is a high-value AI accessibility asset — a single URL containing all terms and definitions. Its actual crawlability and structure should be verified.

### Sitemap

Not assessed in pre-collected data. A comprehensive XML sitemap listing all word entry URLs with `lastmod` dates is essential for systematic AI indexing. Without it, AI crawlers that follow the `*` allow rule cannot efficiently discover the full catalogue.

### Structured Data Rendering

All `DefinedTerm` structured data appears in server-rendered HTML (Astro SSG), so it is accessible to crawlers without JS execution. This is confirmed good practice.

---

## Platform-Specific Scores

| Platform | Score | Key Blocker |
|----------|-------|-------------|
| Google AI Overviews | 35 / 100 | Google-Extended blocked; no Speakable; no FAQ schema |
| ChatGPT Search | 10 / 100 | GPTBot + OAI-SearchBot + ChatGPT-User all blocked |
| Perplexity AI | 45 / 100 | Not explicitly blocked (allow via `*`); low domain authority; good structured data |
| Bing Copilot | 40 / 100 | Standard Bingbot allowed; no Speakable; low authority signals |
| Claude (Anthropic) | 10 / 100 | ClaudeBot blocked |
| Apple Intelligence | 15 / 100 | Applebot-Extended blocked; no Speakable for voice |

---

## Prioritised Recommendations

### 1. Unblock AI Search Crawlers in robots.txt — CRITICAL

The current robots.txt blocks GPTBot, OAI-SearchBot, ClaudeBot, and all major AI search crawlers. This prevents the site from appearing in ChatGPT, Claude, and Gemini search-augmented answers entirely.

**Recommended action**: Differentiate between training crawlers (which may legitimately be blocked) and search/answer crawlers. Add explicit Allow rules for search-oriented agents:

```
User-agent: GPTBot
Disallow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: ClaudeBot
Disallow: /
```

This retains the training opt-out for GPTBot (training) while permitting OAI-SearchBot (ChatGPT real-time search). Review each bot's declared purpose before splitting rules. The TDMREP `ai-train=no` signal should be retained.

**Effort**: Low (< 1 hour). **Impact**: Critical — directly gates ChatGPT and Perplexity visibility.

### 2. Create /llms.txt — HIGH

Add a `/llms.txt` file at the site root. For a dictionary site, this should include:
- A one-paragraph description of the site (Berlin dialect dictionary, N words, German-language)
- Licensing statement (content copyright, ai-train=no)
- Links to key pages: homepage, search API endpoint, example word entries
- Contact for AI licensing inquiries

**Effort**: Low (2-4 hours including content drafting). **Impact**: High — immediately signals AI-readiness to compliant crawlers and assistants.

### 3. Add Speakable Schema to Word Pages — HIGH

The `Speakable` schema type marks specific content sections as suitable for text-to-speech and audio AI interfaces. For a dialect dictionary where pronunciation and usage are core value propositions, this is a natural fit. Mark the definition (`description`) and example sentences (`comment`) sections as speakable.

Additionally, consider adding `FAQPage` markup if the word pages can be restructured to include a brief Q&A block (e.g., "Was bedeutet X?" / "Wie wird X verwendet?").

**Effort**: Medium (4-8 hours). **Impact**: High — directly improves Google AI Overviews and Apple Intelligence visibility.

### 4. Convert Section Headings to Question Format — MEDIUM

H2/H3 headings like "Etymologie" and "Beispiele" are topic labels. AI answer engines match on conversational query patterns. Restructuring headings to question format ("Woher kommt das Wort X?", "Wie wird X in einem Satz verwendet?") increases probability of direct answer extraction.

This also naturally produces optimal passage lengths if the answer to each question is written as a 134-167 word self-contained paragraph.

**Effort**: Medium (requires template change + content strategy). **Impact**: Medium — improves passage-level citation probability across all platforms.

### 5. Build External Entity Presence — MEDIUM

To compensate for low domain authority and unusual TLD, invest in entity signals that AI training corpora weight highly:
- Submit or create a Wikipedia article on "Berliner Schnauze" (the dialect, with the site as a reference)
- Establish a presence on r/de or r/berlin with periodic dialect content
- Pursue backlinks from established German language or culture domains (.de, Wikimedia, DWDS, etc.)

**Effort**: High (ongoing). **Impact**: Medium-term — improves citation probability in ChatGPT and Perplexity over 6-12 months as training data refreshes.

---

## Summary of Findings

| Finding | Severity |
|---------|----------|
| AI search crawlers blocked (GPTBot, ClaudeBot, OAI-SearchBot, ChatGPT-User) | Critical |
| /llms.txt absent | High |
| Speakable schema absent on pronunciation/dialect content | High |
| No FAQPage schema | Medium |
| Section headings are topic labels, not question-format | Medium |
| Zero inbound link authority in Common Crawl data | Medium |
| .wtf TLD reduces implicit trust signals | Medium |
| No Wikipedia entity for brand/topic | Medium |
| No YouTube presence (strongest AI citation signal) | Medium |
| No Reddit community presence | Low |
| Mastodon sameAs present but low AI training corpus coverage | Info |
| DefinedTerm schema well-implemented with termCode + inLanguage | Info (strength) |
| Astro SSG provides full SSR — optimal for AI crawler access | Info (strength) |
| TDMREP ai-train=no signal present and deliberate | Info (strength) |
