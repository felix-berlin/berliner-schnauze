# Global UI E2E Plan

## Application Overview

Global UI (scroll-to-top, header, footer, legal pages, 404, search input) for Berliner Schnauze at http://localhost:4322. Observed values recorded from a live probe. Not probed (skipped): toasts after copy, random word link, word of the day link (no matching links on the homepage; a WOTD is stored in localStorage wordOfTheDay:word), Ctrl+K (no modal opened, no global search shortcut found), app-install section behavior (button has no href). Only words aasen, anmachen, wa exist in CI.

## Test Scenarios

### 1. Scroll to top

**Seed:** `src/tests/e2e/seed.spec.ts`

#### 1.1. Desktop: button hidden at top, visible mid-page and over footer

**File:** `src/tests/e2e/global-scroll-to-top.spec.ts`

**Steps:**
  1. Viewport 1280x800. Open / and /wort/anmachen (test each). Read getComputedStyle of .c-scroll-to-top at scrollY 0.
    - expect: display none, no is-close-to-end class
  2. window.scrollTo(0,1200), wait ~800ms.
    - expect: display flex, opacity 1, pointer-events auto. Observed: / has is-close-to-end already at 1200 (short page); /wort/anmachen does not
  3. window.scrollTo(0, document.body.scrollHeight).
    - expect: Still display flex, opacity 1, pointer-events auto, class is-close-to-end (desktop stays visible over footer)
  4. Click the button.
    - expect: scrollY returns to 0 (poll with expect.poll) and button becomes display none

#### 1.2. Mobile: button hides while footer is in view

**File:** `src/tests/e2e/global-scroll-to-top.spec.ts`

**Steps:**
  1. Viewport 390x800. Open / and /wort/anmachen. At top read computed style.
    - expect: display none
  2. scrollTo(0,1200).
    - expect: display flex, opacity 1, pointer-events auto, no is-close-to-end
  3. scrollTo bottom.
    - expect: class is-close-to-end, opacity 0, pointer-events none (observed on both pages)
  4. Scroll back to 1200 and click the button.
    - expect: scrollY returns to 0

### 2. Header

**Seed:** `src/tests/e2e/seed.spec.ts`

#### 2.1. Logo link navigates home

**File:** `src/tests/e2e/global-header.spec.ts`

**Steps:**
  1. Open /wort/anmachen, click link 'Berliner Schnauze' in header.
    - expect: URL is /, homepage h1/search visible

#### 2.2. Dark mode toggle persists across reload

**File:** `src/tests/e2e/global-header.spec.ts`

**Steps:**
  1. Open / with fresh storage; click button 'Auf dunkles Farbschema wechseln'.
    - expect: html gets classes 'dark cc--darkmode'; localStorage darkMode = 'true'; button label changes to light-mode variant
  2. Reload.
    - expect: html still has class 'dark' (cc--darkmode may be dropped after reload; assert only 'dark')
  3. Toggle again.
    - expect: dark class removed, localStorage darkMode false

#### 2.3. Menu opens with nav links and closes on Escape (desktop and 390x800)

**File:** `src/tests/e2e/global-header.spec.ts`

**Steps:**
  1. Click button 'Website Menu Navigation'.
    - expect: Links visible: Spiel - Berliner oder nicht? (/games/berliner-oder-nicht), Magazin (/magazin), Wort vorschlagen (/wort-vorschlagen), Wort Index (/wort), Einstellungen (/settings), Was ist neu? (/changelog)
  2. Press Escape.
    - expect: aria-expanded becomes false, menu closed
  3. Reopen and click Wort Index.
    - expect: Navigates to /wort and menu closes

### 3. Footer and legal pages

**Seed:** `src/tests/e2e/seed.spec.ts`

#### 3.1. Footer internal links navigate

**File:** `src/tests/e2e/global-footer.spec.ts`

**Steps:**
  1. For each of /settings, /magazin, /wort-vorschlagen, /wort, /settings/cache, /changelog, /technischer-changelog, /spenden, /impressum, /datenschutz: open /, click footer link.
    - expect: URL matches, page has visible h1, no console errors (except known 404 resource noise)

#### 3.2. Footer external links have correct hrefs and rel

**File:** `src/tests/e2e/global-footer.spec.ts`

**Steps:**
  1. Assert hrefs only (no navigation): GitHub issues/new, GitHub Sponsors, Ko-fi, PayPal, Buy me a coffee, Bluesky, Mastodon, GitHub, Facebook.
    - expect: Each href matches observed URL; target _blank with rel containing noopener

#### 3.3. App install button present

**File:** `src/tests/e2e/global-footer.spec.ts`

**Steps:**
  1. Locate footer button 'App installieren' (no href) at desktop and mobile.
    - expect: Button visible and enabled; click does not throw or navigate away (browser install prompt not available in CI)

#### 3.4. Legal pages load

**File:** `src/tests/e2e/global-footer.spec.ts`

**Steps:**
  1. Open /impressum and /datenschutz.
    - expect: HTTP 200; h1 'Impressum' / h1 containing 'erklärung' (contains soft hyphen: use regex /Datenschutz/)

### 4. Search, 404 and misc

**Seed:** `src/tests/e2e/seed.spec.ts`

#### 4.1. Search input on homepage; no global shortcut modal

**File:** `src/tests/e2e/global-search-input.spec.ts`

**Steps:**
  1. Open /; locate searchbox 'Suche nach einem Berliner Word' (placeholder 'Durchsuche den Berliner-Jargon'). Type 'aasen'.
    - expect: Result list includes aasen; clearing input clears results
  2. Press Control+K.
    - expect: No dialog opens (observed); document stays usable. Only assert if a shortcut is introduced

#### 4.2. 404 page

**File:** `src/tests/e2e/global-404.spec.ts`

**Steps:**
  1. Open /nope-xyz.
    - expect: Status 404, title 'Seite konnte nicht gefunden werden', h1 'Blöd jelaufen, die Seite gibts nicht.', header and footer render, logo link returns home

#### 4.3. Word of the day stored after homepage load

**File:** `src/tests/e2e/global-misc.spec.ts`

**Steps:**
  1. Open / and wait for network idle.
    - expect: localStorage has wordOfTheDay:word JSON with post_name and wordOfTheDay:error 'false'. No visible WOTD/random-word link was found in the header/footer; locate the on-page element in a follow-up exploration before asserting link behavior

#### 4.4. Toasts (not explored)

**File:** `src/tests/e2e/global-toast.spec.ts`

**Steps:**
  1. On /wort/anmachen use a copy/share button (grant clipboard-write permission), if present.
    - expect: Toast appears and auto-dismisses. Needs exploration before implementation
