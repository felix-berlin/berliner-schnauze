# Startseite v20 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die Startseite v20 „Berliner Wörterbuch“ (11 Abschnitte) ersetzt die alte Startseite, mit neuen Design-System-Tokens und serverseitig berechneten Daten (Morse-Ring, Bezirks- und Altersaggregate).

**Architecture:** Payload liefert neue Felder und ein reines Aggregat-Modul (`payload-app/home-stats`); die Website holt alles in einem SSR-Aufruf (`fetchHome`) plus `GET /api/home-stats` (gecacht). Vue-Inseln nur für Interaktives, Rest Astro. Tokens in `website/tokens/*.json`.

**Tech Stack:** Astro (SSR, Node), Vue 3, Payload CMS (Postgres), SCSS mit `mx.component(...)`, Vitest, Playwright, pnpm.

**Spec:** `docs/superpowers/specs/2026-11-21-startseite-v20-design.md` (Design, freigegeben) und der Handoff `SPEC.md` (nach Task 1 unter `docs/design/startseite-v20/SPEC.md`). Die Handoff-SPEC ist für Maße, Texte, Zustände verbindlich.

## Global Constraints

- Header und Footer bleiben unberührt.
- Radius ≤ 4px (Ausnahmen SPEC §4.6); Text ≥ `.8125rem`; keine Emojis; kein `--font-display` (Fraktur); Orange nur für Handlung und Marke (SPEC §4.4); Datenfarben nur für Daten.
- `MIN_GROUP = 10`: Gruppen darunter erscheinen nie (Bezirk, Altersgruppe, Bezirk×Wort). `MIN_WORD_VOTES = 30` (Zwischenwert, `TODO(startseite)`).
- Altersgruppen: unter 30 / 30–49 / 50–69 / 70+ aus den Stufen `u20, 20-29, 30-39, 40-49, 50-59, 60-69, 70-79, 80plus`.
- `--t3` Light `#535e69`, Dark `#a8b2bc`. Palette und Datenfarben exakt nach SPEC §4.1–4.3.
- Breakpoints `<808` / `808–999` / `≥1000`. Genau eine `h1`. Hover-Inhalte nur unter `@media (hover: hover)`.
- Payload nur additiv (Expand/Contract, `payload/CLAUDE.md`). `pnpm` only. `oxlint` direkt immer mit `--format=agent`.
- Styles als SCSS-Komponenten, BEM, keine Scoped Styles; `pnpm lint` und `pnpm tokens:check` grün vor jedem Commit.
- Keine echten Daten aus der Prod-DB in Tests, Fixtures, Screenshots. Offene Punkte: Zwischenlösung mit `TODO(startseite):`.
- Commits: Conventional Commits (`feat(home): …`), mit Co-Author-Zeile laut Session-Vorgabe.

## Review Focus

- Wort ohne Buchstaben der Morse-Tabelle (z. B. nur „-“ oder „’“): Ring leer, kein Crash, Seal zeigt trotzdem Button.
- Bezirk ohne jede Stimme / alle Bezirke unter `MIN_GROUP`: Karte grau, Band entfällt wenn auch Alter leer.
- Wort des Tages ohne Audio und ohne IPA: Pille „Noch keene Hörprobe“, keine Kontur.
- Sehr langes Wort („Kodderschnauze“, > 28 Morsezeichen): Ring gekappt, Lemma umbricht.
- Suche mit Sonderzeichen/Leerzeichen/leer: GET `/suche?q=` korrekt kodiert, kein leerer Request.
- JS aus: Suche per GET, Reiter zeigen Panel 1, `<details>` funktionieren.

---

## Dateistruktur

| Datei | Verantwortung |
|---|---|
| `docs/design/startseite-v20/**` | entpackter Handoff (Referenz, Fonts, Punktraster) |
| `website/tokens/semantic.{light,dark}.tokens.json` | neue Tokens |
| `website/public/fonts/fira-sans-extra-condensed-*.woff2`, `website/src/styles/base/_fonts-home.scss` | Schrift |
| `payload/src/collections/{Words,Themen,Posts}.ts`, `payload/src/globals/Home.ts`, `payload/src/migrations/*` | Felder |
| `payload/src/lib/homeStats.ts` (+ Export `payload-app/home-stats`) | reine Berechnung: Morse, Altersgruppen, Bezirks-/Altersaggregate |
| `payload/src/lib/homeStatsLoad.ts` | Loader: DB → Aggregate |
| `payload/src/seed/home.ts`, `payload/src/seed/homeContent.ts` | Seed der Texte |
| `website/src/pages/api/home-stats.ts` | gecachter Endpunkt |
| `website/src/services/payload/home.ts` | `fetchHome()` |
| `website/src/pages/index.astro` | Seite |
| `website/src/components/home/*.{astro,vue}`, `website/src/components/{WordSeal,HomePoll}.vue` | Abschnitte |
| `website/src/styles/components/_home-*.scss`, `_word-seal.scss`, `_home-poll.scss` | Styles |
| `website/src/tests/unit/**`, `website/src/tests/e2e/home.spec.ts` | Tests |

---

### Task 1: Handoff importieren, Tokens, Schrift

**Files:**
- Create: `docs/design/startseite-v20/` (Inhalt der ZIP außer `ds/`), `website/public/fonts/fira-sans-extra-condensed-{600,800,latin-ext-800}.woff2`, `website/src/styles/base/_fonts-home.scss`
- Modify: `website/tokens/semantic.light.tokens.json`, `website/tokens/semantic.dark.tokens.json`, `website/src/styles/tokens/_tokens.generated.scss` (generiert), die Stelle, an der `base/` eingebunden wird (`website/src/styles/app.scss`)
- Test: `website/src/tests/unit/styles/home-tokens.test.ts`

**Interfaces:**
- Produces: CSS-Variablen `--page, --card, --card2, --card3, --t3, --line, --d-bl, --d-ye, --d-gr, --ok` (Light/Dark), Band-Variablen `--band-dark-bg` (`#14191e`), Font-Familie `"Fira Sans Extra Condensed"` als `--font-condensed`.

- [ ] **Step 1:** `unzip` der ZIP in ein leeres Verzeichnis, `design/`, `assets/`, `PROMPT.md`, `SPEC.md` nach `docs/design/startseite-v20/` kopieren (kein `ds/`, keine ZIP). Bestehende Änderungen in `website/tokens/*` (uncommitted, von Kalle) zuerst committen oder mitnehmen, nicht überschreiben.
- [ ] **Step 2: Failing test.** `home-tokens.test.ts` liest die generierte SCSS und prüft: `--t3` Light `#535e69`, Dark `#a8b2bc`; `--page` Light `#efe6db`, Dark `#1b2127`; `--d-bl/--d-ye/--d-gr/--ok` Light und Dark gemäß SPEC §4.2; `--card, --card2, --card3` gemäß §4.1.
- [ ] **Step 3:** Run `pnpm --filter website exec vitest run src/tests/unit/styles/home-tokens.test.ts` als `(cd website && rtk vitest run src/tests/unit/styles/home-tokens.test.ts)` → FAIL.
- [ ] **Step 4:** Tokens in beide JSONs eintragen (Namen wie im Bestand strukturiert, Werte aus SPEC §4.1–4.3; Bestehende Wortseiten-`--t3` auf `#535e69` setzen), `pnpm tokens:build` und `pnpm tokens:check` ausführen.
- [ ] **Step 5:** `_fonts-home.scss`: drei `@font-face` (600, 800, latin-ext 800 mit `unicode-range: U+0100-02AF`), `font-display: swap`, Fallback mit `size-adjust`/`ascent-override` gegen CLS; in `app.scss` einbinden. Dateien aus `assets/fonts/` nach `website/public/fonts/`.
- [ ] **Step 6:** Test grün, `pnpm lint`, dann Commit `feat(home): add palette v13 tokens and condensed font`.

### Task 2: Payload-Felder und Migration

**Files:**
- Modify: `payload/src/collections/Words.ts` (`ipa`), `Themen.ts` (`typischerSatz`), `Posts.ts` (`teaserZitat`, `teaserIpa`), `payload/src/globals/Home.ts`
- Create: Migration über `pnpm cms:…` Skript laut `payload/CLAUDE.md` (Dateiname-Muster wie `20261113_…`), regenerierte Typen
- Test: `payload/src/…` Config-Test, falls Projekt einen hat; sonst Migrationstest über `scripts/migration-dryrun.sh`

**Interfaces:**
- Produces: `Word.ipa?: string`, `Thema.typischerSatz?: string`, `Post.teaserZitat?: string`, `Post.teaserIpa?: string`; Global `home` zusätzlich: `intro` (textarea), `tryWords` (relationship → words, hasMany, max 4), `browseLinks` (array: `label`, `href`, `icon` select), `knowledge` (richText), `soundRules` (array ×6: `standard`, `berlin`, `example`, `rule`), `faq` (array: `question`, `answer` richText), `aboutText` (textarea). `facts` bleibt.

- [ ] **Step 1:** Felder additiv hinzufügen (alle optional außer Pflichtfelder der Array-Zeilen); Admin-Beschreibungen auf Deutsch, `ipa` mit Hinweis „ohne eckige Klammern, IPA“.
- [ ] **Step 2:** Migration erzeugen (Postgres, additive Spalten/Tabellen) und mit `scripts/migration-dryrun.sh` prüfen; Expand/Contract-Regel beachten.
- [ ] **Step 3:** Typen neu erzeugen (`payload generate:types` über das Projektskript), `pnpm typechecking` für payload.
- [ ] **Step 4:** Commit `feat(cms): add home page fields and word ipa`.

### Task 3: `homeStats` reine Funktionen (TDD)

**Files:**
- Create: `payload/src/lib/homeStats.ts`, Export `"./home-stats": "./src/lib/homeStats.ts"` in `payload/package.json`
- Test: `payload/src/lib/homeStats.test.ts` (Vitest, bestehendes Muster des Pakets; falls das Paket keinen Runner hat, Test unter `website/src/tests/unit/lib/homeStats.test.ts` mit Import `payload-app/home-stats`)

**Interfaces (Produces):**
```ts
export const MIN_GROUP = 10;
export const MIN_WORD_VOTES = 30; // TODO(startseite)
export type MorseMark = { sym: "d" | "l"; left: string; top: string; rotate: string };
export const MORSE_MAX_MARKS = 28; // TODO(startseite): Regel für lange Wörter
export function morseRing(word: string): MorseMark[];
export const AGE_GROUPS = ["u30", "30-49", "50-69", "70plus"] as const;
export type AgeGroup = (typeof AGE_GROUPS)[number];
export function ageGroup(age: (typeof import("./wordFeedback").AGES)[number]): AgeGroup;
export type UsageCounts = { say: number; know: number; never: number };
export function districtValue(counts: UsageCounts): number | null;       // say/total in %, gerundet; null wenn total < MIN_GROUP
export function agePercents(byGroup: Record<AgeGroup, UsageCounts>): Record<AgeGroup, number | null>; // Anteil say je Gruppe, null unter MIN_GROUP
export function typicalWord(perWord: { word: number; say: number; total: number }[], avgSay: number): number | null; // größter Abstand über Schnitt, nur total ≥ MIN_GROUP
```

- [ ] **Step 1: Failing tests** (Assertions):
  - `morseRing("KIEZ").length === 10` (K -.-, I .., E ., Z --..); erste Marke bei Winkel −90°+… wie SPEC §5.1; `morseRing("SCHRIPPE").length === 25`; `morseRing("Äh")` enthält 4+4 Zeichen (Ä `.-.-`, H `....`); `morseRing("-’")` → `[]`; `morseRing("Kodderschnauze").length <= 28`.
  - `ageGroup("u20") === "u30"`, `"20-29" → "u30"`, `"30-39"`/`"40-49" → "30-49"`, `"50-59"`/`"60-69" → "50-69"`, `"70-79"`/`"80plus" → "70plus"`.
  - `districtValue({say:4,know:3,never:2}) === null` (9 < 10); `districtValue({say:5,know:3,never:2}) === 50`.
  - `agePercents` setzt Gruppen mit total < 10 auf `null`.
  - `typicalWord` ignoriert Wörter mit `total < 10`, wählt größten `say/total − avgSay`; leere Liste → `null`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implementieren; Morse-Ring nach dem Algorithmus aus SPEC §5.1 (Tabelle A–Z, Ä `.-.-`, Ö `---.`, Ü `..--`, ß `...--..`, andere Zeichen überspringen); Kappung: Buchstaben ab Wortanfang, solange die Gesamtzahl der Zeichen ≤ `MORSE_MAX_MARKS`. **Step 4:** grün. **Step 5:** Commit `feat(home): add home stats helpers`.

### Task 4: Loader, `/api/home-stats`, `fetchHome`

**Files:**
- Create: `payload/src/lib/homeStatsLoad.ts` (+ Export `payload-app/home-stats-load` oder im selben Modul, je nach Importgrenzen), `website/src/pages/api/home-stats.ts`, `website/src/services/payload/home.ts`
- Test: `website/src/tests/unit/services/home.test.ts`, `website/src/tests/unit/server/home-stats-api.test.ts`

**Interfaces:**
- Consumes: Task 3, `trending(payload, {days, limit, type})` aus `payload-app/word-stats`, `berlinDay`, `pickWordOfTheDay`, `fetchAllWords`, `ttl()`, `setPageCache`, `siteRead()`.
- Produces:
```ts
export type HomeStats = {
  districts: { area: string; name: string; value: number | null; typical: { slug: string; berlinerisch: string } | null }[];
  ageLists: { dying: AgeWord[]; growing: AgeWord[] };   // je max 4
  popular: { word: WordRef; views: number; sayShare: number | null }[];   // 5
  rising: { word: WordRef; delta: number }[];                              // 5
  bon: { roundsToday: number; steps: {from:number;mult:number}[]; card: { word: string; wrongShare: number } | null };
};
export type AgeWord = { word: WordRef; byGroup: Record<AgeGroup, number | null> };
export const loadHomeStats: (payload: BasePayload) => Promise<HomeStats>;
export const fetchHome: () => Promise<HomeData>;  // Global + Wort des Tages (inkl. morse: MorseMark[]) + Neu(5) + Themen(6) + Magazin + Mitmachen-Zahlen + Kennzahlen live
```
- Regeln: nur `word-feedback`-Zeilen mit `usage`; Bezirke = die 12 aus `AREAS` ohne `brandenburg`/`elsewhere`; Berliner Schnitt über dieselben; Umfrage-Wort = eigene Tageswahl ohne Wort des Tages; Spielkarte = meistfalsch der letzten 7 Tage aus den BON-Daten, sonst `null`. Antwortform enthält keine IDs/Zeitstempel/Rohstimmen. Cache: `ttl` Beliebt/Aufwind 1 h, Bezirke/Alter 24 h.

- [ ] **Step 1: Failing tests:** `GET /api/home-stats` liefert genau die Schlüssel von `HomeStats` (keine zusätzlichen), alle Bezirke mit Gruppe < 10 haben `value: null`; Fixture mit ausgedachten Daten (z. B. „Testbezirk“-Zählungen), nichts aus Prod. `fetchHome` gibt `word.morse` mit `length` ≤ 28 zurück und `null`-sichere Felder bei leerem Global.
- [ ] **Step 2:** FAIL. **Step 3:** Implementieren (Aggregation per SQL/`payload.find` mit `limit: 0`; für Zählungen Drizzle/`payload.db` wie `trending` es tut, kein Laden aller Rohzeilen in den Speicher). **Step 4:** grün. **Step 5:** Commit `feat(home): add home stats endpoint and fetchHome`.

### Task 5: Seed-Skript für die Texte

**Files:**
- Create: `payload/src/seed/home.ts`, `payload/src/seed/homeContent.ts` (Texte aus `docs/design/startseite-v20/design/HomeV20.dc.html`: Intro, Wissens-Artikel als HTML, 6 FAQ, 6 Lautregeln, Über-Satz, 4 Probier-Wörter als Slugs, die in der Ziel-DB existieren, sonst übersprungen)
- Modify: `payload/package.json` (`"seed:home"` nach Muster `seed:dev`)
- Test: `payload/src/seed/home.test.ts` bzw. `website/src/tests/unit/…`

**Interfaces:**
- Consumes: `htmlToLexical(html, config)`.
- Produces: `seedHome(payload): Promise<{ written: string[]; skipped: string[] }>`; idempotent, überschreibt keine bereits gefüllten Felder.

- [ ] **Step 1: Failing test:** erster Lauf auf leerem Global schreibt `intro, knowledge, soundRules(6), faq(6), aboutText`; zweiter Lauf: `written` leer, alle in `skipped`; ein manuell geändertes `intro` bleibt erhalten.
- [ ] **Step 2–4:** FAIL → implementieren → grün. Texte wörtlich aus dem Mock, Zahlen wie „1.700+“ nicht fest einbauen (Platzhalter `{count}` wird im Frontend aus der Live-Zahl ersetzt).
- [ ] **Step 5:** Commit `feat(cms): seed home page texts`.

### Task 6: Bühne (Intro, Wort des Tages, Siegel, IPA-Kontur, Suche, Chips)

**Files:**
- Create: `website/src/components/home/HomeIntro.astro`, `WordOfTheDayStage.vue`, `HomeSearch.vue`, `BrowseChips.astro`, `website/src/components/WordSeal.vue`, Styles `_home-stage.scss`, `_word-seal.scss`, `_home-search.scss`
- Test: `website/src/tests/unit/components/WordSeal.test.ts`, `HomeSearch.test.ts`

**Interfaces:**
- Consumes: `HomeData.word` mit `morse: MorseMark[]`, Audio-URL, Dauer; Orama-Suche (`fetchSearchIndex`/`/api/search`).
- Produces: `WordSeal` Props `{ word: string; morse: MorseMark[]; audioUrl?: string; duration?: number; initial?: string }`, Events `play`/`end`; Verhalten nach SPEC §5.1–5.2 (Dauer pro Zeichen = `duration / morse.length`, Label wechselt „{Wort} anhören“/„Anhalten“, `prefers-reduced-motion` ohne Schein). `HomeSearch` Props `{ placeholder?: string }`; Form GET `/suche`, `name="q"`.

- [ ] **Step 1: Failing tests:** `WordSeal` rendert genau `morse.length` Marken (`i.d`/`i.l`), Ring `aria-hidden`, Button-Label wechselt beim Klick, ohne `audioUrl` zeigt es den Anfangsbuchstaben statt Button. `HomeSearch`: Enter ohne Auswahl navigiert zu `/suche?q=<encodeURIComponent>`; `/`-Taste fokussiert das Feld (nicht in Eingabefeldern); Lösch-Kreuz nur bei Text, leert Feld, Fokus bleibt; ↑↓/Esc wie SPEC §8; ab 2 Zeichen 150ms Debounce, max. 6 Einträge in zwei Gruppen, Kein-Treffer-Fall mit „Nüscht jefunden“ und Vorschlagen-Link.
- [ ] **Step 2–4:** FAIL → Komponenten + SCSS nach SPEC §4.5/§5/§8/§15/§16, Chips aus `HomeData.tryWords`/`browseLinks` → grün. IPA-Kontur nur wenn `ipa` gesetzt.
- [ ] **Step 5:** `pnpm lint`, Commit `feat(home): add stage, word seal and inline search`.

### Task 7: Mitforschen, Themen, Spiel, Frisch

**Files:**
- Create: `website/src/components/HomePoll.vue`, `components/home/{TopicRegister.astro,BonTeaser.vue,FreshLists.vue}`, Styles `_home-poll.scss`, `_home-topics.scss`, `_home-bon.scss`, `_home-fresh.scss`
- Test: `HomePoll.test.ts`, `BonTeaser.test.ts`, `FreshLists.test.ts`, `website/src/tests/unit/utils/relativeTime.test.ts`
- Modify: bestehender Relativzeit-Helfer, falls vorhanden, sonst Create `website/src/utils/relativeTime.ts`

**Interfaces:**
- Produces: `HomePoll` Props `{ wordId: number; lemma: string; meaning: string; slug: string; total: number }`, nutzt den bestehenden `word-feedback`-Endpunkt (`usage`), zeigt nach der Stimme 100 Punkte, Fokus auf Ergebnis-Überschrift, `aria-live="polite"`. `relativeTime(date: Date, now?: Date): string` → „vor 2 Tagen“, „vor 1 Woche“. `BonTeaser` Props `{ steps; roundsToday; card: {word; wrongShare} | null }`; ← / → nur bei Fokus im Bereich, Probekarte zählt nicht für Ranglisten (kein Aufruf an BON-Start).

- [ ] **Step 1: Failing tests:** `relativeTime` (2 Tage, 1 Woche, heute); `HomePoll`: Klick auf Kachel sendet `usage` und zeigt Ergebnis, Punktzahl summiert auf 100, Stimme markiert; `BonTeaser`: ArrowRight beantwortet, ohne `card` kein Stapel, Multiplikator-Leiste aus `steps`; `FreshLists`: beide Panels im SSR-HTML, ←/→ wechselt Reiter (`tabindex="-1"` inaktiv).
- [ ] **Step 2–4:** FAIL → implementieren nach SPEC §6, §7 (Hover nur `@media (hover: hover)`), §9, §10 → grün. Leere Reiter ausgeblendet, < 3 Einträge: Liste entfällt.
- [ ] **Step 5:** Commit `feat(home): add poll, topics, game teaser and fresh lists`.

### Task 8: Ergebnis-Band (Karte und Altersprofil)

**Files:**
- Create: `website/src/components/home/{ResultsBand.vue,DotMap.vue,AgeDots.vue}`, `website/src/utils/dotMap.ts`, Styles `_home-results.scss`
- Test: `website/src/tests/unit/utils/dotMap.test.ts`, `components/home/AgeDots.test.ts`, `ResultsBand.test.ts`

**Interfaces:**
- Produces: `dotStyle(v: number | null): { r: number; opacity: number; muted: boolean }` mit `r = 1.6 + 2.0*v/100`, `opacity = 0.18 + 0.82*clamp((v-30)/56, 0, 1)`; `null` → `muted: true` (Farbe `--d-gr` 20 %). `filledDots(percent: number | null): number` → `round(p/10)`, `null` → 0. `DotMap` Props `{ districts: HomeStats["districts"]; geometry: Geometry }`, Geometrie aus `docs/design/startseite-v20/assets/berlin-bezirke-punkte.json` nach `website/src/assets/` kopiert; SVG `role="group"`, jeder Bezirk `<g tabindex="0" aria-label="{Bezirk}, typisch: {Wort}. {v} Prozent sagen Sag ick selbst">`; Tooltip bei Hover/Fokus/Tap; unter `MIN_GROUP`: „{Bezirk} · noch zu wenig Stimmen“. `AgeDots` mit `aria-label` „unter 30: 3 %, 30–49: …, 50–69: …, 70+: …“. Beschriftungen/Achsenzeile mit den neuen Gruppen.

- [ ] **Step 1: Failing tests:** `dotStyle(30)` → `opacity .18`, `dotStyle(86)` → `1`, `dotStyle(100)` clampt auf `1`, `dotStyle(0)` auf `.18`; `filledDots(67) === 7`, `filledDots(null) === 0`; `ResultsBand` blendet Reiter ohne Daten aus, beide leer: rendert nichts; Reiter per Tastatur.
- [ ] **Step 2–4:** FAIL → implementieren (1091 Punkte als ein Inline-SVG, Welle per CSS-Variable, kein JS pro Punkt) → grün. Band `data-theme="dark"` in beiden Themes.
- [ ] **Step 5:** Commit `feat(home): add results band with dot map and age profile`.

### Task 9: Wissen, FAQ, Magazin, Mitmachen, Mitnehmen

**Files:**
- Create: `components/home/{BerlinerischArticle.astro,FaqAbout.astro,MagazineQuote.astro,SuggestGap.astro,ToGoBar.vue}`, Styles `_home-knowledge.scss`, `_home-faq.scss`, `_home-magazine.scss`, `_home-gap.scss`, `_home-togo.scss`
- Test: `ToGoBar.test.ts`, `website/src/tests/unit/pages/home-sections.test.ts`

**Interfaces:**
- Consumes: Kalle `components/kalle/BerlinerBaer.vue` (Variante `plain`, Pose `zeigen`, nicht ändern); bestehende App-Install-Logik aus `InstallApp.vue`/`FooterAppSection.vue` wiederverwenden (nicht neu schreiben); Anki-Link aus `fetchAnkiContent`.
- Produces: `<details class="…__more">` immer im HTML; ein kleines Script setzt ab 808px `open` und die Summary wird per CSS ausgeblendet; Text einmal gerendert. Der Satz „Die Übersicht zeigt …“ (neutral). Magazin-Fallback: ohne `teaserZitat` erster Pull-Quote, ohne beides entfällt der Abschnitt (`TODO(startseite)`). `ToGoBar`: installierte App → linke Hälfte entfällt.

- [ ] **Step 1: Failing tests:** `<details>` ist im gerenderten HTML vorhanden und der Text steht in beiden Zuständen im DOM; Magazin-Abschnitt entfällt ohne Artikel; `ToGoBar` blendet App-Hälfte bei `standalone` aus; FAQ: erste Frage offen, 6 `<h3>` in Summaries; Lautregeln 6 Zeilen mit durchgestrichenem Hochdeutsch `aria-hidden`.
- [ ] **Step 2–4:** FAIL → implementieren nach SPEC §12 → grün.
- [ ] **Step 5:** Commit `feat(home): add knowledge, faq, magazine, gap and to-go sections`.

### Task 10: Seite zusammensetzen, SEO, Bewegung

**Files:**
- Modify: `website/src/pages/index.astro` (alte Startseite ersetzen; `FactCard`, `GameCtaCard`, `WordOfTheDay`, `WordSearchLink`-Nutzung hier entfernen, die Komponenten nur löschen, wenn sonst unbenutzt), `website/src/pages/llms.txt.ts`
- Create: `website/src/utils/revealOnView.ts` (IntersectionObserver, `threshold: .2`, einmalig), `website/src/utils/homeJsonLd.ts`
- Test: `website/src/tests/unit/utils/homeJsonLd.test.ts`, `revealOnView.test.ts`

**Interfaces:**
- Produces: `homeJsonLd(data: HomeData): object[]` → `WebSite` (mit `SearchAction` auf `/suche?q={search_term_string}`), `Organization` (bestehend), `FAQPage` (die sichtbaren Fragen), `DefinedTerm` (Wort des Tages, `inDefinedTermSet`). `<title>` und Description nach SPEC §14, Zahl live. `revealOnView(root: ParentNode): () => void`; unter `prefers-reduced-motion: reduce` sofort Endzustand.

- [ ] **Step 1: Failing tests:** JSON-LD enthält alle Fragen des Globals; Description enthält die Live-Zahl; `revealOnView` setzt Klasse einmalig und feuert nicht erneut; bei reduce sofort.
- [ ] **Step 2–4:** FAIL → implementieren, Abschnitte in Reihenfolge SPEC §2 einbinden, Leer-Fälle (§13) in der Seite (Abschnitt entfällt ohne Daten), `llms.txt` um Intro/„Wat is Berlinerisch?“/Lautregeln/FAQ erweitern → grün.
- [ ] **Step 5:** Commit `feat(home): assemble start page, seo and reveal motion`.

### Task 11: E2E, Zugänglichkeit, Aufräumen

**Files:**
- Create: `website/src/tests/e2e/home.spec.ts`
- Modify: Specs, die noch auf `/` für die Suche zeigen (`rg "goto\(\"/\"\)"` in `website/src/tests/e2e/` prüfen); Doku `website/CLAUDE.md` (Startseite-Abschnitt, falls vorhanden)

- [ ] **Step 1: Specs:** genau eine `h1`; `/` fokussiert die Suche, ↑↓/Esc, Lösch-Kreuz; beide Tablists per Tastatur; Umfrage → Ergebnis sichtbar und Fokus darauf; Spiel ← / → beantwortet die Probekarte; mobil `<details>` zu, ab 808px offen, Text in beiden Fällen im DOM; `reducedMotion: 'reduce'` keine laufende Animation (`document.getAnimations()` leer bis auf Morse-Marker); kein Text < 13px im `main`; Screenshots 390/834/1280 × Dark/Light gegen `docs/design/startseite-v20/assets/v20/` (Toleranz, nur als Sichtvergleich, kein hartes Pixelmatch gegen Mock-Daten). axe ohne Verstöße (Karte `role="group"`, Tabs, Combobox).
- [ ] **Step 2:** `pnpm test:unit`, `pnpm lint`, `pnpm typechecking` (gezielt), `pnpm build`; Lighthouse auf der laufenden Seite: CLS 0 in der Bühne, LCP ist das Lemma.
- [ ] **Step 3:** Seed lokal gegen die Worktree-DB ausführen (`pnpm --filter payload-app seed:home` mit `scripts/with-env.sh`), Seite im Browser prüfen (Dev-Server nicht stoppen).
- [ ] **Step 4:** Commit `test(home): add start page e2e and accessibility checks`.

---

## Self-Review

- **Spec-Abdeckung:** Tokens/Font (T1), Felder (T2), Morse/Alter/MIN_GROUP (T3), Endpunkt/Service/Datenschutz (T4), Seed (T5), §5/§8 (T6), §6/§7/§9/§10 (T7), §11 (T8), §12 (T9), §14/§16 (T10), §17/§21 (T11). Header/Footer: keine Task berührt sie.
- **Offene Zwischenlösungen** (`TODO(startseite)`): `MORSE_MAX_MARKS`, `MIN_WORD_VOTES`, Beliebt/Aufwind-Definition (T4), Magazin-Fallback (T9).
- **Typkonsistenz:** `MorseMark`, `AgeGroup`, `HomeStats`, `HomeData` werden in T3/T4 definiert und in T6–T10 verwendet.
