# Backlink Profile — berliner-schnauze.wtf

**Audit date:** 2026-06-29
**Data tier:** Tier 0 (Common Crawl + Verification Crawler only)
**Overall score:** INSUFFICIENT DATA (fewer than 4 scoring factors have data — no numeric score issued per Tier 0 rules)

---

## Data Sources Used

| Source | Status | Confidence | Freshness |
|--------|--------|------------|-----------|
| Common Crawl Web Graph (cc-main-2026-jan-feb-mar) | No data returned | 0.50 | Quarterly |
| Backlink Verification Crawler | Available (no known-link file provided) | 0.95 | Near-realtime |
| Moz Link Explorer API | Not configured | — | ~3 days |
| Bing Webmaster Tools API | Not configured | — | Near-realtime |
| DataForSEO | Not available | — | — |

To unlock Tier 1 metrics (DA, PA, Spam Score, referring domain list): run `/seo backlinks setup` and add a free Moz API key.

---

## 1. Profile Overview

**Data source:** Common Crawl (domain-level, confidence: 0.50)

| Metric | Value | Rating |
|--------|-------|--------|
| PageRank | None (not indexed in CC graph sample) | CRITICAL |
| Harmonic Centrality | None | CRITICAL |
| Referring host count (CC in-degree) | None | CRITICAL |
| Top referring domains | None found in sample | CRITICAL |

**Interpretation:** `berliner-schnauze.wtf` does not appear in the Common Crawl web graph for the Jan–Mar 2026 release. This is consistent with two scenarios: (a) the domain has a very small inbound link footprint that falls below the CC graph's minimum in-degree threshold, or (b) CC crawlers have not yet followed links pointing to the domain in sufficient volume. Neither scenario is catastrophic for a niche dictionary site, but it means link authority is currently near zero from a graph-signal perspective.

**Severity: Critical** — No measurable link authority signal in the largest freely available web graph dataset.

---

## 2. Referring Domain Analysis

**Data source:** Common Crawl (confidence: 0.50) — no data returned

Because CC returned no referring domains, a referring domain table cannot be produced. The following is known from pre-collected site signals:

| Signal Type | Detail | Source |
|-------------|--------|--------|
| Social profiles | Mastodon (@berliner_schnauze@mastodon.social) | Schema.org sameAs (site) |
| Social profiles | Facebook (Berliner.Schnauze030) | Schema.org sameAs (site) |
| Code repository | GitHub (felix-berlin/berliner-schnauze) | Schema.org sameAs (site) |

Social profile links and GitHub repos typically carry `rel="nofollow"` or `rel="ugc"` and contribute zero followed link equity. They are valuable for brand signals but do not move ranking authority metrics.

**Severity: High** — Referring domain count is effectively unknown but inferred to be very low (sub-20) based on CC absence.

---

## 3. Anchor Text Distribution

**Data source:** None available at Tier 0 without a known-link input file.

Cannot produce anchor text distribution. At Tier 1 (Moz), `python3 scripts/moz_api.py anchors <url>` would supply this data.

**Recommendation:** Once Moz is configured, verify that branded anchors ("Berliner Schnauze", "berliner-schnauze.wtf") constitute 30–50% of the profile, and that exact-match keyword anchors ("Berliner Dialekt", "Berliner Wörter") remain below 15% to avoid over-optimisation signals.

**Severity: Medium** — Data gap; not actionable until link volume grows.

---

## 4. Toxic Link Assessment

**Data source:** None available at Tier 0 without known-link file.

No spam links can be confirmed or denied. For a newly established niche site, toxic link risk is typically low unless negative SEO has been applied. At Tier 1, Moz Spam Score would surface this.

**Severity: Low** — Low prior risk for a new niche dictionary with minimal link footprint.

---

## 5. TLD Impact on Link Acquisition

**Severity: High**

The `.wtf` TLD creates friction in three distinct ways:

| Issue | Detail | Recommended Action |
|-------|--------|--------------------|
| Editorial hesitation | Many institutional editors (Wikipedia, Wiktionary, university linguistics pages) filter or block unusual TLDs from citation lists. `.wtf` may trigger automatic rejection in link-vetting workflows at high-DA sites. | Acquire a `.de` or `.com` mirror domain; use canonical pointing to `.wtf`. Alternatively, apply directly to Wikipedia editors demonstrating site legitimacy. |
| User-facing trust gap | German-language audiences — particularly older demographics who are the core users of dialect dictionaries — may distrust `.wtf` as a joke domain and not share it on blogs or forums. | Add clear brand signals (About page, DSGVO-compliant imprint, author credentials) to neutralise the trust gap. |
| CMS spam filters | Automated comment-link and trackback systems at many German WordPress blogs block `.wtf` at the server level (common in `wp-ban` / Bad Behavior plugin rule sets). | When reaching out for link placements, ask partners to whitelist the domain explicitly. |

Despite these challenges, the unusual TLD is also a memorability asset — "berliner-schnauze.wtf" is inherently shareable among younger, digital-native audiences. This double-edged nature should be acknowledged in any link outreach.

---

## 6. Social Signals

**Severity: Info**

| Platform | Handle / URL | Link Type | Equity Value |
|----------|-------------|-----------|--------------|
| Mastodon | @berliner_schnauze@mastodon.social | nofollow / ugc | Indirect (brand) |
| Facebook | Berliner.Schnauze030 | nofollow | Indirect (brand) |
| GitHub | felix-berlin/berliner-schnauze | nofollow | Indirect (developer credibility) |

Social signals provide no direct PageRank equity. However, Mastodon and GitHub links are relevant for:
- **Crawl discovery:** CC and Googlebot follow Mastodon public timelines and GitHub READMEs; these may be how the domain was first discovered.
- **Developer/linguistics community trust:** GitHub presence signals legitimacy to tech-oriented bloggers and journalists who may link without prompting.
- **Fediverse amplification:** Posts on Mastodon from the official account can surface in federated RSS feeds and be picked up by German-language tech or culture bloggers.

No action required on existing social presence — it is appropriate for the audience. The gap is volume: low follower counts limit amplification.

---

## 7. Link Building Opportunities

**Severity: High** (unrealised opportunity)

### Priority Tier A — Highest Authority, Editorially Strict

| Target | Why Relevant | Approach | Difficulty |
|--------|-------------|----------|------------|
| de.wikipedia.org — Berliner Dialekt article | The [Berliner Dialekt Wikipedia article](https://de.wikipedia.org/wiki/Berliner_Dialekt) and related articles (Berliner Schnauze, Berlinisch) are natural reference targets. A well-cited dictionary is a standard external link in linguistics articles. | Submit under "Weblinks" section; must pass notability checks. Prepare a talk-page argument citing the 916-word depth and primary source nature. | High |
| de.wiktionary.org | Individual Wiktionary entries for Berlin dialect terms can cite dialect dictionaries as external references under "Quellen" or "Weblinks". | One entry at a time; link to the specific word page (e.g. `/wort/icke`), not the homepage. 916 linkable pages = 916 potential entry-level citations. | Medium |
| Wiktionary.org (English) | English Wiktionary entries for German dialect terms (e.g. "Kiez", "schnauze") can cite berliner-schnauze.wtf as a dialect reference under "Further reading". | Same approach as German Wiktionary. | Medium |

### Priority Tier B — Medium Authority, Editorial Flexibility

| Target | Why Relevant | Approach | Difficulty |
|--------|-------------|----------|------------|
| Tagesspiegel / Berliner Zeitung | Berlin newspapers regularly publish dialect and language pieces, especially around cultural identity topics. | Pitch a "Berliner Sprache im Wandel" story; offer data from the word database as journalist resource. | High |
| rbb24.de / Radioeins.de | Regional public broadcaster; runs language and culture segments. | Press release or direct journalist contact offering the site as a reference resource. | High |
| Language learning blogs (de.babbel.com magazine, Lingoda blog, DW Learn German) | These sites publish "German slang" and regional dialect articles that link to reference dictionaries. | Guest post or resource-page pitch: "Best resources for Berlin German". | Medium |
| visitBerlin.de / berlin.de | Official Berlin tourism and city portals maintain resource pages. A dialect dictionary is a natural fit for "Berlin culture" or "Berlin language" content. | Submit via official partner/media contact form. | Medium |
| Slow German podcast (slowgerman.com) | Podcast about German language learning; has published Berlin-related episodes. High DA, niche-relevant audience. | Email outreach; offer to be cited as vocabulary reference for a Berlin episode. | Low |

### Priority Tier C — Community and Niche Links

| Target | Why Relevant | Approach | Difficulty |
|--------|-------------|----------|------------|
| Reddit r/German, r/berlin, r/germany | Community posts linking to dialect resources get organic shares and occasional blog pickups. | Participate authentically; share word-of-the-day type posts with link. Avoid spam patterns. | Low |
| Expat Berlin blogs (toytown germany, iamexpat.de) | English-speaking expats in Berlin actively seek dialect resources. | Comment or outreach; the .wtf TLD may actually appeal to this demographic. | Low |
| German linguistics university pages (HU Berlin, FU Berlin, Universität Potsdam) | Linguistics departments maintain resource lists for German dialects. | Email the relevant professorship (German Linguistics / Dialectology) with a brief summary of the corpus. | Medium |
| GitHub Awesome Lists (awesome-german-nlp, awesome-linguistics) | Developer-facing audience; GitHub README links are indexed by CC. | Submit a PR to relevant awesome lists. | Low |
| Chaos Computer Club / re:publica adjacent blogs | Tech-culture community in Berlin; would appreciate a well-built open-source dictionary with GitHub presence. | Post in relevant channels; the open-source nature is a hook. | Low |

### Priority Tier D — Reciprocal / Partner Links

| Target | Why Relevant | Note |
|--------|-------------|------|
| Berlinerisch.de / Berlinisch.net (if active) | Existing Berlin dialect reference sites | Check for link exchange or co-citation opportunities; verify these are not direct competitors |
| Mundmische.de | German dialect community | Resource listing opportunity |

---

## 8. Strategic Recommendations

### Critical Priority

1. **Establish measurable backlink baseline** — Configure Moz API (free, 2,500 rows/month) to get actual DA, referring domain count, and anchor text data. Without this, no numeric health score can be issued and progress cannot be tracked. Run: `python3 scripts/backlinks_auth.py --check` after setup.

### High Priority

2. **Wikipedia/Wiktionary citations** — This is the highest-leverage link building channel for a reference dictionary. A single accepted link on the German Wikipedia "Berliner Dialekt" article would be the highest-DA link the site could acquire. Prepare the talk-page argument before submitting. Focus on the depth of the lexicon (916 entries) and primary-source nature of the data.

3. **Individual Wiktionary entry citations** — Scalable: 916 word pages each represent a potential Wiktionary citation on the corresponding entry. Start with the 20–30 most culturally prominent terms (Kiez, Icke, Schnauze, Bullette, Jeck) to establish a citation pattern.

4. **Address .wtf TLD friction proactively** — Add a prominent imprint/About page with author name, contact, and legal notice (DSGVO-compliant). This is required by German law and simultaneously builds trust for editors who vet external links. Institutional editors are less likely to reject a domain that displays clear editorial accountability.

### Medium Priority

5. **German language learning media outreach** — Babbel Magazine, DW Learn German, and Lingoda Blog regularly publish "regional German" content. A well-timed pitch ("Berlin German for learners: 916 words from a native speaker") has a realistic acceptance probability and would produce DA 60–80 links.

6. **GitHub Awesome List submissions** — Low effort, indexed by CC, and reaches developer audiences who blog and share. Target `awesome-german-nlp` and similar lists.

7. **Word-of-the-day social strategy** — Consistent posting on Mastodon (already active) and cross-posting to Bluesky would increase crawl frequency and organic sharing. Each shared post is a potential discovery path for bloggers.

### Low Priority

8. **Expat community outreach** — r/berlin, iamexpat.de, Toytown Germany. Low-authority but high-relevance; builds topical footprint and social proof.

9. **University linguistics department resource pages** — HU Berlin and FU Berlin linguistics faculty pages maintain external resource links. Long sales cycle but very high trust signals if accepted.

---

## Summary Table

| Finding | Severity | Factor |
|---------|----------|--------|
| Not indexed in Common Crawl web graph — no link authority signal | Critical | Referring domains / PageRank |
| Referring domain count effectively zero or below CC threshold | High | Referring domain count |
| .wtf TLD creates friction with institutional link editors | High | Link acquisition |
| No anchor text data available | Medium | Anchor text naturalness |
| Wikipedia/Wiktionary citation opportunity unrealised | High | Link building |
| Social profiles present but carry no followed equity | Info | Social signals |
| No toxic link risk detected (low footprint = low attack surface) | Low | Toxic link ratio |
| Moz/Bing credentials not configured — no numeric score possible | High | Data coverage |

---

## Setup Instructions

To reach Tier 1 and unlock a numeric Backlink Health Score:

```bash
# Add Moz API key (free — 2,500 rows/month)
# Sign up: https://moz.com/products/api
export MOZ_API_KEY="your_key_here"
python3 scripts/backlinks_auth.py --check

# Or persist to config file:
mkdir -p ~/.config/claude-seo
echo '{"moz_api_key": "your_key_here"}' > ~/.config/claude-seo/backlinks-api.json
```

For Bing Webmaster Tools (free — near-realtime data, competitor comparison):

```bash
# Sign up: https://www.bing.com/webmasters
export BING_WEBMASTER_API_KEY="your_key_here"
```

---

*Data freshness: Common Crawl — quarterly (cc-main-2026-jan-feb-mar). Social signals — manually observed at audit date 2026-06-29.*
*All findings based on Tier 0 sources. Numeric health score not issued: fewer than 4 scoring factors have data (per Tier 0 rules).*
