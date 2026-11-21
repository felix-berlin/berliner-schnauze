# Startseite v20 „Berliner Wörterbuch“: Umsetzungsdesign

Stand 21.11.2026. Status: freigegeben vom Nutzer. Grundlage: Handoff `startseite-v20-handoff.zip` (`SPEC.md` ist verbindlich; Referenz `design/HomeV20.dc.html`, Zustände `design/HomeStates20.dc.html`, Sichtvergleich `assets/v20/*.jpg`). Dieses Dokument legt fest, **wie** wir es im Repo umsetzen, und hält die Entscheidungen fest, die der Handoff offen lässt. Was die Seite zeigt, steht im Handoff und wird hier nicht wiederholt. Der Handoff wird in Scheibe 1 nach `docs/design/startseite-v20/` entpackt und committet (Mock, Fonts, Punktraster, JPGs; `ds/` nur als Referenz für die Tokens). Die ZIP-Datei bleibt untracked und wird nicht committet.

## Warum

Die Startseite soll drei Dinge klarmachen: Was ist das (H1 + Erklärsatz), was kann ich tun (Wort des Tages anhören, suchen), warum wiederkommen (Umfrage, Spiel, Neu/Beliebt, Karte). Dazu rund 1.000 Wörter Fließtext, FAQ und Arbeitsweise für Google und KI-Suche. v20 **ersetzt v5 komplett**. Spätere Arbeiten (Wortseite, weitere Seiten) bauen auf den neuen Tokens und den geteilten Komponenten auf.

## Ziele

- Startseite nach SPEC §2 (11 Abschnitte), Dark und Light, drei Breakpoints (<808, 808–999, ≥1000), alle Leer- und Grenzfälle (§13, §19).
- **Neue Tokens im Design System** (`website/tokens/*.json` → generierte SCSS), nicht seitenlokal: Palette v13 (`--page`, `--card`, `--card2`, `--card3`, `--t3`, `--line`), Datenfarben (`--d-bl`, `--d-ye`, `--d-gr`, `--ok`), Bänder, Fira Sans Extra Condensed. `--t3` Light = `#535e69`, gilt auch für die Wortseite.
- Daten kommen vom Server, nichts wird im Browser erzeugt, was das Backend liefern kann.
- Geteilte Komponenten für die Wortseite: `WordSeal.vue`, `HomePoll.vue`.
- Kalle über die vorhandene `BerlinerBaer.vue` (Variante `plain`, Pose `zeigen`).

## Nicht-Ziele

- **Header und Footer bleiben unberührt.**
- Kein Redesign der Suchseite `/suche`. Sie existiert bereits (Slice 1), `/?q=` leitet dorthin um.
- Keine Ortsteile (SPEC §20.7), keine neue Umfrage-Erhebung.
- Kein Umbau der Wortseite über `--t3` und die Übernahme von `WordSeal`/`HomePoll` hinaus (die Übernahme selbst ist ein späterer Auftrag).
- Keine Änderung an Kalles Komponente oder Generator.

## Anti-Ziele

- Echte Namen, Kommentare, Stimmen oder Vorschlagstexte aus der Produktions-DB in Tests, Fixtures, Screenshots, Doku.
- Einzelstimmen, Zeitstempel oder Bezirk×Altersgruppe-Zellen unter 10 Stimmen im Ausgang oder im Such-Index.
- Emojis, Fraktur (`--font-display`), Radius über 4px (Ausnahmen SPEC §4.6), Text unter 13px, Orange für Daten.
- Live-Seite als Mix aus alt und neu: die neue Startseite ersetzt die alte in einem Schritt (Branch), die Scheiben sind Arbeitspakete, keine einzeln ausgelieferten Zwischenstände.

## Randbedingungen

- Astro (SSR, `output: "server"`) + Vue-Inseln, SCSS-Komponenten mit `mx.component(...)`, Tests in Vitest und Playwright, Regeln aus `website/CLAUDE.md`, `payload/CLAUDE.md` und `.claude/rules/` (Styles, Tests, Payload-Migrationen).
- Payload-Schemaänderungen nur additiv (Expand/Contract, siehe `payload/CLAUDE.md`): `cms` wird vor `web` ausgerollt.
- Keine Secrets in Dateien. Dev-DB stammt aus einem Prod-Backup und enthält personenbezogene Daten.
- Offene Punkte aus SPEC §20 nicht selbst entscheiden, außer wo dieses Dokument es festlegt. Zwischenlösungen mit `TODO(startseite):`.

## Ansätze

| | Ansatz | Trade-off |
|---|---|---|
| **A (gewählt)** | Ein serverseitiger Home-Datensatz (Payload-Felder + Berechnung im Backend + `/api/home-stats`), Abschnitte in Scheiben | Größerer Server-Anteil vorab; dafür kein CLS, alles im HTML, Datenschutz an einer Stelle |
| B | Jeder Abschnitt holt seine Daten im Browser | Schneller gebaut, aber Karte/Listen fehlen im ersten HTML; widerspricht SPEC §19 und „nicht im Frontend erzeugen“ |
| C | Erst Oberfläche mit Mock-Daten, dann Backend | Zeigt früh etwas, Datenformen ändern sich später, doppelte Arbeit |

Gewählt: **A**, vom Nutzer bestätigt.

## Entscheidungen des Nutzers

- **Altersgruppen** im Ergebnis-Band: unter 30 / 30–49 / 50–69 / 70+, im Backend aus den 8 gespeicherten Stufen (`u20`, `20-29`, … `80plus`) zusammengezählt. Das Mock und alle Beschriftungen/`aria-label` bekommen diese Gruppen. `MIN_GROUP = 10` je Gruppe.
- **Suche:** Das Formular der Startseite sendet per GET an `/suche?q=…`. Die Inline-Vorschlagsliste (SPEC §8) ersetzt das Such-Modal auf der Startseite (löst §20.6). Enter ohne Auswahl → `/suche?q=`. Die Umleitung von `/?q=` und die `/suche`-Seite sind schon da (Commits `9a68cb11`…`8ca62431`), dort wird nichts mehr umgestellt außer Tests, die noch auf `/` zeigen.
- **Lautschrift:** Payload-Feld `ipa` an `Words` (gepflegt, nicht generiert). Fehlt es, entfällt die Kontur (SPEC §13).
- **Morse:** wird im Backend berechnet und mit dem Wort des Tages ausgeliefert (Zeichenfolge Punkt/Strich plus fertige Ring-Positionen).
- **Tokens:** im Design System, nicht seitenlokal (weicht vom `PROMPT.md` ab, das `TODO(startseite)` seitenlokal vorsieht).

## Wie es gebaut wird (Architektur)

### Payload (`payload/`)

Alles additiv. Migrationen nach `.claude/rules/` für Payload.

| Was | Wo | Hinweis |
|---|---|---|
| `ipa` (text) | `Words` | optional; Anzeige in eckigen Klammern im Frontend |
| `typischerSatz` (text) | `Themen` | optional; fehlt er, entfällt die Sprechblase |
| `teaserZitat`, `teaserIpa` (text) | `Posts` | optional; Zwischenlösung wenn leer: erster Pull-Quote bzw. Abschnitt entfällt (`TODO(startseite)`) |
| `intro`, Probier-Wörter (4, Relationship), Stöber-Links, Wissens-Text (richText), Lautregeln (6, array), FAQ (array: Frage, Antwort), Über-Satz | Global `home` (bestehend, Label „Startseite“) | Das heutige Feld `facts` bleibt bis zum Umschalten und wird danach entfernt (Contract-Schritt, eigener Auftrag) |
| Aggregate | neues Modul in `payload/src/lib/` (z. B. `homeStats.ts`, exportiert über `payload-app/…` wie `word-stats`) | reine Funktionen + ein Loader; getestet ohne DB |

**Im Modul berechnet** (nichts davon im Browser):
- **Morse-Ring:** Tabelle A–Z, Ä Ö Ü ß; Ring-Positionen wie SPEC §5.1; Länge begrenzt (siehe „Dem Builder überlassen“, Vorschlag ≤ 28 Zeichen ab Wortanfang). Rückgabe: `[{ sym: "d"|"l", left, top, rotate }]` plus Anzahl, damit die Wiedergabe-Kopplung `dauer / anzahl` einfach bleibt.
- **Bezirksband:** je Bezirk Anteil „say“ in `word-feedback` (`usage = say`) nach `area`, Gruppen < `MIN_GROUP` ohne Wert; Bezirke aus `AREAS` (die 12 Bezirke, ohne `brandenburg`/`elsewhere`); „Typisches Wort“ je Bezirk = Wort mit dem größten Abstand über dem Berliner Schnitt, Mindestzahl Stimmen je Bezirk×Wort = `MIN_GROUP`.
- **Altersprofil:** 4 Gruppen (s. o.), je Wort Anteile; Auswahl „Stirbt langsam aus“ = höchster Anteil 70+, „Lebt und wächst“ = höchster Anteil unter 30. Mindeststimmen je Wort gesamt: `MIN_WORD_VOTES` (Zwischenlösung, siehe unten).
- **Beliebt / Aufwind:** wiederverwendet `trending(...)` aus `word-stats` (Aufrufe 7 Tage, Vorwoche als Vergleich); der Anteil „Sag ick selbst“ je Wort kommt dazu.
- **Wort des Tages, Umfrage-Wort, Spielkarte der Woche:** tägliche Wahl in Europe/Berlin (`berlinDay`), wiederverwendet `pickWordOfTheDay` und die BON-Statistik.

Datenschutz: nur Aggregate, keine Zeitstempel, keine IDs, nichts im Such-Index. Rückgabe hat feste Form, damit kein Rohfeld durchrutscht.

### Website (`website/`)

- **Service** `services/payload/home.ts` (neben `site.ts`): `fetchHome()` bündelt Global, Wort des Tages, Neu, Themen, Magazin, Mitmachen-Zahlen; mit `ttl()` aus `services/cache.ts`. Ergebnis-Band, Beliebt/Aufwind kommen aus `GET /api/home-stats` (täglich bzw. stündlich gecacht, `setPageCache`).
- **Seite** `pages/index.astro` ersetzt die alte Startseite; ein SSR-Aufruf, alle Abschnitte im ersten HTML (Karte, Altersprofil, beide Reiter-Panels, `<details>` offen im DOM).
- **Komponenten** nach SPEC §18 (Namen und Hydration wie dort); Styles als SCSS-Komponenten (`styles/components/…`, `mx.component(...)`), BEM, keine Scoped Styles (Projektregel hat Vorrang vor SPEC §18 Satz 2).
- **Geteilt:** `WordSeal.vue` und `HomePoll.vue` leben in `components/` (nicht unter `home/`), damit die Wortseite sie später ohne Verschieben nutzt. `HomePoll` nutzt den bestehenden `word-feedback`-Endpunkt (`usage`).
- **Tokens/Schrift:** Palette, Datenfarben, Bänder in `website/tokens/*.json` (Light/Dark), Generator erzeugt `_tokens.generated.scss`. Fira Sans Extra Condensed 600/800 und latin-ext 800 (mit `unicode-range: U+0100-02AF`) aus `assets/fonts/` nach `website/public/fonts/` bzw. dem vorhandenen Font-Weg, `font-display: swap`, Metriken-Fallback gegen CLS.
- **Bewegung:** IntersectionObserver (einmalig, `threshold .2`), `prefers-reduced-motion` (SPEC §16); nur `transform`/`opacity`/`clip-path`; Karte als ein Inline-SVG.
- **SEO:** SPEC §14 (Title, Description mit Live-Zahl, genau eine H1, JSON-LD `WebSite`, `FAQPage`, `DefinedTerm`; `llms.txt` um Startseitentext ergänzen).

### Scheiben (Arbeitspakete)

1. **Fundament:** Tokens, Fonts, Payload-Felder + Migration, `homeStats`-Modul mit Tests, `fetchHome`, `/api/home-stats`.
2. **Bühne:** Intro, Wort des Tages, `WordSeal`, IPA-Kontur, Suche (Inline-Liste, `/`-Taste), Chips.
3. **Mitmachen-Bereiche:** Mitforschen (`HomePoll`), Themen-Register, Spiel-Band, „Frisch uff’m Tisch“.
4. **Ergebnis-Band:** Reiter, `DotMap`, `AgeDots`, `MIN_GROUP`-Fälle.
5. **Text und Rest:** Wissen + Lautregeln, FAQ + Über, Magazin, Mitmachen (Kalle), Mitnehmen (App/Anki), SEO, Playwright-Screenshots, axe, Lighthouse.

Jede Scheibe endet mit grünem Lint/Typecheck/Tests; ausgeliefert wird erst nach Scheibe 5.

## Zwischenlösungen für offene Punkte (SPEC §20)

| # | Punkt | Festlegung hier |
|---|---|---|
| 1 | Morse bei langen Wörtern | Vorschlag der SPEC: nur so viele Buchstaben, wie unter 28 Zeichen passen, ab Wortanfang. `TODO(startseite)` |
| 2 | „Beliebt“ / „Im Aufwind“ | Definition wie SPEC §10 (Aufrufe 7 Tage; Zuwachs gegenüber Vorwoche). `TODO(startseite)` bestätigen |
| 3 | Mindeststimmen Altersliste, Erhebung | Erhebung existiert (`area`, `age`). `MIN_GROUP = 10` je Gruppe; `MIN_WORD_VOTES = 30` je Wort für die Altersliste als Zwischenwert. `TODO(startseite)` |
| 4 | `typischerSatz`, `teaserZitat`, `teaserIpa` | Als Felder angelegt (s. o), Zwischenlösung wenn leer: s. Tabelle |
| 5 | „Die Übersicht rechts“ | Neutral: „Die Übersicht zeigt …“ |
| 6 | Such-Modal vs. Inline | Inline-Liste, Enter → `/suche` |
| 7 | Ortsteile | zurückgestellt |

## Tests

Wie SPEC §21, Fixtures nur mit ausgedachten Daten. Vitest: Morse (KIEZ = 10 Zeichen, SCHRIPPE = 25, Umlaute), Punkt-Radius/Opazität, `MIN_GROUP`, Altersgruppen-Zusammenfassung und `round(anteil/10)`, relative Zeit, Aggregat-Ausgabe enthält keine Rohfelder. Playwright: Screenshots 390/834/1280 × Dark/Light, Tastatur, Umfrage, Spiel, `<details>`, `reducedMotion`, genau eine H1, kein Text < 13px. Bestehende Such-Specs, die noch auf `/` zeigen, werden auf `/suche` gezogen.

## Texte

Entscheidung des Nutzers: Die Texte aus dem Mock (Wissens-Artikel, 6 FAQ, 6 Lautregeln, Intro, Über-Satz, 4 Probier-Wörter) werden per **Seed-Skript** in das Global `home` geschrieben (Rich Text über den vorhandenen `htmlToLexical`-Helfer), danach im CMS pflegbar. Das Skript ist idempotent und überschreibt keine bereits gefüllten Felder. Gehört in Scheibe 5.

## Festlegungen des Autors (Gegenleser-Fragen, bitte gegenlesen)

- **Umfrage-Wort:** eigene deterministische Tageswahl (Europe/Berlin), schließt das Wort des Tages aus. Bereits abgestimmte Wörter werden nicht serverseitig gefiltert (Stimme pro Gerät liegt im Browser); `HomePoll` zeigt dann direkt das Ergebnis.
- **Spielkarte:** die in der BON-Statistik der letzten 7 Tage am häufigsten falsch beantwortete Karte, täglich gecacht; ohne Daten: Stapel ohne Probe (SPEC §13).
- **Welche Stimmen zählen:** nur `word-feedback`-Zeilen mit gesetztem `usage`; Bezirkswerte nur für die 12 Berliner `AREAS`; „Berliner Schnitt“ über dieselben 12. Doppelstimmen sind durch den Unique-Index (`word`, `visitor`) ausgeschlossen.
- **Kennzahlen und Intro-Zahl:** live berechnet (Wörter, Themen, Hörproben, Stimmen), keine Overrides. Das Feld `facts` bleibt bis zum Umschalten, danach Contract-Schritt.

## Dem Builder überlassen

Genaue SCSS-Struktur und Dateinamen, Mapping der Handoff-Klassen (`h18__…`) auf BEM, Cache-Schlüssel und TTL im Detail, Form der Migration, Wahl der Bildschirmgrößen für Screenshots.
