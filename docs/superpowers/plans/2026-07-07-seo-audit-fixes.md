# SEO-Audit-Fixes — Implementierungsplan

**Quelle:** SEO-Audit 2026-07-07, Health Score 77/100. Evidenz: `berliner-schnauze.wtf-audit/FULL-AUDIT-REPORT.md` + `findings/*.md`.
**Scope:** Code-seitige Fixes in diesem Repo. NICHT im Scope: Content-Arbeit in WordPress (Beispielsätze backfillen, Etymologie-Quellen, Themen-Introtexte, Wort-Anreicherung) — das ist redaktioneller Backlog.

Jede Phase ist eigenständig in frischem Kontext ausführbar. Reihenfolge: 1→8. Phasen 1–5 sind unabhängig voneinander; 6 und 7 sind größer.

---

## Phase 0: Faktenlage (Discovery abgeschlossen — nur lesen, nichts recherchieren)

**Erlaubte APIs / verifizierte Fakten (aus Code-Recon 2026-07-07):**

| Thema | Fakt | Quelle |
|---|---|---|
| Critical CSS | `@playform/inline` v0.1.4 (wrappt beasties), letzter Eintrag im `integrations`-Array, **ohne Optionen** aufgerufen | `astro.config.mjs`, `package.json:119` |
| Sitemap | `@astrojs/sitemap` mit `serialize`-Funktion, setzt `lastmod` bereits für `/wort/<slug>` via `getWordDates()` | `astro.config.mjs` (sitemap-Block), `src/services/queries/getSitemapWordDates.ts` |
| Headers | `public/_headers` existiert (8 Zeilen: Security-Header + Content-Signal). **Keine** Cache-Control-Regeln im Repo | `public/_headers` |
| Suchindex | `src/pages/api/search/index.json.ts:126` — `new Response(JSON.stringify(...))` **ohne Header**. URL hardcoded in `src/stores/wordList.ts:422`, `src/components/games/BerlinerOderNicht.vue:234`, `src/components/word-search/WordSearch.astro:12` + SW-Regex in `astro.config.mjs` | Recon |
| llms.txt | Statische Datei `public/llms.txt` (handgeschrieben, 16 Zeilen). Kein Route-Code | `public/llms.txt` |
| Wortart/NLP | Im Repo berechnet: `getWordType()` (`src/utils/wordHelper.ts:67`, compromise/nlp) + `translateNlpTags()` (`:163`). WP liefert kuratierte Typen `berlinerischWordTypes.nodes.name` — ungenutzt, auskommentiert in `src/pages/api/search/index.json.ts:51-52` | Recon |
| Meta-Description | `src/pages/wort/[...wordSlug].astro:93-102`, hardcodierter Suffix „Mit Etymologie, Aussprache und Beispielsätzen." | Recon |
| Examples-Feld | `wordProps.examples` (`WordPropertiesExamples`: `example`, `exampleExplanation`, `exampleAudio`); Conditional-Pattern existiert: `src/components/word/WordSectionBeispiele.astro:14` | `src/services/fragments/fragments.ts:75-83` |
| Audio-Feld | `wordProperties.berlinerischAudio` existiert im Fragment | `fragments.ts:93-142` |
| H1-Bug | `src/components/word/WordHero.astro:30-33` — Whitespace zwischen `</dfn>` und `<span>, {article}</span>` erzeugt „Tankstelle , die" | Recon |
| JSON-LD Wortseite | `schemaJson()` in `src/pages/wort/[...wordSlug].astro:154-217`: DefinedTerm (161), Comment via `exampleComments` (146-152, angehängt 163), speakable (177-180), DefinedTermSet (192-199) | Recon |
| JSON-LD Homepage | `websiteSchema` (index.astro:15-30), `organizationSchema` (32-52), Logo = SVG (41-44). PNG existiert: `/favicons/apple-touch-icon-180x180.png` | Recon |
| Kontrast | `GameCtaCard.astro:16` → `.c-fact-card__link`, Style `src/styles/components/_fact-card.scss:45-61`, `background: var(--orange-500)` (#cf5736, Zeile 51). `--orange-600` = #b23b27 existiert (`src/styles/variables/_colors.scss:37`) | Recon |
| CLS-Selektoren | `.o-index__image`: `src/styles/objects/_index.scss:41-49` (+ wrap 24-39); `.c-word-search-link`: `src/styles/components/_word-search-link.scss:4-36`. Markup: `index.astro:109-112`, `WordSearchLink.vue:2` | Recon |
| Homepage-Islands | `WordSearchLink client:load` (index.astro:122); `WordFilter client:only="vue"` + `WordSearchList client:only="vue"` (`src/components/word-search/WordSearch.astro:15,17`); `WordOfTheDay client:only='vue'` mit leerem fallback-Slot (index.astro:136-138) | Recon |
| Statische Seiten | WP-Seiten via `src/pages/[legalPages].astro` (Slugs Zeile 13); kein Standalone-Content-Page-Beispiel außer 404 | Recon |
| Wort-Liste statisch | `/wort`-Index rendert alle 946 Links serverseitig via `fetchAllWordsLinks()` (`src/pages/wort/index.astro:16`) | Recon |
| Tests | Vorlagen: `WordSectionGrammatik.test.ts` (Astro-Komponente rendern), `version.test.ts` (getStaticPaths aufrufen), `getSitemapWordDates.test.ts`. **Kein** Test für JSON-LD/Meta-Tags/sitemap-serialize — net-new | `src/tests/unit/` |

**Anti-Patterns (verifiziert NICHT vorhanden — nicht erfinden):**
- Kein `beasties`/`critters` direkt in config — Optionen müssten an `@playform/inline` `.default({...})` gehen (API vorher in node_modules/Docs prüfen!)
- Kein `src/pages/llms.txt.ts` — llms.txt ist statisch
- Sitemap: KEIN `changefreq`/`priority` hinzufügen (Google ignoriert beides; Audit bestätigt korrekt weggelassen)
- `@stores/index`-Barrel NICHT importieren (Side-Effect triggert Suchindex-Fetch — CLAUDE.md)

---

## Phase 1: Template-Quickfixes (4 unabhängige Mini-Tasks, je 1 Commit)

### 1a. H1-Leerzeichen-Bug
- `src/components/word/WordHero.astro:30-33`: Whitespace zwischen `</dfn>` und `<span …>, {article}</span>` eliminieren — Elemente auf eine Zeile ziehen oder `{...}`-Expression-Join nutzen. Ziel-Rendering: `Tankstelle, die`.
- **Verify:** `pnpm vitest run src/tests/unit/components/word/WordHero.test.ts` + neue Assertion: gerendertes HTML matcht `/<\/dfn><span/` bzw. Text enthält kein `" ,"`.

### 1b. Kontrast-Fix Game-CTA
- `src/styles/components/_fact-card.scss:51`: `var(--orange-500)` → `var(--orange-600)`. Hover (Zeile 59) eine Stufe dunkler oder Unterstreichung.
- #b23b27 vs. Weiß ≈ 5:1 → AA-konform. KEINEN neuen Farbwert erfinden — Token existiert.
- **Verify:** visuell (`pnpm dev`), danach Lighthouse-A11y-Check auf Homepage (Ziel: color-contrast-Audit besteht).

### 1c. JSON-LD-Fixes Wortseite + Homepage
Referenz mit fertigen Snippets: `berliner-schnauze.wtf-audit/findings/schema.md`.
- `src/pages/wort/[...wordSlug].astro`, `schemaJson()` (154-217):
  1. `speakable` (177-180) vom DefinedTerm auf einen neuen `WebPage`-Node verschieben (`@graph` oder separates Objekt; `@id` = Seiten-URL).
  2. `comment` (163) → `workExample` umbenennen (Comment-Nodes können bleiben, Property-Name ist das Domain-Problem).
- `src/pages/index.astro:41-44`: Logo-`ImageObject` auf `${SITE_URL}/favicons/apple-touch-icon-180x180.png` mit `width: 180, height: 180`.
- **Verify:** `pnpm build:local`, dann JSON-LD aus dist extrahieren (`grep -o 'application/ld+json.*' dist/wort/aasen/index.html`) und mit https://validator.schema.org gegenprüfen. Neuer Unit-Test: `schemaJson`-Output parsen, assert `speakable` NICHT auf DefinedTerm, `workExample` statt `comment`.

### 1d. Konditionale Meta-Description
- `src/pages/wort/[...wordSlug].astro:93-102`: Suffix dynamisch bauen:
  - Basis: `${berlinerisch} heißt auf Berlinerisch: ${translations}.`
  - `Mit Etymologie` immer (Sektion existiert immer? prüfen — sonst ebenfalls konditional)
  - `, Aussprache` nur wenn `wordProps.berlinerischAudio` vorhanden
  - ` und Beispielsätzen` nur wenn `(wordProps.examples ?? []).some(e => e?.example)` — Guard-Pattern von `WordSectionBeispiele.astro:14` kopieren
- Gleiche Logik gilt für JSON-LD-`description` (166-171) — eine gemeinsame Variable nutzen.
- **Verify:** Unit-Test mit 3 Fixtures (mit/ohne examples, mit/ohne Audio); `pnpm build:local` + Stichprobe `dist/wort/antalpschen/index.html` (Description ohne „Beispielsätzen").

---

## Phase 2: Caching + Sitemap-lastmod

### 2a. Cache-Header (`public/_headers`)
Cloudflare-Pages-Headers-Syntax (Doku: developers.cloudflare.com/pages/configuration/headers/). An bestehende Datei anhängen:
```
/_astro/*
  Cache-Control: public, max-age=31536000, immutable

/api/search/index.json
  Cache-Control: public, max-age=3600, stale-while-revalidate=86400

/api/search/meta.json
  Cache-Control: public, max-age=3600, stale-while-revalidate=86400
```
- Content-Hashing der Suchindex-URL bewusst NICHT machen (3 Code-Literale + SW-Regex, hoher Aufwand — Audit-Empfehlung war „oder SWR", wir nehmen SWR). SW-seitig cached Workbox bereits StaleWhileRevalidate 3h — HTTP-Header decken Erstbesuch/No-SW ab.
- **Verify:** nach Deploy `curl -sI https://berliner-schnauze.wtf/_astro/<asset> | grep -i cache-control` → `immutable`; gleiches für `/api/search/index.json` → `stale-while-revalidate`.

### 2b. Sitemap-lastmod für Themen + statische Seiten
- `astro.config.mjs`, bestehende `serialize`-Funktion erweitern (Pattern KOPIEREN, nicht umbauen):
  1. `/themen/<slug>`: lastmod = max(`modifiedGmt`) aller Wörter des Themas. Neue Query-Funktion analog `getSitemapWordDates.ts` (Cache-Pattern Zeilen 48-57 kopieren) — Wörter mit `berlinerischThemen`-Zuordnung sind via `fetchAllWords()`-Daten verfügbar; alternativ leichte GraphQL-Query `slug + modifiedGmt + berlinerischThemen`.
  2. Statische Seiten (Homepage, /wort, /impressum, …): lastmod = Build-Zeitpunkt ist FALSCH (täglich neue lastmod ohne Inhaltsänderung = Vertrauensverlust bei Google). Stattdessen: nur Themen-Seiten fixen, statische Seiten ohne lastmod lassen (Audit-Priorität war „Themen zuerst, Rest Low").
- **Anti-Pattern:** kein `changefreq`/`priority` hinzufügen.
- **Verify:** `pnpm build:local`, dann `grep -A2 'themen/alkohol-kneipe' dist/sitemap-0.xml` → `<lastmod>` vorhanden, ISO-Format. Test analog `getSitemapWordDates.test.ts` für neue Query-Funktion.

---

## Phase 3: Cold-Load-CLS-Fix (0,33 → <0,1)

**Befund:** Inline-Critical-CSS (`@playform/inline`, ohne Optionen) enthält Sizing für `.o-index__image` und `.c-word-search-link` nicht → volles Stylesheet bei ~600ms verschiebt Layout (Bild 372×214→238×137, Button 39→66px). Nur Erstbesuch (SW-Cache macht Folgebesuche sauber). `font-display` NICHT anfassen (dokumentierter Trade-off, Anteil nur 0,03).

**Umsetzung (deterministisch, nicht beasties-Tuning):**
1. Layout-kritische Dimensionen der beiden Elemente in ein kleines `<style is:global>` direkt in `src/pages/index.astro` (Head) legen ODER als Inline-Styles auf die Elemente (`index.astro:109-112` Bild-Wrap, `WordSearchLink.vue:2`/`WordSearchLink.astro:6` Button). Benötigt: finale Breite/Höhe bzw. `aspect-ratio` + `max-width` fürs Bild, `min-height`/Padding für den Button — Werte aus `src/styles/objects/_index.scss:24-49` und `src/styles/components/_word-search-link.scss:4-36` ableiten (die `fluid()`-Berechnung ggf. als statisches `clamp()` duplizieren, mit Kommentar auf die SCSS-Quelle).
2. Alternative zuerst prüfen (15 min timebox): `@playform/inline`-Optionen in `node_modules/@playform/inline/Target/Interface/` — falls beasties-`allowRules`/`additionalStylesheets`-äquivalent existiert, ist Config-Weg sauberer. Nichts erfinden: nur dokumentierte Optionen verwenden.
- **Verify:** Repro-Skript aus Audit: Chrome DevTools MCP, frischer isolierter Context (kein SW), mobile Viewport 412×915@2.625, Fast 4G, 4× CPU, `PerformanceObserver({type:'layout-shift',buffered:true})` → Gesamt-CLS < 0,1. Genaue Methode: `berliner-schnauze.wtf-audit/findings/visual.md`. Gegen Preview-Build (`pnpm build:local && pnpm server:preview`) testen.

---

## Phase 4: `/llms-full.txt`

- Neue Route `src/pages/llms-full.txt.ts` — Pattern von `src/pages/api/search/index.json.ts` KOPIEREN (`export const GET: APIRoute`, `fetchAllWords()` aus `@services/api`):
  - Markdown-Ausgabe: Kopf aus `public/llms.txt` übernehmen, danach pro Wort ein kompakter Block: `## <berlinerisch>` + Bedeutung (translations), Beispiel (falls `examples[].example`), URL `https://berliner-schnauze.wtf/wort/<slug>`.
  - `Response` mit `Content-Type: text/plain; charset=utf-8`.
- `public/llms.txt` um Verweis auf `/llms-full.txt` ergänzen.
- **Anti-Pattern:** kein `Astro.request`-Runtime-Zugriff — Route ist SSG, alles zur Buildzeit.
- **Verify:** `pnpm build:local` → `dist/llms-full.txt` existiert, enthält 900+ `## `-Einträge (`grep -c '^## ' dist/llms-full.txt`), Stichprobe `aasen` mit Bedeutung. Unit-Test analog `index.json.test.ts` für die Formatierungsfunktion.

---

## Phase 5: Wortart-Korrektheit (kuratierte WP-Typen bevorzugen)

**Befund:** `aasen` (Verb) + `pfannkuchen` (Nomen) live als „Adjektiv" — NLP-Ableitung (`compromise`) fehlerhaft. WP liefert bereits manuell kuratierte `berlinerischWordTypes.nodes.name`, ungenutzt (auskommentiert `src/pages/api/search/index.json.ts:51-52`).

- Konsumstellen umstellen auf: kuratierte Typen wenn vorhanden, sonst NLP-Fallback:
  1. `src/pages/wort/[...wordSlug].astro:111` (`wordTags`) + `wortartLabel` (122-123) — Label „(NLP-Analyse)" in `src/components/word/WordSectionGrammatik.astro:20` nur noch zeigen, wenn tatsächlich NLP-Fallback griff.
  2. `src/pages/api/search/index.json.ts:61` + `meta.json.ts:41` (gleiches Prefer-Muster; auskommentierte Zeile 51-52 reaktivieren als Quelle).
- Helper `getEffectiveWordTypes(word)` in `src/utils/wordHelper.ts` neben `getWordType` (Zeile 67) — beide Konsumpfade nutzen ihn.
- **Verify:** bestehende Tests `getWordType.test.ts`/`translateNlpTags.test.ts` bleiben grün; neuer Test für Prefer-Logik (kuratiert vorhanden → kuratiert; leer → NLP). Nach Deploy: `/wort/aasen` zeigt „Verb", `/wort/pfannkuchen` „Nomen" — SOFERN die WP-Taxonomie dort gepflegt ist. Falls nicht: Ausgabe an Felix, welche Wörter in WP kuratiert werden müssen (Liste generierbar: Wörter ohne `berlinerischWordTypes`).

---

## Phase 6: Statischer Fallback für Homepage-Suche + Wort des Tages

**Befund (SXO-Critical):** `WordFilter`/`WordSearchList` sind `client:only="vue"` (`WordSearch.astro:15,17`) → serverseitig leere Divs. `WordOfTheDay client:only` mit leerem Fallback-Slot (`index.astro:136-138`).

**Umsetzung (Fallback-Content, KEINE Hydration-Umstellung):**
- `client:only` NICHT auf `client:load` umstellen — Komponenten hängen an Browser-APIs/Stores (Barrel-Side-Effects, `computedAsync`); SSR-Umbau wäre riskant. Stattdessen Astro-natives Muster: statisches Server-HTML im gleichen `<section>`, das beim Mount ausgeblendet wird.
- In `src/components/word-search/WordSearch.astro`:
  1. Statische Liste server-rendern — Pattern von `src/pages/wort/index.astro:16` KOPIEREN (`fetchAllWordsLinks()`): z. B. alphabetische Linkliste (alle 946 Links sind auf /wort schon precedent — hier reicht ggf. gekürzte Liste + prominenter Link „Alle Wörter → /wort").
  2. Markup: `<div class="c-filter-search__fallback js-search-fallback">…</div>` neben den Islands.
  3. Ausblenden bei Hydration: kleines Inline-Script oder CSS-Regel, die den Fallback versteckt sobald die Island gemountet ist (z. B. WordSearchList emittet nach Mount eine Klasse auf `#wordListing`; einfachste Variante: `onMounted` in `WordSearchList.vue` → `document.getElementById('wordListing')?.classList.add('is-hydrated')` + CSS `.is-hydrated .js-search-fallback { display:none }`). `astro:page-load`-Gotcha beachten (CLAUDE.md): kein einmaliges `<script>` für wiederkehrende Logik.
  4. CLS-Guard: Fallback und hydratisierte Liste dürfen nicht nacheinander beide sichtbar Höhe beanspruchen — Fallback im selben Grid-Slot, `min-height` konsistent.
- `WordOfTheDay`-Fallback-Slot (`index.astro:137`): statt leerem Div statischer Teaser („Wort des Tages" + Link auf `/wort`) — Slot-Inhalt wird von Astro serverseitig gerendert und beim Mount ersetzt (dokumentiertes `client:only`-Fallback-Verhalten, Astro-Docs „slot=fallback").
- **Verify:** `pnpm build:local`; `curl -s http://localhost:<port>/ | grep -c 'wort/'` → deutlich >0 Wortlinks im Raw-HTML; Browser-Test mit deaktiviertem JS (DevTools) → Liste sichtbar; mit JS → kein Doppel-Rendering, kein Layout-Sprung (CLS-Messung aus Phase 3 wiederholen). Snapshot-/Container-Test für `WordSearch.astro` (Pattern: `createAstroRender`-Helper, 30s-Timeout in `beforeAll` — Testing-Konventionen CLAUDE.md).

---

## Phase 7: Neue Seiten — `/ueber` + „Was bedeutet Berliner Schnauze?"

**Inhalt kommt von Felix (Redaktion). Code scaffolds nur.** Zwei Varianten (Entscheidung Felix):
- **(a) WordPress-Seiten** (wie Impressum): Slug in `src/pages/[legalPages].astro:13` ergänzen (`"ueber"`, `"berliner-schnauze"` o. ä.) — Voraussetzung: Seiten in WP angelegt. Route-Umbenennung erwägen (Datei heißt `[legalPages]` — semantisch dann falsch, ggf. `[wpPages].astro`).
- **(b) Standalone-Astro-Seiten**: `src/pages/ueber.astro` mit `Layout` + `seoData()` (`src/utils/helpers.ts:34-46`) — Pattern von `index.astro`-Head übernehmen. Kein Precedent für hardcodierte Content-Seite — bei (b) neuen Precedent sauber setzen.
- Brand-Phrase-Seite zusätzlich: interner Link von Homepage (z. B. FactCard) + `Organization`-Schema `sameAs`/`about`-Verknüpfung; `speakable`+`WebPage`-Schema wie in Phase 1c-Muster.
- Sitemap nimmt neue Routen automatisch auf (filter in `astro.config.mjs` prüfen — nicht ausgeschlossen).
- **Verify:** Build enthält `dist/ueber/index.html`; Seite in `dist/sitemap-0.xml`; Meta-Title/Description gesetzt; interner Link von Homepage vorhanden.

---

## Phase 8: Verifikation (Abschluss)

1. `pnpm lint && pnpm test:unit` grün; `pnpm typechecking` gezielt auf geänderte Dateien.
2. `pnpm build:local` erfolgreich; Stichproben in `dist/`: JSON-LD valide, Description konditional, sitemap-lastmod, llms-full.txt, statischer Fallback im Homepage-HTML.
3. Anti-Pattern-Greps:
   - `grep -rn "changefreq\|priority" astro.config.mjs` → leer
   - `grep -rn "from \"@stores/index\"" src/components src/pages` → keine neuen Treffer
   - `grep -rn "client:load" src/components/word-search/` → leer (client:only unangetastet)
4. Lighthouse + CLS-Repro (Methode aus `findings/visual.md`) gegen Preview: CLS < 0,1, A11y-Kontrast-Audit grün, SEO 100 gehalten.
5. Nach Produktions-Deploy: `curl -sI` Cache-Header-Checks (Phase 2a); Drift-Baseline setzen: `python3 <seo-plugin>/scripts/drift_baseline.py https://berliner-schnauze.wtf/`.

---

## Offene Punkte für Felix (keine Code-Tasks)

- WP-Taxonomie `berlinerischWordTypes` pflegen (Phase 5 wirkt nur, wo kuratiert)
- Redaktioneller Backlog aus Audit: Beispielsätze für ~60 % der Einträge, Ein-Wort-Definitionen anreichern (`antalpschen`, `pilsette`, …), Themen-Introtexte, Etymologie-Quellen (Duden/DWDS)
- Produktentscheidung „Übersetzer"-Framing vs. Freitext-Feature (SXO-Finding)
- Google-API-Key + GSC einrichten (CrUX-Felddaten, Monitoring) — Anleitung: seo-google-Skill
- Optional: Moz-/Bing-Keys für Backlink-Tracking
