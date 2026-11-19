# Admin-Statistik Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eine Admin-Seite `/admin/stats` mit Kennzahl-Kacheln, Chart.js-Diagrammen und Top-Listen für einen einstellbaren Zeitraum.

**Architecture:** Reine Zeitraum-Funktionen (`lib/statsRange.ts`) und eine SQL-Abfrage (`lib/statsQueries.ts`, `drizzle.execute` wie `collect()` in `lib/wordStats.ts`) liefern Daten an eine Server-Komponente (`StatsView`). Diese gibt sie an Client-Komponenten mit Chart.js (Canvas) weiter. Zeitraum und Auswahl stehen als URL-Parameter.

**Tech Stack:** Payload 3.93.0 (Custom View, `afterNavLinks`), Next 16, React 19, Postgres/drizzle, Chart.js + `react-chartjs-2`, vitest.

**Spec:** `docs/superpowers/specs/2026-11-19-admin-stats-design.md` (lesen, die Festlegungen dort gelten).

## Global Constraints

- Alle Pfade relativ zu `payload/`; Befehle vom Repo-Root. Tests: `scripts/with-env.sh pnpm cms:test <datei>` (nur gegen `DATABASE_URL_TEST`).
- Tage zählen nach Berliner Zeit (`AT TIME ZONE 'Europe/Berlin'`, `berlinDay`/`addDays`/`dayStart` aus `lib/berlinTime.ts`); Enddatum zählt ganz mit.
- Zeitraum 1 bis 366 Tage, `von ≤ bis ≤ heute`, sonst Fallback 30 Tage (`bis` = heute). Über 90 Tage ISO-Wochen (Montag), Randwochen auf den Zeitraum begrenzt.
- URL-Parameter: `von`, `bis`, `reihen`, `verteilung` (`reaktion`|`nutzung`), `ansicht` (`linie`|`flaeche`).
- Nur Summen, nie Einzelpersonen: `visitor`, `author_tag` und Namen nie lesen oder anzeigen.
- Quellen: `word_stats.day` (Text), `word_feedback.created_at` (nur Zeilen mit `reaction`), `comments.created_at` (`status = 'published'`), `suggestions.created_at` (alle), `bon_games.finished_at` (nicht null).
- Top-Listen: nur veröffentlichte Wörter (`_status = 'published'`) mit `deleted_at is null`; „Beliebt“ und „Typisch berlinerisch“ ab `MIN_GROUP` Stimmen (`lib/wordFeedback.ts`), 10 Einträge.
- Zugriff: jeder eingeloggte Nutzer (keine Rollen); ohne Login nichts anzeigen.
- Oberfläche Deutsch. Commits: `feat(dev): …` o. ä. nach Root-`CLAUDE.md`, Attribution wie dort.
- Schema ändert sich nicht (keine Migration). `lib/`-Dateien, die die Seite lädt, importieren nichts aus `payload-app`-Exports der Website.

## Review Focus

- Ereignis 23:30 UTC im Winter und Sommer landet am richtigen Berliner Tag (Task 2).
- Leerer Zeitraum ohne Daten: alle Summen 0, keine `NaN`/`Infinity`, Seite rendert (Task 1, 2, 4).
- `von > bis`, `bis` in der Zukunft, Zeitraum > 366 Tage und kaputte Parameter fallen auf 30 Tage zurück (Task 1).
- Vorwert 0: Kachel zeigt „neu“ statt Prozent, bei 0 und 0 „–“ (Task 1).
- Wort mit nur einer Stimme oder getrasht/Entwurf steht nicht in „Beliebt“/„Typisch berlinerisch“ (Task 2).

---

### Task 0: Vorarbeit committen (Live-Link, Gruppen, Trash)

**Files:** der unversionierte Stand dieses Worktrees (`src/collections/*`, `src/components/LiveLink.tsx`, `src/migrations/20261119_211428_trash_and_live_link.*`, `payload-types.ts`, `importMap.js`, `pnpm-lock.yaml`).

- [ ] **Step 1:** `pnpm format` ausführen (u. a. die lange `admin`-Zeile in `BonGames.ts`, `WordFeedback.ts`).
- [ ] **Step 2:** `scripts/with-env.sh pnpm cms:test` und `(cd payload && pnpm lint:check)`. Erwartet: grün. Schlägt ein Test wegen Trash fehl (z. B. Kaskade beim Löschen), den Test oder Hook anpassen.
- [ ] **Step 3:** Test ergänzen in `tests/words.trash.test.ts`: Wort mit Kommentar und `word-stats`-Zeile trashen (`payload.update` mit `data: { deletedAt: new Date().toISOString() }`); danach `find` ohne `trash` liefert es nicht, Kommentar und Stat-Zeile bleiben; endgültiges `payload.delete` räumt beides ab.
- [ ] **Step 4:** Commit `feat(dev): trash for words, live link and admin groups` (Lockfile-Änderung als eigener `fix(deps): …`-Commit).

### Task 0b: Payload-Abhängigkeiten aktualisieren

**Files:** Modify `payload/package.json`, `pnpm-lock.yaml`; ggf. `src/payload-types.ts`, `src/app/(payload)/admin/importMap.js`, neue Migration.

- [ ] **Step 1:** Aktuelle Versionen prüfen: `pnpm --filter payload-app outdated`. `payload` und alle `@payloadcms/*` (`db-postgres`, `email-nodemailer`, `next`, `plugin-mcp`, `plugin-redirects`, `plugin-seo`, `richtext-lexical`, `ui`) müssen exakt dieselbe Version haben, sie bleiben wie bisher gepinnt (aktuell 3.93.0). Die übrigen `dependencies` und `devDependencies` von `payload/package.json` (z. B. `next`, `react`, `vitest`, `nodemailer`) auf die neueste Version, die das 24-h-Alterslimit erfüllt. Eine Hauptversion nur nach Lesen des Changelogs (Context7 oder Release Notes) und Rücksprache mit Felix.
- [ ] **Step 2:** Anheben, z. B. `pnpm --filter payload-app update --latest` bzw. gezielt `pnpm --filter payload-app add payload@<v> @payloadcms/<paket>@<v> …`; danach `pnpm install`. Schlägt der Alterslimit-Check an: `pnpm clean --lockfile && pnpm install`.
- [ ] **Step 3:** `pnpm --filter payload-app generate:types`, `generate:importmap`, dann `scripts/with-env.sh env NODE_ENV=production pnpm cms:migrate:create payload_update` nur ausführen, wenn Payload ein Schema-Drift meldet (Migration prüfen: nur additiv, sonst nachfragen); gibt es keine Änderung, bleibt es bei „keine neue Migration“.
- [ ] **Step 4:** Prüfen: `scripts/with-env.sh pnpm cms:test`, `(cd payload && pnpm lint:check)`, `pnpm build` (der Website-Build zieht `payload-app`). Vorher grüne Tests aus Task 0 als Vergleich nehmen; neue Fehler nennen, nicht wegretuschieren.
- [ ] **Step 5:** Commit `build(deps): update payload dependencies`. Offene Renovate-PRs für dieselben Pakete danach schließen oder rebasen lassen (nur nennen, nicht selbst schließen).

### Task 1: Zeitraum-Funktionen

**Files:**

- Create: `src/lib/statsRange.ts`
- Test: `tests/statsRange.test.ts`

**Interfaces:**

- Produces:
  - `type Range = { from: string; to: string }` (Berliner Tage `YYYY-MM-DD`)
  - `parseRange(params: Record<string, string | string[] | undefined>, today: string): Range`
  - `previousRange(range: Range): Range` (gleich lang, direkt davor)
  - `bucketMode(range: Range): "day" | "week"` (`"week"` ab 91 Tagen)
  - `bucketKey(day: string, mode: "day" | "week", range: Range): string` (Tag selbst, bzw. Montag der ISO-Woche, nie vor `range.from`)
  - `pctChange(current: number, previous: number): number | "neu" | "–"` (Vorwert 0 und aktuell > 0: `"neu"`; beide 0: `"–"`; sonst Prozent, gerundet auf ganze Zahlen)

- [ ] **Step 1:** Tests schreiben: `parseRange({}, "2026-11-19")` ergibt `{ from: "2026-10-21", to: "2026-11-19" }`; `von > bis`, `bis` nach `today`, 400 Tage und `von=abc` fallen auf denselben Default; 366 Tage sind erlaubt; `previousRange` von 7 Tagen endet am Tag vor `from`; `bucketMode` ist `"day"` bei 90 und `"week"` bei 91 Tagen; `bucketKey("2026-11-19", "week", …)` ist Montag `2026-11-16`, liegt der Montag vor `range.from`, kommt `range.from`; `pctChange(0, 5)` ist `"neu"`, `(0, 0)` ist `"–"`, `(150, 100)` ist `50`.
- [ ] **Step 2:** Lauf zeigt FAIL (Modul fehlt): `scripts/with-env.sh pnpm cms:test tests/statsRange.test.ts`.
- [ ] **Step 3:** Funktionen in `src/lib/statsRange.ts` implementieren, mit `addDays` aus `./berlinTime`; Wochentag über `dayStart(day)` in Berliner Zeit bestimmen.
- [ ] **Step 4:** Lauf zeigt PASS.
- [ ] **Step 5:** Commit `feat(dev): stats range helpers`.

### Task 2: SQL-Abfragen

**Files:**

- Create: `src/lib/statsQueries.ts`
- Test: `tests/statsQueries.test.ts`

**Interfaces:**

- Consumes: `Range` aus Task 1; `MIN_GROUP`, `REACTIONS`, `USAGES` aus `./wordFeedback`; `dayStart`, `addDays` aus `./berlinTime`.
- Produces:
  - `const METRICS = ["views","audio","shares","clicks","reactions","comments","suggestions","bonGames"] as const; type Metric = (typeof METRICS)[number]`
  - `type StatsData = { daily: Record<Metric, Record<string, number>>; totals: Record<Metric, number>; reactionSplit: Record<"like"|"dislike"|"say"|"know"|"never", number>; topViewed: TopWord[]; topLiked: TopWord[]; topSay: TopWord[] }`
  - `type TopWord = { id: number; berlinerisch: string; slug: string | null; value: number; votes?: number }` (`value`: Aufrufe bzw. Prozent)
  - `loadStats(payload: Payload, range: Range): Promise<StatsData>`

- [ ] **Step 1:** Test anlegen: Wort `stats-test-wort` (published) und ein Entwurfs-Wort plus ein getrashtes Wort; `word-stats`-Zeilen für drei Tage, Feedback mit `createdAt` explizit gesetzt, zwei Kommentare (`published`, `pending`), ein Vorschlag, ein BON-Spiel mit `finishedAt`.
  - `loadStats` mit passendem Range: `totals.views` und `daily.views[day]` stimmen; `pending`-Kommentar zählt nicht.
  - Feedback um `2026-01-15T23:30:00Z` (Winter) zählt zum 16.01., eines um `2026-07-15T22:30:00Z` (Sommer) zum 16.07. (`daily.reactions`).
  - Leerer Zeitraum: alle `totals` sind 0, `daily` leer, Top-Listen leer.
  - `topLiked` enthält ein Wort mit 9 Stimmen nicht, eines mit 10 schon; Entwurf und getrashtes Wort fehlen in allen Top-Listen.
- [ ] **Step 2:** Lauf zeigt FAIL.
- [ ] **Step 3:** `loadStats` mit `Promise.all` über je eine aggregierende Abfrage pro Quelle (`sql` aus `@payloadcms/db-postgres/drizzle`, Muster `collect()` in `lib/wordStats.ts`). Tagesgruppierung `to_char(created_at AT TIME ZONE 'Europe/Berlin', 'YYYY-MM-DD')`. Top-Listen joinen `words` (`_status = 'published' and deleted_at is null`) und begrenzen mit `limit 10`; Prozentlisten mit `having count(*) >= ${MIN_GROUP}`. Kommentar im Code, dass rohes SQL Access und Hooks umgeht und Namen einer Umbenennung folgen müssen.
- [ ] **Step 4:** Lauf zeigt PASS; im Test `afterAll` alle angelegten Zeilen entfernen.
- [ ] **Step 5:** Commit `feat(dev): stats queries`.

### Task 3: Chart.js und Diagramm-Komponenten

**Files:**

- Modify: `package.json` (payload), `pnpm-lock.yaml`
- Create: `src/components/stats/themeColors.ts`, `src/components/stats/StatsCharts.tsx` (`"use client"`)
- Test: `tests/statsColors.test.ts` (nur die reine Funktion)

**Interfaces:**

- Consumes: `Metric`, `StatsData`, `Range`.
- Produces:
  - `readThemeColors(el: HTMLElement): { text: string; grid: string; series: string[] }` (liest `--theme-elevation-*`, `--theme-success-*`, `--theme-error-*` per `getComputedStyle`, mit festen Fallbacks)
  - `<StatsCharts data={StatsData} range={Range} series={Metric[]} view={"linie"|"flaeche"} split={"reaktion"|"nutzung"} />` (Verlauf mit zweiter Achse: `views` links, übrige Reihen rechts; Balken-Diagramm der Prozent-Veränderung zum Vorzeitraum pro Kennzahl; Verteilung als gestapelter Balken; Legende zum Ein-/Ausblenden)

- [ ] **Step 1:** `pnpm --filter payload-app add chart.js react-chartjs-2` (nur Versionen, die das 24-h-Alterslimit erfüllen; sonst `pnpm clean --lockfile && pnpm install` nach Root-`CLAUDE.md`). Nur benötigte Chart.js-Teile registrieren (`LineElement`, `PointElement`, `BarElement`, `LinearScale`, `CategoryScale`, `Tooltip`, `Legend`, `Filler`).
- [ ] **Step 2:** Test: `readThemeColors` mit einem Element ohne Variablen liefert die Fallbacks und mindestens 6 Reihenfarben (jsdom ist ggf. nicht eingerichtet: dann die Fallback-Logik als reine Funktion `pickColors(get: (name: string) => string)` testen).
- [ ] **Step 3:** Implementieren. Reihen-Auswahl und Wochen-/Tag-Buckets über `bucketMode`/`bucketKey` aus Task 1; Beschriftungen und Fehlertexte Deutsch; Tooltips zeigen Zahl und Reihenname.
- [ ] **Step 4:** Lauf `(cd payload && pnpm lint:check)` und der Test aus Step 2 zeigen grün.
- [ ] **Step 5:** Commit `feat(dev): stats charts with chart.js`.

### Task 4: Seite, Navigation, Registrierung

**Files:**

- Create: `src/components/StatsView.tsx`, `src/components/StatsNavLink.tsx`, `src/components/stats/RangeForm.tsx`
- Modify: `src/payload.config.ts` (`admin.components.views.stats = { Component: "@/components/StatsView", path: "/stats" }`, `admin.components.afterNavLinks`), `src/app/(payload)/admin/importMap.js` (regeneriert)
- Test: `tests/statsView.test.ts`

**Interfaces:**

- Consumes: `parseRange`, `previousRange`, `pctChange` (Task 1), `loadStats` (Task 2), `StatsCharts` (Task 3).
- Produces: `StatsView(props: AdminViewServerProps): Promise<JSX.Element | null>` (`null` ohne `user`).

- [ ] **Step 1:** Test: `StatsView` ohne `user` in `initPageResult.req` liefert `null`; `parseRange` wird mit den `searchParams` der View aufgerufen (Aufruf mit `{ von: "x" }` lädt trotzdem 30 Tage).
- [ ] **Step 2:** Lauf zeigt FAIL.
- [ ] **Step 3:** `StatsView` in `DefaultTemplate` mit `Gutter` (Muster aus den Payload-Docs), lädt `loadStats` für `range` und `previousRange(range)`, rendert acht Kacheln (Summe plus `pctChange`), `StatsCharts` und die drei Top-Listen. `RangeForm`: Schnellwahl-Links (7/30/365 Tage rückwärts bis heute) und ein GET-Formular mit `von`/`bis`. `StatsNavLink`: Link auf `/admin/stats`. Fehler in `loadStats` mit deutschem Hinweis abfangen (wie `WordFeedbackCounts`), nicht die Admin-Seite abstürzen lassen.
- [ ] **Step 4:** `pnpm --filter payload-app generate:importmap`; Lint und die Tests aus den Tasks 1 bis 4 laufen grün. Im Dev (`pnpm cms:dev`, Port aus `.env.worktree`) die Seite öffnen: Default, 7/365 Tage, kaputte Parameter, Dark Mode; Ergebnis in der Rückmeldung nennen.
- [ ] **Step 5:** Commit `feat(dev): admin stats page`.

### Task 5: Doku

**Files:** Modify `payload/CLAUDE.md` (Abschnitt „Other features“).

- [ ] **Step 1:** Ein Absatz: Seite `/admin/stats`, Dateien (`lib/statsRange.ts`, `lib/statsQueries.ts`, `components/StatsView.tsx`), rohes SQL folgt Spalten-Umbenennungen, Parameter `von`/`bis`/`reihen`/`verteilung`/`ansicht`, Chart.js Canvas mit Farben aus Admin-Variablen.
- [ ] **Step 2:** `pnpm format:check` und Commit `docs(dev): document admin stats page`.
