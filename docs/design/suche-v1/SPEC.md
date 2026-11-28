# Handoff Spec: Suche v1 (`/suche`) und Schnellsuche v1 (Modal)

Stand: 28. November 2026 (Update: Tablet und Schnellsuche) · Design System „Berliner Schnauze“ v3.1 + Palette v13 (wie Startseite v20, Wortseite v18, Footer v21)

> **Teil A** (§1–§17) beschreibt die Suchseite, **Teil B** (§18–§27) die Schnellsuche, die über jeder Seite aufgeht. Beide nutzen dieselbe Such-API und dieselbe KI-Komponente.
>
> Suche v1 ersetzt die heutige Wortsuche, also die Fraktur-Überschrift, die lange Filterspalte links mit Toggles und Schiebereglern und die großen Ergebniskarten. Neu sind:
> - die **Rückwärtssuche** (Hochdeutsch → Berlinerisch) im selben Feld
> - **neue Filter**: Gebrauch aus der Umfrage, Inhalt, Wortform
> - eine **kompakte Trefferliste** mit Umfrage-Anteil und Audio
> - die **semantische Suche mit Chrome-KI**, lokal im Browser

**Boards:** Canvas, Seite **„Suche v1 · Nachschlagen, rückwärts und nach Bedeutung“**

| Board | Breite | Zeigt |
|---|---|---|
| `SucheV1DesktopDark` | 1280 | Suche „brötchen“: Wort-Treffer, Trennzeile, Bedeutungs-Treffer; Wort des Tages; aktive Zeile (Tastatur) |
| `SucheV1DesktopLightStart` / `…DarkStart` | 1280 | ohne Suchbegriff: Register „Springen zu“, Liste A–Z, „Mehr laden“ |
| `SucheV1DesktopLightFilter` | 1280 | Popover „Gebrauch“ offen, aktive Filter-Chips |
| `SucheV1DesktopDarkKiAngebot` | 1280 | Beschreibung erkannt („jemand ist lustig“), Angebot der KI-Suche |
| `SucheV1DesktopLightKiLaden` | 1280 | KI-Modell muss erst geladen werden |
| `SucheV1DesktopDarkKiFertig` | 1280 | KI-Ergebnis über den Stichworttreffern |
| `SucheV1DesktopLightLeer` | 1280 | keine Treffer, „Meinste …“ |
| `SucheV1TabletDark` | 834 | Suche „brötchen“ |
| `SucheV1TabletLightKi` | 834 | KI-Ergebnis |
| `SucheV1TabletLightFilter` | 834 | ohne Suchbegriff, Popover „Inhalt“ offen |
| `SucheV1MobileDark` | 390 | Suche „brötchen“ |
| `SucheV1MobileLightKi` | 390 | KI-Ergebnis (nur Desktop-Chrome, siehe §8.1) |
| `SucheV1MobileDarkFilter` | 390 | Filter-Sheet offen |
| `SucheV1MobileLightStart` | 390 | ohne Suchbegriff |

**Dateien:**

| Datei | Inhalt |
|---|---|
| `design/SucheV1.dc.html` | **Referenz**: Markup, CSS, Logik, Mock-Daten, Filterlogik. Props siehe §15 |
| `design/SucheV1*.dc.html` | die 15 Boards (Header + SucheV1 + Footer v21) |
| `design/SchnellsucheV1.dc.html`, `design/SchnellsucheV1*.dc.html`, `design/generator-schnellsuchev1.py` | Schnellsuche: Referenz, 8 Boards, Quelle (Teil B) |
| `assets/schnellsuche/boards/*.jpg`, `assets/schnellsuche/zustaende/*.jpg` | Schnellsuche: Boards und der Dialog je Zustand |
| `design/generator-suchev1.py` | Quelle, aus der `SucheV1.dc.html` erzeugt wird. CSS und Texte sind dort lesbarer |
| `assets/boards/*.jpg` | Suchseite: Screenshot je Board (nur Suchteil), 1:1 |
| `assets/zustaende/*.jpg` | alle 6 Popover, KI-Zustände, Laden, Leer, Filter-Leer, Mobil-Sheet |
| `assets/fonts/`, `ds/` | Fira Sans Extra Condensed 600/800; Tokens und DS-CSS |
| `PROMPT.md` | Startauftrag für Claude Code |

**So liest du die `.dc.html`:**
- `{{x}}` kommt aus `renderVals()`.
- `<sc-if>` / `<sc-for>` entsprechen `v-if` / `v-for`.
- `size="mobile"` ist im Mock eine Klasse (`.s1--m`), im Code `< 808px`.
- Kalle ist als SVG eingebettet. Im Code: `BerlinerBaer.vue`.
- Die Mock-Wörter sind öffentliche Wörterbuch-Inhalte oder erfunden; die Prozentwerte, Stimmen und Zahlen sind **erfunden**. Keine Daten aus der Produktions-Datenbank in Tests oder Fixtures, denn die Dev-DB ist ein Produktions-Backup.

**Texte:**
- Die Seite betreibt eine Einzelperson: nie „wir/uns/unser/wa“.
- Keine Emojis, kein Fraktur.
- Texte wörtlich aus dieser SPEC bzw. der `.dc.html`.

---

## 1. Überblick

Leute kommen mit zwei Absichten:
- **Nachschlagen:** „Was heißt *Schrippe*?“
- **Rückwärts:** „Wie sagt der Berliner zu *Brötchen*?“

Dazu kommen ein paar Stöbernde. Daraus folgt:

1. **Ein Feld, beide Richtungen.** Kein Umschalter. Wort-Treffer kommen zuerst, dann Treffer in der Bedeutung, getrennt durch eine Zeile. Die Markierung zeigt, warum ein Treffer passt.
2. **Viele Treffer auf einen Blick.** Kompakte Zeilen (Desktop ca. 88 px, mobil 2 Zeilen) statt großer Karten.
3. **Filter oben, nicht daneben.** Chips mit Popover; aktive Filter als entfernbare Chips. Mobil als Bottom-Sheet.
4. **Bedeutungssuche als Ergänzung.** Beschreibt jemand statt zu suchen („jemand ist lustig“), bietet die Seite die lokale Chrome-KI an. Ohne Chrome-KI fehlt der Teil spurlos.

---

## 2. Aufbau (Reihenfolge)

| # | Block | Gezeigt, wenn |
|---|---|---|
| 1 | Kopf: h1 „Wörter suchen“ + Unterzeile | immer |
| 2 | Suchfeld (`role="search"`) + Meta-Zeile (Trefferzahl, Tastenkürzel) | immer |
| 3 | Filterleiste (Desktop) bzw. „Filter“-Button + Sortierung (mobil) | immer |
| 4 | Aktive Filter | mind. ein Filter aktiv |
| 5 | KI-Block „Nach Bedeutung“ | §8 |
| 6 | Leer-Zustand bzw. Filter-Leer-Zustand | §10 |
| 7a | ohne Suchbegriff: Register „Springen zu“ + Liste A–Z + „Mehr laden“ | Feld leer |
| 7b | mit Suchbegriff: Abschnitt „Treffer“ bzw. „Stichworttreffer“ + Liste | Treffer vorhanden |
| – | Footer v21, Slot `app` | immer |

---

## 3. Layout und Maße

| | Mobil (< 808px), Mock 390 | Desktop (≥ 1000px), Mock 1280 |
|---|---|---|
| Container | Padding `24px 16px 64px` | `max-width: 1208px` inkl. 24px Padding, oben 40px, unten 80px |
| h1 | Fira 800, 28px, Versalien, `--color-ink-strong` | Fira 800, 32px |
| Unterzeile | 15px `--t3`, direkt unter h1 (Abstand 6px) | 16px |
| Suchfeld | 56px hoch, Schrift 18px, Icon links 16px | 64px hoch, Schrift 22px, Icon links 20px; Text ab 56px |
| Meta-Zeile | nur Trefferzahl | Trefferzahl links, Tastenkürzel rechts, 15px / 13px, Abstand oben 12px |
| Filterleiste | entfällt → Zeile mit „Filter“-Button (44px) links und Sortier-Pille (44px) rechts | Chips 40px, `gap: 8px`, oben und unten 1px `--line`, Padding 12px 0, Abstand oben 20px |
| Aktive Filter | eine Zeile, horizontal scrollbar, bis zum Rand | umbrechend, Label „Aktiv“ davor |
| Liste | `--card`, Radius 4, `--paper-lift`; Zeile Padding `14px 16px` | Zeile Padding `14px 20px 14px 24px`, Spalten `1fr auto`, `gap: 4px 24px` |
| Register | über die volle Breite gezogen, horizontal scrollbar | eine Zeile, alle 29 Buchstaben teilen sich die Breite |

### 3.1 Tablet (808–999px, Mock 834)

Desktop-Layout als Basis, angepasst für Touch (Klasse `.s1--t` im Mock):

| Element | Tablet |
|---|---|
| Container | Padding `32px 24px 72px`, Inhaltsbreite 786px |
| Suchfeld | wie Desktop, 64px, mit Text „Nach Bedeutung“ am KI-Knopf; **ohne** `/`-Kürzel |
| Tastenkürzel in der Meta-Zeile | entfallen |
| **Sortierung** | wandert in die Meta-Zeile rechts neben die Trefferzahl (Pille 44px, ohne Text „Sortieren“). Grund: Filter-Chips und Sortierung passen bei 786px nicht in eine Zeile |
| Filter-Chips | **44px** hoch, Padding `0 10px 0 13px`, alle 7 in einer Zeile |
| Popover | 360px breit; Optionen und Checkbox-Zeilen 44px |
| Aktive Filter | Pillen 36px, „Alles zurücksetzen“ 44px Tippfläche |
| Register „Springen zu“ | horizontal scrollbar, Felder mindestens 44px breit (29 × 26px wären zu klein zum Tippen) |
| Trefferzeile | wie Desktop; Padding `14px 16px 14px 20px`, Spaltenabstand 16px, jesagt-Balken 48px, Play 40px |
| KI | wie Desktop. Läuft nur auf Tablets mit Desktop-Chrome (z. B. Chromebook, Windows-Tablet), nicht auf iPad oder Android |
| Header / Footer | Header kompakt (wie Startseite v20 Tablet), Footer v21 `size="tablet"` |


---

## 4. Tokens

Palette v13 wie in Startseite v20 §4 und Wortseite v18 §4. Hier verwendet:

| Token | Verwendung |
|---|---|
| `--page` | Seitengrund mit Punkteraster 22px |
| `--card` | Suchfeld, Liste, Chips, Popover, Sheet, Register, Leer-Karte |
| `--card2` | Zeilen-Hover und aktive Zeile, Trennzeile „Ab hier …“, KI-Block, „Meinste“-Chips, aktive Filter-Chips |
| `--card3` | Hover auf `--card2`, gewählte Option im Popover, Balken-Hintergrund |
| `--t3` | Unterzeile, Meta, Artikel, Wortart, „jesagt“, Labels, Trennkreis |
| `--line` | Ränder von Chips und Feld, Zeilentrenner |
| `--d-bl` | jesagt-Balken (Farbe von „Sag ick selbst“ wie auf der Wortseite) |
| `--orange-500` | Fokusrand des Suchfelds, KI-Knopf und Outline-Buttons, Funken-Icon, Fortschritt, Markierung der aktiven Zeile (3px links) |
| `--orange-600` | **einzige Vollflächen**: Badge Wort des Tages, „Fertig“ im Popover, Zähler am mobilen Filter-Button, Häkchen gewählter Checkboxen, Hover des Play-Buttons |
| Markierung | `color-mix(in srgb, var(--orange-500) 22%, transparent)`, Text `--color-ink-strong` |

**Typografie:**

| Rolle | Stil |
|---|---|
| Wort in der Liste | `--font-body` (Berlin) 700, 24px Desktop / 20px mobil |
| Artikel | 18px, `--t3`, hängt ohne Abstand am Wort („Schrippe, die“), `white-space: nowrap` für beides |
| Wortart | **Label-Stil**: 13px, 700, Versalien, `letter-spacing: 1.5px`, `--t3`. Desktop mit 12px Abstand und 1px-Linie links; mobil ohne Linie |
| Bedeutungen | 16px / 1.5, `--color-body`, getrennt durch einen **Kreis** 5px `--t3` (kein „·“, das Berlin wie einen Punkt zeichnet); für Screenreader `; ` versteckt |
| Abschnittstitel („Treffer“) | Fira 600, 24px |
| Label (Aktiv, Popover-Gruppen, Trennzeile) | Label-Stil wie oben |
| Mindestgröße | 13px |

---

## 5. Suchfeld

- `<input type="search">` mit `role="combobox"`, `aria-controls="treffer"` und `aria-activedescendant` auf die aktive Zeile. Ein unsichtbares `<label>`: „Wort oder Bedeutung suchen“.
- **Platzhalter:** Desktop `Such ’n Wort oder wat et bedeutet, z. B. Schrippe oder Brötchen`, mobil `Wort oder Bedeutung`.
- **Rechts im Feld**, von außen nach innen:
  - leer: `/`-Kürzel (Desktop)
  - mit Text: X-Button „Suche leeren“ (44px) und der **KI-Knopf** „Nach Bedeutung“ (§8.2)
- **Fokus:** Rand 2px `--orange-500`. `/` fokussiert das Feld von überall.
- **Live-Suche:** debounce 150ms, ab 1 Zeichen. Der Suchbegriff steht in der URL (`?q=`), dazu alle Filter (§7.4).
- **Meta-Zeile** (`aria-live="polite"`):
  - ohne Suche: `5.928 Wörter`
  - mit Suche: `{n} Treffer für „{q}“`
  - beim Laden: `Suche läuft …`
  - leer: `Keene Treffer für „{q}“`
  - leer durch Filter: `Keene Treffer mit diesen Filtern`
- **Tastenkürzel** (nur Desktop, `hover: hover`): `↑ ↓ navigieren` · `↵ öffnen` · `Shift ↵ nach Bedeutung`.

---

## 6. Trefferliste

### 6.1 Zeile

```
[Wort, Artikel] | WORTART  [Badges]                        jesagt ▬▬▬ 63 %   (▶)
[Bedeutung 1] • [Bedeutung 2]
```

- Die **ganze Zeile** ist klickbar und öffnet `/wort/{slug}`. Das Wort ist der eigentliche Link (`<a>`), der Play-Button liegt darüber und öffnet nicht.
- **Markierung** des Suchbegriffs im Wort und in den Bedeutungen. Groß- und Kleinschreibung egal; ab 3 Zeichen; mehrere Suchwörter einzeln.
- **Badges** nach der Wortart: `Wort des Tages` (Vollfläche `--orange-600`, Kalender-Icon) und `Gerade beliebt` (orange 16 %, Pfeil-Icon). Mobil umbrechend unter dem Wort.
- **jesagt** (rechts, Desktop): Label `jesagt`, Balken 64 × 6px (`--card3` / `--d-bl`), Prozent 13px 700 `tabular-nums`. `title`: `Anteil „Sag ick selbst“ in der Umfrage`. **Unter 10 Stimmen:** `zu wenig Stimmen` (13px `--t3`) statt Balken.
- **Mobil:** `jesagt 63 %` als Text oben rechts, darunter der Play-Button. Kein Balken, keine Hinweiszeile. Unter 10 Stimmen steht nichts.
- **Play:** Kreis 36px (mobil 36px sichtbar, 44px Tippfläche), Rand `--line`; Hover `--orange-600` mit weißem Icon. Nur wenn Audio vorhanden; sonst bleibt der Platz leer, damit die Prozentspalte bündig bleibt. Es spielt immer nur eine Datei; ein zweiter Klick stoppt.
- **Hover:** Grund `--card2`.
- **Aktive Zeile** (Tastatur): `--card2` + `box-shadow: inset 3px 0 0 var(--orange-500)`, `aria-selected="true"`.

### 6.2 Reihenfolge und Trennung

- **Beste Treffer** (Standard):
  1. exakter Wort-Treffer
  2. Wort beginnt mit
  3. Wort enthält
  4. **Trennzeile**
  5. Treffer in der Bedeutung (exakt vor Teilwort)
  6. Unscharfe Treffer (Soundex) nur, wenn es weniger als 5 Treffer gibt, mit Label `Klingt ähnlich` als eigene Trennzeile
- **Trennzeile** zwischen Wort- und Bedeutungs-Treffern: `<li role="presentation">`, Label-Stil, Grund `--card2`, Padding `10px 24px 8px`, Text `Ab hier: Treffer in der Bedeutung`. Sie erscheint nur, wenn es beide Arten gibt.
- **Abschnittskopf:** h2 `Treffer` bzw. `Stichworttreffer` (sobald ein KI-Block sichtbar ist). Rechts 14px `--t3`, je nach Inhalt: `erst im Wort, dann in der Bedeutung` · `alle in der Bedeutung` · `Treffer in der Bedeutung, enthalten „{q}“`.

### 6.3 Sortierung

Eine Pille (40px, Radius 999) mit `<select>`: **Beste Treffer** · A–Z · Gerade beliebt · Neu dabei · Am meisten jesagt.
- Ohne Suchbegriff ist der Standard **A–Z**.
- „Am meisten jesagt“ sortiert Wörter mit weniger als 10 Stimmen ans Ende.

### 6.4 Ohne Suchbegriff

- **Register „Springen zu“** auf `--card`, Padding `14px 16px 10px`. Label `Springen zu` + Text `Alle Wörter von A bis Z. Die Zahl zeigt, wie viele mit dem Buchstaben anfangen.`
- 29 Felder A … Z inklusive Ä, Ö, Ü, je Buchstabe fett + Zahl 13px `--t3`.
- Aktiv ist der Buchstabe, bei dem man in der Liste steht (Scroll-Spy): Grund `--color-ink-strong`, Text `--card`, `aria-current="true"`. Klick springt zum Anker des Buchstabens.
- `aria-label` je Feld: `B, 498 Wörter`.
- Der Filter-Chip „Buchstabe“ ist in diesem Zustand **ausgeblendet**, weil das Register ihn ersetzt.
- Die Liste ist nach Buchstaben gruppiert (h2 je Buchstabe, rechts `{n} Wörter`).

### 6.5 Mehr laden

Unter der Liste: `{x} von {n}` + Outline-Button **Mehr laden**.
- Es kommen je 50 weitere.
- Der Fokus geht auf den ersten neuen Treffer.
- Die Position steht in der URL (`?seite=`), damit „Zurück“ vom Wort an dieselbe Stelle führt.
- Kein Endlos-Scroll, weil der Footer erreichbar bleiben soll.

---

## 7. Filter

### 7.1 Filterleiste (Desktop)

Chips in dieser Reihenfolge: **Buchstabe · Wortart · Thema · Gebrauch · Inhalt · Wortform**, dazu der Schalter-Chip **Nur Berolinismen**, rechts die Sortierung.

| Zustand | Chip mit Popover | „Nur Berolinismen“ |
|---|---|---|
| Ruhe | 40px, Radius 999, `--card`, Rand `--line`, 15px, Chevron `--t3` | gleich, ohne Chevron |
| Hover | `--card2` | `--card2` |
| offen | Rand `--color-ink-strong`, Grund `--card2`, Chevron 180°, `aria-expanded="true"` | – |
| aktiv | Rand ink, 700, Zähler-Pille (20px, ink/`--card`) mit Anzahl | Grund und Rand `--color-ink-strong`, Text `--card` 700, Häkchen davor, `aria-pressed="true"` |

Der Tooltip an „Nur Berolinismen“ lautet: `Nur Berliner Spitznamen für Orte, Straßen und Plätze`.

### 7.2 Popover

- 380px breit, Padding 20, `--card`, Radius 4, Schatten `0 14px 32px rgb(0 0 0/28%)` + 1px `--line`, `role="dialog"` mit `aria-label`.
- Aufbau:
  - Titel: Fira 600, 20px
  - Einleitung: 14px `--t3`
  - Gruppen mit `<fieldset>` + Label-Stil-`<legend>`
  - Fuß mit Linie oben: links `{n} Wörter passen` (live), rechts **Fertig** (Primär)
- **Filter wirken sofort**, „Fertig“ schließt nur.
- Esc und Klick außerhalb schließen; der Fokus geht zurück auf den Chip.
- Inhalt und Wortform öffnen nach links versetzt, damit sie im Bildschirm bleiben (Mock: `left: -60px` bzw. `-180px`; im Code per Floating UI o. Ä. am Rand ausrichten).

| Popover | Einleitung | Inhalt |
|---|---|---|
| Buchstabe | Springt zu allen Wörtern mit diesem Anfangsbuchstaben. | Raster 6 Spalten, Feld 48px: Buchstabe + Anzahl; Einfachauswahl, nochmal klicken hebt auf. Filtert die Treffer nach Anfangsbuchstabe |
| Wortart | Mehrere möglich. Redewendungen haben eigene Wortart. | Checkboxen: Substantiv · Verb · Adjektiv · Adverb · Pronomen · Redewendung (die Werte aus `wordTypes`) |
| Thema | Mehrere möglich. | Checkboxen aller Themen |
| Gebrauch | Aus der Umfrage „Sagste det noch?“. Zählt nur Wörter mit mindestens 10 Stimmen. | **Wie oft jesagt?** Egal · Oft (ab 50 %) · Manchmal · Kaum noch (unter 20 %) — **Eher wo?** Egal · Eher Ost · Eher West · Beides — **Im Bezirk** Select „Alle Bezirke“ + 12 Bezirke — **Altersgruppe** Alle · unter 30 · 30 bis 59 · ab 60 |
| Inhalt | Zeigt nur Wörter, die dit schon haben. „Hier fehlt noch wat“ zeigt Wörter zum Mitmachen. | Checkboxen mit Anzahl rechts: Anhören · Beispiele · Beispiele mit Hörprobe · Bilder · Jeschichten · Wissenswertes · Hier fehlt noch wat |
| Wortform | Für Rätsel, Reime und Wortspiele. | Felder **Beginnt mit** / **Endet auf** (nebeneinander) · **Reimt sich auf** · **Silben** Alle · 1 · 2 · 3 · 4+ · **Länge** Alle · kurz (bis 5) · mittel (6–10) · lang (ab 11) |

**Optionen:** Pillen 36px (Einfachauswahl, `aria-pressed`) bzw. Checkbox-Zeilen 40px (`role="checkbox"`, `aria-checked`, Kästchen 20px, gewählt `--orange-600` mit weißem Häkchen).

### 7.3 Aktive Filter

- Pillen 32px auf `--card2`: `{Gruppe}: **{Wert}**` + × (22px Kreis, Hover `--card3`).
- `aria-label`: `Filter entfernen: {Gruppe} {Wert}`.
- Dahinter der Textlink `Alles zurücksetzen`.
- Jede Option ist eine eigene Pille (zwei Wortarten = zwei Pillen).

### 7.4 Logik und URL

- Innerhalb einer Gruppe gilt **ODER** (Wortart Verb oder Adjektiv), zwischen Gruppen **UND**.
- **Gebrauch** berücksichtigt nur Wörter mit ≥ 10 Stimmen. „Eher Ost/West“ = Anteil „Sag ick selbst“ in der Gruppe Ost bzw. West mindestens 10 Prozentpunkte höher als in der anderen (siehe Offene Punkte §16.1).
- **Hier fehlt noch wat:** Wörter, bei denen mindestens eins fehlt: Beispiel, Wissenswertes, Audio, verwandtes Wort (dieselbe Lücken-Logik wie auf der Wortseite v18).
- **URL:** `/suche?q=brötchen&wortart=verb,adjektiv&gebrauch=oft&inhalt=audio&sort=beliebt&seite=2`. Die URL ist teilbar und funktioniert mit „Zurück“.

### 7.5 Mobil: Filter-Sheet

- Button **Filter** (44px) mit Zähler-Pille (`--orange-600`, weiß) bei aktiven Filtern. Er öffnet ein Bottom-Sheet:
  - `role="dialog"`, `aria-modal="true"`
  - Radius oben 12px, max. 86 % Höhe
  - Griff 40 × 4px
  - Scrim `rgb(0 0 0/45%)`
- **Kopf:** „Filter“ + Schließen-X (44px).
- **Inhalt:** die Gruppen als `<details>`-Akkordeon (56px), rechts die Zusammenfassung (`Alle`, `Egal`, `2 gewählt`). „Gebrauch“ ist offen.
- Unten die Zeile **Nur Berolinismen**.
- **Fuß:** `Zurücksetzen` (Textlink) + **{n} Wörter zeigen** (Primär, 48px). Zieht der Nutzer das Sheet runter, Esc oder Scrim = schließen. Die Filter gelten trotzdem, weil sie live wirken.
- Die aktiven Filter stehen unter der Filter-Zeile als horizontal scrollbare Pillen.

---

## 8. Bedeutungssuche mit Chrome-KI

### 8.1 Technik und Verfügbarkeit

- **Prompt API** (`LanguageModel`) von Chrome, laut Chrome-Doku für Webseiten ab **Chrome 148**. Sie läuft **nur auf Desktop**: Windows 10/11, macOS 13+, Linux, Chromebook Plus. Nicht auf Android und iOS, also praktisch nie auf dem Handy. Die mobilen KI-Boards zeigen das Verhalten für Tablets mit Desktop-Chrome und als Referenz.
- **Feature-Erkennung:** `'LanguageModel' in self`, dann `LanguageModel.availability({ expectedInputs: [{ type: 'text', languages: ['de'] }], expectedOutputs: [{ type: 'text', languages: ['de'] }] })`.
  - `unavailable` oder API fehlt → **KI-Knopf und KI-Block gibt es nicht**. Kein ausgegrauter Knopf, kein Hinweis.
  - `downloadable` / `downloading` → Zustand **laden** (§8.3).
  - `available` → direkt **läuft**.
- Ob ein Modell-Download erlaubt ist, entscheidet Chrome. Download und `create()` brauchen eine **Nutzeraktion** (Klick), deshalb startet die KI nie automatisch.
- **Ablauf (Vorschlag):**
  1. Server bzw. Index liefert die besten **40 Kandidaten** zur Anfrage: Volltext in den Bedeutungen + Synonym-Erweiterung, `slug`, `wort`, Bedeutungen.
  2. Die Session sortiert sie mit `responseConstraint` (JSON Schema) und gibt die **Top 5** mit Begründung zurück: `{ items: [{ slug: string, why: string /* max. 80 Zeichen */ }] }`.
  3. Nur Slugs aus der Kandidatenliste werden angezeigt (Schutz gegen erfundene Wörter).
  4. `initialPrompts` (Systemprompt) in Deutsch: Rolle „Berliner Wörterbuch“, Antwort nur aus den Kandidaten.
- **Nichts verlässt das Gerät:** Die KI läuft lokal. Die Kandidatensuche ist eine normale Suchanfrage an den eigenen Server.
- `AbortController` für „Abbrechen“ und beim Ändern der Suche. Die Session wird pro Seitenbesuch wiederverwendet.

### 8.2 Auslöser

1. **KI-Knopf im Suchfeld**, sobald Text im Feld steht:
   - Outline 44px, Rand 1.5px `--orange-500`, Funken-Icon orange, Text `Nach Bedeutung` (14px 700). Mobil nur Icon 44 × 44.
   - `aria-label="Nach Bedeutung suchen mit Chrome-KI"`, `aria-pressed="true"` während der Suche und solange das Ergebnis zu sehen ist.
2. **Automatisches Angebot:** ab **3 Wörtern** im Feld erscheint der KI-Block im Zustand **Angebot**. Wer ihn mit „Nee, danke“ wegklickt, sieht ihn in dieser Sitzung (`sessionStorage`) nicht mehr. Der Knopf bleibt.
3. **Tastatur:** `Shift` + `Enter` im Suchfeld.
4. **Leer-Zustand:** Button „Nach Bedeutung suchen“.

### 8.3 Zustände des KI-Blocks

Block: `--card2`, Rand 1px `--line`, Radius 4, Padding `20px 24px` (mobil 16), über der Trefferliste, `aria-live="polite"`. Kopf: Icon-Kreis 40px (`--card`, Funken orange) + h2 (Fira 600, 22px) + Text 16px. Inhalte darunter um 54px eingerückt (mobil nicht).

| Zustand | Titel | Text | Aktionen |
|---|---|---|---|
| **Angebot** | Dit klingt nach ’ner Beschreibung | Die Bedeutungssuche findet Wörter, die zu „{q}“ passen, ooch wenn keen Stichwort übereinstimmt. | Outline **Nach Bedeutung suchen** · Textlink `Nee, danke` · Schloss-Icon `Läuft lokal in deinem Browser. Deine Suche verlässt dein Gerät nicht.` |
| **laden** (Modell fehlt) | Einmal dit KI-Modell laden? | Chrome braucht dafür einmalig sein eingebautes KI-Modell (mehrere GB, kommt von Google). Danach läuft die Bedeutungssuche ooch offline. | Outline **Modell laden und suchen** · Textlink `Nee, lieber nich` · Schloss-Hinweis wie oben |
| **läuft** | Ick such nach Bedeutung … | Die Chrome-KI vergleicht deine Beschreibung mit den Bedeutungen im Wörterbuch. | Fortschrittsbalken 6px (`--card3` / `--orange-500`): beim Modell-Download **echter Fortschritt** aus `downloadprogress` (`e.loaded`), sonst unbestimmt (Balken 38 % wandert, 1,4s). Statuszeile 14px `--t3`: `Modell wird jeladen … {p} %` → `Wörterbuch wird vorbereitet …` → `KI sortiert die besten 40 Kandidaten …` + Textlink `Abbrechen` |
| **fertig** | Passt vielleicht: {n} Wörter nach Bedeutung | Sortiert nach Bedeutung, nicht nach Stichwort. Die Stichworttreffer stehen darunter. | Liste auf `--card` mit den normalen Zeilen (§6.1), dazu je eine Zeile `Warum: {why}` (13px `--t3`, auch mobil). Fuß: Schloss + `Von Chrome-KI lokal sortiert. Kann danebenliegen.` · rechts `Hat’s jepasst?` + Pillen **Ja** / **Nee** (Daumen, 36px, `aria-pressed`) |
| **Fehler** (nicht im Mock) | Hat nich jeklappt | Die Chrome-KI hat jerade keene Antwort jegeben. Die Stichworttreffer unten sind trotzdem da. | Outline `Nochmal versuchen` · Textlink `Schließen` |
| **zu wenig** (nicht im Mock) | Nüscht Passendet jefunden | Ooch nach Bedeutung passt keen Wort so richtig. Magste et anders beschreiben? | – |

- **Filter gelten auch für KI-Ergebnisse.** Die Kandidaten werden vor dem Sortieren gefiltert.
- **Rückmeldung Ja/Nee:** anonym zählen (Suchbegriff, gezeigte Slugs, Antwort), ohne Nutzerkennung. Das hilft, den Prompt zu verbessern. In der Datenschutzerklärung erwähnen.
- Ändert sich der Suchbegriff, verschwindet ein fertiges Ergebnis; der Block geht zurück auf Angebot (nur bei ≥ 3 Wörtern) oder schließt.
- Die Tastatur-Navigation (↑↓) beginnt im KI-Block, wenn er fertig ist, und läuft danach in die Stichworttreffer.

---

## 9. Laden

- **Skeleton:** 5 Zeilen in der Liste, je 3 Balken (Wort 28 %, volle Zeile, 62 %), Shimmer 1,4s linear.
- `aria-busy="true"`, `aria-label="Treffer werden jeladen"`.
- Erst nach **300ms** zeigen. Beim Tippen bleiben die alten Treffer stehen, bis die neuen da sind; ein Skeleton erscheint nur beim ersten Laden oder wenn eine Antwort länger als 300ms braucht.

---

## 10. Leer-Zustände

| Fall | Darstellung |
|---|---|
| **Keine Treffer** | Karte `--card`, Padding 28, Kalle `stimmung="nuescht"` (120px) links. h2 **Nüscht jefunden für „{q}“** · `Weder im Wort noch in den Bedeutungen. Vielleicht ’n Tippfehler?` · Label `Meinste` + bis zu 3 Pillen (Soundex/Levenshtein, Links zu den Wörtern) · Outline **Nach Bedeutung suchen** (nur mit Chrome-KI) · Outline **Wort vorschlagen** (→ `/wort-vorschlagen?wort={q}`) |
| **Keine Treffer durch Filter** | Gleiche Karte, Kalle `stimmung="kratzen"`. h2 **Mit diesen Filtern: nüscht** · `Keen Wort passt zu allen Filtern uff eenmal. Nimm een paar raus.` · Outline **Alle Filter zurücksetzen**. Die aktiven Filter bleiben darüber sichtbar |
| **Fehler (Server)** (nicht im Mock) | Streifen `role="alert"`, Linie `--danger`: `Ditt hat nich jeklappt. Die Suche is jerade nich erreichbar. Versuch’s gleich nochmal.` + **Nochmal versuchen** |
| **Offline** (PWA) | Suche in den zwischengespeicherten Wörtern, falls vorhanden. Hinweis `Du bist offline. Ick such nur in den Wörtern, die schon uff deinem Gerät sind.` KI-Suche geht, wenn das Modell schon geladen ist |

---

## 11. Bewegung

| Element | Auslöser | Animation | Dauer | Easing |
|---|---|---|---|---|
| Popover | öffnen | Opacity + `translateY(-6px)` → 0 | 180ms | ease |
| KI-Block | erscheinen / Zustandswechsel | wie oben | 250ms | ease |
| Sheet | öffnen | `translateY(30%)` → 0 | 250ms | ease |
| Chevron | öffnen | `rotate(180deg)` | 200ms | ease |
| Unbestimmter Fortschritt | läuft | Balken wandert | 1400ms endlos | ease-in-out |
| Skeleton | Laden | Shimmer | 1400ms endlos | linear |
| Suchfeld-Rand, Chips, Zeilen | Hover/Fokus | Farbe | 150ms | ease |

`prefers-reduced-motion: reduce` → alles aus, auch der Shimmer.

---

## 12. Barrierefreiheit

**Fokus-Reihenfolge:** Suchfeld → X → KI-Knopf → Filter-Chips (links nach rechts) → Sortierung → aktive Filter → Alles zurücksetzen → KI-Block → Register → Liste → Mehr laden.

- **Combobox-Muster:**
  - Das Feld hat `role="combobox"`, die Liste `role="listbox"`, die Zeilen `role="option"`.
  - ↑/↓ bewegen `aria-activedescendant`, Enter öffnet das Wort, Esc leert erst das Feld und verlässt es beim zweiten Mal.
  - Der Fokus bleibt im Feld, damit man weitertippen kann.
- **Ansagen** (`aria-live="polite"`, gedrosselt 500ms): `{n} Treffer`, `Keene Treffer`, KI: `Ick such nach Bedeutung`, `5 Wörter nach Bedeutung jefunden`.
- **Markierung:** `<mark>` reicht; kein zusätzlicher Text.
- **Bedeutungs-Trenner** liest der Screenreader als „;“.
- **Play-Button:** `aria-label="{Wort} anhören"`, beim Abspielen `aria-pressed="true"`.
- **jesagt-Balken:** `aria-hidden`. Der Text „jesagt 63 %“ ist lesbar.
- **Popover:** Fokus auf den ersten Eintrag, Tab bleibt im Popover, Esc schließt und gibt den Fokus an den Chip zurück.
- **Sheet:** Fokusfalle, Fokus auf den Titel. Beim Schließen zurück auf den Filter-Button.
- **Register:** `<nav aria-label="Springen zu Buchstabe">`.
- **Kontrast** (gemessen):
  - `--t3` auf `--card`: Light 5,93 : 1, Dark 4,76 : 1 (Wortart, jesagt, Artikel). **Nicht kleiner oder heller machen.**
  - Markierung mit Text: 13,7 : 1 (Dark).
  - Weiß auf `--orange-600`: 5,9 : 1.
- **Touch:** mindestens 44px auf Mobil (Felder, Filter-Button, Sortierung, X, KI-Knopf, Play-Tippfläche, Sheet-Akkordeon). Auf Desktop: Chips 40px, Play 36px, Pillen 32px (mit Abstand, WCAG 2.5.8).

---

## 13. Datenmodell und Suche (Backend)

Was die Suche pro Wort braucht (Felder aus Payload `words`, Rest aggregiert):

```ts
interface SearchHit {
  slug: string; word: string; article?: string
  pos: string                         // aus wordTypes bzw. derived.nlpTags
  meanings: string[]                  // translations[].translation
  audio: boolean                      // berlinerischAudio.length > 0
  usage?: { selbst: number; votes: number; ost?: number; west?: number; ages?: Record<string, number> } // nur votes >= 10
  flags: { wdt: boolean; trend: boolean; berolinismus: boolean }
  has: { examples: boolean; examplesAudio: boolean; images: boolean; stories: boolean; facts: boolean; gap: boolean }
  themes: number[]
  form: { firstLetter: string; syllables: number; length: number; soundex: string } // derived.*
  match: 'word-exact' | 'word-prefix' | 'word' | 'meaning' | 'fuzzy'
}
```

- **Index:** Wort und Bedeutungen getrennt durchsuchbar, Gewichtung nach `match` (§6.2).
  - Die deutsche Normalisierung muss Umlaute und ß gleich behandeln wie die Wörterbuch-Schreibung („jeh“ ↔ „geh“ ist **nicht** gleich; Berlinisch bleibt, wie es ist).
  - `derived.soundexCode` existiert schon für „Meinste“ und unscharfe Treffer.
- **Zahlen pro Filteroption** (Inhalt, Buchstabe) kommen aus Facetten der Suchanfrage, nicht aus festen Zahlen.
- **Umfrage-Aggregat** nachts vorberechnen. Live pro Anfrage ist zu teuer.
- **Reimt sich auf:** gleiche Endung ab dem letzten betonten Vokal; als Näherung die letzten 3 Buchstaben (`TODO(suche):` verbessern).

---

## 14. Komponenten (Vorschlag Astro + Vue)

| Komponente | Island? | Inhalt |
|---|---|---|
| `SearchPage.astro` | – | Kopf, SSR der ersten Trefferseite (auch ohne JS benutzbar: Formular mit GET) |
| `SearchApp.vue` | `client:load` | Zustand, URL-Sync, Combobox, Liste |
| `SearchField.vue` | – | Feld, X, KI-Knopf, `/`-Kürzel |
| `FilterBar.vue` + `FilterPopover.vue` | – | Chips, Popover, aktive Filter |
| `FilterSheet.vue` | – | mobil |
| `HitRow.vue` | – | §6.1, gemeinsam für normale und KI-Treffer |
| `AlphabetRegister.vue` | – | §6.4 |
| `SemanticSearch.vue` | – | §8, kapselt `LanguageModel`; wird nur geladen, wenn die API existiert (dynamischer Import) |
| `SearchEmpty.vue` | – | §10 |
| `BerlinerBaer.vue` | – | aus dem Kalle-Handoff |

---

## 15. Props im Mock (nur zum Nachschlagen)

| Prop | Werte | Zeigt |
|---|---|---|
| `theme` | dark / light | |
| `size` | desktop / tablet / mobile | tablet = Desktop + `.s1--t` |
| `zustand` | start / suche / ki / leer / laden | Startwert des Suchbegriffs: leer, „brötchen“, „jemand ist lustig“, „schrippö“, Laden |
| `ki` | angebot / laden / laeuft / fertig | KI-Block |
| `popover` | zu / buch / art / thema / gebrauch / inhalt / form | offenes Popover |
| `aktiv` | nein / ja | Beispiel-Filter: Gebrauch „Oft“ + Inhalt „Anhören“ |
| `sheet` | zu / offen | mobiles Filter-Sheet |

Im Mock filtern alle Optionen die wenigen Beispielwörter wirklich. Die Zahlen (412, 1.312 …) sind fest.

---

## 16. Offene Punkte (nicht selbst entscheiden, `TODO(suche):`)

1. **Schwellen beim Gebrauch:** „Oft“ ab 50 %, „Kaum noch“ unter 20 %, „Eher Ost/West“ ab 10 Prozentpunkten Unterschied. Sind diese Werte so gewünscht?
2. **Altersgruppen** im Filter (unter 30 / 30–59 / ab 60) gleich wie Wortseite v18? Siehe dort §21.6.
3. **KI-Rückgabe:** nur Reihenfolge oder auch die „Warum“-Zeile? Die „Warum“-Zeile kostet Rechenzeit und kann danebenliegen.
4. **Rückmeldung Ja/Nee** speichern oder nur lokal anzeigen?
5. **Kandidatensuche für die KI:** Volltext + Synonyme reicht? Oder später Embeddings auf dem Server?
6. **Offline-Suche:** Wie viele Wörter speichert die PWA vor?

---

## 17. Tests und Abnahme

**Unit (Vitest):**
- Rangfolge: exakt > Präfix > enthält > Bedeutung > unscharf. Die Trennzeile erscheint genau zwischen Wort- und Bedeutungstreffern.
- Markierung: mehrere Suchwörter, Groß/Klein, Umlaute, keine Markierung unter 3 Zeichen.
- Filter: ODER innerhalb, UND zwischen Gruppen. Gebrauch ignoriert Wörter mit < 10 Stimmen. Die URL lässt sich lesen und schreiben (Round-Trip).
- `SemanticSearch`:
  - API fehlt → nichts gerendert
  - `downloadable` → Zustand laden
  - Antwort mit unbekanntem Slug wird verworfen
  - Abbruch per `AbortController`
- Texte: Snapshot-Test verbietet „ wir “, „ uns “, „ unser“, „ wa “.

**E2E (Playwright):**
- „brötchen“ zeigt Splitterbrötchen vor der Trennzeile und Schrippe danach.
- Filter setzen, entfernen und zurücksetzen. „Mit diesen Filtern: nüscht“.
- Tastatur: ↑↓, Enter, Esc, `/`, `Shift+Enter`.
- Mobil 390px: Sheet, Fokusfalle, „{n} Wörter zeigen“.
- KI mit gemocktem `LanguageModel`: Angebot ab 3 Wörtern, „Nee, danke“ merkt sich das für die Sitzung, Knopf startet trotzdem.

**Visuell:** gegen `assets/boards/*.jpg`, beide Themes, 390, 834 und 1280.
- Tablet 834px: Sortierung in der Meta-Zeile, Chips in einer Zeile, Register scrollt, alle Tippflächen ≥ 44px.

**A11y:** axe ohne Verstöße. Kein Text unter 13px.

---

---
---

# Teil B: Schnellsuche v1

## 18. Überblick

Die Schnellsuche ist ein Dialog über **jeder** Seite. Sie öffnet über die Header-Suche, die Taste `/` oder `Strg`/`⌘` + `K`. Sie ist für den schnellen Sprung zu einem Wort da, nicht zum Stöbern; dafür gibt es die Suchseite. Daher:

- **Eine Liste für alles.** Treffer, Bedeutungssuche und Aktionen stehen in einer Liste und sind mit denselben Pfeiltasten erreichbar.
- **Keine Filter.** Wer filtern will, kommt mit „Alle {n} Treffer anzeigen“ oder `Strg`/`⌘` + `Enter` zur Suchseite. Der Suchbegriff wird übernommen.
- **Gleiche Suche wie die Suchseite.** Dieselbe API und dieselbe Rangfolge (§6.2), nur weniger Treffer.

**Boards:** Canvas, Seite **„Schnellsuche v1 · Modal über jeder Seite“**

| Board | Breite | Zeigt |
|---|---|---|
| `SchnellsucheV1DesktopDark` | 1280 | geöffnet, noch nichts getippt |
| `SchnellsucheV1DesktopDarkTreffer` | 1280 | „brötchen“: Im Wort, In der Bedeutung, Aktionen |
| `SchnellsucheV1DesktopLightKiLaeuft` | 1280 | Beschreibung, KI-Suche läuft (oben) |
| `SchnellsucheV1DesktopLightKi` | 1280 | KI-Ergebnis „Nach Bedeutung“ |
| `SchnellsucheV1DesktopLightNichts` | 1280 | nichts gefunden |
| `SchnellsucheV1DesktopDarkLaden` | 1280 | Laden |
| `SchnellsucheV1MobileDark` | 390 | „schrip“, Vollbild |
| `SchnellsucheV1MobileLight` | 390 | geöffnet, Vollbild |

Die Zustände einzeln liegen unter `assets/schnellsuche/zustaende/*.jpg`. Die Seite im Hintergrund der Boards ist nur angedeutet.

## 19. Öffnen und Schließen

| Auslöser | Verhalten |
|---|---|
| Klick auf die Suche im Header | öffnet den Dialog, Fokus ins Feld |
| `/` (außer in Eingabefeldern) und `Strg`/`⌘` + `K` | wie oben |
| Auf der Suchseite selbst | `/` fokussiert das große Suchfeld der Seite, **kein** Dialog |
| `Esc`, Klick auf den Hintergrund, Button `esc`, mobil „Abbrechen“ | schließt; Fokus zurück auf den Auslöser |
| Treffer gewählt | Navigation zur Wortseite, Dialog schließt, Suchbegriff landet im Verlauf |

- Der Dialog hat `role="dialog"`, `aria-modal="true"`, `aria-label="Schnellsuche"` und eine Fokusfalle. Die Seite dahinter ist `inert`, der Body scrollt nicht.
- Beim erneuten Öffnen ist das Feld leer, ohne den alten Suchbegriff.

## 20. Layout

| | Desktop und Tablet | Mobil (< 808px) |
|---|---|---|
| Form | Dialog `width: min(720px, 100% − 48px)`, oben 72px Abstand, max. Höhe `100vh − 128px`, Radius 6, `--card`, Schatten `0 24px 64px rgb(0 0 0/40%)` + 1px `--line` | **Vollbild**, kein Radius, kein Schatten |
| Hintergrund | Scrim: Dark `rgb(16 20 24/55%)` + `blur(2px)`, Light `rgb(27 33 39/28%)` + `blur(4px)` | – |
| Kopf | 64px: Lupe `--t3` · Feld 20px · X (40px, nur mit Text) · Taste `esc` (24px, Rand `--line`) | 60px: Lupe · Feld 18px · X (44px) · Textbutton **Abbrechen** (16px 700) |
| Liste | scrollt innen, `overscroll-behavior: contain`, Padding `6px 0 10px` | ebenso |
| Fuß | 1px Linie oben, Padding `10px 16px 10px 20px`, 13px `--t3` | Links ohne Icons, 13px, `nowrap`, `env(safe-area-inset-bottom)` |

**Platzhalter:** Desktop `Such ’n Wort oder wat et bedeutet`, mobil `Wort oder Bedeutung`.

**Tablet:** Der Dialog sieht aus wie auf Desktop. Die Tastenkürzel im Fuß gibt es nur bei `hover: hover`.

## 21. Inhalte je Zustand

### 21.1 Geöffnet, nichts getippt

| Gruppe | Inhalt | Regeln |
|---|---|---|
| **Zuletzt jesucht** | bis zu **3** Suchbegriffe, Uhr-Icon; rechts im Kopf Textlink `Verlauf löschen` | nur lokal (`localStorage`), siehe Offene Punkte §26.1. Klick setzt den Begriff ins Feld |
| **Heute** | Wort des Tages als Wortzeile | immer |
| **Gerade beliebt** | 3 Wortzeilen aus der Trend-Liste | immer |
| Fuß | links die Links `Zufälliges Wort` · `Wort vorschlagen` (Icon 16px), rechts `Alle Wörter A–Z →` (zur Suchseite) | Desktop und mobil |

**Keine Zeile ist vorausgewählt**, damit ein versehentliches Enter nichts auslöst. Erst ↓ wählt die erste Zeile.

### 21.2 Beim Tippen

Die Suche läuft live, debounce 120ms, ab 1 Zeichen. Gruppen in dieser Reihenfolge:

1. **Klingt nach ’ner Beschreibung:** nur ab **3 Wörtern** und wenn Chrome-KI verfügbar ist.
   - Eine Aktionszeile `Nach Bedeutung suchen: „{q}“` mit der Unterzeile `Findet passende Wörter, ooch ohne Stichwort. Chrome-KI, lokal in deinem Browser.`
   - Diese Zeile ist **vorausgewählt**; Enter startet die Bedeutungssuche.
2. **Nach Bedeutung:** erscheint nach fertiger KI-Suche. Bis 3 Wortzeilen mit Begründung (13px `--t3`). Rechts im Gruppenkopf steht `Chrome-KI, lokal in deinem Browser`.
3. **Im Wort:** bis **5** Treffer, Präfix vor enthält.
4. **In der Bedeutung:** bis **4** Treffer.
5. Trennlinie, dann die Aktionen:
   - `Nach Bedeutung suchen: „{q}“`, nur unter 3 Wörtern und mit Chrome-KI
   - `Alle {n} Treffer anzeigen`, bei 1 Treffer `Treffer auf der Suchseite ansehen`; Unterzeile `Mit Filtern und Sortierung`; Ziel `/suche?q={q}`

Gruppen ohne Treffer entfallen. Die erste Zeile der ersten Gruppe ist vorausgewählt.

### 21.3 Nichts gefunden

- Kalle `stimmung="nuescht"` (84px), h2 `Nüscht jefunden für „{q}“` (Fira 600, 22px), darunter `Weder im Wort noch in den Bedeutungen.`
- Label `Meinste` + bis zu 3 Pillen (Soundex).
- Aktionen:
  - `Nach Bedeutung suchen: „{q}“`, Unterzeile `Vielleicht passt een Wort, ooch ohne Stichwort. Chrome-KI, lokal in deinem Browser.` (nur mit Chrome-KI)
  - `Wort vorschlagen: „{q}“`, Unterzeile `Wenn’s dit Wort jibt, prüf ick’s und nehm’s uff.`

### 21.4 KI-Suche im Dialog

Es ist dieselbe Komponente wie auf der Suchseite (§8), nur als Zeile:
- **läuft:** Die KI-Zeile heißt `Ick such nach Bedeutung …`, Unterzeile `Chrome-KI vergleicht „{q}“ mit den Bedeutungen`, rechts ein Fortschrittsbalken 120 × 4px.
- **Modell-Download nötig:** dieselbe Rückfrage wie §8.3 „laden“, als Unterzeile `Chrome lädt einmalig sein KI-Modell … {p} %`.
- **fertig:** Die Gruppe „Nach Bedeutung“ steht oben, die KI-Zeile verschwindet.
- **Fehler** (nicht im Mock): Zeile `Hat nich jeklappt. Nochmal versuchen`.
- Ohne Chrome-KI gibt es weder Zeile noch Gruppe.
- `Shift` + `Enter` im Feld startet die Bedeutungssuche jederzeit.

### 21.5 Laden

4 Skeleton-Zeilen (Wort 110px, Bedeutung bis 320px). Sie erscheinen erst nach 300ms. Beim Weitertippen bleiben die alten Treffer stehen.

## 22. Zeilen

| Typ | Aufbau |
|---|---|
| **Wortzeile** | Kachel 32px links · **Wort** (Berlin 700, 18px, Treffer markiert) + `, {Artikel}` (15px `--t3`) + Status-Icons · Bedeutungen in **einer** Zeile (15px `--t3`, Treffer markiert, mit „…“ abgeschnitten) |
| Kachel links | Wort mit Audio: **Play-Knopf** (32px, `--card2`, Hover `--orange-600` mit weißem Icon, `aria-label="{Wort} anhören"`, `tabindex="-1"`). Ohne Audio: leere Fläche gleicher Breite, damit alles bündig bleibt |
| Status-Icons | Wort des Tages: Kreis 22px `--orange-600` mit weißem Kalender. Gerade beliebt: Kreis 22px orange 16 % mit Pfeil. Je mit `title` und `aria-label` |
| **Aktionszeile** | Icon-Kachel 32px (`--card2`, Icon `--t3`; KI-Funke orange) · Titel 16px 700 · Unterzeile 13px `--t3` |
| **Verlaufszeile** | Uhr-Kachel · Begriff 16px 700 · rechts × (32px, mobil 44px) **nur für die Maus** (`tabindex="-1"`, `aria-hidden`). Mobil immer sichtbar, Desktop nur bei Hover oder aktiver Zeile |
| Höhe | Desktop mind. 48px, Rand 8px, Radius 4. Mobil mind. 52px, volle Breite, Wort und Bedeutung untereinander |
| Gruppenkopf | Label-Stil (13px, 700, Versalien, 1.5px, `--t3`), Padding `12px 20px 6px` |
| Hover | `--card2` |
| **Aktiv** (Tastatur) | `--card2` + `inset 3px 0 0 var(--orange-500)` + rechts eine `↵`-Taste (22px). Mobil ohne Aktiv-Markierung |

## 23. Tastatur

| Taste | Wirkung |
|---|---|
| ↓ / ↑ | nächste / vorige Zeile über **alle** Gruppen und Aktionen, am Ende zurück zum Anfang |
| Enter | öffnet das Wort bzw. führt die Aktion aus |
| `Strg`/`⌘` + Enter | alle Treffer auf der Suchseite (`/suche?q=`) |
| `Shift` + Enter | Bedeutungssuche |
| `Entf` | entfernt den aktiven Verlaufseintrag; der Hinweis `Entf aus Verlauf entfernen` erscheint dann im Fuß |
| `Esc` | leert erst das Feld, beim zweiten Mal schließt der Dialog |
| Tab | bleibt im Dialog (Feld → X → esc → Fuß-Links) |

**Fuß mit Suchbegriff** (nur `hover: hover`):
- Links: `↑ ↓ navigieren` · `↵ öffnen` · `{Strg|⌘} ↵ alle Treffer`
- Rechts: `Zur Suchseite →`
- Die Taste wird nach System gezeigt, `⌘` auf macOS und iOS. Tasten sind 22px hoch, Schrift 13px.

## 24. Barrierefreiheit

- **Combobox:** Das Feld hat `role="combobox"`, `aria-expanded="true"`, `aria-controls` auf die Liste und `aria-activedescendant` auf die aktive Zeile. Ist keine Zeile aktiv, bleibt `aria-activedescendant` leer.
- **Liste:**
  - Die Liste ist `role="listbox"`.
  - Gruppen sind `role="group"` mit dem Gruppentitel als `aria-label`.
  - Zeilen sind `role="option"` mit `aria-selected`.
  - **Keine fokussierbaren Elemente in Optionen:** × und Play haben `tabindex="-1"`. Ihre Funktion gibt es per Taste (`Entf`) bzw. auf der Wortseite.
- **Ansagen** (`aria-live="polite"`, 500ms gedrosselt): `{n} Treffer`, `Keene Treffer`, `Ick such nach Bedeutung`, `{n} Wörter nach Bedeutung jefunden`.
- **Kontrast** (gemessen):
  - Bedeutungen und Artikel: Light 5,93 : 1, Dark 4,76 : 1
  - Gruppenköpfe und Fuß: Light 6,62 : 1, Dark 5,69 : 1
  - Kein Text unter 13px.
- **Touch** mobil: Zeilen ≥ 52px; ×, X und „Abbrechen“ 44px; Fuß-Links 44px hoch.
- `prefers-reduced-motion`: kein Einblenden, kein Shimmer, der unbestimmte Balken steht.

## 25. Bewegung

| Element | Auslöser | Animation | Dauer |
|---|---|---|---|
| Dialog | öffnen | Opacity 0→1, `translateY(-8px) scale(.99)` → 0 | 180ms ease |
| Scrim | öffnen | Opacity 0→1 | 150ms |
| Mobil | öffnen | von unten, `translateY(16px)` → 0 | 200ms ease |
| KI-Balken | läuft | wandert | 1400ms endlos |
| Skeleton | Laden | Shimmer | 1400ms linear |

## 26. Offene Punkte Schnellsuche (`TODO(schnellsuche):`)

1. **Verlauf:**
   - Nur lokal im Browser? Das ist der Vorschlag: kein Server, keine Personendaten.
   - Wie viele Einträge werden gespeichert? Gezeigt werden 3.
   - Werden auch Suchen gespeichert, bei denen niemand auf einen Treffer klickt?
2. **Mobil:** Öffnet die Header-Suche auf dem Handy die Vollbild-Schnellsuche (wie im Mock) oder direkt die Suchseite?
3. **„Gerade beliebt“ im leeren Zustand:** nur 3 Wörter aus „Gerade beliebt“ oder gemischt mit „Im Aufwind“?

## 27. Komponenten und Tests (Schnellsuche)

| Komponente | Inhalt |
|---|---|
| `QuickSearch.vue` | Dialog, Fokusfalle, Tasten, Öffnen über Header, `/` und `Strg`/`⌘`+`K` (einmal global, `client:idle`) |
| `QuickSearchList.vue` | Gruppen und Zeilen (§22), Tastaturnavigation |
| `useSearch()` | gemeinsam mit der Suchseite: API, Debounce, Abbruch alter Anfragen |
| `SemanticSearch` | aus Teil A §14, als Zeilen-Variante |
| `useSearchHistory()` | `localStorage`, Höchstzahl laut §26.1, mit try/catch für den privaten Modus |

**Tests:**
- Öffnen über `/` und `Strg`/`⌘`+`K`; nicht in Eingabefeldern; auf `/suche` kein Dialog.
- Leerer Zustand: keine Zeile aktiv, ↓ wählt die erste; `Entf` entfernt einen Verlaufseintrag.
- „brötchen“: 1 Treffer „Im Wort“, dazu Bedeutungs-Treffer; „Alle 7 Treffer anzeigen“ führt zu `/suche?q=brötchen`.
- „jemand ist lustig“ mit gemockter Chrome-KI: KI-Zeile oben und aktiv, Enter startet die Suche. Ohne KI fehlt die Zeile.
- Nach Esc kehrt der Fokus auf den Auslöser zurück; die Seite ist währenddessen `inert`.
- axe ohne Verstöße; Screenshots gegen `assets/schnellsuche/boards/*.jpg`.

Quellen zur Chrome-KI: Chrome for Developers, „The Prompt API“ (https://developer.chrome.com/docs/ai/prompt-api) und MDN „Prompt API“ (https://developer.mozilla.org/docs/Web/API/Prompt_API).
