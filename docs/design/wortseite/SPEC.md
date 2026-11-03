# Handoff Spec: Wortseite · Dark (`/wort/<slug>`)

> Quelle: Design-Canvas „Wortseite vereinheitlichen“, Artboards `Main.dc.html` (Seite) und `Poll.dc.html` (Umfrage „Sagste det noch?“). Beide liegen in `design/` neben dieser Datei.
> Basis: Berliner Schnauze Design System v2 („Word-page canon“) → `src/styles/components/_section-card.scss`, `_single-word.scss`, `components/bundle.css`.
> Ziel-Branch: `felix-berlin/user-feedback` · Stack: Astro + Vue 3 Islands, SCSS, Vitest.

---

## Overview

Die Wortseite zeigt einen Eintrag aus dem Berlinerisch-Wörterbuch. Sie wird **vereinheitlicht**: Jeder Inhaltsblock ist eine `c-section-card`, die neuen Features aus `user-feedback` sind in diesen Aufbau integriert (Bewertung im Hero, Umfrage als Karte, Bilder-Spalte rechts). Außerdem gibt es **nur noch drei Bedienelement-Stile** (Auswahl, Aktion, Link).

Inhalte sind je Wort unterschiedlich. Jeder optionale Block wird **nur gerendert, wenn Daten vorhanden sind** (siehe *Edge Cases*). Referenzwörter im Entwurf:
- **Ab Notam**: Herkunft, Quelle, Beispiel, Grammatik mit mehreren Wörtern, keine Bilder.
- **Akademiebusen**: Artikel, Kategorie, „Selbe Bedeutung wie“, Wortzerlegung, Bilder.

---

## Layout

Drei Spalten mit CSS Grid auf `.c-word-page`:

```scss
.c-word-page {
  max-width: 1200px;
  margin-inline: auto;
  display: grid;
  grid-template-columns: 200px minmax(0, 1fr) 240px; // ohne Bilder: 200px minmax(0, 1fr)
  gap: 2rem;
  align-items: start;
}
```

| Bereich | Element | Inhalt |
|---|---|---|
| links, 200px | `nav.c-sidebar` (sticky `top: 1rem`) | Wort, Artikel, Sprungmarken in Gruppen |
| Mitte, fluid | `main.c-word-main.c-section-list` | Hero, Section Cards, Kommentare, Meta, „Noch mehr Wörter“ |
| rechts, 240px | `aside` (nur wenn Bilder) | „Bilder“, Fotos, Credits, Link „Erfahre mehr ↗“ |

Seiten-Padding: `32px 24px 80px`. Hintergrund: das gepunktete Papier-Muster des Design Systems (`radial-gradient(var(--color-gradient-body-1) 1.1px, var(--color-gradient-body-2) 1.1px)`, `background-size: 22px 22px`).

Reihenfolge in der Mitte (`gap: 1rem`):

1. **Hero** `header.c-word-hero` (nicht nummeriert)
2. **Etymologie** `section.c-section-card#bedeutung` (01)
3. **Beispiele** `#beispiele` (nummeriert, optional)
4. **Sagste det noch?** Umfrage, `c-section-card--unnumbered` (Nummer „—“)
5. **Orthographie** `#orthographie`
6. **Quantitative Linguistik** `#linguistik`
7. **Grammatik** `#grammatik`
8. **Phonologie** `#phonologie` (optional)
9. **Alphabetische Nachbarn** `#nachbarn`
10. **Ooch als Buch zu haben, wa?** (unnummeriert)
11. **Wat sagste dazu?** `#kommentare` (unnummeriert)
12. Meta-Zeile „Wort erstellt am … · Bearbeitet am …“
13. „Noch mehr Wörter kennen zu lernen?“

Die Nummern kommen aus dem CSS-Counter `section-num` und werden **nicht** hart codiert. Fällt eine optionale Section weg, rücken die Nummern automatisch nach.

---

## Design Tokens Used (Dark-Werte)

Alle Werte stammen aus `tokens.css` und `colors_and_type.css`, Dark über `[data-theme="dark"]` bzw. `html.dark`. **Im Code nur die Token-Namen verwenden.**

| Token | Wert (Dark) | Verwendung |
|---|---|---|
| `--surface-sheet` | `var(--new-blue-400)` | Section Cards |
| `--surface-hero` | `var(--new-blue-400)` | Hero |
| `--surface-paper` | `var(--new-blue-400)` | Sidebar, Bild-Rahmen (`.c-paper`) |
| `--surface-chip` | `new-blue-400 80% + black` | Inputs, Balken-Spur, Kartenflächen |
| `--surface-callout` | `new-blue-400 80% + black` | `.c-infotext` (Herkunft, Umfrage-Erklärung) |
| `--rule-card` | `orange-300 @ 25%` | 1px **gestrichelter** Außenrahmen |
| `--rule-inner` | `orange-300 @ 30%` | gestrichelte Trenner in Karten |
| `--color-ink-strong` | `--white-100` `#f9f9f9` | Titel, Werte |
| `--color-body` | `--yellow-500` `#e3e3d2` | Fließtext |
| `--color-muted` | `yellow-500 75% + blue` | Labels, Sekundärtext |
| `--color-accent-text` | `--orange-300` `#f0ac85` | Vokale, Links hover |
| `--control-border` | `blue 80% + white` | Rahmen von Auswahl-Elementen und Inputs |
| `--orange-600` | `#b23b27` | gewählte Auswahl, Primär-Button, Fortschritt „erledigt“ |
| `--orange-500` | `#cf5736` | Section-Nummer, Karten-Hover |
| `--orange-400` | `#e28964` | Häufigkeits-Balken, Fortschritt „aktuell“ |
| `--shadow-hover-glow` | `0 0 12px 0 orange-500 60% + white` | Hover aller Auswahl-Elemente |
| `--paper-lift` | `--shadow-card` | Schatten aller Flächen |
| `--radius-sm` / `--radius-xs` / `--radius-xxs` | 4 / 3 / 2px | Karten / Chips / Bilder, Balken |
| `--font-body` | `"Berlin"` 400/700/900 | alles außer Display |
| `--font-display` | `"Berliner"` | nur „Noch mehr Wörter kennen zu lernen?“ |
| `--tracking-body` | `1px` | an `html`, nicht überschreiben |

Typo-Stufen: Headword `clamp(2rem, 5cqi, 3.75rem)` 700 · Card-Titel 1.25rem 700 · Bedeutung 1.125rem · Body 1rem/1.5 · Labels (`.c-eyebrow`, `dt`) 0.7rem 700 uppercase · Footer/Meta 0.75–0.8rem.

---

## Components

| Komponente | Klasse / Datei | Props / Daten | Notizen |
|---|---|---|---|
| Sidebar | `.c-sidebar` | `word`, `article?`, Links | Gruppen: **Inhalt** (Bedeutung, Beispiele\*), **Mitmachen** (Sagste det noch?, Kommentare), **Sprache** (Orthographie, Linguistik, Grammatik, Phonologie\*), **Entdecken** (Nachbarn). \* nur wenn Section existiert. Aktiver Link hat einen 3px-Streifen in `--orange-600`. |
| Word Hero | `.c-word-hero` | `word`, `article?`, `badges[]`, `category?`, `likes`, `dislikes` | Artikel als „, der“ **hinter** dem Wort (`.c-word-hero__article`). Badges **ohne Rahmen** (`border-color: transparent`), auch `--auto` ohne Innenlinie. Kategorie-Badge mit Lucide-Icon `tag` als Link. Darunter, abgetrennt durch `--rule-inner`: Bewertung + Link „Sagste det noch? Hier abstimmen ↓“ (`#umfrage`). Rechts das Icon-Menü `⋮`. |
| Section Card | `.c-section-card` | `title`, Slot `body`, Slot `footer?` | Header: Nummer + Titel. Footer für Quellen (Etymologie: „Quelle“, Linguistik: Wikipedia/DeReKo). |
| Herkunft | `.c-infotext` in Etymologie | `origin`, `source` | `source` steht im Card-Footer mit `.c-eyebrow` „Quelle“. |
| Beispiel | `figure.c-example` | `examples[{text, explanation}]` | Zitatzeichen `“` in Berliner, Text kursiv, Erklärung „– …“ in `--color-muted`. |
| Grammatik | Liste | `grammar[{w, pos}]` | Eine Zeile pro Wort: Wort fett (min. 8rem breit) + `.c-tag` mit der Wortart, Zeilen durch `--rule-inner` getrennt. |
| Linguistik | `.c-stat-row` / `.c-stat-box` | `counts{b,v,k,u,va,s}`, `freq[[ch,%,label]]`, `facts[]` | Häufigkeits-Balken **einfarbig** `--orange-400`, Breite `p / 18 * 100%` (mindestens 1.5%). Vokale `--color-accent-text` 700, Konsonanten `--color-muted`. Kuriositäten mit einer Raute in `--orange-400` als Aufzählungszeichen. |
| Wortlinks | `.c-chip-link` in `.c-chip-list` | Wörter | Wortzerlegung (mit „+“ dazwischen), Phonologie, Nachbarn, Noch mehr Wörter. |
| Umfrage | `Poll.vue` (neu) | siehe *Umfrage-Flow* | `c-section-card--unnumbered`, `id="umfrage"`. |
| Bezirkskarte | `BerlinAreaMap.vue` | `@select(bezirk)`, `@woanders` | Bestehende SVG aus dem Branch, Styling siehe unten. |
| Bücher | Liste in Card | 3 feste Einträge | Typ als `.c-tag` (Wörterbuch/Nachschlagewerk/Geschenk) statt der bunten Labels, Amazon-Hinweis im Footer. |
| Kommentare | Formular in Card | `count`, `comments[]` | Sortierung „Beste/Neueste“ als **Auswahl**, Leerzustand siehe *Edge Cases*. |
| Bilder | `aside` + `figure.c-paper` | `images[{src, alt, credit?}]`, `moreUrl?` | Bild im Format 16:9 (`object-fit: cover`), Credit 0.7rem muted unter dem letzten Bild. |

### Bedienelemente: nur diese drei Stile (neu)

| Stil | Vorschlag DS-Klasse | Wo | Spec |
|---|---|---|---|
| **Auswahl** | `.c-choice` (im Entwurf `bs-opt`) | Jefällt ma/Nee, Umfrage-Antworten, Bezirk-Liste, Kiez, Herkunft, Hälfte, Alter, „Woanders“, Beste/Neueste | `min-height: 44px` · `padding: 0 1rem` · `background: transparent` · `border: 1px solid var(--control-border)` · `radius: 0` · `color: var(--color-body)` · Zustand über `aria-pressed` |
| **Aktion** | `.c-button--primary` | nur „Abschicken“ | `--orange-600`, weiße Schrift, 700, 44px hoch |
| **Link** | `.c-link` (im Entwurf `bs-link`/`bs-textbtn`) | Sprungmarken, „überspringen“, „← Zurück“, „Lieber aus ner Liste wählen“, „zufälliges Wort“, Datenschutz, Quellen | `text-decoration: underline dashed from-font` · `text-underline-position: from-font` · Hover `--color-accent-text` · Klickfläche 44px |
| (Icon) | `.c-icon-button` (Entwurf `bs-quiet`) | `⋮` im Hero | 44×44, ohne Rahmen, Hover: 1px gestrichelter Rahmen `--rule-card` |

**Nicht mehr verwenden** auf der Wortseite: `.c-button--control` (der eckige Steuerungs-Button) und `.c-button--filter` (der laute orange Filter-Button).

---

## States and Interactions

| Element | State | Behavior |
|---|---|---|
| Auswahl | Default | transparent, 1px solid `--control-border` |
| Auswahl | Hover | `border-style: dashed` + `box-shadow: var(--shadow-hover-glow)` |
| Auswahl | Gewählt (`aria-pressed="true"`) | `background` und `border-color` `--orange-600`, Text `--white-100`, 700 |
| Auswahl | Focus | 2px dashed outline `--orange-400`, offset 2px (Fokusring nie entfernen) |
| Jefällt ma / Nee | Klick | schaltet um, ist exklusiv (Like hebt Dislike auf und umgekehrt), Zähler ±1, optimistisch aktualisieren |
| Section-Card-Link (Sidebar) | Hover/Aktiv | Hintergrund `orange-300 12%/18%`, aktiv + 3px-Streifen `--orange-600` |
| `.c-chip-link` | Hover | gestrichelter → durchgezogener Rahmen, Pfeil „→“ blendet ein (DS) |
| Abschicken | Disabled | wenn Kommentar leer; DS-Disabled-Stil (`dotted`, `--color-muted`) |
| Abschicken | Loading | Button disabled + Text „Wird jeschickt …“ *(Copy prüfen)* |
| Kommentar | Error | Hinweis unter dem Formular in `--danger`, Formularinhalt bleibt erhalten |
| Textarea | Zähler | „0 / 1000“, harte Grenze bei 1000 (`maxlength`) |
| Strg/⌘+Enter | im Textarea | schickt ab |

### Umfrage-Flow „Sagste det noch?“

Zustandsmaschine (`step`):

```
vote → bezirk → kiez* → herkunft → haelfte* → alter → done
```

| Step | Frage (h3) | Optionen | Übersprungen wenn |
|---|---|---|---|
| `vote` | – (nur Header „Sagste det noch?“) | Sag ick selbst · Kenn ick · Nie jehört | – |
| `bezirk` | Wo wohnste? | Karte (12 Bezirke + Brandenburg) oder Liste, „Woanders“ | – |
| `kiez` | Welcher Kiez? · {Bezirk} | Kieze des Bezirks | `woanders` |
| `herkunft` | Uffjewachsen oder zujezogen? | Hier uffjewachsen · Zujezogen, über 10 Jahre her · Zujezogen, unter 10 Jahren | – |
| `haelfte` | In welcher Hälfte? | Ost · West · Beides / nach der Wende | `woanders` **oder** „Zujezogen, unter 10 Jahren“ ⚠️ *Bedingung bitte mit der Branch-Logik abgleichen* |
| `alter` | Wie alt biste? | unter 20 · 20–29 · … · 70–79 · 80+ | – |
| `done` | Fertig | „Danke fürs Mitmachen!“ | – |

- **Nach der Abstimmung**: Ergebnis-Balken für alle 3 Optionen (6px, Spur `--surface-chip`). Die eigene Antwort ist `--orange-600` und fett mit „· deine Antwort“, die anderen `--orange-300`. Rechts „{pct} % · {n} Stimme(n)“.
- **Fortschritt**: **immer 6 Segmente** (4px hoch, `gap: 4px`). Erledigt `--orange-600`, aktuell `--orange-400`, offen `--rule-inner`, übersprungen = 1px gestrichelte Linie `--rule-card`. Daneben `.c-eyebrow` „Schritt X von N“, wobei N = Anzahl der nicht übersprungenen Schritte. *Grund: Im Branch sprang die Punktzahl von 4 auf 5 auf 6, das wirkte wie ein Fehler.*
- **Erklärung** (`.c-infotext`), automatisch offen nur im Schritt `bezirk`, danach eingeklappt mit dem Link „Warum fragen wa dit?“:
  > **Warum so ville Fragen?**
  > Weil wa hier zusammen forschen: Wie klingt det Berlinerische heute, wo wird’s noch jesprochen und von wem? Jede Antwort hilft uns, den Berliner Metrolekt besser zu verstehen – dafür brauchen wa ’n paar Angaben von dir: wo de wohnst, ob de hier uffjewachsen bist und wie alt de bist.
  > *Mach mit, so weit de willst – jede Frage kannste überspringen.*
- **Footer** ab Schritt `bezirk`: links „← Zurück“ (geht auch über übersprungene Schritte zurück, `vote` setzt die Stimme zurück), rechts „überspringen“ (nicht in `done`).
- Header rechts: „Noch keene Stimme“ bzw. „Bisher {n} Stimme(n)“.
- Antwort-Raster: `grid-template-columns: repeat(auto-fill, minmax(min(<min>px, 100%), 1fr))`, `gap: .5rem`, Buttons linksbündig. `<min>`: kiez 180 · herkunft 240 · haelfte 180 · alter 96 · bezirk-Liste 180.

### Bezirkskarte (bestehende SVG)

```scss
.c-berlin-area-map__area { fill: var(--surface-chip); stroke: var(--color-muted); stroke-width: .75; stroke-dasharray: 3 2; cursor: pointer; transition: fill .3s; }
.c-berlin-area-map__area:hover,
.c-berlin-area-map__area:focus-visible { fill: var(--orange-500); outline: none; }
.c-berlin-area-map__area[aria-checked="true"] { fill: var(--orange-600); }
.c-berlin-area-map__area--brandenburg { fill: transparent; stroke: var(--rule-card); } // rx 4 statt 40
.c-berlin-area-map__area--brandenburg:hover { fill: color-mix(in srgb, var(--orange-300) 12%, transparent); }
.c-berlin-area-map__label { font: 700 9.5px var(--font-body); fill: var(--color-ink-strong); text-anchor: middle; dominant-baseline: middle; pointer-events: none; paint-order: stroke; stroke: var(--surface-chip); stroke-width: 2.5px; }
.c-berlin-area-map__label--brandenburg { text-anchor: start; font-weight: 400; fill: var(--color-muted); stroke: none; }
```

Klick auf einen Bezirk wählt ihn und führt zu `kiez`. Klick auf die Brandenburg-Fläche entspricht „Woanders“. Darunter steht die Quelle „Karte: Geoportal Berlin / ALKIS Berlin Bezirke“ (0.7rem muted). SVG `max-width: 640px`, mittig.

---

## Responsive Behavior

| Breakpoint | Changes |
|---|---|
| ≥ 1024px | 3 Spalten (200 / fluid / 240), ohne Bilder 2 Spalten |
| 808–1023px | 3 Spalten werden zu eng → **Vorschlag:** Bilder-Spalte unter `main` (`grid-template-columns: 200px 1fr`, `aside` mit `grid-column: 2`) |
| < 808px (`@media (max-width: 807px)` aus dem DS) | `.c-word-page` wird `flex-direction: column`: Sidebar oben (nicht sticky), dann Inhalt, dann Bilder |
| < 640px | Statistik-Boxen umbrechen (`flex-wrap`), Häufigkeits-Raster `1.5rem 1fr 11rem` → Label-Spalte schmaler (`8rem`), Kuriositäten 1-spaltig (`auto-fit, minmax(min(260px,100%),1fr)`) |

Hero: `flex-wrap`, das Menü `⋮` bleibt rechts oben. Die Bewertungszeile bricht um.

---

## Edge Cases

- **Optionale Daten** (Block wird komplett weggelassen, **kein** leerer Platzhalter):
  `article` · `category` · `same` („Selbe Bedeutung wie“) · `origin` + `source` · `examples[]` · `parts[]` (Wortzerlegung) · `similar[]` (Phonologie + Sidebar-Link) · `images[]` (ganze rechte Spalte, Grid 2-spaltig).
- **Keine Kommentare**: gestrichelte Box „Hier hat noch keener wat jesacht. Fang du doch an!“ unter dem Formular. Die Sortierung kann bei 0–1 Kommentaren ausgeblendet werden *(Vorschlag)*.
- **Keine Stimmen**: Header „Noch keene Stimme“. Ergebnisse erst nach eigener Abstimmung zeigen.
- **Lange Wörter / Mehrwort-Einträge** („Nett, wat de nich nett bist“): Headword `text-wrap: balance`, `overflow-wrap: break-word` in Cards. Chip-Links umbrechen mehrzeilig, nicht kürzen.
- **Leerzeichen im Wort** („Ab Notam“): Buchstaben-Darstellung mit `white-space: pre`. Leerzeichen zählen nicht als Buchstabe und bekommen keine Vokal/Konsonant-Farbe.
- **Häufigkeit unbekannt** (Buchstabe nicht im Korpus): Balken mit Mindestbreite 1.5%, Label „–“.
- **Grammatik mit vielen Wörtern**: eine Zeile pro Wort, keine Begrenzung.
- **Bilder ohne Credit**: kein Bildunterschrift-Element. **Mehr als 2 Bilder**: untereinander, kein Slider.
- **Umfrage bereits beantwortet** (Rückkehr auf die Seite): direkt mit Ergebnissen + nächstem offenen Schritt starten oder mit `done`. ⚠️ *Persistenz/Cookie-Logik aus dem Branch übernehmen.*
- **Langsame Verbindung**: Bewertung und Umfrage optimistisch aktualisieren und bei Fehler zurückrollen + Toast (`.c-toast`, DS) „Ditt kann ne wahr sein, es ist ein Fehler aufgetreten.“

---

## Animation / Motion

| Element | Trigger | Animation | Duration | Easing |
|---|---|---|---|---|
| Auswahl, Primär | Hover | Rahmen gestrichelt + Glow, Hintergrund | 300ms | ease-in-out (DS-Standard) |
| Auswahl | Gewählt | Hintergrund → `--orange-600` | 300ms | ease-in-out |
| `.c-chip-link` | Hover | Pfeil blendet ein, Rahmen | 150ms | ease (DS) |
| Sidebar-Link | Hover/Aktiv | Hintergrund, Streifen | 150ms | ease |
| Kartenfläche | Hover | `fill` | 300ms | ease |
| Umfrage-Schritt | Wechsel | **keine** Animation (Inhalt tauscht) | – | – |
| `prefers-reduced-motion` | – | alle Transitions auf `0ms` | – | – |

---

## Accessibility Notes

- **Fokus-Reihenfolge**: Sidebar → Hero (Badges-Link → Jefällt ma → Nee → „Hier abstimmen“ → ⋮) → Sections in DOM-Reihenfolge → Bilder-Spalte.
- **Landmarks**: `nav[aria-label="Inhalt der Wortseite"]`, `main`, `aside[aria-labelledby="bilder"]`.
- **Bewertung**: `<button aria-pressed>` mit sichtbarem Text „Jefällt ma“/„Nee“. Die Zahl steht im Button, Screenreader liest z. B. „Jefällt ma 0, Umschalter, nicht gedrückt“.
- **Umfrage**: Antwortgruppe `role="group" aria-label="{Frage}"`. Nach einem Schrittwechsel den Fokus auf die neue `h3`-Frage setzen (`tabindex="-1"`), Ergebnis-Text zusätzlich per `aria-live="polite"` ansagen.
- **Fortschritt**: Segmente `aria-hidden`, Text „Schritt X von N“ ist die zugängliche Info.
- **Bezirkskarte**: `role="radiogroup"`, Flächen `role="radio"`, **Roving Tabindex** (ein Element `tabindex=0`). ⚠️ *Im Entwurf fehlen Tastatur-Handler: Pfeiltasten = nächster Bezirk, Enter/Leertaste = wählen.* Die Liste („Lieber aus ner Liste wählen“) ist die barrierefreie Alternative und muss immer erreichbar sein.
- **Icon-Button ⋮**: `aria-label="Weitere Aktionen"`, `aria-haspopup="menu"`, `aria-expanded`.
- **Bilder**: aussagekräftiges `alt` (z. B. „Kugelförmiges Labor in Berlin-Adlershof“), Credit nicht in `alt`.
- **Kontrast**: Alle Text-Tokens erfüllen laut DS AA in beiden Themes. Häufigkeits-Balken sind Grafik (3:1 gegen `--surface-chip` prüfen).
- **Formular**: sichtbare `<label for>` für Name und Kommentar, Hinweise per `aria-describedby`.
- **Sprache**: `lang="de"`. Dialekt-Strings nicht automatisch übersetzen.

---

## Offene Punkte

1. Bedingung für „In welcher Hälfte?“ mit dem Branch abgleichen.
2. Neue DS-Klassen anlegen: `.c-choice`, `.c-link`, `.c-icon-button` (aus `bs-opt`/`bs-link`/`bs-quiet`). Dann `.c-button--control`/`--filter` auf der Wortseite entfernen.
3. Dialekt-Copy prüfen: „Warum so ville Fragen?“-Text, „Warum fragen wa dit?“, „Danke fürs Mitmachen!“, „Noch keene Stimme“.
4. Wenn Umfrage-Daten anonym ausgewertet werden: in der Erklärung erwähnen und auf eine Forschungsseite verlinken.
5. Tastaturbedienung der Bezirkskarte.

## Dateien in `design/`

| Datei | Inhalt |
|---|---|
| `Main.dc.html` | komplette Wortseite, Prop `word` (`abnotam` / `akademiebusen`), `theme` (`dark` / `light`) |
| `Poll.dc.html` | Umfrage inkl. Zustandsmaschine und Bezirkskarte |
| `tokens.css`, `colors_and_type.css`, `bundle.css` | DS-Stände, auf denen der Entwurf basiert |

Die `.dc.html`-Dateien sind Entwurfs-Markup (Templating mit `{{…}}`, `<sc-if>`, `<sc-for>`), **kein** Produktionscode. Struktur, Klassen und Inline-Styles dienen als Referenz.
