# Handoff Spec: Startseite v20 „Berliner Wörterbuch“

Stand: 21. November 2026 · Design System „Berliner Schnauze“ v3.1 + Palette v13

> **v20 ersetzt die Startseite v5 „farbig“ vollständig** (`handoff/startseite-SPEC.md` §22). Aus v5 gelten nur noch das Install-Verhalten der App (§22.9 dort, Tabelle „Installieren“) und die Such-Regeln (§22.10 dort), soweit §8 hier nichts anderes sagt. Das Riesenwort „Monument“, das Laufband, die Übersetzer-Tafel, die Fakten-Karten und die A–Z-Kacheln entfallen.

> Die Mockups (`design/*.dc.html`), die Screenshots und der Startauftrag sind nach dem Merge entfernt worden. Sie stehen in der Git-History (Commit vor dem Löschen, Pfad `docs/design/startseite-v20/`). Tokens und Komponenten des Design Systems: `docs/design/design-system/`. 

**Platzhalter:** Alle Zahlen (1.700+, 312, 12.400, Prozentwerte, Bezirkswerte, Altersverteilungen, Themen-Zähler) und alle Listen sind ausgedacht. Echte Namen, Kommentare oder Vorschlagstexte aus der Produktions-Datenbank gehören nicht in Mocks, Tests, Fixtures oder Screenshots. Die Dev-Datenbank stammt aus einem Backup.

---

## 1. Überblick

Die Startseite macht in dieser Reihenfolge klar:

1. **Was ist das?** H1 „Berliner Wörterbuch“ und ein Erklärsatz ganz oben. Danach erst das große Wort.
2. **Was kann ich tun?** Ein Wort des Tages anhören und aufschlagen, dann suchen. Die Suche steht noch im ersten Bildschirm.
3. **Warum wiederkommen?** Mitforschen (Umfrage), Spiel, neue und beliebte Wörter, die Karte „Wo wird noch berlinert?“.
4. **Für Google und KI-Suche:** rund 1.000 Wörter Fließtext „Wat is Berlinerisch?“, FAQ, Über-Block mit Arbeitsweise.

**Zielgruppe:** Die meisten Besucher kommen nicht aus Berlin. Jede Berliner Floskel steht mit hochdeutscher Übersetzung, der Fließtext erklärt Lautregeln.

**Tonalität:** Überschriften berlinern („Kiek ma rin“), Fließtext und Bedienhinweise sind Hochdeutsch oder leicht berlinisch und immer verständlich.

**Pfad:** `/`. Header mit `current="start"`.

---

## 2. Reihenfolge der Abschnitte

| # | Abschnitt | Überschrift (sichtbar) | Ebene | Fläche |
|---|---|---|---|---|
| 1 | Bühne: Intro, Wort des Tages, Suche, Stöbern | „Berliner Wörterbuch“ / Wort selbst | h1 / h2 | `--page` |
| 2 | Mitforschen (Umfrage) | „Forsch ma mit!“ | h2 | `--card` |
| 3 | Themen-Register | „Kiek ma rin“ | h2 | `--page` |
| 4 | Spiel „Berliner oder nich?“ | „Berliner oder nich?“ | h2 | Orange-Band |
| 5 | Neu / Beliebt / Im Aufwind | „Frisch uff’m Tisch“ | h2, h3 | `--page` |
| 6 | Ergebnis-Band mit Reitern Bezirk / Alter | „Wo wird noch berlinert?“ | h2, h3 | Dunkles Band |
| 7 | Wissen + Lautregeln | „Wat is Berlinerisch?“ | h2, h3 | `--page` |
| 8 | FAQ + Über ditt Wörterbuch | „Häufig jefragt“ | h2, h3 | `--card` |
| 9 | Magazin-Teaser | (Zitat) + Artikeltitel | h3 | `--page` |
| 10 | Mitmachen mit Kalle | „Fehlt dir een Wort?“ | h2 | `--page`, gestrichelter Kasten |
| 11 | Zum Mitnehmen: App + Anki | (keine, `aria-label`) | – | `--card2` |

Ein Abschnitt ohne Daten entfällt ganz. Ausnahmen: Bühne und Suche stehen immer da. Einzelfälle in §13.

**Korrektur-Überschrift** (Hochdeutsch durchgestrichen über der Berliner Überschrift) gibt es **nur** bei 2, 3, 6 und 10. Bei allen anderen nicht, das ist Absicht: Der Effekt nutzt sich sonst ab.

| # | durchgestrichen (`aria-hidden`) | Überschrift |
|---|---|---|
| 2 | Forschen Sie mit | Forsch ma mit! |
| 3 | Nach Themen stöbern | Kiek ma rin |
| 6 | Wo wird noch Berlinerisch gesprochen? | Wo wird noch berlinert? |
| 10 | Fehlt ein Wort? | Fehlt dir een Wort? |

---

## 3. Layout und Breakpoints

Breakpoints wie auf der übrigen Seite:

| | Mobil (< 808px) | Tablet (808–999px) | Desktop (≥ 1000px) |
|---|---|---|---|
| Mock | `size="mobile"`, 390 | `size="tablet"`, 834 | `size="desktop"`, 1280 |
| Container | `padding-inline: 24px` | `padding-inline: 40px` | `max-width: 1208px` inkl. 24px Padding, zentriert |
| Abschnitt oben/unten | 64px | 80px | 96px |
| h2 | 2.4rem | 3rem | 3.5rem |
| Header | kompakt (Menü) | **kompakt (Menü)**: die Desktop-Navigation läuft bei 834px über | Desktop |
| Footer | mobil | Desktop | Desktop |

Tablet ist **Desktop-Basis mit Overrides** (`.h18--t` im Mock), nicht Mobil hochskaliert. Im Code als Media Query `808px ≤ w < 1000px`.

**Hover nur bei Hover-Geräten:** Alles, was im Mock nur beim Hover erscheint (Beispielwörter und Sprechblase im Themen-Register, Karten-Tooltip), steht im Code unter `@media (hover: hover)`. Ohne Hover sind die Beispielwörter immer sichtbar und die Sprechblase entfällt. Im Mock ist das für Tablet und Mobil schon so gebaut.

### Spaltenaufteilung pro Abschnitt

| Abschnitt | Desktop | Tablet | Mobil |
|---|---|---|---|
| Mitforschen `.h18__split` | 2 Spalten | 1 Spalte, gap 40 | 1 Spalte, gap 32 |
| Spiel `.h19__bonw` | 2 Spalten | 2 Spalten, gap 40 | 1 Spalte |
| Frisch `.h18__cols` | 2 Spalten (Neu / Ranking) | 1 Spalte, gap 48 | 1 Spalte, gap 40 |
| Ergebnis-Band `.h18__mapw` | Rangliste .8fr / Karte 1.2fr | Karte oben (max. 560px, zentriert), Rangliste darunter | wie Tablet, Karte volle Breite |
| Altersprofil `.h20__omag` | 2 Spalten | 1 Spalte | 1 Spalte |
| Wissen `.h20__grid` | Text (max. 68ch) + Lautregeln-Kasten `sticky; top: 24px` | 1 Spalte, Kasten unter dem Text, Regeln 2-spaltig | 1 Spalte, Kasten nicht sticky |
| FAQ `.h20__fg` | 1.6fr / 1fr | 1 Spalte | 1 Spalte |
| Magazin `.h20__mzg` | 2 Spalten | 1 Spalte | 1 Spalte |
| Mitmachen `.h18__gap` | Kalle + Text nebeneinander | wie Desktop | untereinander |
| Mitnehmen `.h18__tg` | 2 Spalten mit Trennlinie | 2 Spalten | 1 Spalte, Button unter dem Text |

---

## 4. Tokens

Basis: `ds/tokens.css`, `ds/colors_and_type.css`. Dazu die **Palette v13**, die auch die Wortseite v17 nutzt. Im Mock hängt sie an `.w13` / `[data-theme="dark"].w13`. Im Code als globale Seiten-Tokens anlegen, mit `TODO(startseite):` für die Übernahme ins Design System.

### 4.1 Flächen und Text

| Token | Light | Dark | Verwendung |
|---|---|---|---|
| `--page` | `#efe6db` | `#1b2127` | Seitenfläche |
| `--card` | `#fff` | `#2e363f` | Suchfeld, Mitforschen-Band, FAQ-Band, Lautregeln-Kasten |
| `--card2` | `#fbf1e6` | `#38424c` | Umfrage-Kacheln, Chips, Über-Kasten, Mitnehmen-Leiste |
| `--card3` | `#f5dfca` | `#46525e` | Hover von `--card2`, `kbd` |
| `--t3` | **`#535e69`** | `#a8b2bc` | Nebentext, Zähler, Datumsangaben |
| `--line` | `var(--rule-card)` | `var(--rule-card)` | Trennlinien, durchgezogen 1px |
| `--color-ink-strong`, `--color-body`, `--color-accent-text` | DS | DS | Überschriften, Fließtext, Lemma/Akzent |

> **`--t3` Light ist gegenüber der Wortseite v17 dunkler** (`#5f6b77` → `#535e69`). Der alte Wert lag auf `--page` bei 4,41:1 und damit unter AA. Bitte den neuen Wert global setzen, auch für die Wortseite.

### 4.2 Datenfarben

| Token | Light | Dark | Bedeutung |
|---|---|---|---|
| `--d-bl` | `#3d6f9c` | `#8fb4d6` | „Sag ick selbst“, Beliebt-Punkte, Altersgruppe unter 30 hervorgehoben |
| `--d-ye` | `#8a6d00` | `#f0d722` | „Kenn ick“, Karte, Altersgruppe 60+ hervorgehoben |
| `--d-gr` | `#7d8994` | `#9aa5b1` | „Nie jehört“, übrige Punkte |
| `--ok` | `#2e7d4f` | `#6cc08b` | „Im Aufwind“ (+N) |

Datenfarben nur für Daten, nie für Bedienelemente.

### 4.3 Bänder

| Band | Hintergrund | Text | Hinweis |
|---|---|---|---|
| Spiel `.h19__bon` | `--orange-600` | `#fff`, Nebentext `rgb(255 255 255 / 85%)` | primärer Button hier **weiß** mit Orange-Text, Fokusring weiß |
| Ergebnis-Band `.h18__dark` | `#14191e` in **beiden** Themes, `data-theme="dark"` | `#c9cfd6`, Überschriften `#fff` | überschreibt `--t3 #a8b2bc`, `--line rgb(255 255 255 / 12%)`, `--card2 #232a31`, `--d-ye #f0d722`, `--d-bl #8fb4d6`, `--d-gr #9aa5b1` |

### 4.4 Orange: nur Handlung und Marke

Orange (`--orange-500/600`, `--color-accent-text`) steht nur für:
- primäre Buttons, Hover- und Fokuszustände, aktiver Reiter-Strich
- Lemma des Wort des Tages, Wortsiegel, Korrektur-Strich
- Spiel-Band, Sprechblase im Themen-Register (Hover), Magazin-Zitat

Alles Dekorative ist `--t3` oder `--color-ink-strong`: Rangziffern, Register-Nummern 01–06, Initialen im Wissens- und Magazin-Text, Icons in Umfrage, Stöber-Chips, Mitnehmen-Leiste und „Noch keene Hörprobe“. Diese Icons werden erst beim Hover orange.

### 4.5 Typografie

| Rolle | Schrift | Größe D / T / M |
|---|---|---|
| H1 „Berliner Wörterbuch“ | Fira Sans Extra Condensed 800, Versalien, `letter-spacing: 1px` | 2rem / 2rem / 1.6rem |
| Intro-Satz | `--font-body` | 1.25rem / 1.25rem / 1.0625rem, `line-height: 1.5` |
| Wort des Tages (h2) | `--font-body` 700, `--color-accent-text` | 10rem / 10rem / 5.5rem, `line-height: .9` |
| Bedeutung | `--font-body` 700 | 2.625rem / – / 2rem |
| Abschnitts-h2 | Fira Sans Extra Condensed 800, Versalien, `line-height: .95`, `letter-spacing: .5px` | 3.5rem / 3rem / 2.4rem |
| h3 in Listen (`.h18__ch`), Reiter | Fira Sans Extra Condensed 600 | 1.5rem |
| Themen-Namen | Fira Sans Extra Condensed 800, Versalien | 4.25rem / `clamp(2rem, 6vw, 3.25rem)` / 1.75rem |
| Zahlen (`.h18__n`) | Fira Sans Extra Condensed 800, `tabular-nums` | je nach Ort |
| Fließtext Wissen | `--font-body` | 1.125rem, `line-height: 1.7`, `max-width: 68ch` |
| Durchgestrichene Zeile | `--font-body` | 1.0625rem, `--t3` |

**Schriften laden:** Fira Sans Extra Condensed als `woff2`, `font-display: swap`. Die Datei `latin-ext-800` nur mit `unicode-range: U+0100-02AF` (für ʃ, ː und ɪ in den Lautschrift-Konturen). **Nie** `--font-display` (Fraktur) auf dieser Seite.

**Mindestgröße 13px** (`.8125rem`) für jeden Text. Gemessen im Mock: Desktop, Tablet und Mobil ohne Unterschreitung.

### 4.6 Form

- Radius höchstens 4px. Ausnahmen: Pillen (`999px`) für Chips und „Noch keene Hörprobe“, Kreise (Wortsiegel, FAQ-Plus, Lösch-Kreuz), Sprechblase `18px`.
- Einziger Schatten für erhöhte Flächen: `--paper-lift`. Vorschlagsliste zusätzlich `0 18px 40px rgb(0 0 0 / 28%)`, Spielkarte `0 20px 40px rgb(0 0 0 / 22%)`, Sprechblase `0 16px 32px`.
- Linien durchgezogen. Gestrichelt nur für: sekundäre Buttons, Umfrage-Icon-Ring, „Noch keene Hörprobe“, Mitmachen-Kasten, leere Punkte (als Ring).

---

## 5. Bühne (Abschnitt 1)

Reihenfolge im DOM und auf allen Breakpoints gleich:

1. **Intro** (`header.h20__intro`): H1 „Berliner Wörterbuch“, darunter der Erklärsatz mit zwei Wortlinks („Atze“, „Zicke“). Wortlaut aus dem Mock übernehmen, die Zahl live.
2. **Kopfzeile** `.h18__eye`: „**Wort des Tages**“ in Orange, daneben das Datum („Samstag, 21. November“), 13px Versalien, `letter-spacing: 2px`.
3. **Lemma-Zeile** `.h18__lem` (flex, gap 1.25rem, wrap):
   - h2 mit dem Wort, jeder Buchstabe ein `span` (`aria-hidden`), das h2 trägt `aria-label="{Wort}"`
   - Artikel/Wortart („, der“) in `--t3`
   - **Wortsiegel** (§5.1)
4. **Bedeutung** `.h18__bed`, dann **Beispiel** kursiv mit hochdeutscher Übersetzung darunter in `--t3`.
5. Nur ohne Hörprobe: Pille „**Noch keene Hörprobe.** Sprichste „{Wort}“ ein?“ (§5.2).
6. Textlink „Zum Wort →“ mit 2px Orange-Unterstrich.
7. **Suche** (§8), `margin-top: 56px`, `max-width: 760px` (Tablet: volle Breite).
8. **Probier mal:** vier Wort-Chips. **Oder stöber mal:** fünf Chips mit Icon (Mit Hörprobe, Redewendungen, Kurz und knackig, Wat reimt sich?, Zufallswort). Mobil ist diese Reihe horizontal scrollbar (`overflow-x: auto`, keine Scrollbar, rechts 24px Überstand bis zum Rand).

**Lautschrift als Bühne:** Hinter allem steht die IPA des Worts („[kiːts]“) als Kontur: `color: transparent; -webkit-text-stroke: 2px var(--color-ink-strong); opacity: .1`, Desktop 26rem rechts unten angeschnitten, Mobil 8rem bei `top: 250px` (hinter dem Lemma), `opacity: .07`. `aria-hidden`, `pointer-events: none`. Fehlt die Lautschrift, entfällt die Kontur.

### 5.1 Wortsiegel mit Morse-Ring

Kreis 120px (Mobil 84px), in der Mitte der Play-Button 60px (Mobil 44px), Fläche `--orange-600`, Icon weiß. Um den Button liegt ein Ring aus Morsezeichen des Worts.

**Ring berechnen** (für jedes Wort, gleiches Verfahren wie die Wortseite v17):

```js
// MORSE: Tabelle A–Z, Ä .-.-, Ö ---., Ü ..--, ß ...--..; andere Zeichen überspringen
let t = 0; const units = []; const seq = [];
[...word.toUpperCase()].forEach((ch, li) => {
  const code = MORSE[ch]; if (!code) return;
  if (units.length) t += 0.9;                 // Abstand zwischen Buchstaben
  for (const sym of code) { units.push(t + 0.5); seq.push(sym === '.' ? 'd' : 'l'); t += 1; }
});
t += 0.9;                                     // Lücke am Ringschluss
const pos = units.map(u => {
  const a = -90 + 360 * u / t, r = a * Math.PI / 180;
  return { left: 50 + 45 * Math.cos(r) + '%', top: 50 + 45 * Math.sin(r) + '%', rotate: a + 90 + 'deg' };
});
```

| Zeichen | Desktop | Mobil |
|---|---|---|
| Punkt `i.d` | 8×8, rund | 6×6 |
| Strich `i.l` | 18×6, Radius 3 | 12×4 |
| Farbe | `--orange-500` | |

**Verhalten:**
- Ruhe: Ring dreht sich langsam (60s pro Umdrehung, linear).
- Abspielen: Ring hält an, alle Zeichen auf `opacity: .25`. Synchron zur Wiedergabe werden die Zeichen nacheinander voll (`.on`). Das aktuelle Zeichen bekommt einen Schein `0 0 0 3px` in Orange 35 %. Im Mock 120ms pro Zeichen. **Im Code an die Audiodauer koppeln:** `dauer / anzahlZeichen`.
- Ende oder erneuter Klick: zurück in Ruhe, Button wieder „Play“.
- Button-Label: „{Wort} anhören“ / „Anhalten“.
- Hover: `--orange-700`, `scale(1.06)`. Aktiv: `scale(.94)`.

**Lange Wörter:** Bei mehr als 28 Zeichen im Ring wird es eng. `TODO(startseite):` Regel festlegen (Vorschlag: nur so viele Buchstaben morsen, wie unter 28 Zeichen passen, ab dem Wortanfang).

### 5.2 Ohne Hörprobe (`audio="nein"`)

- Im Siegel statt des Buttons der **Anfangsbuchstabe** (`.h20__sk`, Fira 800, 3rem / Mobil 2.1rem, `--color-ink-strong`, `aria-hidden`). Der Ring bleibt und dreht sich.
- Unter dem Beispiel die Pille `a.h20__noaud` (gestrichelt, `999px`, Icon Mikrofon) mit Link zum Einsprechen für genau dieses Wort. Hover: Rand durchgezogen Orange, Fläche `--card2`.

---

## 6. Mitforschen „Forsch ma mit!“ (Abschnitt 2)

Links: Überschrift, Satz, Karte „Dit Wort steht zur Abstimmung“ mit Wort und Bedeutung (Kante links 4px Orange, Fläche `--card2`, Pfeil rechts, mobil um 90° gedreht). Die Karte verlinkt auf die Wortseite.

Rechts: Frage „Sagste „{Wort}“ noch?“ und drei Kacheln (`button.w17__tile`, min. 72px hoch, Fläche `--card2`):

| Kachel | Unterzeile | Datenfarbe |
|---|---|---|
| Sag ick selbst | Kommt mir regelmäßig übern Mund | `--d-bl` |
| Kenn ick | Hab ick schon mal jehört | `--d-ye` |
| Nie jehört | Is mir janz neu | `--d-gr` |

Icon im 44px-Kreis mit gestricheltem Ring, Farbe `--color-ink-strong`, Hover: Ring und Icon Orange, Icon `rotate(-8deg) scale(1.08)`.

**Nach der Stimme:** Die Kacheln weichen dem Ergebnis: 100 Punkte (je 1 %), gruppiert nach den drei Antworten in den Datenfarben, der Punkt der eigenen Stimme ist markiert (`.me`). Legende mit Prozent und „deine Stimme“. Grafik `role="img"` mit Text, z. B. „41 Prozent sagen es selbst, 44 Prozent kennen es, 15 Prozent haben es nie gehört“.

Darunter: „Schon {n} Stimmen – wat sagst du? Dit Ergebnis siehste danach.“

Gleiche Logik und gleicher Endpunkt wie die Umfrage auf der Wortseite. **Ein Klick, keine Anmeldung**, eine Stimme pro Gerät und Wort (wie auf der Wortseite).

---

## 7. Themen-Register „Kiek ma rin“ (Abschnitt 3)

`ol.tv__reg`, sechs Zeilen `a.tv__row`, Raster `3.5rem | 1fr | auto`:

- Nummer `01`–`06` (Fira 800, 1.125rem, `--t3`)
- Themenname riesig (Fira 800, Versalien)
- darunter 2–3 Beispielwörter (`--t3`)
- rechts Zähler („214“ + „Wörter“)
- Trennlinie oben und unten

**Hover/Fokus (nur `hover: hover`):**
- Name wird `--color-accent-text` und rückt 12px nach rechts.
- Beispielwörter klappen auf (`max-height 0 → 2rem`, Opazität, 0,35s).
- **Sprechblase** `.tv__say` erscheint rechts (`right: 10rem`): ein typischer Satz zum Thema, Fläche `--orange-600`, weiß, kursiv 700, 1.375rem, `rotate(-3deg)`, Spitze nach links. `aria-hidden`.

**Ohne Hover und mobil:** Nummer und Sprechblase entfallen, Beispielwörter immer sichtbar (0.875rem).

Rechts oben im Kopf: Link „Alle Themen“.

---

## 8. Suche

Gleiches Verhalten wie v5 §22.10, mit diesen Festlegungen:

- `form role="search"`, GET auf `/suche?q=…` (funktioniert ohne JS). Unsichtbares Label „Wort suchen“.
- Feld: Lupe links (`--t3`), `input type="search"` 1.25rem, Platzhalter „Wat suchste? Berlinerisch oder Hochdeutsch“, Button „Suchen“ (`--orange-600`, min. 52px, Icon + Text, mobil nur Icon mit `aria-label`).
- **Lösch-Kreuz:** Das Browser-Kreuz ist aus (`::-webkit-search-cancel-button { appearance: none; display: none }`). Stattdessen `button.h20__clr` 36px rund, Kreuz 16px aus zwei Strichen, `--t3`, Hover `--card2` + `--color-ink-strong`, `aria-label="Eingabe löschen"`. Nur sichtbar, wenn das Feld Text hat. Klick: Feld leeren, Liste schließen, Fokus bleibt im Feld.
- **Fokus:** `box-shadow: 0 0 0 3px` Orange 45 % + `--paper-lift`.
- **Vorschlagsliste** (Combobox, ab 2 Zeichen, 150ms Debounce), 8px unter dem Feld, `z-index: 20`:
  - Gruppe „Berlinerisch“: Treffer im Lemma, Treffer-Teil als `<mark>` (orange, fett)
  - Gruppe „Gefunden über Hochdeutsch“: Treffer in der Bedeutung, Lemma fett, Bedeutung mit `<mark>`
  - höchstens 6 Einträge, der aktive mit Fläche `--card2` und 3px-Orange-Kante links, `kbd Enter`
  - letzte Zeile: „Alle {n} Treffer für „{q}“ →“
  - Fußzeile `↑ ↓ auswählen · Enter öffnen · Esc schließen` (nur Desktop/Tablet)
- **Kein Treffer** (`role="status"`): „Nüscht jefunden für „{q}““, „Meintest du X oder Y?“, dann gestrichelter Kasten „„{q}“ als Wort vorschlagen“ mit Unterzeile „Kennste dit? Dann trag et ein.“ (Link mit vorausgefülltem Begriff).
- Tastatur: `/` fokussiert die Suche, ↑↓ wählt, Enter öffnet die Wortseite (ohne Auswahl: Suchseite), Esc schließt.
- `TODO(startseite):` klären, ob das bestehende Such-Modal auf der Startseite durch die Inline-Liste ersetzt wird (aus v5 offen).

---

## 9. Spiel „Berliner oder nich?“ (Abschnitt 4)

Orange-Band. Links:
- h2 und Satz „Echtet Berlinerisch oder frei erfunden? Lies dit Wort, entscheide dich. 20 Karten, 3 Leben, und für jede Serie jibt’s mehr Punkte.“
- Multiplikator-Leiste `ol.h19__mult`: ×1, ab 3 ×2, ab 6 ×3, ab 10 ×5. Kästchen `rgb(255 255 255 / 14%)`, das letzte weiß mit Orange-Text. Werte aus den Spielregeln (BON-Backend), nicht fest einbauen.
- Buttons: „Jetzt spielen →“ (weiß, Orange-Text) und Textlink „Rangliste dieser Woche“.
- „**{n}** Runden heute jespielt“ (14px, weiß 85 %).

Rechts: **Probekarte** auf einem Stapel (zwei Karten dahinter, versetzt gedreht). Karte `#fff8f0`, Text `#2b333b`, `rotate(-1.5deg)`. Inhalt: „Is ditt Berlinerisch?“, Wort, „Die am häufigsten falsch jeratene Karte“.

Darunter zwei Buttons (56px, 2px weißer Rand, transparent; Hover weiß gefüllt): „← Nee, erfunden“, „Ja, Berlinerisch →“. Hinweis „Jeht ooch mit den Pfeiltasten.“ (Desktop) bzw. „Jeht ooch mit Wischen.“ (Touch).

**Antwort:**
- Die Karte fliegt raus: Ja nach rechts, Nee nach links (`translateX(±130%) rotate(±22deg)`, 0,45s), dann
- Auflösung (`role="status"`): „Richtig, ditt is Berlinerisch!“ oder „Knapp daneben!“, Satz mit Bedeutung und „{x} % haben hier „{falsche Antwort}“ jetippt.“, Links „{Wort} nachschlagen“ und „Weiterspielen →“, Button „Nochmal die Probekarte“.
- Die Probekarte zählt **nicht** für die Rangliste.
- Pfeiltasten ← / → wirken nur, wenn der Fokus im Spielbereich liegt.

Die Probekarte ist die am häufigsten falsch geratene Karte der Woche (BON-Statistik).

---

## 10. „Frisch uff’m Tisch“ (Abschnitt 5)

Kopf: h2 und rechts Link „Zum Wort-Index“.

**Links: „Neu im Wörterbuch“** (`ul.h18__neu`), 5 Einträge: Wort (fett), Bedeutung (`--t3`), rechts relative Zeit („vor 2 Tagen“, 13px `--t3`). Mobil: Bedeutung unter dem Wort, Zeit rechts über beide Zeilen.

**Rechts: Reiter** `role="tablist"` mit „Gerade beliebt“ und „Im Aufwind“ (Fira 600, 1.5rem, aktiver Reiter `--color-ink-strong` mit 3px-Orange-Strich, der von links aufzieht). Panels mit `role="tabpanel"` und `aria-labelledby`.

| Reiter | Zeile |
|---|---|
| Gerade beliebt | Rang 1–5 (Fira 800, 1.75rem, `--t3`), Wort, 10 Punkte (8px, gefüllt `--d-bl`, leer als Ring `--card3`), rechts Prozent |
| Im Aufwind | Rang, Wort + Bedeutung, rechts Pfeil-Icon und „+{n}“ in `--ok` |

„Gerade beliebt“: die 5 meistaufgerufenen Wörter der letzten 7 Tage. Die Prozentzahl ist der Anteil „Sag ick selbst“ aus der Umfrage, ein Punkt je 10 %. „Im Aufwind“: größter Zuwachs an Aufrufen gegenüber der Vorwoche. `TODO(startseite):` Definitionen bestätigen.

---

## 11. Ergebnis-Band „Wo wird noch berlinert?“ (Abschnitt 6)

Dunkles Band in beiden Themes (§4.3). Kopf mit Korrektur-Überschrift und Satz „Bei jedem Wort fragen wir: Sagste dit selbst noch? Aus den Antworten sehen wir, wo und von wem Berlinerisch heute noch gesprochen wird.“

**Reiter** `role="tablist"` „Nach Bezirk“ / „Nach Alter“, Stil wie §10, auf Dunkel (`#a8b2bc`, aktiv `#fff`). 40px Abstand zum Inhalt.

### 11.1 Nach Bezirk

**Links:**
- Legende „wenig berlinert ● ● ● ● viel berlinert“ (Punkte 5–8px, Opazität .3–1)
- „Am meisten berlinert“: Top 3 Bezirke mit Prozent
- „Am wenigsten“: die 2 untersten
- Fußnote mit Quelle der Kartengeometrie

**Rechts: Punktkarte** aus `website/src/assets/berlin-bezirke-punkte.json` (1091 Punkte, 12 Bezirke, `viewBox` 0 0 404 340):
- Positionen fest. Pro Bezirk berechnet aus dem Wert `v` („Sag ick selbst“ in %):
  - `r = 1.6 + 2.0 * v / 100`
  - `opacity = 0.18 + 0.82 * clamp((v - 30) / 56, 0, 1)`
- Farbe `--d-ye`.
- Jeder Bezirk ist ein `<g>` mit `tabindex="0"` und `aria-label` „{Bezirk}, typisch: {Wort}. {v} Prozent sagen Sag ick selbst“.
- **Hover/Fokus auf einem Bezirk:** alle anderen Bezirke `opacity: .12`, Tooltip (weiße Fläche, Radius 4) mit zwei Zeilen „{Bezirk} · {v} %“ und „Typisch: {Wort}“, 13px. Auf Touch: Tippen fokussiert den Bezirk und zeigt den Tooltip, Tippen daneben schließt.
- „Typisch“ = das Wort, dessen „Sag ick selbst“-Anteil im Bezirk am weitesten über dem Berliner Schnitt liegt.
- Der äußere `<svg>` bekommt `role="group"` mit `aria-label` (nicht `role="img"` wie im Mock, sonst sind die Bezirke für Screenreader unsichtbar).

Ortsteile statt Bezirke gehen erst mit ALKIS-Ortsteildaten (siehe §16).

### 11.2 Nach Alter

Satz: „Welche Wörter sagen nur noch Ältere, welche auch Junge? Jeder Punkt steht für 10 % der Stimmen „Sag ick selbst“, aufgeteilt auf vier Altersgruppen.“

Zwei Listen (h3 „Stirbt langsam aus“, „Lebt und wächst“), je 4 Wörter mit Bedeutung. Rechts pro Wort das **Punkt-Altersprofil**:
- vier Spalten nebeneinander (unter 30, 30–44, 45–59, 60+), gap 7px
- jede Spalte 10 Punkte von unten nach oben (`flex-direction: column-reverse`, gap 2px), Punkt 7×7, rund
- gefüllt = `round(anteil / 10)`, Farbe `--d-gr`, leer = 1px-Ring in `--d-gr` 45 %
- hervorgehoben: bei „Stirbt langsam aus“ die Spalte 60+ in `--d-ye`, bei „Lebt und wächst“ die Spalte unter 30 in `--d-bl`
- `role="img"` mit `aria-label` „unter 30: 3 %, 30–44: 8 %, 45–59: 22 %, 60+: 67 %“

Achsen-Zeile darunter: „Spalten von links nach rechts, ein Punkt je 10 %: unter 30 · 30–44 · 45–59 · 60+ · nur Gruppen ab 10 Stimmen“.

**Auswahl der Wörter:** „Stirbt langsam aus“ = höchster Anteil 60+ bei mindestens N Stimmen. „Lebt und wächst“ = höchster Anteil unter 30. `TODO(startseite):` N festlegen.

### 11.3 Datenschutz (verbindlich)

- Nur Aggregate. Eine Gruppe (Bezirk, Altersgruppe, Bezirk × Wort) wird erst ab **10 Stimmen** gezeigt (`MIN_GROUP = 10`). Darunter: Bezirk grau ohne Wert, Altersspalte leer, Wort nicht in der Liste.
- Ausgeliefert über einen eigenen Server-Endpunkt (Vorschlag `GET /api/home-stats`), täglich vorberechnet und gecacht. Keine Einzelstimmen, keine Zeitstempel, nichts davon im Such-Index.

---

## 12. Text und Inhalte

### 12.1 „Wat is Berlinerisch?“ (Abschnitt 7)

Fließtext rund 900–1.000 Wörter in einem `<article>`. Absätze und h3 wörtlich aus dem Mock: Einleitung, „Dialekt, Stadtsprache oder Metrolekt?“, „Woher kommt Berlinerisch?“, „So klingt Berlin“, „Die Berliner Schnauze“, „Berlinerisch heute“. Erster Absatz mit Initiale (Fira 800, 5.2rem, `--color-ink-strong`, `aria-hidden`; der Buchstabe steht nochmal im Text, also `<span aria-hidden>B</span>` + Rest des Worts so bauen, dass Screenreader „Berlinerisch“ lesen). Wortlinks unterstrichen (Orange-Unterstrich, 3px Abstand).

**Lautregeln-Kasten** `aside.h20__side` „Berlinerisch auf einen Blick“: Zeile = Hochdeutsch klein und durchgestrichen (Strich in Orange, zieht beim Einblenden auf), darunter Berlinerisch groß (Fira 800, 1.6rem, Akzent), rechts Beispiel kursiv + Regel in 13px. Sechs Regeln: ich → ick, g → j, das → dit/det, au → oo, ei → ee, mich → mir. Darunter „Typisch Berlin“ mit Wort-Chips.

**Mobil eingeklappt:** Einleitung + erste zwei h3 sichtbar, der Rest in `<details class="h20__more">` mit Summary „Mehr über Berlinerisch“ (Karte, Pfeil-Chevron in Orange, dreht beim Öffnen). **Ein DOM für alle Breakpoints:** den Text einmal rendern, `<details>` immer im HTML, auf ≥ 808px per kleinem Script `open` setzen und die Summary per CSS ausblenden. Der Text bleibt so immer im HTML und wird indexiert.

Im Text steht „Die Übersicht rechts zeigt …“. Auf Tablet und Mobil steht der Kasten darunter. `TODO(startseite):` Satz neutral formulieren („Die Übersicht zeigt …“).

### 12.2 FAQ + Über (Abschnitt 8)

Fläche `--card`. Links „Häufig jefragt“, 6 Fragen als `<details>` mit `<h3>` in der Summary (Wortlaut aus dem Mock). Plus-Kreis 28px (`--card2`, Hover `--card3`), Plus in Orange wird beim Öffnen zum Minus (0,25s). Antwort `max-width: 64ch`, `line-height: 1.7`. Die erste Frage ist offen.

Rechts `aside.h20__about` „Über ditt Wörterbuch“ (`--card2`): Satz zur Arbeitsweise, 4 Kennzahlen (Wörter und Redewendungen, Themen, Hörproben, Stimmen in der Umfrage) als 2×2-Kacheln (`--card`, Zahl Fira 800 1.9rem, Label 13px), Links „Quellen und Arbeitsweise“, „Wat is neu?“.

### 12.3 Magazin (Abschnitt 9)

`article.h20__mz`. Links: Label „Magazin · Sprache & Jeschichte“, Zitat als `blockquote` (Fira 800, Versalien, 3.75rem / Mobil 2.4rem, Akzent), h3 mit Artikeltitel als Link (2px-Orange-Unterstrich), Lesezeit. Rechts: Leseprobe (erste ~90 Wörter des Artikels) mit Initiale, nach unten ausgeblendet (`mask-image: linear-gradient(180deg, #000 55%, transparent)`, `max-height: 15.5rem`), Link „Weiterlesen →“, darunter „Ooch lesenswert“ mit zwei weiteren Titeln.

Hinter dem Zitat die Lautschrift des Kernworts als Kontur („[ɪk]“, wie in der Bühne, mobil 13rem).

Zitat und Kernwort kommen aus dem Artikel (`TODO(startseite):` Felder `teaserZitat`, `teaserIpa` im Magazin-Post oder aus dem ersten Pull-Quote).

### 12.4 Mitmachen (Abschnitt 10)

Gestrichelter Kasten. Kalle (`BerlinerBaer.vue`, Variante `plain`, Pose `zeigen`, 170px, auf `--card2`-Kreis, leichtes Wippen 3,2s). Rechts h2, Satz, Hinweis „**{n}** Wörtern fehlt noch eene Hörprobe. Zeig mir eens“ (Link auf ein zufälliges Wort ohne Hörprobe), Buttons „+ Wort vorschlagen“ (primär) und „+ Aussprache einsprechen“ (sekundär, gestrichelt).

### 12.5 Zum Mitnehmen (Abschnitt 11)

Leiste `--card2`, 40px oben und unten, zwei Hälften mit Trennlinie: Icon (`--t3`), „Als App uffs Handy“ / „Offline, mit Wort des Tages. Ohne Store.“, Button „App installieren“ (primär). Rechts „Anki-Deck zum Lernen“ / „Lite für lau, volles Deck einmal kaufen.“, Button „Deck laden“ (sekundär). Install-Zustände wie v5 §22.9 (Tabelle „Installieren“). Ist die App schon installiert, entfällt die linke Hälfte.

---

## 13. Daten

| Abschnitt | Quelle | Felder | Fehlen |
|---|---|---|---|
| Intro | Global „Startseite (Fakten)“ | Wortanzahl | Satz ohne Zahl |
| Wort des Tages | bestehende API | Lemma, Artikel/Wortart, IPA, Bedeutung, erstes Beispiel + Übersetzung, Audio-URL + Dauer, `slug` | ohne Audio: §5.2, ohne IPA: keine Kontur |
| Probier mal / Stöbern | **neu:** Global „Startseite“ | 4 Wörter; Filter-Links auf die Suchseite | Zeile entfällt |
| Mitforschen | Umfrage-Endpunkt der Wortseite | Wort des Umfrage-Tages, Stimmen gesamt, Anteile | Abschnitt entfällt |
| Themen | Themen-Collection | Top 6 nach Wortanzahl: Name, `slug`, Zahl, 2–3 Beispielwörter, **neu:** `typischerSatz` | Sprechblase entfällt |
| Spiel | BON-Endpunkte | Multiplikator-Stufen, Runden heute, Karte der Woche + Fehlquote | ohne Karte: Stapel ohne Probe, nur „Jetzt spielen“ |
| Neu im Wörterbuch | Wort-Collection | 5 neueste veröffentlichte, `publishedAt` | Liste entfällt, Ranking volle Breite |
| Beliebt / Aufwind | Word Pulse / Wort-Statistik | Top 5, Aufrufe, Δ zur Vorwoche, „Sag ick selbst“-Anteil | leerer Reiter wird ausgeblendet |
| Ergebnis-Band | `/api/home-stats` (§11.3) | pro Bezirk `v` + typisches Wort; Altersprofile | Reiter ohne Daten entfällt; beide leer: Band entfällt |
| Wissen, FAQ | **neu:** Global „Startseite“ | Rich Text, Lautregeln (6), FAQ-Liste | – |
| Über | Global „Startseite (Fakten)“ | 4 Kennzahlen | Kachel entfällt |
| Magazin | Magazin-Posts | neuester: Titel, Zitat, IPA, Leseprobe, Lesezeit, `slug`; 2 weitere Titel | Abschnitt entfällt |
| Mitmachen | Wort-Collection | Anzahl ohne Audio, Zufallswort ohne Audio | Hinweiszeile entfällt |

**Caching:** Wort des Tages, Umfrage-Wort und Spielkarte wechseln täglich (Europe/Berlin). Beliebt/Aufwind stündlich, Ergebnis-Band täglich.

---

## 14. SEO

- `<title>`: „Berliner Wörterbuch – Berlinerisch auf Hochdeutsch erklärt | Berliner Schnauze“
- Meta-Description: „Über 1.700 Berliner Wörter mit Bedeutung, Aussprache, Herkunft und Beispielsätzen. Von Atze bis Zicke, jeprüft und jesammelt mit der Community.“ (Zahl live)
- **Genau eine H1** „Berliner Wörterbuch“. Das Wort des Tages ist h2.
- Überschriften-Hierarchie wie §2 ohne Sprünge. Durchgestrichene Zeilen sind `<p aria-hidden="true">`, keine Überschriften.
- JSON-LD:
  - `WebSite` mit `SearchAction`, `Organization` (vorhanden)
  - `FAQPage` mit den sichtbaren Fragen (kein Rich Result mehr, aber Zitiersignal für KI-Suche)
  - `DefinedTerm` für das Wort des Tages mit `inDefinedTermSet`
- Alle Wörter sind echte `<a href>` zu Wortseiten (interne Links).
- Eingeklappter Text (mobil) steht im HTML.
- Suchseite `/suche`: `noindex, follow`.
- `llms.txt` / Markdown-Fassung: Intro, „Wat is Berlinerisch?“, Lautregeln, FAQ.

---

## 15. Zustände und Interaktionen

Alle Zustände stehen auf den Boards `StartV20Zustaende*`.

| Element | Hover | Fokus | Aktiv / Ausgewählt |
|---|---|---|---|
| Primär-Button | `--orange-700`, Schatten `0 6px 16px rgb(0 0 0 / 22%)` | Ring | `--orange-800`, `scale(.98)`, kein Schatten |
| Sekundär-Button (gestrichelt) | Rand durchgezogen Orange, Fläche `--card2` | Ring | `scale(.98)` |
| Weißer Button (Spiel-Band) | wie Default | Ring weiß | `#ffd3c0`, `scale(.98)` |
| Nee/Ja (Spiel) | weiß gefüllt, Text `--orange-700` | Ring weiß | `scale(.97)` |
| Play im Siegel | `--orange-700`, `scale(1.06)` | Ring | `scale(.94)`, spielt: Pause-Icon |
| Suchfeld | – | Orange-Schein 3px | Suchen-Button `scale(.96)` |
| Probier-Chips (Wörter) | Fläche `--card3` | Ring | `scale(.96)` |
| Stöber-Chips (mit Icon) | Rand Orange, Fläche `--card2`, Icon Orange | Ring | `scale(.96)` |
| Textlinks | `--color-accent-text`, Unterstrich bleibt | Ring | – |
| Pfeil-Links („Zum Wort“, „Weiterspielen“, „Alle Treffer“) | Pfeil `translateX(4px)`, Unterstrich `--orange-300` | Ring | – |
| Reiter | Text `--color-ink-strong` | Ring | Strich 3px Orange, `aria-selected="true"` |
| Listenzeile | Fläche `--card2`, `translateX(6px)`, Wort `--color-accent-text` | Ring | Fläche `--card3` |
| Umfrage-Kachel | Icon und Ring Orange, Icon `rotate(-8deg) scale(1.08)` | Ring | Fläche `--card3`, `scale(.98)`; Klick zeigt das Ergebnis |
| Themen-Zeile | §7 | wie Hover | – |
| FAQ-Summary | Frage `--color-accent-text`, Kreis `--card3` | Ring | offen: Minus |
| Karten-Bezirk | andere dimmen, Tooltip | wie Hover | – |

**Fokusring überall:** `outline: 2px solid var(--orange-500); outline-offset: 3px`. Im Spiel-Band `outline-color: #fff`.

---

## 16. Animation und Bewegung

Einblendungen laufen **beim ersten Sichtbarwerden** des Abschnitts (IntersectionObserver, `threshold: .2`, einmalig). Im Canvas laufen sie beim Laden, im Code nicht.

| Element | Auslöser | Animation | Dauer | Easing |
|---|---|---|---|---|
| Wort des Tages, Buchstaben | Laden | `translateY(45%) → 0`, Opazität, je Buchstabe +70ms | 0,7s | `cubic-bezier(.2,.8,.2,1)` |
| Bedeutung, Beispiel, „Zum Wort“ | Laden | `translateY(14px)`, Opazität, Start 0,35s | 0,6s | ease |
| Siegel-Zeichen | Laden | `scale(0 → 1)`, je Zeichen +40ms, Start 0,5s | 0,35s | `cubic-bezier(.3,1.5,.6,1)` |
| Siegel-Ring | dauerhaft | Drehung 360° | 60s | linear, pausiert beim Abspielen |
| IPA-Kontur | Laden | Opazität, danach Drift `translateX(-2.5%)` | 1,4s / 18s | ease-in-out, alternate |
| Korrektur-Strich | sichtbar | `scaleX(0 → 1)` von links, Start 0,25s | 0,5s | `cubic-bezier(.6,0,.3,1)` |
| Abschnitts-h2 | sichtbar | `h19-up`, Start 0,55s | 0,5s | ease |
| Listen, Kacheln, Register-Zeilen, Lautregeln | sichtbar | `h19-up`, gestaffelt je 60ms | 0,4–0,45s | ease |
| Beliebt-Punkte | sichtbar | `scale(0 → 1)`, je Punkt +40ms | 0,3s | `cubic-bezier(.3,1.5,.6,1)` |
| Karten-Punkte | sichtbar | `scale(0 → 1)`, Verzögerung `delay` aus dem JSON (Welle) | 0,5s | `cubic-bezier(.3,1.5,.6,1)` |
| Spielstapel | sichtbar | Karten „ausgeteilt“ `translate(40px,30px) rotate(10–14deg) → Stapel` | 0,6s | ease |
| Probekarte | dauerhaft | kurzes Wackeln alle 4s (Hinweis „schieb mich“) | 4s | ease-in-out |
| Karte raus | Antwort | §9 | 0,45s | `cubic-bezier(.3,.7,.3,1)` |
| Auflösung | Antwort | `rotateY(70deg) → 0` | 0,45s | `cubic-bezier(.2,.8,.2,1)` |
| Kalle | dauerhaft | Wippen `translateY(-6px)` | 3,2s | ease-in-out |
| FAQ-Antwort | öffnen | `h19-up` | 0,3s | ease |
| Magazin-Zitat | sichtbar | `h19-up` | 0,6s | ease |
| Reiter-Strich | Wechsel | `scaleX(0 → 1)` von links | 0,25s | ease |

`@keyframes` stehen im Mock unter `h19-*`.

**`prefers-reduced-motion: reduce`:** alle Einblendungen, Drehung, Drift, Wackeln, Wippen und die Karten-Welle aus. Alles steht sofort im Endzustand. Die Morse-Markierung beim Abspielen bleibt (sie zeigt den Fortschritt), aber ohne Schein. Hover-Übergänge bleiben.

**Leistung:** nur `transform`, `opacity` und `clip-path` animieren. Die 1091 Kartenpunkte als ein inline-SVG, die Animation per CSS-Variable, kein JS pro Punkt.

---

## 17. Barrierefreiheit

**Fokus-Reihenfolge:** Header → Wortlinks im Intro → Play → „Noch keene Hörprobe“ → „Zum Wort“ → Suchfeld → Lösch-Kreuz → Suchen → Probier-Chips → Stöber-Chips → Abstimmungs-Karte → Umfrage-Kacheln → Themen → „Alle Themen“ → Spiel-Buttons → Probekarte Nee/Ja → Neu-Liste → Reiter → Ranking → Ergebnis-Reiter → Bezirke (in Listen-Reihenfolge der Rangliste) → Wissen-Links → FAQ → Über-Links → Magazin → Mitmachen → Mitnehmen → Footer.

- **Reiter** (Frisch, Ergebnis-Band): WAI-ARIA-Tabs-Muster, ←/→ zwischen Reitern, `tabindex="-1"` auf dem inaktiven, Panels `role="tabpanel"`.
- **Umfrage:** `role="group" aria-label="Sagste det noch?"`. Nach der Stimme Fokus auf die Ergebnis-Überschrift, Ergebnis per `aria-live="polite"`.
- **Spiel:** Buttons mit sichtbarem Text, `aria-keyshortcuts="ArrowLeft"` / `"ArrowRight"`, Auflösung `role="status"`.
- **Siegel:** Der Ring ist `aria-hidden`. Der Play-Button hat ein wechselndes `aria-label`.
- **Karte:** §11.1. Die Rangliste daneben enthält die wichtigsten Werte als Text.
- **Altersprofil, Beliebt-Punkte:** Grafik `aria-hidden` oder `role="img"` mit Werten als Text (§11.2). Prozentzahl steht immer als Text daneben.
- **Durchgestrichene Zeilen:** `aria-hidden="true"`.
- **Touch-Ziele:** mindestens 44px. Chips 36px hoch bei 8px Abstand (Ausnahme nach WCAG 2.5.8, Ziel ≥ 24px plus Abstand).

### Kontraste (gemessen im Mock, WCAG 2.1)

| Paar | Light | Dark |
|---|---|---|
| Fließtext auf `--page` | 10,4 : 1 | 12,5 : 1 |
| `--t3` auf `--page` (13–17px) | 5,4 : 1 | 7,6 : 1 |
| `--t3` auf `--card` / `--card2` | 6,6 / 5,9 : 1 | 5,7 / 4,8 : 1 |
| `--t3` auf `--card3` | 5,1 : 1 | **3,7 : 1, nicht verwenden** |
| Akzent (Lemma, Lautregel) auf `--page` | 4,8 : 1 (≥ 24px) | 8,5 : 1 |
| Weiß auf `--orange-600` | 5,9 : 1 | 5,9 : 1 |
| Ergebnis-Band, Nebentext auf `#14191e` | 8,2 : 1 | 8,2 : 1 |
| „Runden heute“ (weiß 85 % auf Orange, 14px) | 4,7 : 1 | 4,7 : 1 |

Der Akzent `--orange-600` auf `--page` (4,8 : 1) nur für große Schrift oder fett ab 18,5px verwenden.

---

## 18. Komponenten (Vorschlag Astro + Vue)

| Komponente | Art | Hydration | Inhalt |
|---|---|---|---|
| `HomeIntro.astro` | Astro | – | H1, Erklärsatz |
| `WordOfTheDayStage.vue` | Vue | `client:visible` | Lemma, IPA-Kontur, `WordSeal`, Bedeutung, Beispiel, ohne-Audio-Pille |
| `WordSeal.vue` | Vue | (Kind) | Morse-Ring + Play, **gemeinsam mit der Wortseite v17** |
| `HomeSearch.vue` | Vue | `client:load` | Combobox, Lösch-Kreuz, `/`-Taste |
| `BrowseChips.astro` | Astro | – | Probier mal, Stöbern |
| `HomePoll.vue` | Vue | `client:visible` | Kacheln, Ergebnis-Punkte, **gemeinsam mit der Wortseite** |
| `TopicRegister.astro` | Astro | – | 6 Zeilen, Hover rein per CSS |
| `BonTeaser.vue` | Vue | `client:visible` | Stapel, eine Probekarte, Pfeiltasten, Wischen |
| `FreshLists.vue` | Vue | `client:visible` | Neu + Reiter Beliebt/Aufwind (SSR beide Panels) |
| `ResultsBand.vue` | Vue | `client:visible` | Reiter, `DotMap`, `AgeDots` |
| `DotMap.vue` | Vue | (Kind) | SVG aus JSON + Werten, Tooltip |
| `AgeDots.vue` | Vue | (Kind) | 4×10 Punkte |
| `BerlinerischArticle.astro` | Astro | – | Text, `<details>` für Mobil, Lautregeln-Kasten |
| `FaqAbout.astro` | Astro | – | FAQ + JSON-LD, Über-Kasten |
| `MagazineQuote.astro` | Astro | – | Zitat, Leseprobe |
| `SuggestGap.astro` | Astro | – | Kalle, Hinweis, Buttons |
| `ToGoBar.vue` | Vue | `client:idle` | App-Install-Logik, Anki |

Seitenspezifische Klassen im Mock beginnen mit `.h18__`, `.h19__`, `.h20__`, `.tv__`, `.w17__`. Im Code als Scoped Styles der Komponenten, Tokens aus §4 als CSS-Variablen.

---

## 19. Grenzfälle

- **Sehr langes Wort des Tages** (z. B. „Kodderschnauze“, im Mock nicht gezeigt, Vorschlag): Lemma `font-size: clamp(3.5rem, 12vw, 10rem)`, Siegel bricht in die nächste Zeile (`flex-wrap`). Morse §5.1.
- **Lange Bedeutung:** bis 2 Zeilen voll, danach normal umbrechen. Keine Kürzung.
- **Themenname länger als die Zeile:** Umbruch erlaubt, Zähler bleibt rechts oben.
- **Weniger als 6 Themen / 5 Listeneinträge:** zeigen, was da ist. Ab weniger als 3: Liste entfällt.
- **Kein Wert für einen Bezirk** (unter `MIN_GROUP`): Punkte in `--d-gr` 20 %, Tooltip „{Bezirk} · noch zu wenig Stimmen“.
- **JS aus:** Suche geht per GET, Reiter zeigen das erste Panel, `<details>` funktionieren, Umfrage und Spiel verlinken auf Wortseite bzw. Spielseite.
- **Langsame Verbindung:** Karte und Altersprofil als SSR-HTML, keine Skeletons nötig. Audio erst beim Klick laden (`preload="none"`).

---

## 20. Offene Punkte

1. Morse-Regel für lange Wörter (§5.1).
2. Definition „Gerade beliebt“ / „Im Aufwind“ (§10).
3. Mindestzahl Stimmen für die Altersliste (§11.2) und ob die Umfrage Bezirk und Altersgruppe **heute schon erhebt**. Falls nicht: Ergebnis-Band zunächst ausblenden und die Felder als optionale Angaben in der Umfrage ergänzen (eigener Auftrag, Datenschutz §11.3).
4. Feld `typischerSatz` je Thema (§7) und Magazin-Felder `teaserZitat`, `teaserIpa` (§12.3).
5. Satz „Die Übersicht rechts“ (§12.1).
6. Such-Modal vs. Inline-Liste (§8).
7. Ortsteile statt Bezirke: braucht ALKIS-Ortsteildaten und ein neues Punktraster.

Diese Punkte nicht selbst entscheiden: fragen oder die genannte Zwischenlösung bauen und mit `TODO(startseite):` markieren.

---

## 21. Tests und Abnahme

- **Vitest:**
  - Morse-Ring: Anzahl und Positionen für „KIEZ“ (10 Zeichen) und „SCHRIPPE“ (25), Umlaute
  - Punkt-Radius/Opazität aus `v`, `clamp` an den Rändern
  - `MIN_GROUP`-Filter: Gruppen unter 10 erscheinen nicht
  - Altersprofil: `round(anteil / 10)` gefüllte Punkte
  - Relative Zeit „vor 2 Tagen“ / „vor 1 Woche“
- **Playwright:**
  - Screenshots 390 / 834 / 1280 × Dark / Light gegen das Mockup aus der Git-History
  - `/` fokussiert die Suche, Pfeiltasten und Esc in der Vorschlagsliste, Lösch-Kreuz leert das Feld
  - Reiter per Tastatur (beide Tablists)
  - Umfrage: Stimme → Ergebnis sichtbar, Fokus auf Ergebnis
  - Spiel: ← / → beantworten die Probekarte
  - Mobil: `<details>` im Wissensteil zu, ab 808px offen, Text in beiden Fällen im DOM
  - `reducedMotion: 'reduce'`: keine laufende Animation
  - kein Text unter 13px im `main`
  - genau eine `h1`
- **axe:** keine Verstöße. Besonders: Karte (`role="group"`), Tabs, Combobox.
- **Lighthouse:** CLS 0 in der Bühne (Schriften mit `size-adjust` oder Fallback-Metriken), LCP ist das Lemma.
