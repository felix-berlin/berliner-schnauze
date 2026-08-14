# Word Detail Page Template Test Plan

## Application Overview

Berliner Schnauze word detail pages (`/wort/<slug>`) render dynamic, per-word content driven by a WordPress GraphQL backend. Different words exercise different optional sections of the same Astro/Vue template (Phonologie, Etymologie infotext, image gallery, related words, anagrams, Berolinismus badge). This plan targets 7 specific, already-content-verified words, each isolating one distinguishing section/feature, plus one cross-cutting smoke check applicable to any single word page.

Important execution constraint: this template has known CSS-transition / ResizeObserver-driven repositioning on some elements (e.g. dropdown/tooltip arrows, transitioning sections). Tests MUST keep interactions minimal per page: navigate once, take a single snapshot, assert the target marker is visible, then move on. Do NOT repeatedly hover, scroll-into-view, or retry against elements that may still be animating/repositioning — if a wait or scroll exceeds ~5s, abandon that specific assertion rather than retrying, to avoid Playwright's auto-scroll jitter/hang bug. Prefer `expect(locator).toBeVisible()` with a bounded timeout over manual `scrollIntoViewIfNeeded()` or hover-based waits.

Assume fresh browser state (no prior cookies/localStorage) for every test. Dev server: http://localhost:4321.

## Test Scenarios

### 1. Word Detail Page — Section Coverage

**Seed:** `seed.spec.ts`

#### 1.1. Sparse word page renders without breaking (wa)

**File:** `tests/word-detail/wa-sparse.spec.ts`

**Steps:**
  1. Navigate to http://localhost:4321/wort/wa
    - expect: Page responds with success (no 404/500)
    - expect: HTTP response status is 200
  2. Assert the page title contains 'wa'
    - expect: document title matches /^wa /i or contains 'wa auf Berlinerisch'
  3. Assert the h1 heading (word title, rendered inside a <dfn>/term) is visible and its text is 'wa'
    - expect: h1 is visible and text equals 'wa'
  4. Assert the Etymologie section (heading 'Etymologie', id 'etymologie') is visible with a short/minimal definition — do not assert on length, only presence
    - expect: Etymologie heading and its definition text are visible
  5. Take a single accessibility snapshot of the page and confirm no obviously broken/empty state markers (e.g. no visible error boundary text, no console errors logged during navigation)
    - expect: No unhandled console errors
    - expect: Page renders remaining sections (Beispiele, Orthographie, Grammatik) without layout collapse

#### 1.2. Rich word page shows full Phonologie section with both subsections (anmachen)

**File:** `tests/word-detail/anmachen-phonologie.spec.ts`

**Steps:**
  1. Navigate to http://localhost:4321/wort/anmachen
    - expect: Page responds with success (no 404/500)
  2. Assert the h1/term heading text equals 'anmachen'
    - expect: Heading is visible and matches the word
  3. Locate the Phonologie section by its heading/id ('#phonologie') without scrolling into it manually — use a locator-based visibility assertion with a bounded timeout instead of scrollIntoViewIfNeeded
    - expect: Phonologie section heading is present in the DOM
  4. Within the Phonologie section, assert the 'Ähnlich klingende Wörter' (Ähnlich klingend) subsection heading is visible
    - expect: Subsection heading and at least one linked similar-sounding word are visible
  5. Within the Phonologie section, assert the 'Ähnlich geschrieben' subsection heading is visible
    - expect: Subsection heading and at least one linked similarly-spelled word are visible
  6. In the Grammatik section, assert multiple distinct word-type tags/labels are rendered (more than one word-type badge, e.g. for compound or multi-word entries)
    - expect: At least two distinct word-type tag elements are visible in the Grammatik region

#### 1.3. Word with multiple meanings and historical infotext (aasen)

**File:** `tests/word-detail/aasen-infotext.spec.ts`

**Steps:**
  1. Navigate to http://localhost:4321/wort/aasen
    - expect: Page responds with success (no 404/500)
  2. Assert the h1/term heading text equals 'aasen'
    - expect: Heading is visible and matches the word
  3. In the Etymologie section, assert at least two numbered meaning definitions are rendered (e.g. two <dt>/<dd> Bedeutung entries or two numbered list items)
    - expect: Two or more distinct numbered meanings are visible
  4. Assert an element with class 'c-section-card__infotext' is visible within the Etymologie section (the orange-styled historical usage note)
    - expect: The infotext box is visible and contains non-empty text

#### 1.4. Word with image gallery (akademiebusen)

**File:** `tests/word-detail/akademiebusen-gallery.spec.ts`

**Steps:**
  1. Navigate to http://localhost:4321/wort/akademiebusen
    - expect: Page responds with success (no 404/500)
  2. Assert the h1/term heading text equals 'Akademiebusen' (case as rendered)
    - expect: Heading is visible and matches the word
  3. Assert an <aside aria-label="Bildergalerie"> with class 'c-word-gallery-col' is visible on the page
    - expect: The gallery aside is visible
  4. Assert the gallery contains at least one image element
    - expect: At least one <img> inside the gallery aside is visible

#### 1.5. Word with 'Verwandte Worte' related-words section (ballast-der-republik)

**File:** `tests/word-detail/ballast-der-republik-related-words.spec.ts`

**Steps:**
  1. Navigate to http://localhost:4321/wort/ballast-der-republik
    - expect: Page responds with success (no 404/500)
  2. Assert the h1/term heading text equals 'Ballast der Republik' (case as rendered)
    - expect: Heading is visible and matches the word
  3. Assert an element with id 'verwandte-worte' is present and visible on the page (locator-based check, no manual scroll)
    - expect: The Verwandte Worte section is visible
  4. Assert the Verwandte Worte section contains at least one link to another word
    - expect: At least one related-word link is visible with an href starting with /wort/

#### 1.6. Word with 'Anagramme' section (alsche)

**File:** `tests/word-detail/alsche-anagramme.spec.ts`

**Steps:**
  1. Navigate to http://localhost:4321/wort/alsche
    - expect: Page responds with success (no 404/500)
  2. Assert the h1/term heading text equals 'alsche'
    - expect: Heading is visible and matches the word
  3. Assert the 'Buchstabenspiele' heading is visible
    - expect: Buchstabenspiele heading is visible
  4. Assert an element with id 'anagramme' is present and visible on the page (locator-based check, no manual scroll)
    - expect: The Anagramme section is visible
  5. Assert the Anagramme section lists at least one linked anagram word
    - expect: At least one anagram link is visible with an href starting with /wort/

#### 1.7. Word with Berolinismus badge (alex)

**File:** `tests/word-detail/alex-berolinismus-badge.spec.ts`

**Steps:**
  1. Navigate to http://localhost:4321/wort/alex
    - expect: Page responds with success (no 404/500)
  2. Assert the h1/term heading text equals 'Alex'
    - expect: Heading is visible and matches the word
  3. Assert a Berolinismus badge element is visible near the word title (locator by accessible name/text 'Berolinismus' or its badge class — do not hover/click to trigger a tooltip, just assert badge presence and visibility)
    - expect: The Berolinismus badge is visible adjacent to the heading
  4. Optional, only if it does not require scrolling: click the badge once to open its tooltip/info, then assert tooltip text is visible; if the click causes any layout shift/animation, skip this step rather than retrying
    - expect: If attempted, tooltip text describing the Berolinismus flag becomes visible without needing scroll/hover retries

#### 1.8. Cross-cutting smoke check — any single word page loads correctly (wa)

**File:** `tests/word-detail/word-page-smoke.spec.ts`

**Steps:**
  1. Navigate to http://localhost:4321/wort/wa
    - expect: Response status is 200, not a 404 page
  2. Assert the page is not the site's 404/not-found page (e.g. absence of a 'Seite nicht gefunden' heading or equivalent 404 marker, and the URL path remains /wort/wa without redirect)
    - expect: No 404 marker text is present
  3. Assert exactly one h1 element exists on the page and its text matches the word slug's display form
    - expect: Single h1 is visible with correct word text
  4. Assert the breadcrumb navigation shows Start > Wort > <word> reflecting the current page
    - expect: Breadcrumb final item text matches the word
