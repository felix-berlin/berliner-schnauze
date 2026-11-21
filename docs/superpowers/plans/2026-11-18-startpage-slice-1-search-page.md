# Startpage Slice 1: `/suche` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die bisherige Wortsuche (Liste, Filter) zieht unverändert von `/` auf die neue Seite `/suche`; die Startseite behält alles andere.

**Architecture:** `pages/suche.astro` bindet das vorhandene `WordSearch.astro` ein (`noindex, follow`, eine H1). `index.astro` verliert `WordSearch`; `WordSearchLink` wird zum Link auf `/suche`; das `SearchAction` im JSON-LD zeigt auf `/suche?q=`. `?q=` füllt das Suchfeld schon heute über `useSearchQuerySync`, daran ändert sich nichts. Die E2E-Specs, die die Suche auf `/` prüfen, ziehen auf `/suche`.

**Tech Stack:** Astro (SSR), Vue 3 (Inseln), Nanostores, Vitest (`@vue/test-utils`), Playwright.

**Spec:** `docs/superpowers/specs/2026-11-18-startseite-v5-design.md` (Scheibe 1, Entscheidung 4)

## Global Constraints

- Die Suche wird nur verschoben: kein Redesign, keine neuen Filter, keine geänderten Komponenten `WordSearch.astro`, `WordFilter.vue`, `WordSearchList.vue`, `SearchWords.vue`.
- Header und Footer bleiben unberührt (auch `SearchModal` im Header).
- `/suche`: `noindex, follow`, nicht in `STATIC_PATHS` (`services/sitemap.ts`), nicht in `llms.txt`.
- Komponenten, Ordner, Klassen und neue Dateien heißen englisch; der Routenname `/suche` ist durch den Handoff (§22.10) vorgegeben.
- Commits: Conventional Commits (`<type>(<scope>): <description>`, Scope z. B. `search`), pnpm only. Beim Committen die Co-Authored-By-Zeile der Session anhängen.
- Lint vor jedem Commit: `pnpm lint` im Repo-Root löst Auto-Fixes aus; bei direktem Aufruf `oxlint --format=agent`.
- Tests laufen im Verzeichnis `website/`: `pnpm vitest run <datei>`.

## Review Focus

- `/suche` ohne `?q=`: zeigt die volle Liste wie die Startseite bisher (Test in Task 1).
- `/suche?q=` mit Sonderzeichen oder leerem Wert: kein Fehler, Liste unverändert (Test in Task 1).
- `/suche` ist nicht indexierbar: `<meta name="robots" content="noindex, follow">` (Test in Task 1).
- Startseite `/` enthält keine Wortliste und kein Suchfeld mehr, aber weiter den Link „Berliner Mundart durchsuchen“ (Test in Task 3).
- Kein Verweis mehr auf `/wort?q=` im JSON-LD (Test in Task 3).

---

### Task 1: Seite `/suche`

**Files:**

- Create: `website/src/pages/suche.astro`
- Create: `website/src/tests/e2e/suche.spec.ts`

**Interfaces:**

- Produces: Route `/suche` mit Element `section#wordListing` (aus `WordSearch.astro`), Suchfeld `searchbox` mit Name „Suche nach einem Berliner Word“, eine `h1`.

- [ ] **Step 1: Write the failing E2E spec** `suche.spec.ts` (Beschreibung `"Suchseite (/suche)"`), vier Tests:
  - `lädt mit Titel, einer H1 und noindex`: `page.goto("/suche")`, `toHaveTitle(/Wortsuche/)`, genau eine `h1` (Name „Wortsuche“), `page.locator('meta[name="robots"][content="noindex, follow"]')` hat Anzahl 1.
  - `zeigt Suchfeld und Wortliste ohne Suchbegriff`: `searchbox` sichtbar, `resultCount(page)` sichtbar (Helfer aus `./helpers`), Liste enthält den Link `aasen` (E2E-Seed-Wort).
  - `?q= füllt das Suchfeld`: `goto("/suche?q=aasen")`, `searchbox` hat Wert `aasen`, `.c-word-list` zeigt `aasen`, nicht `ab`.
  - `?q= mit Sonderzeichen bricht nichts`: `goto("/suche?q=%22%3Cb%3E%26")`, `resultCount(page)` oder der Leer-Zustand (`NoSearchResults`) ist sichtbar, kein `pageerror` (Listener auf `page.on("pageerror")`, am Ende leer).

- [ ] **Step 2: Run it to verify it fails**
      Run (im Verzeichnis `website/`, Voraussetzungen und Server-Start laut `website/CLAUDE.md`, Abschnitt E2E): `pnpm exec playwright test src/tests/e2e/suche.spec.ts`
      Expected: FAIL (404 auf `/suche`). Läuft kein E2E-Setup, genügt für den Rot-Nachweis `curl -s -o /dev/null -w "%{http_code}" http://localhost:$WEBSITE_PORT/suche` = 404 gegen den Dev-Server.

- [ ] **Step 3: Create `website/src/pages/suche.astro`.** Aufbau wie `pages/index.astro` (Imports `Layout`, `seoData`, `SITE_URL`), `content.title = "Wortsuche - Berlinerisch zu Hochdeutsch"`, `content.seo = { canonical: \`${SITE_URL}/suche\`, robots: "noindex, follow" }`(BaseHead schreibt`seo.robots`als`<meta name="robots">`). Im Layout: `<h1>`„Wortsuche“ (visuell wie die Seite es zulässt: Klasse`c-band`mit`data-variant`nur, wenn das heutige Design es schon so nutzt, sonst nacktes`h1`; kein neues SCSS), darunter `<WordSearch />`. Der `o-index`-Container wird **nicht** übernommen (`contentClasses`weglassen); prüfe im Browser, dass Liste und Filter wie zuvor aussehen, und gib sonst`contentClasses="o-index"` mit.

- [ ] **Step 4: Run the spec to verify it passes**
      Run: `pnpm exec playwright test src/tests/e2e/suche.spec.ts`
      Expected: 4 passed. (Alternativ gegen den Dev-Server: `/suche` liefert 200, `view-source` zeigt die noindex-Meta.)

- [ ] **Step 5: Commit**
  ```bash
  git add website/src/pages/suche.astro website/src/tests/e2e/suche.spec.ts
  git commit -m "feat(search): add /suche page with the word search"
  ```

### Task 2: `WordSearchLink` wird ein Link auf `/suche`

**Files:**

- Modify: `website/src/components/WordSearchLink.vue`
- Modify: `website/src/tests/unit/components/WordSearchLink.test.ts`

**Interfaces:**

- Consumes: `trackEvent("Search", "Click Search Link", "Search Link Clicked")` aus `@utils/analytics` (unverändert).
- Produces: `WordSearchLink` rendert `<a class="c-word-search-link" href="/suche">` mit dem Text „Berliner Mundart durchsuchen“ und dem Icon-Wrap; die Props und Exposes bleiben leer.

- [ ] **Step 1: Rewrite the unit test** (`WordSearchLink.test.ts`): Die Tests zum Scrollen, Fokus und Retry (`c-word-search__search-input`, `useMediaQuery`, `usePreferredReducedMotion`) entfallen samt Mocks. Neu, mit denselben Mocks für `@utils/analytics`:
  - `rendert einen Link auf /suche`: `mount(WordSearchLink).find("a").attributes("href")` ist `"/suche"`, Text enthält „Berliner Mundart durchsuchen“.
  - `sendet das Analytics-Event beim Klick`: Klick auf `a` (mit `preventDefault` im Test-Handler, damit jsdom nicht navigiert) → `trackEvent` wurde mit `("Search", "Click Search Link", "Search Link Clicked")` aufgerufen.

- [ ] **Step 2: Run it to verify it fails**
      Run: `pnpm vitest run src/tests/unit/components/WordSearchLink.test.ts`
      Expected: FAIL (`find("a")` leer, es ist ein `button`).

- [ ] **Step 3: Rewrite `WordSearchLink.vue`.** `<button>` → `<a href="/suche" @click="onClick">`, `onClick` ruft nur `trackEvent` (Navigation macht der Browser; kein `preventDefault`). Alle Scroll-, Fokus- und Media-Query-Logik und den ungenutzten Import `usePreferredReducedMotion`/`useMediaQuery` entfernen. `searchLinkIconWrapClass` und das Icon-Markup bleiben, soweit das SCSS sie braucht (`_word-search-link.scss` bleibt unverändert; falls `button`-spezifische Resets im SCSS fehlen, im Browser prüfen, dass der Link wie zuvor aussieht: `text-decoration: none; color: inherit` nur ergänzen, wenn nötig).

- [ ] **Step 4: Run the test to verify it passes**
      Run: `pnpm vitest run src/tests/unit/components/WordSearchLink.test.ts`
      Expected: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add website/src/components/WordSearchLink.vue website/src/tests/unit/components/WordSearchLink.test.ts
  git commit -m "refactor(search): link the home search button to /suche"
  ```

### Task 3: Startseite ohne Suche, JSON-LD auf `/suche`

**Files:**

- Modify: `website/src/pages/index.astro` (Import `WordSearch`, Element `<WordSearch />` am Ende, `urlTemplate` im `websiteSchema`)
- Modify: `website/src/tests/e2e/index.spec.ts`

**Interfaces:**

- Consumes: `/suche` (Task 1), `WordSearchLink` (Task 2).

- [ ] **Step 1: Update `index.spec.ts`:** Den Test `Wortsuche filtert die Wortliste` ersetzen durch zwei Tests:
  - `Startseite hat keine Wortliste und kein Suchfeld mehr`: `goto("/")`, `searchbox` (Name „Suche nach einem Berliner Word“) Anzahl 0, `.c-word-list` Anzahl 0.
  - `Suchlink führt auf /suche`: Link mit Name „Berliner Mundart durchsuchen“ hat `href="/suche"`.
  - Neu: `JSON-LD SearchAction zeigt auf /suche`: Inhalt des `script[type="application/ld+json"]` mit `WebSite` enthält `/suche?q={search_term_string}` und nicht `/wort?q=`.

- [ ] **Step 2: Run it to verify it fails**
      Run (E2E wie in Task 1): `pnpm exec playwright test src/tests/e2e/index.spec.ts`
      Expected: FAIL in den drei neuen Tests.

- [ ] **Step 3: Modify `index.astro`:** `WordSearch` und seinen Import entfernen, `urlTemplate` auf `` `${SITE_URL}/suche?q={search_term_string}` `` ändern. Nichts sonst (Fakten, Wort des Tages, `WordSearchLink` bleiben).

- [ ] **Step 4: Run the spec to verify it passes**
      Run: `pnpm exec playwright test src/tests/e2e/index.spec.ts`
      Expected: alle Tests bestanden. Dazu: Die Startseite lädt im Browser ohne Konsolenfehler und ohne verwaisten Preload (`/api/search/index.json` wird nur noch auf `/suche` vorgeladen).

- [ ] **Step 5: Commit**
  ```bash
  git add website/src/pages/index.astro website/src/tests/e2e/index.spec.ts
  git commit -m "feat(search): move the word search off the home page"
  ```

### Task 4: E2E-Specs der Suche auf `/suche` umziehen

**Files:**

- Modify: `website/src/tests/e2e/homepage-search-behavior.spec.ts` (7× `goto("/")`)
- Modify: `website/src/tests/e2e/homepage-search-edge-cases.spec.ts` (2×)
- Modify: `website/src/tests/e2e/homepage-search-keyboard.spec.ts` (1×)
- Modify: `website/src/tests/e2e/homepage-search-language.spec.ts` (6×)
- Modify: `website/src/tests/e2e/homepage-filter-sidebar.spec.ts` (1×)
- Modify: `website/src/tests/e2e/global-search-input.spec.ts` (2×)

**Interfaces:**

- Consumes: Route `/suche` mit unveränderter Liste, Filter und Suchfeld.

- [ ] **Step 1: Retarget the specs.** In jeder Datei `goto("/")` → `goto("/suche")`, außer wo der Test die Startseite meint (kein solcher Fall in diesen sechs Dateien erwartet; prüfe jeden Treffer). `?q=`-Gotos (`goto("/?q=…")`) → `goto("/suche?q=…")`. Titel und Kommentare mit „(/)“ → „(/suche)“; die Dateinamen bleiben, damit die Historie lesbar bleibt (Umbenennen nach `search-*.spec.ts` ist nicht Teil dieser Scheibe).

- [ ] **Step 2: Run the six specs**
      Run: `pnpm exec playwright test src/tests/e2e/homepage-search-behavior.spec.ts src/tests/e2e/homepage-search-edge-cases.spec.ts src/tests/e2e/homepage-search-keyboard.spec.ts src/tests/e2e/homepage-search-language.spec.ts src/tests/e2e/homepage-filter-sidebar.spec.ts src/tests/e2e/global-search-input.spec.ts`
      Expected: alle bestanden. Schlägt ein Test fehl, weil er die Startseitenumgebung braucht (z. B. Kopfbereich), wird er entsprechend angepasst, nicht übersprungen.

- [ ] **Step 3: Check the rest of the suite for hidden dependencies**
      Run: `grep -rnE 'goto\("/\??q?' website/src/tests/e2e | grep -v "suche"` und prüfe jeden Treffer: Specs, die auf `/` das Suchfeld, die Liste oder `#wordListing` erwarten (`visual-baseline.spec.ts` und seine Snapshots eingeschlossen), müssen nachgezogen werden. Das Visual-Baseline-Bild der Startseite ändert sich (keine Liste mehr): Snapshot nach der Anleitung in `website/CLAUDE.md` neu erzeugen und in den Commit aufnehmen.

- [ ] **Step 4: Run the full E2E suite once** (Anleitung `website/CLAUDE.md`, Wegwerf-Datenbank) und das Unit-Set: `pnpm vitest run`.
      Expected: grün.

- [ ] **Step 5: Commit**
  ```bash
  git add website/src/tests/e2e
  git commit -m "test(search): run the search specs against /suche"
  ```

### Task 5: Abschluss

**Files:**

- Modify (falls nötig): `docs/superpowers/specs/2026-11-18-startseite-v5-design.md` (Scheibe 1 als erledigt markieren)

- [ ] **Step 1: Checks:** `pnpm lint` (Root), `pnpm format:check`, `pnpm typechecking` für `website` (gezielt: `pnpm --filter website exec astro check`, laut Projektregel im Subshell-Format `(cd website && rtk astro check)`); alles ohne neue Fehler.
- [ ] **Step 2: Manuelle Sichtprüfung** (Dev-Server `pnpm dev`, Browser): `/suche` in Light und Dark, schmal und breit; Filter-Flyout; `/suche?q=aasen`; Startseite mit Link auf `/suche`. Ergebnis kurz in der PR-Beschreibung notieren.
- [ ] **Step 3: Open the PR** gegen `main`, Titel `feat(search): move the word search to /suche`.

---

## Self-Review

- **Spec-Abdeckung (Scheibe 1):** Suche herauslösen und `/suche` (Task 1, 3), `SearchAction` (Task 3), `WordSearchLink` (Task 2), `noindex, follow` (Task 1), Header/Footer unberührt (Constraints), Sitemap/`llms.txt` unverändert (Constraints). Die Combobox gehört zu Scheibe 2, hier nicht.
- **Offen, vor Scheibe 3 klären:** Die Startseite wird in dieser Scheibe kürzer, Fakten und Wort des Tages bleiben. Die Cross-Page-Weitergabe von `?q=` (`useSearchQuerySync` hängt `q` an jede View-Transition) bleibt wie sie ist.
- **Typkonsistenz:** Es entstehen keine neuen Typen oder Funktionen. Selektoren und Namen (`#wordListing`, `.c-word-list`, „Suche nach einem Berliner Word“, „Wortsuche löschen“) kommen aus dem Bestand.
- **Verhältnis:** Der Plan enthält keinen Implementierungscode, nur Signaturen, Selektoren und Assertions.
