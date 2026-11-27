# Suche v1 „Nachschlagen, rückwärts und nach Bedeutung“: Umsetzungsdesign

Stand: 2026-11-27. Gilt zusammen mit dem Handoff in `docs/design/suche-v1/` (`SPEC.md` ist der verbindliche Stand für Design, Texte und Maße, `PROMPT.md` die Regeln, `SucheV1.dc.html` bzw. `generator-suchev1.py` Markup und Maße). Die Board-Screenshots (`assets/boards/*.jpg`, `assets/zustaende/*.jpg`) liegen nur im Handoff-Zip `suche-v1-handoff.zip` im Repo-Root (nicht eingecheckt). Dieses Dokument legt fest, **wie** gebaut wird und was abweichend von der SPEC entschieden ist. Es wiederholt die SPEC nicht.

## Intent

Heute gibt es zwei Seiten: `/suche` (Wortsuche, nur im Browser gerendert, `noindex`) und `/wort` (Wort-Index, alle Wörter als Links). Suche v1 macht daraus **eine** Seite unter `/wort`. Ohne Suchbegriff ist sie der Index (Register + Liste A–Z), mit Suchbegriff die Suche in beide Richtungen (Berlinerisch → Hochdeutsch und zurück), mit neuen Filtern aus der Umfrage, kompakten Zeilen und einer optionalen Bedeutungssuche mit der lokalen Chrome-KI. Die alte Suche und der alte Index samt Styles entfallen.

## Goals

- `/wort` nach SPEC §2–§7 und §9–§12 in mobil `< 808px` und Desktop `≥ 808px` (siehe Entscheidung Tablet).
- Erste Trefferansicht per SSR; ohne JS benutzbar (GET-Formular, Filter- und Registerlinks).
- Rangfolge nach SPEC §6.2, Filter nach §7 (ODER innerhalb, UND zwischen Gruppen), Zustand komplett in der URL.
- Bedeutungssuche (SPEC §8) als dynamisch geladene Komponente, Logik aus PR #1955.
- Tests nach SPEC §17 plus die neuen Fälle unten.

## Non-goals

- Keine Server-Such-API pro Tastendruck, keine Embeddings, kein Speichern der KI-Rückmeldung.
- Keine „Warum“-Zeile bei KI-Treffern.
- Kein „Mehr laden“ und kein `?seite=`: die Liste bleibt virtualisiert (virtua).
- Keine Links auf alle Wörter im HTML von `/wort` (die Sitemap reicht).
- Keine Schema-Änderung in Payload, keine Migration.

## Anti-goals

- Texte mit „wir/uns/unser/wa“, Emojis, Fraktur, Orange außerhalb SPEC §4, Text unter 13px.
- Irgendetwas von der KI sichtbar oder im Hauptbundle, wenn `LanguageModel` fehlt oder `unavailable` ist (kein ausgegrauter Knopf, kein Hinweis).
- KI startet automatisch (nur Klick oder `Shift+Enter`).
- Daten oder Texte aus der Produktions-Datenbank in Tests oder Fixtures.
- Ein Zwischenstand auf `main`, der Suche oder Index bricht.

## Constraints

- Frontend-Umsetzung jedes Mal über den Skill `modern-web-guidance` (Browser-Floor: `docs/superpowers/specs/2026-11-13-design-system-design.md` §9, Firefox ≥ 146; Newly-Available nur mit benannter Rückfallebene).
- Vorhandene Tokens verwenden (`--card`, `--card2`, `--card3`, `--t3`, `--line`, `--d-bl`, `--orange-500/600` existieren in `styles/tokens/_tokens.generated.scss`); fehlende neu anlegen statt Werte hart zu codieren. Styles nach `.claude/rules/website-styles.md`.
- Der Index `/api/search/index.json` ist öffentlich und liegt per Service Worker auf den Geräten: nur Aggregate, keine Einzelantworten.
- Heute 2,9 MB roh / 397 KB komprimiert (gemessen auf Prod). Budget: komprimiert höchstens +25 %; beim Bau messen.
- Zählwerte werden nie auf `words` gespeichert (website/CLAUDE.md); neue In-Process-Caches sind `ttl`/`ttlBy`.
- Code, Kommentare, Bezeichner, Tests und Commits Englisch, nur UI-Texte Deutsch. Offene Punkte: `TODO(suche):`.

## Approaches

|                 | Beschreibung                                                                                                                                                                                                                 | Abwägung                                                                                                                                                                                      |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A** (gewählt) | Eine Suchlogik (reines TS) für Server und Browser. Der Server baut aus den Index-Einträgen eine Orama-DB und rendert den ersten Listenausschnitt; die Vue-Insel lädt danach den Index wie heute und sucht lokal live weiter. | Kein Request pro Tastendruck, offline geht weiter, KI-Kandidaten lokal wie in #1955, Rangfolge an einer Stelle testbar. Server und Browser rechnen beide; kalter Cache braucht den DB-Aufbau. |
| B               | Server-API `/api/search?q=…` liefert Treffer und Facetten.                                                                                                                                                                   | Kein Index im Browser, aber Request pro Tastendruck, offline kaputt, KI bräuchte trotzdem lokale Kandidaten.                                                                                  |
| C               | Wie heute nur im Browser, ohne SSR.                                                                                                                                                                                          | Billig, verletzt aber „erste Trefferseite per SSR, ohne JS benutzbar“.                                                                                                                        |

Gewählt wurde A, weil es auf der vorhandenen Orama-Suche und dem KI-Code aus #1955 aufbaut und offline erhält.

## Entscheidungen

### Seite und URL

- **Eine Seite `/wort`**, h1 „Wörter suchen“, Unterzeile laut SPEC. `pages/wort/index.astro` wird ersetzt.
- **`/suche` → 301 auf `/wort`, Query bleibt erhalten** (`/suche?q=x&wortart=verb` → `/wort?q=x&wortart=verb`). `pages/suche.astro` entfällt. Prüfen, ob `redirects` in `astro.config.mjs` die Query mitnimmt; sonst in der Middleware.
- Mit-anpassen: `utils/homeSearch.ts` (`searchUrl`), `components/home/HomeSearch.vue` (`action`), `utils/homeJsonLd.ts` (`SearchAction.urlTemplate`), `pages/index.astro` (Weiterleitung `/?q=`), `lib/previewAwareCache.ts` (Kommentar), Manifest-Shortcut „Wort suchen“ in `astro.config.mjs` (heute `/`, neu `/wort`).
- URL-Parameter nach SPEC §7.4 **ohne `seite`**, dazu `buchstabe=` (Filter Buchstabe). Werte sind Slugs (`wortart=verb,adjektiv`, `thema=<slug>`, `gebrauch=oft`, `wo=ost`, `bezirk=<area-key>`, `alter=u30`, `inhalt=audio,beispiele`, `beginnt=`, `endet=`, `reim=`, `silben=4`, `laenge=kurz`, `berolinismus=1`, `sort=beliebt`). Parser und Serializer sind reine Funktionen mit Round-Trip-Test; unbekannte Werte werden verworfen.
- **Robots:** `/wort` ohne `q` und ohne Filter `index, follow`, Canonical `/wort`, JSON-LD `DefinedTermSet` wie heute. Mit `q` oder Filtern `noindex, follow` und **kein** Canonical.
- **Cache:** `Astro.cache?.set` bleibt wie heute; die Query ist Teil des Cache-Schlüssels (prüfen in `lib/previewAwareCache.ts`).

### Liste: virtua statt „Mehr laden“

- `WindowVirtualizer` aus `virtua/vue` wie heute in `WordList.vue`. SPEC §6.5 entfällt (kein „Mehr laden“, kein `?seite=`, kein Fokus auf neue Treffer). Der Footer ist erreichbar, weil die Liste endlich ist.
- SSR rendert über `ssrCount` den ersten Ausschnitt (Größenordnung 30 Zeilen). Ohne JS zeigt die Seite diesen Ausschnitt. Mehr ist ohne JS nicht nötig (Weg B: Sitemap reicht).
- **`?buchstabe=` ist immer der Filter** (Entscheidung des Planers): Die Liste zeigt nur Wörter mit diesem Anfangsbuchstaben, die Seite gilt als gefiltert (`noindex, follow`, kein Canonical), der Chip „Buchstabe“ erscheint als aktiver Filter. Das Register verlinkt ohne JS auf `?buchstabe=b`. Mit JS springt ein Klick im Register nur per `scrollToIndex` und ändert die URL nicht. Der Chip „Buchstabe“ bleibt ausgeblendet, solange weder `q` noch `buchstabe` gesetzt ist (SPEC §6.4).
- Zeilen für Buchstaben-Köpfe (h2 je Buchstabe, SPEC §6.4) und die Trennzeilen („Ab hier: Treffer in der Bedeutung“, „Klingt ähnlich“) sind eigene Einträge in derselben flachen virtua-Liste mit `role="presentation"`.
- Register: Klick → `scrollToIndex` auf den Kopf des Buchstabens; Scroll-Spy aus dem ersten sichtbaren Index des Virtualizers. Ohne JS echter Link.
- Combobox (SPEC §12): Der Fokus bleibt im Feld; ↑/↓ setzen den aktiven Index, rufen `scrollToIndex` und setzen danach `aria-activedescendant` auf die dann gerenderte Zeile. Das heutige Muster in `WordList.vue` (Fokus wandert in die Liste) wird dafür ersetzt.

### Suchlogik (geteilt, reines TS)

Neues Modul unter `website/src/lib/search/` (ohne DOM, ohne Payload-Import), genutzt von Seite und Insel:

- `query.ts`: Normalisierung (Kleinschreibung `de`, Umlaute/ß wie die Wörterbuch-Schreibung, Berlinisch bleibt wie es ist, also „jeh“ ≠ „geh“), Zerlegung in Suchwörter.
- `rank.ts`: Stufen `word-exact` > `word-prefix` > `word` > `meaning` (exakt vor Teilwort) > `fuzzy` (Soundex über `derived.soundexCode`, nur wenn < 5 Treffer). Baut auf `matchTier` aus `stores/wordList.ts` auf und ersetzt es. Liefert die Stelle der Trennzeile.
- `filters.ts`: Prädikate je Gruppe, ODER innerhalb, UND zwischen Gruppen. Filter laufen in JS über die Treffer (nicht als Orama-`where`), damit Server, Insel und KI-Kandidaten exakt dieselbe Logik nutzen. Orama macht nur den Volltext.
- `facets.ts`: Zahlen je Option („{n} Wörter passen“, Zahlen bei Buchstabe und Inhalt) aus der aktuellen Treffermenge.
- `usage.ts`: Schwellen als Konstanten an einer Stelle: `OFT_MIN = 0.5`, `KAUM_MAX = 0.2`, `OST_WEST_DIFF = 0.10`, `MIN_VOTES = 10`. „Manchmal“ = dazwischen. „Beides“ = Unterschied < 10 Punkte. Wörter unter 10 Stimmen fallen aus jedem Gebrauch-Filter heraus; „Am meisten jesagt“ sortiert sie ans Ende.
- `highlight.ts`: Markierung ab 3 Zeichen, mehrere Suchwörter einzeln, Groß/Klein egal (`@orama/highlight` ist installiert; prüfen, ob es die Regeln abdeckt, sonst eigene kleine Funktion).
- `url.ts`: Parser/Serializer (siehe oben).
- Reimt sich auf: letzte 3 Buchstaben, `TODO(suche):` verbessern.

Server: eine `ttl`-memoisierte Orama-DB aus `getSearchIndexEntries()` (gleiche Schema-/Tokenizer-Konfiguration wie `services/wordSearchDb.ts`, daraus gemeinsam ziehen). Insel: wie heute `getWordDb()`.

### Index-Erweiterung (`makeOramaSearchIndex`)

Neu je Wort (Feldnamen frei für den Builder, Form wie SPEC §13 `SearchHit`):

- `article`, `meanings` (gibt es als `translations`), `pos` (gibt es als `berlinerischWordTypes`).
- `has`: `examples`, `examplesAudio`, `images`, `stories` (mind. eine veröffentlichte Jeschichte), `facts`, `gap`. **Lücke** = es fehlt mind. eins von Beispiel, Wissenswertes, Audio, verwandtes Wort (dieselben Bedingungen wie die `gap`-Props in `WordFactsCard`/`WordNetworkCard`).
- `form`: `syllables`, `length`, `soundex` aus `derived`.
- `usage` nur bei ≥ 10 Stimmen: Anteil „Sag ick selbst“ gesamt, Stimmen, Anteil Ost und West (aus `half`), je Bezirk (`area`) und je Altersgruppe — jeweils nur Gruppen mit ≥ 10 Stimmen.
- **Altersgruppen (entschieden): die 4 Gruppen der Startseite**, `AGE_GROUPS = ["u30", "30-49", "50-69", "70plus"]` mit `ageGroup()` aus `payload/src/lib/homeStats.ts` (Export `payload-app/home-stats`). Das Popover zeigt statt der SPEC-Werte: Alle · unter 30 · 30 bis 49 · 50 bis 69 · ab 70. URL-Werte = die Schlüssel (`alter=u30`).
- **Nicht** im Index: Wort des Tages und „Gerade beliebt“. Sie ändern sich täglich bzw. laufend und würden den ETag und damit den Service-Worker-Download ständig erneuern. Der Server setzt sie im SSR selbst; die Insel holt sie aus den vorhandenen Quellen (`stores/wordOfTheDay.ts`, `/api/trending`).
- **„Gerade beliebt“ (Entscheidung des Planers):** dieselbe Definition wie auf der Wortseite (`services/payload/wordTrend.ts`): `trending()` mit `type: "viewed"`, `TREND_DAYS` (7 Tage). Das **Badge** bekommen die Top 10 (wie `getWordTrend`). Die **Sortierung** ordnet nach Rang in `/api/trending?type=viewed&days=7` (Top 50), alle übrigen Wörter danach A–Z. Offline ohne Trend-Daten: Sortierung fällt auf A–Z zurück, keine Badges.

**Umfrage-Aggregat:** ein SQL-Aggregat über `word_feedback` per `payload.db.drizzle.execute` (Muster: `payload/src/lib/homeStatsLoad.ts`, Export server-only), im Web-Prozess als `ttl`-Memo mit 24 h. Kein Payload-Job: Jobs laufen nur im `cms`-Container und müssten ihr Ergebnis speichern. Die Cache-Stamp-Leerung bei CMS-Änderungen gilt mit.

Bezirk und Altersgruppe im Gebrauch-Popover (Entscheidung des Planers): Sie schränken die Gruppe ein, über die „Wie oft jesagt?“ rechnet. Allein gewählt bedeuten sie „Wort hat in dieser Gruppe ≥ 10 Stimmen“.

### Bedeutungssuche (Chrome-KI)

- Logik aus PR #1955 (`feat/chrome-on-device-semantic-search`, `components/SearchWords.vue`, `findSemanticCandidates` in `stores/wordList.ts`) wird nach `components/search/SemanticSearch.vue` portiert: `availability` mit `samplingMode: "most-predictable"` und Rückfall auf den Standardmodus, `create` mit `monitor` und `downloadprogress`, Session und Kandidaten parallel (`Promise.allSettled`), `responseConstraint` mit `{ slugs: string[] }`, nur Slugs aus der Kandidatenliste, `runId` + `AbortController` gegen veraltete Antworten.
- Abweichungen vom PR: Oberfläche und Texte aus SPEC §8.3 (Angebot, laden, läuft, fertig, Fehler, zu wenig); keine Entwickler-Hinweise (localhost-Flags, Sampling-Label); **Top 5**, keine „Warum“-Zeile; **40 Kandidaten** (Text „KI sortiert die besten 40 Kandidaten …“), lokal per Orama und **nach den aktiven Filtern** gefiltert.
- Sessions nach Guide `language-model`: eine **Basis-Session** mit dem Systemprompt in `initialPrompts`, einmal pro Seitenbesuch; jede Anfrage läuft in `base.clone()`, der Klon wird danach mit `destroy()` freigegeben (keine Vermischung zwischen Anfragen, kein erneutes `create()`). Die Basis wird beim Verlassen der Seite (`astro:before-swap`/`pagehide`) zerstört.
- Vorwärmen: Nur wenn `availability === "available"` (kein Download nötig), wird die Basis-Session schon beim Fokus oder Hover des KI-Knopfs bzw. beim Erscheinen des Angebots angelegt. Bei `downloadable`/`downloading` erst beim Klick (Nutzeraktion nötig). Gesucht wird in jedem Fall erst nach Klick oder `Shift+Enter`.
- Ergebnis-Cache in `sessionStorage` (try/catch), Schlüssel = normalisierter Suchbegriff + aktive Filter: Zurück-Navigation oder dieselbe Anfrage rechnen nicht neu.
- `signal` nur an `prompt()`, nicht an `create()`. `create()`, `prompt()` und `JSON.parse()` einzeln abfangen → Zustand **Fehler**; ein `AbortError` durch Abbrechen ist kein Fehler. Kein `maxLength` im Schema.
- A11y: Download-Fortschritt in `<progress max="1">` mit Namen; der Block ist eine `aria-live="polite"`-Region, die ab dem Erscheinen im DOM steht. Verschwindet der fokussierte Knopf („Abbrechen“, „Modell laden und suchen“), geht der Fokus auf den KI-Knopf im Suchfeld bzw. die Statuszeile (`tabindex="-1"`).
- Keine Rückfallebene über Server oder Cloud (der Guide nennt sie als Option): ohne Chrome-KI fehlt der Teil bewusst spurlos (SPEC §8.1).
- Laden: `SearchApp.vue` importiert `SemanticSearch.vue` nur dynamisch, wenn `'LanguageModel' in self` und `availability` nicht `unavailable` ist. Bundle-Test: das Haupt-Chunk enthält den String `LanguageModel` bzw. die KI-Texte nicht.
- Angebot ab 3 Wörtern; „Nee, danke“ in `sessionStorage` (try/catch). Erkennung wie im PR (3 Wörter oder 2 mit Beschreibungs-Signal) ist erlaubt, solange die SPEC-Schwelle „ab 3 Wörtern“ eingehalten wird; im Zweifel nur die SPEC-Regel.
- Ja/Nee: nur `trackEvent("Search", "AI feedback", "ja" | "nee")`, ohne Suchbegriff und ohne Slugs. Keine Änderung der Datenschutzerklärung.
- Der Guide `language-model` (`modern-web-guidance`) ist für dieses Repo freigeschaltet (`.mwgrc` im Repo-Root) und vor der Umsetzung erneut abzurufen.

### Oberfläche (nach `modern-web-guidance`)

- **Filter-Popover:** nicht-modal (`<dialog popover="auto">` mit `aria-labelledby` auf den Titel, Guide `dialog` Rule 2), Esc und Klick außerhalb schließen nativ, Fokus geht an den Chip zurück. Abweichung von SPEC §12: **keine Fokusfalle** im Popover (nicht-modal; der Guide verbietet manuelle Fallen), Tab darf hinaus.
- **Positionierung:** CSS Anchor Positioning ist in Firefox nicht verfügbar. `position-area: block-end span-inline-end` + `position-try-fallbacks: flip-inline` nur innerhalb `@supports (position-area: block-end)`; **Rückfallebene** ohne Unterstützung: der Standard-Platz des Popovers (mittig). Keine Floating-UI-Abhängigkeit. Logische Schlüsselwörter, nie gemischt mit physischen.
- **Filter-Sheet (mobil):** `<dialog>` mit `showModal()` und `closedby="any"`; **kein** `role="dialog"`/`aria-modal`/manuelle Fokusfalle (nativ). Fokus auf den Titel (`tabindex="-1"` + `autofocus`). Scroll-Sperre per `overscroll-behavior: contain` auf `dialog:modal` und `::backdrop` (mit `overflow: hidden`), nie `overflow: hidden` auf `html`/`body`. Runterziehen schließt (kleiner Pointer-Handler).
- **Akkordeon im Sheet:** vorhandene `@components/accordion` (`<details>`), nicht exklusiv, „Gebrauch“ offen.
- **Bewegung (SPEC §11):** Popover/Sheet über `@starting-style` + `transition` auf `display` und `overlay` mit separatem `transition-behavior: allow-discrete`; Transformationen nur in `@media (prefers-reduced-motion: no-preference)`; Shimmer und Fortschritt bei `reduce` aus.
- **Popover-Polyfill:** nicht nötig (Popover ist Baseline seit 2025-01 und liegt über dem Floor).

### Such-Modal im Header (entschieden)

`components/modals/search/SearchModal.vue` (geöffnet über `SearchModalTrigger.vue` in `MainHeader.astro`) bleibt als schnelles Nachschlagen: Suchfeld + kompakte Trefferliste auf `lib/search/*` (gleiche Rangfolge, Trennzeile und Markierung), **ohne Filter, ohne KI**. Darunter ein Link `Alle Treffer und Filter` auf `/wort?q=…`. Die Tastatur-Kürzel im Fuß bleiben. Damit entfallen `WordFilter.vue`, `WordSearchFilterToggle.vue` und der alte Filter-Store vollständig; `SearchWords.vue` und `useSearchQuerySync.ts` werden auf die neue Logik umgestellt oder ersetzt. Der Text `Alle Treffer und Filter` ist nicht aus der SPEC (das Modal kommt dort nicht vor) und wird mit dem Nutzer abgestimmt, bevor er live geht.

### Tablet 808–999px

Desktop-Layout mit umbrechender Filterleiste und Popovern; unter 1000px ist der KI-Knopf nur Icon. Prüfung im Browser bei 820px. Die Grenze ist ein einzelner Wert.

### Offline

Der Service Worker speichert den ganzen Index (`urlPattern` für `/api/search/index.json` in `astro.config.mjs`). Offline gehen damit alle Wörter; der Offline-Hinweis aus SPEC §10 erscheint nur, wenn der Index fehlt.

### Aufräumen

Wird gelöscht, sobald die neue Seite steht (vorher dem Nutzer die Liste zeigen, PROMPT Schritt 1):

- `pages/suche.astro`, `components/word-search/*` (`WordSearch.astro`, `WordFilter.vue`, `WordSearchList.vue`, `WordSearchFilterToggle.vue`, `NoSearchResults.vue`, `SearchResultCount.vue`, `WordListSkeleton.vue`, `shortcuts/`), soweit nicht mehr benutzt.
- Styles `_filter-search.scss`, `objects/_word-index.scss`, `components/_word-group.scss` und was nur sie importieren.
- `stores/wordList.ts` vollständig (`persistentMap` „wordSearch:“, alte Filter, `matchTier`, `$oramaSearchResults`), sobald Seite und Header-Modal auf `lib/search/*` laufen; ebenso `WordList.vue`, falls es danach nichts mehr nutzt. Der Barrel `@stores/index` verliert den `computedAsync`-Seiteneffekt.
- `api/search/meta.json.ts`, falls nichts mehr ihn liest.

### Tests (zusätzlich zu SPEC §17)

- Unit: `lib/search/*` (Rangfolge inkl. Trennzeilen-Index, Filter UND/ODER, Schwellen an den Grenzen 0,2/0,5/±0,1 und 9/10 Stimmen, URL-Round-Trip, Normalisierung „jeh“ ≠ „geh“), Index-Erweiterung (keine Einzelantworten, Gruppen < 10 fehlen), `SemanticSearch` mit gemocktem `LanguageModel` (fehlt → nichts; `downloadable` → laden; unbekannter Slug verworfen; Abbruch; Session wiederverwendet).
- E2E: `/suche?q=x` → 301 → `/wort?q=x`; Robots-Meta mit/ohne `q`; Seite mit `javaScriptEnabled: false` zeigt Treffer für `?q=` und das Register verlinkt; Daten nur aus `seed:e2e` (`docs/test-words.md`), die SPEC-Beispiele („brötchen“, Splitterbrötchen, Schrippe) als erfundene Seed-Wörter ergänzen, falls nicht vorhanden.
- `wordTexts`-Test (verbotene Wörter) auf die neuen Komponenten ausweiten.

## Dem Builder überlassen

- Komponentenschnitt im Detail (SPEC §14 ist ein Vorschlag), Feldnamen im Index, `ssrCount`.
- Kalle-Stimmungen `nuescht` und `kratzen` (SPEC §10) gibt es in `BerlinerBaer.vue` noch nicht: aus dem Kalle-Handoff (`docs/design/kalle/`) ergänzen oder auf vorhandene abbilden.
- Wie die SSR-Treffer an die Insel gehen (Props vs. erneutes Rechnen nach dem Laden des Index), solange kein Hydration-Mismatch und kein Flackern entsteht.
- PR-Schnitt. Ohne Migration ist ein Zweig mit mehreren Commits möglich; Löschen der alten Teile im letzten Commit.
