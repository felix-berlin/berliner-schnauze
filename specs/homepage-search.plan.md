# Homepage Search - Additional Scenarios

## Application Overview

New search scenarios for / (SearchWords.vue, useSearchQuerySync.ts, $oramaSearchResults in wordList.ts). Orama: German stemming, tolerance 1, threshold 0.5, boost berlinerisch 2.5 / translations 1 / wordComponents (suffix tokens) 1. Query is mirrored to ?q= via debounced (300ms) history.replaceState. NOTE: the search index (/api/search/index.json) uses fetchAllWords, which is NOT capped by E2E_WORD_LIMIT (only word/OG pages are). So in CI the list holds the full dataset; only clicking through to /wort/<slug> is restricted to first 500 + required slugs. Rule: assert on the required slugs (aasen, anmachen, wa, alex, schale, akademiebusen, alsche, ballast-der-republik), capture counts dynamically, never hardcode totals. LIMITATION: the browser tools were unavailable in this session (setup tool missing), so no query was run live; word presence is derived from code/config only and must be verified when implementing.

## Test Scenarios

### 1. Homepage Search Extended (/)

**Seed:** `src/tests/e2e/seed.spec.ts`

#### 1.1. ?q= deep link prefills input and filters list

**File:** `src/tests/e2e/homepage-search-url.spec.ts`

**Steps:**
  1. Go to /?q=aasen
    - expect: Searchbox has value 'aasen'
    - expect: Result count differs from unfiltered count
    - expect: First result link href is /wort/aasen

#### 1.2. Typing updates ?q= after debounce, clearing removes it

**File:** `src/tests/e2e/homepage-search-url.spec.ts`

**Steps:**
  1. Fill searchbox with 'aasen', wait via expect.poll on page.url()
    - expect: URL contains q=aasen
    - expect: No new history entry (replaceState)
  2. Click 'Wortsuche löschen'
    - expect: URL has no q param
    - expect: Input empty

#### 1.3. Search survives View Transition to word page and back

**File:** `src/tests/e2e/homepage-search-url.spec.ts`

**Steps:**
  1. Search 'anmachen', click the /wort/anmachen result
    - expect: Word page loads (URL /wort/anmachen...)
  2. Navigate back / return to /
    - expect: Verify actual behaviour (q carried via astro:before-preparation); assert input value matches URL q

#### 1.4. Whitespace and case insensitivity

**File:** `src/tests/e2e/homepage-search-input.spec.ts`

**Steps:**
  1. Search 'AASEN', then 'aasen', then '  aasen  '
    - expect: Same result count for all three (or document trim behaviour); aasen first
  2. Search only spaces '   '
    - expect: No crash; count text still visible; clear button shown (length>0)

#### 1.5. Umlaut and eszett input does not break search

**File:** `src/tests/e2e/homepage-search-input.spec.ts`

**Steps:**
  1. Search 'straße', 'Straße', 'strasse', 'ä', 'ü'
    - expect: No error state; count text shows '<n> Ergebnisse'; results consistent between 'Straße' and 'straße'. Do not assert 'strasse' equals 'straße' (Orama has no ß folding; document result). Verify a specific umlaut word in the dataset before asserting hits.

#### 1.6. German stemming: inflected form finds base entry

**File:** `src/tests/e2e/homepage-search-stemming.spec.ts`

**Steps:**
  1. Search 'anmachen' then 'anmachte' / 'angemacht' (verify which variants match)
    - expect: Result set for the stemmed variant includes /wort/anmachen; use a locator on href, not count

#### 1.7. Typo tolerance (tolerance: 1)

**File:** `src/tests/e2e/homepage-search-stemming.spec.ts`

**Steps:**
  1. Search 'aasn' (one edit from 'aasen')
    - expect: Result list includes /wort/aasen
  2. Search 'aaxxn' (two edits)
    - expect: aasen not in list or count 0

#### 1.8. Prefix and compound (suffix) matching

**File:** `src/tests/e2e/homepage-search-stemming.spec.ts`

**Steps:**
  1. Search 'anmach'
    - expect: /wort/anmachen in results (prefix)
  2. Search 'machen' (wordComponents suffix token of 'anmachen')
    - expect: /wort/anmachen in results

#### 1.9. Standard-German query finds Berlin word via translations

**File:** `src/tests/e2e/homepage-search-direction.spec.ts`

**Steps:**
  1. Open /wort/wa or /wort/anmachen, note one German translation; search for it on /
    - expect: Result list contains the Berlin word link; dialect->German and German->dialect both work

#### 1.10. Result ordering: exact headword ranks above translation-only hits

**File:** `src/tests/e2e/homepage-search-direction.spec.ts`

**Steps:**
  1. Search 'wa'
    - expect: Check first result behaviour; note sortBy alphabetical is always applied (getSortBy) so relevance may be overridden - assert actual first link is stable, and switch sort to 'neuste zuerst' changes order while count stays same

#### 1.11. Highlighting of matched term in cards

**File:** `src/tests/e2e/homepage-search-direction.spec.ts`

**Steps:**
  1. Search 'aasen'
    - expect: Card for aasen contains a highlight element (WordList passes :highlight-term); inspect the element type/class first, then assert it wraps text matching the query

#### 1.12. Special chars and XSS-like input are inert

**File:** `src/tests/e2e/homepage-search-input.spec.ts`

**Steps:**
  1. Fill '<img src=x onerror=window.__xss=1>' then '<script>alert(1)</script>', then '"; DROP', '%', '?&#=q', regex chars '.*(['
    - expect: window.__xss undefined; no dialog event; no console error; no <img src=x> injected in DOM (highlight must not use innerHTML unescaped); count text visible; URL q param is encoded, page does not navigate; reload with that ?q= is safe

#### 1.13. Very long query

**File:** `src/tests/e2e/homepage-search-input.spec.ts`

**Steps:**
  1. Fill 500 chars 'a'
    - expect: No crash; '0 Ergebnisse' or count text visible; clearing restores default count

#### 1.14. Rapid typing settles on last query

**File:** `src/tests/e2e/homepage-search-input.spec.ts`

**Steps:**
  1. pressSequentially 'anmachen' with delay 0 on a cold page
    - expect: Final count equals count from a single fill('anmachen'); no double-fetch of /api/search/index.json (count requests)

#### 1.15. Keyboard: Enter/Escape and Tab order

**File:** `src/tests/e2e/homepage-search-input.spec.ts`

**Steps:**
  1. Type 'aasen', press Enter
    - expect: Page does not navigate/reload; results remain
  2. Press Escape (type=search clears in Chromium only) - assert per-browser or skip on non-chromium
    - expect: Input cleared or unchanged consistently
  3. Tab from searchbox
    - expect: Focus reaches clear button then first interactive element; clear button activatable with Enter/Space

#### 1.16. Search combined with letter filter

**File:** `src/tests/e2e/homepage-search-filters.spec.ts`

**Steps:**
  1. Search 'aasen', open filter sidebar (reuse beforeEach from filter spec), click letter A
    - expect: aasen still listed, count <= count for search alone
  2. Click letter B
    - expect: 0 Ergebnisse / 'Keen Treffer' (aasen filtered out)

#### 1.17. Berolinismus filter narrows search; 'Zurücksetzen' clears search too

**File:** `src/tests/e2e/homepage-search-filters.spec.ts`

**Steps:**
  1. Search 'a', toggle Berolinismus
    - expect: Count <= count without filter
  2. Click 'Zurücksetzen'
    - expect: Input empty ($searchQuery reset in resetFilters), URL q removed, count equals default

#### 1.18. Sort change keeps query and result set

**File:** `src/tests/e2e/homepage-search-filters.spec.ts`

**Steps:**
  1. Search 'a', record count, change 'Sortiere nach' to 'neuste zuerst'
    - expect: Count unchanged, input value unchanged, order of list changed
