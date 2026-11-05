# Trending-Wörter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tageszähler pro Wort (Aufrufe, Audio, Teilen, Weiterklick) erfassen und die Ranglisten meistgesehen, steigend und viel Interaktion als Lese-Endpunkt bereitstellen.

**Architecture:** Neue Payload-Collection `word-stats` (eine Zeile pro Wort und Berliner Tag), atomar hochgezählt per SQL-Upsert. Reine Ranking-Funktionen und die Aggregation liegen in `payload/src/lib/wordStats.ts` (Export `payload-app/word-stats`). Zwei Astro-Routen im `website`-Paket: `POST /api/word-pulse` (Melden) und `GET /api/trending` (Lesen). Der Browser meldet und dedupliziert per `localStorage`.

**Tech Stack:** Payload 3 (Postgres, drizzle `sql`), Astro-API-Routen, Vue/nanostores, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-05-trending-words-design.md`

## Global Constraints

- Gezählt wird nach dem **Berliner Kalendertag** (`Europe/Berlin`), gespeichert als `YYYY-MM-DD`.
- Der Server speichert **keine Besucher-IDs und keine Hashes** in `word-stats`; Dedupe macht der Browser (`localStorage`).
- Aufrufe zählen nur auf der Wortseite selbst, nur für **veröffentlichte** Wörter.
- Gewichte als Konstanten: Audio, Teilen, Weiterklick, Reaktion je 1; Kommentar 3. Nur Kommentare mit `status = published` zählen.
- Formeln ohne feste Schwellen. `m = max(1, Summe der Aufrufe im aktuellen Zeitraum / Anzahl Wörter mit Aufrufen im aktuellen Zeitraum)`.
  - steigend: `(jetzt − davor) / (davor + m)`, Gleichstand entscheidet `views`.
  - viel Interaktion: `(Interaktionen + m · Gesamtrate) / (Aufrufe + m)`, `Gesamtrate = Σ Interaktionen / Σ Aufrufe` (0, wenn keine Aufrufe).
- Standardzeitraum 30 Tage; `days` ist wählbar von 1 bis 365.
- Texte und Fehlermeldungen in der Seitensprache (Deutsch), Commits nach `<type>(<scope>): …`, Scope `word`.
- Payload-Schemaänderung: `pnpm cms:migrate:create <name>` und die Migration committen.
- Neues Wort-Zählen ist ein Expand-Schritt (neue Tabelle), kein Contract.

## Review Focus

- Leere Tabelle: alle drei Listen geben `[]` zurück, keine Division durch 0 (`m`, `Gesamtrate`).
- Ein Wort mit 0 Aufrufen, aber Kommentaren, steht bei "viel Interaktion" nicht an der Spitze (Glättung).
- `days=0`, `days=9999`, `days=abc`, `limit=-1`, unbekannter `type` → 400, kein Absturz.
- Meldung für ein Wort, das nur als Entwurf existiert oder gelöscht ist → 404, kein Zähler.
- Meldung kurz vor und nach Mitternacht Berliner Zeit (auch bei Sommerzeit, 22:30 UTC) landet am richtigen Tag.
- `localStorage` wirft (privater Modus): der Reporter meldet trotzdem einmal pro Seitenaufruf und wirft nicht.
- 20 gleichzeitige Meldungen zählen genau 20 (kein verlorenes Update).

---

### Task 1: Berliner Tag und Ranking-Funktionen

**Files:**
- Create: `payload/src/lib/wordStats.ts`
- Create: `payload/tests/wordStatsRank.test.ts`
- Modify: `payload/package.json` (Export `"./word-stats": "./src/lib/wordStats.ts"`)

**Interfaces:**
- Produces:
  - `export const STAT_KINDS = ["view", "audio", "share", "click"] as const; export type StatKind = (typeof STAT_KINDS)[number];`
  - `export const berlinDay = (date?: Date) => string` (`YYYY-MM-DD`, Zone `Europe/Berlin`, Standard: jetzt).
  - `export type Counts = { views: number; interactions: number };`
  - `export type Ranked = { word: number; value: number; views: number; previous?: number };`
  - `export const rankViewed = (cur: Map<number, Counts>, limit: number): Ranked[]`
  - `export const rankRising = (cur: Map<number, Counts>, prev: Map<number, Counts>, limit: number): Ranked[]` (`value` = Veränderung, `previous` = Aufrufe davor)
  - `export const rankEngaged = (cur: Map<number, Counts>, limit: number): Ranked[]`

- [ ] **Step 1: Write the failing tests** in `payload/tests/wordStatsRank.test.ts`. Reine Funktionen, keine Datenbank. Assertions:
  - `berlinDay(new Date("2026-07-01T22:30:00Z")) === "2026-07-02"` und `berlinDay(new Date("2026-12-01T22:30:00Z")) === "2026-12-01"`.
  - `rankViewed` sortiert absteigend nach `views`, schneidet bei `limit`.
  - `rankRising`: cur-Aufrufe `{A:3, B:80}`, prev-Aufrufe `{A:1, B:50}`, `m = 41.5` → `value(A) = 2/42.5`, `value(B) = 30/91.5`, B zuerst (A mit nur +2 Aufrufen schießt nicht nach oben).
  - `rankEngaged`: cur `{A:{views:1,interactions:1}, B:{views:100,interactions:30}, C:{views:100,interactions:10}}`, `m = 67`, `Gesamtrate = 41/201` → `value(B) ≈ 0.261`, `value(A) ≈ 0.216`, `value(C) ≈ 0.142`, Reihenfolge B, A, C (A mit 1 Aufruf und 1 Klick liegt nahe am Durchschnitt, nicht an der Spitze).
  - Leere Maps → `[]` für alle drei.
- [ ] **Step 2: Run to verify it fails.** Run: `scripts/with-env.sh pnpm cms:test -- wordStatsRank` — Expected: FAIL (Modul fehlt).
- [ ] **Step 3: Implement** die obigen Signaturen in `payload/src/lib/wordStats.ts`. `berlinDay` über `Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" })`. `m` und `Gesamtrate` laut Global Constraints; Gleichstand nach `views`, dann nach `word` aufsteigend (stabil).
- [ ] **Step 4: Run to verify it passes.** Same command — Expected: PASS.
- [ ] **Step 5: Commit** `feat(word): add the berlin day and trending rank functions`

### Task 2: Collection `word-stats`, Migration, atomares Zählen

**Files:**
- Create: `payload/src/collections/WordStats.ts`
- Modify: `payload/src/payload.config.ts` (zur `collections`-Liste hinzufügen, wie `WordFeedback`)
- Modify: `payload/src/lib/wordStats.ts` (Schreibfunktion)
- Create: `payload/src/migrations/<timestamp>_word_stats.ts|.json` (von `pnpm cms:migrate:create word_stats` erzeugt) und Eintrag in `migrations/index.ts`
- Create: `payload/tests/wordStats.test.ts`

**Interfaces:**
- Consumes: `StatKind`, `berlinDay` aus Task 1.
- Produces: `export const bumpWordStat = (payload: Payload, wordId: number, kind: StatKind, day?: string) => Promise<void>`

- [ ] **Step 1: Write the failing test** in `payload/tests/wordStats.test.ts` (Muster wie `comments.test.ts`: `getTestPayload()`, eigenes Test-Wort `word-stats-test` anlegen und vorher aufräumen). Tests:
  - `bumpWordStat(payload, id, "view", "2026-11-05")` zweimal, dann ein `find` auf `word-stats` mit `word = id, day = "2026-11-05"`: genau **eine** Zeile mit `views = 2`, `audio = 0`.
  - `Promise.all` über 20 Aufrufe von `bumpWordStat(..., "click", "2026-11-06")` → eine Zeile mit `clicks = 20`.
  - Die vier `kind`-Werte erhöhen `views`, `audio`, `shares`, `clicks`.
  - `payload.create` einer zweiten Zeile mit gleichem Wort und Tag wirft eine eindeutige Verletzung (Index greift).
- [ ] **Step 2: Run to verify it fails.** Run: `scripts/with-env.sh pnpm cms:test -- wordStats.test` — Expected: FAIL (Collection fehlt).
- [ ] **Step 3: Implement** die Collection `slug: "word-stats"`: Felder `word` (Relationship zu `words`, required, index), `day` (`text`, required, Format `YYYY-MM-DD`; Abweichung von "date" aus der Spec: sortiert lexikographisch und hat keine Zeitzone), Zähler `views`, `audio`, `shares`, `clicks` (je `number`, `defaultValue: 0`, `required`). `indexes: [{ fields: ["word", "day"], unique: true }]`, `access: authenticatedOnly`, `admin.defaultColumns: ["word", "day", "views", "audio", "shares", "clicks"]`. `bumpWordStat`: ein SQL-Upsert (`insert … on conflict (word_id, day) do update set <spalte> = <tabelle>.<spalte> + 1`) über `payload.db.drizzle.execute(sql…)`, importiert wie in `payload/src/hooks/commentCounts.ts`. Spaltennamen aus der erzeugten Migration übernehmen.
- [ ] **Step 4: Create the migration** Run: `scripts/with-env.sh pnpm cms:migrate:create word_stats`; prüfe, dass nur `CREATE TABLE word_stats` + Index + FK + Eintrag in `payload_locked_documents_rels` enthalten sind.
- [ ] **Step 5: Run tests** Run: `scripts/with-env.sh pnpm cms:test -- wordStats.test` — Expected: PASS. Dazu `scripts/migration-upgrade-test.sh` wie in `payload/CLAUDE.md` beschrieben (Migration läuft vor und zurück).
- [ ] **Step 6: Commit** `feat(word): add the daily word stats collection`

### Task 3: Aggregation `trending()`

**Files:**
- Modify: `payload/src/lib/wordStats.ts`
- Create: `payload/tests/wordTrending.test.ts`

**Interfaces:**
- Consumes: `rankViewed`, `rankRising`, `rankEngaged`, `berlinDay`, `Counts`, `Ranked` aus Task 1; `bumpWordStat` aus Task 2.
- Produces:
  - `export type TrendType = "viewed" | "rising" | "engaged";`
  - `export const trending = (payload: Payload, opts: { type: TrendType; days: number; limit: number; today?: string }) => Promise<Ranked[]>`

- [ ] **Step 1: Write the failing test.** Zwei Test-Wörter, Zeilen in `word-stats` direkt per `payload.create` mit festen Tagen und `today: "2026-11-30"`, Kommentare (`status: "published"`, und einer `pending`) und eine Reaktion in `word-feedback`. Assertions:
  - `viewed` über 30 Tage: Reihenfolge nach Aufrufen; Zeilen außerhalb des Zeitraums zählen nicht.
  - `rising`: Zeitraum `2026-11-01..2026-11-30` gegen `2026-10-02..2026-10-31`; `previous` enthält die Aufrufe davor.
  - `engaged`: ein veröffentlichter Kommentar zählt 3, ein `pending`-Kommentar 0.
  - Wort als Entwurf (`_status: "draft"`) taucht nirgends auf.
  - Leere Datenbasis → `[]`.
- [ ] **Step 2: Run to verify it fails.** Run: `scripts/with-env.sh pnpm cms:test -- wordTrending` — Expected: FAIL.
- [ ] **Step 3: Implement `trending`.** Zeitraum = die `days` Tage bis einschließlich `today` (Standard `berlinDay()`); der Vergleichszeitraum ist der gleich lange davor. Lesen über die Local API mit `pagination: false`, `depth: 0` und `select` auf die nötigen Felder: `word-stats` (nach `day` zwischen den Grenzen), `word-feedback` und `comments` (`createdAt` zwischen den Berliner Tagesgrenzen, Kommentare nur `status = published`). Gruppieren in einer `Map<number, Counts>`; `interactions = audio + shares + clicks + Reaktionen + 3·Kommentare`. Danach auf veröffentlichte Wörter filtern (eine `find`-Abfrage auf `words` mit `_status = published` und `id in`), dann ranken.
- [ ] **Step 4: Run to verify it passes.** Same command — Expected: PASS.
- [ ] **Step 5: Commit** `feat(word): aggregate the trending lists`

### Task 4: Melde-Route `POST /api/word-pulse`

**Files:**
- Create: `website/src/pages/api/word-pulse.ts`
- Create: `website/src/utils/wordPulseSchema.ts`
- Modify: `website/src/utils/rateLimit.ts` (neue Regel in `RULES`)
- Create: `website/src/tests/unit/pages/api/word-pulse.test.ts`

**Interfaces:**
- Consumes: `bumpWordStat`, `STAT_KINDS`, `StatKind` aus `payload-app/word-stats`.
- Produces: `export const wordPulseSchema` (zod: `{ word: positive int, kind: enum STAT_KINDS }`); `POST` antwortet `{ ok: true }` (200) oder `{ error }` (400/404/429/502).

- [ ] **Step 1: Write the failing test** (Muster `word-feedback.test.ts`: `getPayloadClient` per `vi.mock` ersetzen, `bumpWordStat` mocken). Tests: gültige Meldung → 200 und `bumpWordStat` mit `(payload, wordId, "view")`; ungültiger Body, `kind: "x"`, `word: -1` → 400 ohne Zählen; `findByID` wirft 404 (`orNull` liefert `null`) → 404 ohne Zählen; Wort-Prüfung nutzt `siteRead()`; 502 bei Datenbankfehler (Fehler wird geloggt); mehr als das Tageslimit pro IP → 429.
- [ ] **Step 2: Run to verify it fails.** Run: `(cd website && rtk vitest run src/tests/unit/pages/api/word-pulse.test.ts)` — Expected: FAIL.
- [ ] **Step 3: Implement** `POST` im Stil von `website/src/pages/api/word-feedback.ts`: JSON lesen, `wordPulseSchema.safeParse`, Wort per `payload.findByID({ collection: "words", depth: 0, id, ...siteRead() })` über `orNull`, IP über `clientIp(...)`, Tageslimit `rateLimitedBy(ip, "word-pulse-all", 2000, DAY)`, dann `bumpWordStat`. Antworten über `reply(...)`. In `RULES` die Regel `{ max: 60, method: "POST", prefix: "/api/word-pulse", windowMs: 60_000 }` ergänzen (neutraler Routenname, bewusst ohne "stats", "track" oder "analytics").
- [ ] **Step 4: Run to verify it passes.** Same command — Expected: PASS. Dazu der bestehende `rateLimit`-Test (`pnpm test:unit` für die Datei) bleibt grün.
- [ ] **Step 5: Commit** `feat(word): add the word pulse reporting endpoint`

### Task 5: Lese-Route `GET /api/trending`

**Files:**
- Create: `website/src/pages/api/trending.ts`
- Create: `website/src/tests/unit/pages/api/trending.test.ts`
- Modify: `payload/CLAUDE.md` (Abschnitt zu `word-stats`: Collection, Formeln, Gewichte)

**Interfaces:**
- Consumes: `trending`, `TrendType`, `Ranked` aus `payload-app/word-stats`; `toWordRef` aus `website/src/services/payload/words.ts`.
- Produces: `GET /api/trending?type=viewed|rising|engaged&days=1..365&limit=1..50` → `{ items: { rank: number; word: WordRef; value: number; views: number; previous?: number }[] }`. Standard: `type` Pflicht, `days=30`, `limit=10`.

- [ ] **Step 1: Write the failing test** (Mock-Muster wie oben, `trending` gemockt). Tests: Standardwerte `days=30`, `limit=10` kommen an; `rank` zählt ab 1; Antwort enthält die Wort-Referenz; `type` fehlt/ungültig, `days=0`, `days=366`, `days=abc`, `limit=0`, `limit=51` → 400; zweiter Aufruf mit gleichen Parametern innerhalb von 5 Minuten ruft `trending` nicht erneut auf (Cache), nach 5 Minuten (`vi.useFakeTimers`) schon; `trending` wirft → 502.
- [ ] **Step 2: Run to verify it fails.** Run: `(cd website && rtk vitest run src/tests/unit/pages/api/trending.test.ts)` — Expected: FAIL.
- [ ] **Step 3: Implement** `GET`: Parameter mit `positiveInt` prüfen, `trending(...)` aufrufen, Wörter per `find` laden und mit `toWordRef` abbilden, Ergebnis in einer `Map` je Parameter-Schlüssel 5 Minuten im Prozess cachen (Kommentar `shortcut: pro Prozess, bei mehreren web-Containern geteilten Cache`), Antwort mit `Cache-Control: public, max-age=300`. Regel `{ max: 60, method: "GET", prefix: "/api/trending", windowMs: 60_000 }` in `RULES`. In `payload/CLAUDE.md` den neuen Abschnitt schreiben.
- [ ] **Step 4: Run to verify it passes.** Same command — Expected: PASS.
- [ ] **Step 5: Commit** `feat(word): add the trending words endpoint`

### Task 6: Browser meldet Aufrufe und Interaktionen

**Files:**
- Create: `website/src/utils/wordPulse.ts`
- Create: `website/src/tests/unit/utils/wordPulse.test.ts`
- Modify: `website/src/pages/wort/[...wordSlug].astro` (Aufruf melden, Klick auf verwandte Wörter)
- Modify: `website/src/components/AudioPlayer.vue` (Audio)
- Modify: `website/src/components/word/WordOptionDropdown.vue` (Teilen; Bon-Share, falls als eigener Pfad vorhanden, gleiche Meldung)
- Modify: `website/CLAUDE.md` (Hinweis auf den Reporter und die Dedupe-Regel)

**Interfaces:**
- Consumes: `POST /api/word-pulse` aus Task 4; die Schlüssel `StatKind` als Literal (`"view" | "audio" | "share" | "click"`).
- Produces: `export const reportWord = (wordId: number, kind: StatKind): void` — meldet höchstens einmal je Wort, Art und Berliner Tag.

- [ ] **Step 1: Write the failing test** (jsdom, `fetch` per `vi.fn`). Tests: erster Aufruf sendet `POST /api/word-pulse` mit `{ word, kind }`; zweiter Aufruf mit gleichem Wort und gleicher Art am selben Tag sendet nichts; andere Art oder anderes Wort sendet; am nächsten Berliner Tag (`vi.setSystemTime`) sendet wieder; wirft `localStorage.getItem` (privater Modus), sendet der Reporter trotzdem und wirft nicht; schlägt `fetch` fehl, wirft der Reporter nicht und merkt sich den Versuch **nicht**; Einträge von früheren Tagen werden beim Schreiben entfernt (der Speicher wächst nicht).
- [ ] **Step 2: Run to verify it fails.** Run: `(cd website && rtk vitest run src/tests/unit/utils/wordPulse.test.ts)` — Expected: FAIL.
- [ ] **Step 3: Implement `reportWord`**: Schlüssel `bsw-pulse` in `localStorage` mit `{ day, seen: ["<wordId>:<kind>", …] }`; der Berliner Tag über dieselbe Logik wie `berlinDay` (kleine Kopie im Browser, weil `payload-app/word-stats` Serverabhängigkeiten hat), Senden per `fetch(..., { keepalive: true, method: "POST", headers: { "Content-Type": "application/json" } })`, Fehler schlucken.
- [ ] **Step 4: Run to verify it passes.** Same command — Expected: PASS.
- [ ] **Step 5: Wire the hooks.** Aufruf: in der Wortseite ein Client-Skript, das `reportWord(word.id, "view")` ruft. Audio: beim Start der Wiedergabe in `AudioPlayer.vue` (`playAudio`) `reportWord(wordId, "audio")`, `wordId` als neue Prop aus `WordHero.astro` bzw. der Liste. Teilen: in `shareWord` von `WordOptionDropdown.vue` nach erfolgreichem `share`. Weiterklick: ein Klick-Handler (Event-Delegation) auf `#verwandte-worte`, der bei Klick auf einen Link `reportWord(currentWordId, "click")` ruft. Bestehende Unit-Tests von `AudioPlayer` und `WordOptionDropdown` laufen weiter; je ein Test für die neue Meldung.
- [ ] **Step 6: Verify** Run: `pnpm test:unit` und `pnpm build` — Expected: grün; im Build taucht `payload-app/word-stats` nur serverseitig auf (kein Client-Bundle-Import).
- [ ] **Step 7: Commit** `feat(word): report word views and interactions from the browser`

---

## Self-Review

- **Spec-Abdeckung:** Zähler (T2, T6), drei Ranglisten (T1, T3), wählbare Zeiträume bis 365 Tage (T3, T5), Lese-Endpunkt (T5), Melde-Endpunkt mit Wortprüfung und Rate-Limit (T4), Berliner Tag (T1, T2), Dedupe im Browser (T6), dauerhafte Speicherung ohne Aufräumen (T2), Reaktionen und Kommentare live gezählt (T3), Antwortform mit Rang und Vorwert (T5), Cache (T5), Migration (T2), Doku (T5, T6).
- **Abweichung von der Spec:** `day` ist ein `text`-Feld im Format `YYYY-MM-DD` statt eines `date`-Felds (Plan-Entscheidung, siehe T2).
- **Typkonsistenz:** `StatKind`, `Counts`, `Ranked`, `TrendType` und `bumpWordStat` heißen in allen Tasks gleich; die Wörter-Schlüssel der Wire-Typen (`view|audio|share|click`) werden in T6 als Literal wiederholt, weil der Browser den Server-Export nicht importiert.
