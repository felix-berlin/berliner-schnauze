# Startseite v5 „farbig“ mit Kalle: Umsetzungsdesign

Stand 18.11.2026. Grundlage: Handoff `startseite-handoff-v5.zip` (`SPEC.md` §22 ist verbindlich, §21 und davor nur, wo §22 nichts sagt; Referenz `design/HomeKalle3.dc.html`, Sichtvergleich `assets/v5/*.jpg`). Dieses Dokument legt fest, **wie** wir es im Repo umsetzen. Was die Seite zeigt, steht im Handoff und wird hier nicht wiederholt.

## Warum

Die heutige Startseite wirkt monoton: Seite, Karten und Bänder haben fast dieselbe Fläche, dazu über 20 gleiche gestrichelte Kästen. v5 trennt drei Flächen-Ebenen, wechselt die Bänder farbig, nimmt Rahmen und Punkte zurück und gibt der Seite mit Kalle einen Charakter.

## Ziele

- Neue Startseite nach SPEC §22 (11 Abschnitte, Reihenfolge §22.1), in Light und Dark, mit allen Zuständen (auch leere Daten).
- Kalle (bereits übernommen: `components/kalle/BerlinerBaer.vue`) an den drei Orten aus §22.4.
- Die bisherige Suche (Liste, Filter, Modal) zieht unverändert nach `/suche`.
- Die Live-Seite bleibt bis zum Umschalten unverändert.

## Nicht-Ziele

- **Header und Footer bleiben unberührt**, auch die Header-/Footer-Entwürfe im Handoff werden nicht umgesetzt.
- **Kein Redesign der Suchseite.** `/suche` ist die verschobene Liste, nichts weiter (die Filter nach Thema und Wortart aus §22.10 sind die vorhandenen Filter).
- Keine Änderungen an Kalles Komponente oder Generator (Fixes gehören in `docs/design/kalle/tools`).
- Kein Umbau des Design-Systems über die Tokens aus §22.2 hinaus (und Anpassungen, die die Seite braucht).

## Anti-Ziele (wäre ein Fehlschlag, auch wenn es technisch läuft)

- Live-Startseite ist zwischenzeitlich ein Mix aus altem und neuem Design.
- Text unter 13 px, Fraktur außerhalb von H1 und h2-Bändern, mehr als eine gerasterte Zahl, Radius über 4 px, gestrichelte Karten (§22.3).
- Kalle auf Ink, Aubergine oder Orange ohne helle Kontur.
- Echte Namen, Kommentare oder Vorschlagstexte aus der Produktions-DB in Tests, Fixtures oder Screenshots.

## Randbedingungen

- Astro (SSR, `output: "server"`) + Vue-Inseln, SCSS-Komponenten mit `mx.component(...)`, Tests in Vitest (`website/src/tests/unit`), Regeln aus `website/CLAUDE.md` und `.claude/rules/` (Styles, Tests).
- Bänder bekommen `data-theme="dark"`, dadurch schalten Textfarben, Karten und Kalles Kontur um (§22.2).
- Kalle-Hover/Klick und `tippen()`: `client:visible` nur dort, wo er reagieren soll (§22.4); sonst SSR.
- `prefers-reduced-motion`: Mitteilung im Handy-Mock, Kartenstapel, Kalle (§22.11, §17).
- Offene Punkte des Handoffs (`TODO(startseite):`, SPEC §16) nicht selbst entscheiden: Zwischenlösung wie genannt setzen und markieren.

## Ansätze

|                 | Ansatz                                                              | Trade-off                                                                                    |
| --------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| A               | Alles in einem Zug auf `/`                                          | Ein riesiger, kaum reviewbarer PR.                                                           |
| B               | Scheibchenweise direkt auf `/`                                      | Live-Seite lange ein Mix aus alt und neu.                                                    |
| **C (gewählt)** | **Neue Seite parallel unter versteckter Route, am Ende umschalten** | Kleine PRs, Live-Seite unverändert. Kurz doppelter Code, Umschalten ist ein eigener Schritt. |

## Entscheidungen

1. **Route:** Die neue Seite liegt unter `/startpage-new` (`noindex, nofollow`, nicht in der Sitemap, nicht im `llms.txt`). Die Umschaltung ersetzt am Ende den Inhalt von `pages/index.astro` und löscht die Route. _(Eigene Entscheidung: Name der Route.)_
2. **Komponenten:** Neue Komponenten unter `website/src/components/startpage/` (Astro für statische Teile, Vue nur für Interaktion), Styles als `_startpage-*.scss`-Komponenten. Bestehende Teile werden wiederverwendet statt neu gebaut: `WordOfTheDay`, Trend/Word-Pulse (`/api/trending`, `/api/word-pulse`, `/api/word-of-the-day`), Orama-Suche (`/api/search`), `GameCtaCard`, Fakten (`fetchHomeFacts`), Install-Store (`stores/installApp.ts`, `services/pwa.ts`), Magazin, `BerlinerBaer.vue`. _(Eigene Entscheidung: Ordnername.)_
3. **Tokens:** Die Flächen aus §22.2 kommen direkt als Tokens ins Design System (Namensvorschläge aus dem Handoff: `--color-surface-page`, `--surface-sheet`, `--color-band-aubergine`, `--color-band-aubergine-card`, `--color-band-ink`), in der Token-Quelle statt in `_tokens.generated.scss` von Hand. Die Namen werden gegen die vorhandenen Tokens geprüft, Light/Dark über `light-dark()`. Kommt in Scheibe 2. _(Entscheidung von dir.)_
4. **Suche:** Neue Seite `pages/suche.astro` (`noindex, follow`) mit der bisherigen `WordSearch`-Liste. `SearchAction` im JSON-LD zeigt auf `/suche?q={search_term_string}`. Die Startseiten-Combobox (§22.10, Inline-Vorschläge, ARIA-Combobox-Muster, Enter ohne Auswahl → `/suche?q=…`, GET-Formular ohne JS) kommt in Scheibe 2. Ob das Modal bleibt, bleibt `TODO(startseite):` (Zwischenlösung: Modal unverändert).
5. **Umschalten:** Eigener letzter Schritt. Vorher: Vergleich gegen `assets/v5/*.jpg` (Desktop Dark/Light, Mobile).

## Scheiben (je ein eigener PR, jeder einzeln mergebar)

1. **`/suche` + JSON-LD:** Die Suche aus `index.astro` herauslösen, `SearchAction` anpassen, Links, die zur Suche scrollen (`WordSearchLink`), auf `/suche` umbiegen. Unabhängig und sofort live. Der Rest der Startseite bleibt vorerst, nur die Liste fliegt raus.
2. **Fundament + Bühne + Riesenwort:** Route, DS-Tokens, Bühne (H1, Erklärsatz, Combobox, „Probier ma“), Riesenwort = Wort des Tages mit Kalle `zeigen`.
3. **Übersetzer + Trend, Band Aubergine (Fakten), Band Ink (Spiel mit Kalle `ganove` → `jubeln`/`facepalm`).**
4. **Themen (farbige Kacheln) + A–Z, Über ditt Wörterbuch, „Berlinerisch zum Mitnehmen“ (Anki-Karte, App-Karte mit Install-Logik aus §22.9, vier Zustände), FAQ.**
5. **Band Orange (Kalle `lauschen`), Magazin, SEO (Title, Description, eine H1, JSON-LD, neue H2), Umschalten von `/`.**

## Tests

- Install-Logik: alle vier Zustände aus §22.9 mit gemocktem `beforeinstallprompt` und `matchMedia` (Unit).
- Combobox: Tastatur (↑↓, Enter, Esc, „/“), ARIA-Attribute, 150-ms-Debounce, ab 2 Zeichen, höchstens 6 Treffer (Unit).
- Pro Abschnitt: Rendern mit Daten und mit leeren Daten (Unit, AstroContainer-Helfer).
- Playwright: kein Text unter 13 px im `main` (computed `font-size` aller Textknoten, Ausnahmen `.c-kbd` und Illustrationen), je Band Light und Dark mit Kalle-Kontur.
- Test-Daten sind erfunden (E2E-Seed), nie aus der Produktion.

## Dem Builder überlassen

- Genaue Klassennamen und SCSS-Struktur, solange vorhandene DS-Klassen wiederverwendet werden und keine Farbwerte außerhalb der Tokens verstreut sind.
- Aufteilung in Astro- und Vue-Teile, solange SSR ohne JS funktioniert und die Interaktion nur dort hydratisiert, wo sie gebraucht wird.
- Wortlaut der Texte aus dem Handoff (Schreibweise „ditt“ ist dort durchgehend gesetzt; projektweite Festlegung bleibt `TODO`).

## Offen (Zwischenlösung bis zur Klärung)

| Punkt                                             | Zwischenlösung                                   |
| ------------------------------------------------- | ------------------------------------------------ |
| Ziel-URLs der Anki-Decks                          | Platzhalter, `TODO(startseite):`                 |
| Modal oder Inline-Liste für die Suche             | Modal bleibt unverändert                         |
| Wortlaut „Kein Install möglich“ (Firefox Desktop) | Text aus §22.9, `TODO(startseite):`              |
| Farbe der Themen-Kacheln als Payload-Feld `farbe` | Farbe hängt an der Position, `TODO(startseite):` |
