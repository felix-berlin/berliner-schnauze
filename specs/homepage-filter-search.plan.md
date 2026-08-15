# Homepage Filter Sidebar & Search Edge Cases

## Application Overview

Berliner Schnauze homepage ("/") displays a word-of-the-day, a filter sidebar (aside, complementary landmark) next to a searchable/sortable word list, and a search box. This plan covers only the areas of the homepage NOT already covered by tests/e2e/index.spec.ts: the filter sidebar's sort dropdown, alphabet letter filter, reset button, and Berolinismus checkbox; plus search edge cases (empty result state, clearing the search). All other areas (dark mode, header, footer, BON game link, word-of-the-day, basic search happy path) are intentionally out of scope. All interactions must be minimal (single click/select, then one bounded-timeout assertion) to avoid known jitter from ResizeObserver-driven dropdown/panel transitions — do not chain hover/scroll retries.

## Test Scenarios

### 1. Filter Sidebar

**Seed:** `seed.spec.ts`

#### 1.1. Sortiere-nach-Dropdown ändert die Reihenfolge der Wortliste

**File:** `tests/e2e/homepage-filter-sidebar.spec.ts`

**Steps:**

1. Go to '/' - expect: Homepage loads with the default 'Alphabetisch (A - Z)' sort option selected
2. Read and store the text of the first word link in the word list (`.c-word-list article a` or equivalent first result link) - expect: First word matches the default alphabetical order (e.g. 'aalen')
3. In the complementary sidebar, select 'neuste zuerst' from the 'Sortiere nach:' combobox - expect: The combobox value changes to 'neuste zuerst'
4. Read the text of the first word link in the word list again - expect: The first word differs from the value captured before changing the sort order, confirming the list re-ordered

#### 1.2. Buchstaben-Filter (Alphabet) filtert die Wortliste auf einen Buchstaben

**File:** `tests/e2e/homepage-filter-sidebar.spec.ts`

**Steps:**

1. Go to '/' - expect: Result count paragraph (e.g. 'X Ergebnisse') is visible with the full/default count
2. Click the letter filter button labelled 'Filter nach Buchstabe B' in the alphabet navigation - expect: The result count paragraph updates to a smaller number than the default full count - expect: The first word link in the list starts with the letter 'B' (e.g. its href starts with '/wort/b')
3. Click the 'Alle' button in the same alphabet navigation - expect: The result count paragraph returns to the original full/default count

#### 1.3. Zurücksetzen-Button setzt aktive Filter zurück

**File:** `tests/e2e/homepage-filter-sidebar.spec.ts`

**Steps:**

1. Go to '/' and capture the default result count from the result count paragraph - expect: Default result count is visible and captured, e.g. '2434 Ergebnisse'
2. Click the letter filter button 'Filter nach Buchstabe B' to apply a filter - expect: Result count paragraph shows a smaller count than the captured default
3. Click the 'Zurücksetzen' button in the sidebar - expect: Result count paragraph returns to exactly the captured default count

#### 1.4. Berolinismus-Checkbox filtert die Wortliste

**File:** `tests/e2e/homepage-filter-sidebar.spec.ts`

**Steps:**

1. Go to '/' and capture the default result count from the result count paragraph - expect: Default result count is visible and captured
2. Click the 'Berolinismus' checkbox inside its filter group in the sidebar - expect: The checkbox becomes checked - expect: Result count paragraph updates to a smaller number than the captured default (e.g. drops to a much lower count)
3. Click the 'Berolinismus' checkbox again to uncheck it - expect: The checkbox becomes unchecked - expect: Result count paragraph returns to the captured default count

### 2. Search Edge Cases

**Seed:** `seed.spec.ts`

#### 2.1. Suche ohne Treffer zeigt Empty-State-Nachricht

**File:** `tests/e2e/homepage-search-edge-cases.spec.ts`

**Steps:**

1. Go to '/' - expect: Search box 'Suche nach einem Berliner Word' is visible with the default (non-zero) result count
2. Fill the search box with a nonsense query, e.g. 'xyzzyx123' - expect: Result count paragraph updates to '0 Ergebnisse' - expect: An empty-state message is visible (e.g. text containing 'Keen Treffer') - expect: No word result articles/links are rendered in the word list

#### 2.2. Suche löschen stellt die vollständige Wortliste wieder her

**File:** `tests/e2e/homepage-search-edge-cases.spec.ts`

**Steps:**

1. Go to '/' and capture the default result count from the result count paragraph - expect: Default result count is visible and captured
2. Fill the search box with a query that narrows results, e.g. 'aasen' - expect: Result count paragraph shows a smaller count than the captured default - expect: A 'clear search' button (e.g. labelled 'Wortsuche löschen') becomes visible next to the search input
3. Click the clear search button - expect: The search input is empty - expect: Result count paragraph returns to the captured default count
