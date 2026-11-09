# Handoff Spec: Wortseite v3 (`/wort/<slug>`)

Stand: 9. November 2026 · Design System „Berliner Schnauze“ v3.1 · ersetzt den Handoff vom 3. November

**Neu in v3.1:** Umfrage startet direkt (keine Like-Frage, kein Zwischenschritt) · Like und Dislike immer gleichberechtigt nebeneinander (Wort und Kommentare), kein Hover-Einblenden · Kommentar-Menü ⋯ (Link kopieren, Bearbeiten, Löschen, Melden) und `Strg`+`Enter` · Themen in eigener Zeile unter den Badges · Buchkarten ab 808px kompakt und horizontal.

**Referenz-Boards im Canvas „Wortseite vereinheitlichen“:**
- **Mobile:** `Mobile v2 · alles gefixt` (Dark und Light), `Mobile v2 · mit Kommentaren & Trend`
- **Desktop:** `Desktop v2 · Bilder im Hero` (Dark und Light)
- **Seite „v3 · Zustände & Grenzfälle“:** Laden, Offline, Fehler, langes Wort, minimales Wort
- **Seite „v3 · Header, Footer & Index“:** `Wortseite komplett · Mobile / Desktop`

**Mitgeliefert in `design/`:** die Artboards als HTML (Markup und Logik zum Nachschlagen) und `bundle.css` mit allen `c-*`-Klassen. Siehe Abschnitt 17.

---

## 1. Überblick

Die Wortseite erklärt ein berlinerisches Wort. Leute kommen meist über die Suche (Google oder intern) auf genau eine Seite, oft mobil und mit einer Hand. Deshalb gilt:

1. **Bedeutung zuerst.** Wort, Wortart und Bedeutung stehen im Hero, ohne Scrollen.
2. **Mitmachen früh.** Die Umfrage „Sagste det noch?“ steht direkt nach Hero, Audio und Bildern. Weiter unten wurde sie kaum benutzt.
3. **Wissenschaftlicher Teil danach.** Etymologie, Beispiele, dann „Sprachliche Analyse“ mit den Fachbegriffen Orthographie, Grammatik, Quantitative Linguistik und Phonologie.
4. **Ruhig.** Es gibt nur wenige Bedienelement-Stile und wenig Orange (Regeln in Abschnitt 8).

---

## 2. Reihenfolge der Blöcke

Ein Block ohne Daten wird komplett weggelassen: keine leere Karte und kein Platzhaltertext. Ausnahmen sind Umfrage und Kommentare.

| # | Block | ID (Anker) | Wird gezeigt, wenn | Überschrift |
|---|---|---|---|---|
| 0 | Tab-Leiste (mobil) / Seitenleiste (Desktop) | – | immer | – |
| 1 | Hero: Wort, Artikel, Badges, Themen-Zeile, Reaktion, ⋮-Menü, Bedeutungen | `n-bedeutung` | immer | **h1** = Wort |
| 2 | Trend-Kasten | `n-trend` | Wort ist in den Top 10 der Woche | – (`.t-label`) |
| 3 | Anhören (Männlich / Weiblich) | – | `audio` vorhanden | – (`.t-label`) |
| 4 | Bilder (Strip mobil, im Hero ab 1000px) | – | `images.length > 0` | – (`aria-label="Bilder"`) |
| 5 | Umfrage „Sagste det noch?“ | `n-umfrage` | immer | h2 |
| 6 | Etymologie | `n-etymologie` | `origin` oder `sources` | h2 |
| 7 | Beispiele | `n-beispiele` | `examples.length > 0` | h2 |
| 8 | Band „Sprachliche Analyse“ | `n-analyse` | immer | **h2** (`.c-band`) |
| 8a | Orthographie: Silbentrennung, Wortzerlegung, Ähnlich geschrieben, Anagramme | – | immer (Unterblöcke einzeln optional) | h3 |
| 8b | Grammatik: „Wortart (NLP-Analyse)“ | – | immer | h3 |
| 8c | Quantitative Linguistik: Buchstaben-Kacheln, 4 Kennzahlen, Fakten, Häufigkeiten | – | immer | h3 |
| 8d | Phonologie: Ähnlich klingende Wörter | – | `similar.length > 0` | h3 |
| 9 | Bücher „Ooch als Buch zu haben, wa?“ + Badge „Anzeige“ | `n-buecher` | Bücher vorhanden (max. 3) | h2 (`.c-band`) |
| 10 | Lexikalisches Umfeld: Verwandte Wörter + alphabetische Nachbarn | `n-umfeld` | immer (Nachbarn gibt es immer) | h2 |
| 11 | Kommentare „Wat sagste dazu? (n)“ | `n-kommentare` | immer | h2 |
| 12 | „Und nu?“ | `n-weiter` | immer | h2 (`.c-band`) |
| 13 | Erstellt / Bearbeitet | – | immer | – (`.t-small`) |

**Tabs bzw. Seitenleisten-Links:** Bedeutung · Umfrage · Etymologie · Beispiele · Analyse · Umfeld · Kommentare. Nur Sektionen, die existieren, bekommen einen Tab.

---

## 3. Layout und Breakpoints

| Bereich | < 808px (mobil) | 808–999px | ≥ 1000px |
|---|---|---|---|
| Navigation | `.c-tabbar` sticky oben, horizontal scrollbar | `.c-sidebar` 200px, sticky `top: 1rem` | wie 808 |
| Raster | 1 Spalte | `grid-template-columns: 200px minmax(0,1fr)`, `gap: 2rem` | wie 808 |
| Seitenbreite | volle Breite | `max-width: 1160px`, zentriert | wie 808 |
| Innenabstand Seite | `1rem 1rem 3rem` | `32px 24px 80px` | wie 808 |
| Abstand zwischen Blöcken | `1rem` | `1.25rem` | wie 808 |
| Hero | 1 Spalte, Padding `1.5rem 1.25rem` | 1 Spalte, Padding `2rem`; Bilder unter den Bedeutungen | 2 Spalten `minmax(0,1fr) minmax(220px,38%)`, `column-gap: 2rem`; Bilder rechts über 3 Zeilen |
| Bilder | `.c-image-strip`, Figuren 82% breit, Snap | im Hero, 1. Bild groß, weitere 3-spaltig als Thumbs (ohne Caption) | wie 808, aber rechte Spalte |
| Headword | `clamp(2rem, 11cqi, 2.75rem)` | `clamp(2.5rem, 6cqi, 3.75rem)` | wie 808 |
| Orthographie + Grammatik | untereinander | `.bs-2col` nebeneinander (`1fr 1fr`, `gap: 1rem`) | wie 808 |
| Buchstaben-Kacheln | 44 × 52px, Schrift 1.15rem | 64 × 72px, Schrift 1.6rem | wie 808 |
| Bücher | `.c-shelf` horizontal, Karten 64% (nächste lugt rein), Cover 5:4 oben | 3-spaltiges Grid, **kompakte Karte**: `grid-template-columns: 64px minmax(0,1fr)`, Cover 64px (3:4) links ohne Titel, Text rechts, Padding `.875rem`, CTA ohne Linie | wie 808 |
| Umfeld | untereinander | 2 Spalten (Verwandte / Nachbarn), `gap: 2rem` | wie 808 |
| „Und nu?“ | gestapelt | 3 Spalten | wie 808 |
| Section-Card | Header `.875rem 1rem`, Body `0 1rem 1rem`, Footer `.75rem 1rem` | Header `1rem 1.5rem`, Body `0 1.5rem 1.5rem`, Footer `.75rem 1.5rem` | wie 808 |

- **808px** ist der bestehende Umbruch von `.c-word-page`.
- **1000px** ist neu: Darunter ist die rechte Bildspalte schmaler als 220px und die Bilder werden zu klein. Im Repo kannst du auf `md` (1024) runden.
- **Header:** Er ist auf der Wortseite **nicht sticky**, weil Tab-Leiste bzw. Seitenleiste schon kleben. Empfehlung: Beim Runterscrollen ausblenden, beim Hochscrollen einblenden. Die Tab-Leiste rutscht dann um die Header-Höhe nach unten.
- **`scroll-margin-top`:** `56px` für alle Anker, damit Überschriften nicht unter der Tab-Leiste landen.
- **Section-Card-Nummern:** Auf der Wortseite ausgeblendet (`.c-section-card__num { display: none }`). Die Header-Linie entfällt (`border-block-end: 0`).

---

## 4. Design Tokens

Quelle: `tokens.json` und `colors_and_type.css`. Im Code nur Tokens verwenden, keine Hex-Werte.

| Token | Light | Dark | Verwendung |
|---|---|---|---|
| `--color-background-body` + `--color-gradient-body-1/2` | Creme + Punkte | Blau + Punkte | Seitengrund: Punkte 1.1px im 22px-Raster |
| `--surface-hero` | Orange-Tint | Blau-Tint | Hero |
| `--surface-sheet` | Weiß | Blau | Section-Cards, Menü |
| `--surface-paper` | `white-100` | Blau hell | Tab-Leiste, Seitenleiste, Buchkarten, Trend-Grund, „Und nu?“ |
| `--surface-chip` | Orange-100-Mix | Blau-Mix | Kennzahlen, Kacheln, Kommentar-Felder, Bild-Platzhalter |
| `--surface-badge` | – | – | Badges |
| `--rule-card` | `grey-100` | – | gestrichelte Kartenränder |
| `--rule-inner` | `orange-200` | – | gestrichelte Trenner in Karten |
| `--color-ink-strong` | Blau | `white-100` | Titel, Werte, Wort in Listen |
| `--color-body` | `blue-500` (12.2:1) | `yellow-500` (7.2:1) | Fließtext |
| `--color-muted` | – | – | Sekundärtext, Labels |
| `--color-accent-text` | `orange-600` (5.6:1) | `orange-300` (5.2:1) | orange Text: Rang, „Trendet jerade“, Buch-CTA, gedrückte Reaktion |
| `--orange-600` | `#b23b27` | gleich | **einzige Vollfläche**: Primary-Button, gewählte Auswahl, Trend-Badge (weißer Text 5.6:1) |
| `--orange-500` | `#cf5736` | gleich | nur als Wash: 14–16% (`color-mix`) für Tags, gedrückte Reaktion, Avatar, Trend-Kasten; 34% für Vokal-Kacheln |
| `--orange-400` | `#e28964` | gleich | Icons in Menü, Kacheln, „Und nu?“; Fokusring |
| `--control-border` | `orange-600` | – | Rand von `.c-choice` |
| `--shadow-hover-glow` | warmes Orange-Glow | – | Hover aller Bedienelemente und Karten |
| `--paper-lift` (= `shadow-card`) | `0 .5px .6px rgb(0 0 0/8%), 0 4px 5px rgb(0 0 0/16%)` | gleich | alle erhabenen Flächen |
| `--danger` | `hsl(8 89% 53%)` | gleich | nur Streifen und Icon im Fehlerzustand, nie Text |
| `--success` | `#35a672` | gleich | nur Streifen und Icon im Erfolgszustand |
| `--gold` | `#e1b125` | gleich | nur Wort-des-Tages-Krone |
| `--radius-sm` / `-xs` / `-xxs` | 4 / 3 / 2px | – | nichts ist runder als 4px; keine Kreise (auch keine Avatare) |
| `--font-display` | Berliner | – | nur `.c-band`, Anführungszeichen, Logo |
| `--font-body` | Berlin 400/700/900 | – | alles andere, `letter-spacing: 1px` |

### Typo-Skala (v3)

Es gibt nur diese Größen neben dem Headword.

| Klasse | Größe / Gewicht | Farbe | Wofür |
|---|---|---|---|
| `.c-band` | Berliner 1.6rem / 400 | ink-strong | Seiten-Bänder: „Sprachliche Analyse“, „Ooch als Buch …“, „Und nu?“ |
| `.c-section-card__title` | 1.25rem / 700 | ink-strong | Kartentitel (h2 oder h3) |
| `.t-em` | 1.25rem | ink-strong | Bedeutung(en), Beispielsatz, Rang, Silbentrennung |
| Body | 1rem / 1.5 | body | Fließtext |
| `.t-label` | .75rem / 700 / uppercase / .04em | muted | Zeilen-Labels („Bedeutung“, „Anhören“, „Silbentrennung“) |
| `.t-small` | .75rem / 1.5 | muted | Meta, Captions, Quellen, Fußzeilen |

**Überschriften-Ebenen:** h1 = Wort · h2 = Sektion oder Band · h3 = Karte innerhalb von „Sprachliche Analyse“. Die optische Größe kommt von der Klasse, nicht von der Ebene.

---

## 5. Komponenten (Vorschlag Vue/Astro)

Statisch in Astro rendern. Interaktives als Vue-Island mit `client:visible`, bzw. Hero-Aktionen mit `client:idle`.

| Komponente | DS-Klassen | Props | Hinweise |
|---|---|---|---|
| `WordPage.astro` | `.c-word-page`, `.c-word-main` | `word: Word` | Raster, Reihenfolge laut Abschnitt 2 |
| `WordTabBar.vue` (Island) | `.c-tabbar`, `.c-tabbar__tab` | `sections: {id,label}[]` | Scroll-Spy (IntersectionObserver), aktiver Tab scrollt sich in Sicht |
| `WordSidebar.astro` (+ Spy-Island) | `.c-sidebar`, `__word`, `__link.is-active` | `word, posLabel, sections` | Desktop-Ersatz der Tab-Leiste |
| `WordHero.astro` | `.c-word-hero`, `.c-headword`, `.c-word-hero__article`, `.c-word-hero__badges`, `.c-themes` | `word, article, pos, posAuto, berolinismus, themes, meanings, same, trend?` | `h1` mit `hyphens: auto; overflow-wrap: anywhere` |
| `WordBadges` | `.c-badge`, `--strong`, `--auto` | – | Reihenfolge: Trend → Wortart → Berolinismus. **Keine Themen in dieser Zeile** |
| `WordThemes` | `.c-themes` | `themes: {label,url}[]` | eigene Zeile direkt unter den Badges: `.t-label` „Thema“/„Themen“ + Textlinks, getrennt durch „·“, `.75rem` muted, bricht um. Entfällt ohne Themen |
| `WordReactions.vue` | `.c-reaction-group`, `.c-reaction` | `likes, dislikes` | Daumen hoch und runter immer beide sichtbar, je mit Zahl (Abschnitt 9) |
| `WordActionsMenu.vue` | `.c-icon-button`, `.c-menu-anchor`, `.c-menu`, `.c-menu__item` | `url, word` | Teilen, Link kopieren, Wort kopieren |
| `WordMeanings` | `.c-meanings` (ab 2) / `p.t-em` (1) | `meanings` | ab 6 Bedeutungen einklappen: 5 zeigen + „Alle n Bedeutungen zeigen“ |
| `WordTrendBox.astro` | `.c-trend`, `.c-trend__bars` | `rank, views, change, bars[7]` | nur wenn trending |
| `WordAudio.vue` | `.c-choice` (`aria-pressed`) | `sources: {m?, w?}` | nur eine Stimme spielt gleichzeitig, auch über Beispiele hinweg |
| `WordImages.vue` + `Lightbox.vue` | `.c-image-strip`, `__btn`, `.c-lightbox` | `images: {src, alt, credit, link?}[]` | Credit ist Pflicht |
| `WordPoll.vue` (Island) | `.c-choice--tile`, `.c-choice`, `.c-infotext`, `.c-state` | `slug, status` | Abschnitt 10 |
| `SectionCard.astro` | `.c-section-card`, `__header`, `__title`, `__body`, `__footer` | `id, title, level: 2/3` | Slot für Body und Footer |
| `WordAnalysis.astro` | `.c-band` + 4 × SectionCard | – | Orthographie, Grammatik, Quantitative Linguistik, Phonologie |
| `LetterTiles.vue` | `.c-letters`, `.c-letters__tile` (`--fill`) | `letters: {ch, pct, vowel}[]` | Toggle „Häufigkeiten als Zahlen zeigen“ |
| `BookShelf.astro` | `.c-shelf`, `.c-book`, `__cover`, `__title`, `__cta` | `books[≤3]` | `rel="sponsored noopener"`, Badge „Anzeige“ |
| `WordNeighborhood.astro` | `.c-textlink--inline`, Listen | `related, before[3], after[3]` | aktuelles Wort mit Wash markiert |
| `WordComments.vue` (Island) | `.c-comment*`, `.c-reaction`, `.c-choice`, `.c-field`, `.c-button--primary`, `.c-state`, `.c-menu`, `.c-kbd` | `slug, initial, currentUserToken` | Abschnitt 9 und 9a |
| `NextLinks.astro` | `.c-next-link` | – | Ooch im Trend · Zufälliges Wort · Wort-Index · Wort vorschlagen |
| `WordDates` | `.t-small` | `created, edited` | „Wort erstellt am {created} · Bearbeitet am {edited}“ |

### Bedienelemente: nur diese Stile

| Stil | Klasse | Ruhezustand | Wofür |
|---|---|---|---|
| Primary | `.c-button--primary` | orange-600, weiße 700 | höchstens **1 pro Ansicht**: „Abschicken“ |
| Auswahl | `.c-choice` | transparent, 1px solid `--control-border` | Antworten, Audio, Sortierung, „Kommentar schreiben“, Bezirk |
| Umfrage-Kachel | `.c-choice.c-choice--tile` | wie Auswahl, Grund `--surface-chip`, 72px hoch | nur die 3 Abstimmungs-Antworten |
| Reaktion | `.c-reaction` | randlos, muted | Daumen hoch/runter bei Wort und Kommentaren, immer als Paar |
| Icon-Button | `.c-icon-button` | randlos, 44 × 44 | ⋮, Lightbox schließen |
| Textlink | `.c-textlink` (`--inline`) | muted, gestrichelt unterstrichen | alles Sekundäre: „Stimme ändern“, „Alle 4 Kommentare zeigen“, „Antworten“ |

`.c-button` (alt), `--filter` und `--control` kommen auf der Wortseite **nicht** mehr vor.

---

## 6. Datenmodell

So ist das Mock-Objekt aufgebaut. Feldnamen sind ein Vorschlag, gemappt auf das WordPress-GraphQL-Schema.

```ts
interface Word {
  slug: string
  word: string                 // „Testwort“
  article?: string             // „der“, „die“, „das“; im Hero nach dem Wort, kleiner
  pos: WordClass               // EIN Feld für Badge UND Grammatik (s. Abschnitt 8)
  posAuto: boolean             // true = NLP-geraten → .c-badge--auto + Label „Nomen (geraten)“
  berolinismus: boolean
  themes: { label: string; url: string }[]   // 0..n, z. B. Alltag & Wohnen, Berlin & Orte
  audio?: { m?: string; w?: string }      // Datei-URLs
  meanings: string[]           // ≥ 1
  same?: { label: string; url: string }   // „Selbe Bedeutung wie …“
  origin?: string
  sources: string[]
  examples: { text: string; explanation?: string; audio?: { m?: string; w?: string } }[]
  syllables: string[]          // ['Test', 'wort'] → „Test · wort“
  parts: { label: string; url?: string }[]  // Wortzerlegung
  counts: { letters: number; vowels: number; consonants: number; unique: number; syllables: number }
  freq: { ch: string; pct: number; label: 'sehr häufig' | 'häufig' | 'gelegentlich' | 'selten' }[]
  facts: string[]              // „Kein Palindrom“, „Längste Konsonantenfolge …“
  grammar: { w: string; pos: WordClass }[]  // pro Token bei Mehrwort-Ausdrücken
  similar: string[]            // Phonologie
  written: string[]            // Orthographie „Ähnlich geschrieben“
  anagrams: string[]
  related: { label: string; url: string; relation?: string }[]
  before: string[]; after: string[]       // je 3 alphabetische Nachbarn
  images: { src: string; alt: string; credit: string; link?: string }[]
  books: { title: string; kind: string; desc: string; cover?: string; url: string }[]
  likes: number; dislikes: number
  trend?: { rank: number; views: number; change: string; bars: number[] }  // bars = 7 Tageswerte
  created: string; edited: string          // ISO, Anzeige „8. November 2026“
}
type WordClass = 'Nomen' | 'Verb' | 'Adjektiv' | 'Adverb' | 'Pronomen' | 'Präposition' | 'Konjunktion' | 'Interjektion' | 'Redewendung'
```

**Doppelte Wörter:** Ein Wort erscheint dort, wo es fachlich hingehört (`similar` → Phonologie, `written` → Orthographie). Im Umfeld landet es nur, wenn es nicht schon in `similar` oder `written` vorkommt.

---

## 7. Copy (exakt so übernehmen)

| Stelle | Text |
|---|---|
| Bedeutungs-Label | `Bedeutung` / `Bedeutungen` |
| Mehr Bedeutungen | `Alle {n} Bedeutungen zeigen` |
| Gleiche Bedeutung | `Selbe Bedeutung wie {Wort}` |
| Trend-Badge | `Im Trend · Platz {n}` |
| Trend-Kasten | `Trendet jerade` · `Platz {n} diese Woche` · `{views} Aufrufe in 7 Tagen · {change} zur Vorwoche` · `Alle Trend-Wörter ansehen →` |
| Audio | `Anhören` · `Männlich` / `Weiblich` (spielend: Stop-Icon) |
| Bilder | Caption `Foto: {credit}` · `Erfahre mehr über dieses Wort ↗` |
| Reaktion Wort | Gruppe `Wie findste ditt Wort?` · aria `Jefällt ma, {n}` / `Nee, {n}` |
| Reaktion Kommentar | Gruppe `Kommentar bewerten` · aria `Hilfreich, {n}` / `Nich hilfreich, {n}` |
| Themen | Label `Thema` / `Themen` |
| Menü | `Wort teilen` · `Link kopieren` → `Link kopiert` · `Wort kopieren` → `Wort kopiert` |
| Etymologie-Footer | `Quelle` / `Quellen` |
| Grammatik-Label | `Wortart (NLP-Analyse)` |
| Kacheln-Legende | `Füllhöhe = wie häufig der Buchstabe im Deutschen vorkommt. Orange = Vokal, grau = Konsonant.` |
| Häufigkeiten-Toggle | `Häufigkeiten als Zahlen zeigen` / `Häufigkeiten ausblenden` |
| Quant.-Footer | `Häufigkeit: knapp 180 Mrd. Zeichen aus dem Deutschen Referenzkorpus · Wikipedia` |
| Bücher | `Ooch als Buch zu haben, wa?` · `Anzeige` · `Für Berliner & solche, die es werden wollen – zum Nachschlagen, Rätseln und Verschenken.` · `Bei Amazon ansehen ↗` · `Bezahlte Links zu Amazon.de. Kaufst du darüber, kriegen wa ’ne kleine Provision – für dich bleibt der Preis gleich.` |
| Umfeld | `Lexikalisches Umfeld` · `Verwandte Wörter` · Nachbarn |
| Kommentare | `Wat sagste dazu? ({n})` · leer: `Hier hat noch keener wat jesacht. Fang du doch an!` · `Alle {n} Kommentare zeigen` · `Antworten` · `Kommentar schreiben` |
| Formular | `Dein Kommentar` (max. 1000, Zähler `0 / 1000`) · `Dein Name (optional)` · Placeholder `z. B. Kiez-Kalle` · Hint `Leer jelassen? Dann kriegste ’n Berliner Namen, z. B. „Anonyme Schrippe“.` · `Abschicken` / `Nochmal abschicken` · `Mit dem Abschicken wird dein Kommentar öffentlich angezeigt. Was wir dabei speichern, steht in der Datenschutzerklärung.` · Desktop: `Strg` `Enter` `zum Abschicken` (macOS: `⌘` `Enter`) |
| Kommentar-Menü | `Link kopieren` → `Link kopiert` · eigene: `Bearbeiten` · `Löschen` · fremde: `Melden` → `Schon jemeldet` · aria `Weitere Aktionen zum Kommentar von {name}` |
| Bearbeiten | `Kommentar bearbeiten` · `Speichern` · `Abbrechen` · Meta danach `· bearbeitet` |
| Löschen | `Kommentar wirklich löschen?` · `Dit kann man nich rückgängig machen.` · `Ja, löschen` · `Abbrechen` · danach `Du hast deinen Kommentar jelöscht.` |
| Melden | `Wat is mit dem Kommentar?` · `Spam oder Werbung` · `Beleidigend` · `Falsch oder irreführend` · `Wat anderet` · `Magste dit kurz erklären? (optional)` · `Melden` · `Abbrechen` · Erfolg `Danke, is jemeldet.` `Wir kieken uns den Kommentar an. Bis dahin bleibt er sichtbar.` |
| Erfolg Kommentar | `Danke, is anjekommen!` · `Dein Kommentar erscheint, sobald wa ihn jesehen haben.` |
| Fehler Kommentar | `Ditt hat nich jeklappt.` · `Dein Kommentar is nich rausjegangen. Dein Text bleibt stehen – versuch’s gleich nochmal.` |
| Offline-Banner | `Du bist offline.` · `Du siehst die jespeicherte Version. Abstimmen und Kommentieren jeht wieder, sobald du Netz hast.` |
| Daten | `Wort erstellt am {created} · Bearbeitet am {edited}` |
| Und nu? | `Und nu?` · `Ooch im Trend` · `Zufälliges Wort` · `Wort-Index` · `Wort vorschlagen` |

Die Copy der Umfrage steht in Abschnitt 10.

---

## 8. Regeln, die nicht verhandelbar sind

1. **Die Wortart ist überall identisch.** Badge im Hero, Seitenleisten-Untertitel und Grammatik-Karte lesen dasselbe Feld `pos`. Ist der Wert NLP-geraten (`posAuto`), sieht das Badge so aus: `.c-badge--auto`, Text „{pos} (geraten)“. Die Grammatik-Karte heißt dann ehrlich „Wortart (NLP-Analyse)“.
2. **Orange-Budget.** Vollflächen gibt es nur für `.c-button--primary`, eine gewählte `.c-choice` und `.c-badge--strong` (Trend). Pro Ansicht höchstens eine Vollfläche plus Trend-Badge. Alles andere ist ein Wash (14–16%) oder Text in `--color-accent-text`.
3. **Kein Kasten im Kasten.** In Section-Cards gibt es keine weiteren umrandeten Boxen. Ausnahmen sind `.c-infotext` und die Kennzahl-Flächen (randlos, `--surface-chip`).
4. **Badges und Tags ohne Rand** (v3).
5. **Radius maximal 4px.** Auch Avatare und Icon-Flächen sind eckig.
6. **Touch-Ziele mindestens 44 × 44px.** Ausnahme: Kacheln im Desktop-Index (36px).
7. **Leere Blöcke verschwinden** (Abschnitt 2).
8. **Affiliate:** Immer das Badge „Anzeige“, den Hinweistext und `rel="sponsored noopener"`.

---

## 9. Zustände und Interaktionen

| Element | Zustand | Verhalten |
|---|---|---|
| `.c-choice` | Hover | Rand gestrichelt + `--shadow-hover-glow`, `.3s` |
| | gewählt | `aria-pressed="true"` → orange-600-Fläche, weiße 700 |
| | gesperrt | `aria-disabled="true"`: Deckkraft .55, Rand gepunktet, kein Glow, Klick ohne Wirkung. Nicht `disabled`, damit das Element fokussierbar bleibt und der Grund vorgelesen werden kann |
| `.c-reaction` | Hover | Rand gestrichelt `--rule-card`, Text ink-strong |
| | gedrückt | Text accent, Grund orange-500 15% |
| Like/Dislike (Hero und Kommentare) | Ruhe | **Beide immer sichtbar, gleichberechtigt**: Daumen hoch + Zahl, Daumen runter + Zahl, `gap: .25rem`, gleiche Größe und Farbe. Kein Hover-Einblenden, nichts im Menü versteckt |
| | Klick | Like und Dislike schließen sich aus; nochmal klicken nimmt zurück. Zähler optimistisch ±1. Bei Fehler zurückrollen + Toast „Ditt hat nich jeklappt.“ |
| ⋮-Menü | offen | `aria-expanded="true"`, Button mit gestricheltem Rand |
| | Link/Wort kopieren | Icon wird zu ✓, Label zu „Link kopiert“ bzw. „Wort kopiert“, `data-done="true"` (accent, 700). Nach 2s zurück. **Kein** extra Toast |
| | Wort teilen | `navigator.share({title, url})`; ohne Web-Share-API wird stattdessen der Link kopiert |
| Audio | Klick | spielt (Icon ▶ → ■, `aria-pressed="true"`); ein zweiter Klick stoppt. Startet eine andere Stimme, stoppt die erste. Am Ende zurück auf idle |
| | Datei fehlt | Button nicht rendern; fehlen beide, entfällt die ganze Zeile |
| Bild | Klick | öffnet Lightbox an Index i |
| Bedeutungen | > 5 | 5 zeigen + Textlink „Alle n Bedeutungen zeigen“ (`aria-expanded`). Zuklappen nicht nötig |
| Häufigkeiten | Toggle | Liste Buchstabe · Prozent (Komma) · Label, 2-spaltig |
| Tabs | Klick | Smooth-Scroll zum Anker (`prefers-reduced-motion` → sofort). Aktiver Tab per Scroll-Spy |
| Kommentare | ≥ 2 | Sortierung „Beste“ / „Neueste“ (`.c-choice`, klein) erscheint im Kartenkopf |
| | > 3 | 3 zeigen + „Alle n Kommentare zeigen“ |
| | Bewerten | Daumen hoch („hilfreich“) und runter („nich hilfreich“) wie beim Wort; „Beste“ sortiert nach hoch minus runter |
| | „Kommentar schreiben“ | klappt das Formular auf, Fokus ins Textfeld |
| | Abschicken | Primary zeigt während des Requests Busy (`aria-busy`, Text bleibt, Doppelklick gesperrt). Erfolg: Formular zu, Erfolgsbox oberhalb des Buttons. Fehler: Fehlerbox über dem Button, Text bleibt, Button heißt „Nochmal abschicken“ |
| Antworten | – | eine Ebene tief, eingerückt 48px (`.c-comment--reply`) |
| Formular | `Strg`/`⌘` + `Enter` | schickt ab wie der Button. Hinweis mit `.c-kbd` nur ab 808px und bei `hover: hover`; mobil ist der Button volle Breite |

### 9a. Kommentar-Aktionen (⋯ pro Kommentar)

`.c-icon-button` mit ⋯ rechts in der Aktionszeile (nach Daumen und „Antworten“), öffnet `.c-menu`.

| Eintrag | Für | Verhalten |
|---|---|---|
| Link kopieren | alle | kopiert `/wort/{slug}#kommentar-{id}`; Icon → ✓, Label → „Link kopiert“, 2s. Jeder Kommentar hat `id="kommentar-{id}"`; beim Aufruf mit Anker hinscrollen und den Kommentar 2s mit 14%-Wash hervorheben |
| Bearbeiten | eigener Kommentar | Text wird an Ort und Stelle zum Textfeld (vorbefüllt, max. 1000). „Speichern“ (`.c-choice` gedrückt, kein zweiter Primary) / „Abbrechen“. Danach Meta „· bearbeitet“. Zeitfenster: offener Punkt |
| Löschen | eigener Kommentar | Inline-Bestätigung `.c-state--error` (`role="alertdialog"`, Fokus auf „Ja, löschen“), kein Modal. Danach Platzhalter „Du hast deinen Kommentar jelöscht.“ (`role="status"`) bis zum Neuladen; Zähler −1 |
| Melden | fremde Kommentare | Inline-Panel auf `--surface-chip`: Grund als `.c-choice` (Pflicht), Notiz optional (max. 300). „Melden“ ist `aria-disabled`, bis ein Grund gewählt ist. Danach `.c-state--done`; der Kommentar bleibt sichtbar, der Eintrag heißt „Schon jemeldet“ (`aria-disabled`). Einmal pro Gerät und Kommentar |

- **„Eigener Kommentar“:** erkannt über ein Token im Browser (localStorage oder Cookie) aus der Antwort beim Abschicken, weil Kommentare ohne Login sind. Der eigene, frische Kommentar steht für den Autor oben angepinnt.
- Nur eine Aktion pro Kommentar ist gleichzeitig offen; das Menü schließt, sobald ein Eintrag gewählt ist. Esc schließt Menü und Panels.

### Seitenweite Zustände

| Zustand | Darstellung |
|---|---|
| Laden | Skeleton (`.c-skeleton`): Hero mit Titelbalken 60%, 2 Badge-Balken, 2 Zeilen; Audio 2 × 44px; 2 Karten. Erst nach 300ms zeigen, bei Cache nie. Seiten sind statisch (Astro), Skeleton nur bei Client-Navigation/Islands |
| Offline (PWA) | `.c-state--offline` oben in `main`: Lesen geht. Umfrage-Kacheln und „Kommentar schreiben“ sind `aria-disabled`, die Umfrage zeigt ihren eigenen Offline-Hinweis |
| Fehler Abstimmen | `.c-state--error` in der Umfrage über den Kacheln, mit „Nochmal versuchen“. Die Wiederholung schickt dieselbe Antwort |
| Fehler Kommentar | siehe oben |

---

## 10. Umfrage „Sagste det noch?“

**Kopf:**
- Titel `Sagste det noch?` (h2)
- Frage `Is dit Wort bei dir noch im Einsatz?`
- Darunter `Schon {n} Stimmen – wat sagst du?` bzw. `Noch keener hat abjestimmt – mach den Anfang!`; im Ergebnis `Bisher {n} Stimmen`

**Kacheln** (`.c-choice--tile`, Icon 40px in gestricheltem Quadrat, Hover: Icon −8° und 108%):

| Antwort | Hinweis |
|---|---|
| Sag ick selbst | Kommt mir regelmäßig übern Mund |
| Kenn ick | Hab ick schon mal jehört |
| Nie jehört | Is mir janz neu |

Ein Klick auf eine Kachel ist die Stimme. Es gibt keinen Bestätigungs-Button.

**Schritte:** `vote → bezirk → kiez → herkunft → haelfte → alter → done`

Die Umfrage startet direkt: Nach der Stimme kommen sofort die Ergebnis-Balken (mit „· deine Antwort“) und darunter die erste Frage. Es gibt **keine** Like-Frage und keinen Zwischenschritt „Willste noch mehr helfen?“. Zurück zur Stimme geht es über `← Zurück`.

| Schritt | Frage | Optionen | Wird übersprungen, wenn |
|---|---|---|---|
| bezirk | `Wo wohnste?` | SVG-Karte der 12 Bezirke + Fläche „Woanders“ (= Brandenburg-Rahmen); Umschalter `Lieber aus ner Liste wählen` / `Lieber auf der Karte wählen` | – |
| kiez | `Welcher Kiez?` | Ortsteile des Bezirks (z. B. Pankow: Prenzlauer Berg, Weißensee, …) | „Woanders“ |
| herkunft | `Uffjewachsen oder zujezogen?` | Hier uffjewachsen · Zujezogen, über 10 Jahre her · Zujezogen, unter 10 Jahren | – |
| haelfte | `In welcher Hälfte?` | Ost · West · Beides / nach der Wende | „Woanders“ oder „Zujezogen, unter 10 Jahren“ |
| alter | `Wie alt biste?` | unter 20 · 20–29 · 30–39 · 40–49 · 50–59 · 60–69 · 70–79 · 80+ | – |
| done | `Danke fürs Mitmachen!` | – | – |

- **Fortschritt:** 6 Segmente, `aria-label="Schritt {i} von {n}"`. Übersprungene Schritte zählen nicht mit.
- **Navigation:** `← Zurück` und `überspringen` (Textlinks) in jedem Profil-Schritt.
- **Infotext** (`.c-infotext`), aufklappbar über `Warum fragen wa dit?`:
  - Überschrift: `Warum so ville Fragen?`
  - Text: „Weil wa hier zusammen forschen: Wie klingt det Berlinerische heute, wo wird’s noch jesprochen und von wem? Jede Antwort hilft uns, den Berliner Metrolekt besser zu verstehen – dafür brauchen wa ’n paar Angaben von dir: wo de wohnst, ob de hier uffjewachsen bist und wie alt de bist. Mach mit, so weit de willst – jede Frage kannste überspringen.“
- **Karten-Credit:** `Karte: Geoportal Berlin / ALKIS Berlin Bezirke`
- **Speichern:** Stimme pro Wort und Gerät; Profilangaben einmal pro Gerät. Wer schon ein Profil hat, sieht nach der Stimme nur die Ergebnisse und „Danke fürs Mitmachen!“.

---

## 11. Responsive-Verhalten (zusätzlich zu Abschnitt 3)

| Breakpoint | Änderungen |
|---|---|
| < 808px | Tab-Leiste statt Seitenleiste. Bilder als Strip unter dem Hero. Alles einspaltig, horizontale Scroller (Bilder, Bücher) ohne Scrollbar, mit Snap |
| 808–999px | Seitenleiste links. Bilder im Hero unter den Bedeutungen. 2-Spalten-Blöcke aktiv |
| ≥ 1000px | Hero 2-spaltig mit Bildern rechts (`grid-row: 1 / span 3`) |
| `hover: none` | Hover-Effekte nur über `@media (hover: hover)` |
| `prefers-reduced-motion` | kein Shimmer, kein Kachel-Kippen, kein Smooth-Scroll |

---

## 12. Grenzfälle

| Fall | Verhalten | Board |
|---|---|---|
| Langes Wort (36+ Zeichen, z. B. „Rinnsteinschwalbenbeobachtungsposten“) | `h1`: `hyphens: auto; overflow-wrap: anywhere`, Root `lang="de"`. Seitenleisten-Titel: `overflow-wrap: anywhere`. Buchstaben-Kacheln brechen um, min. 28px | Grenzfall · langes Wort (mobil und Desktop) |
| Viele Bedeutungen (10) | 5 + „Alle 10 Bedeutungen zeigen“ | dto. |
| Viele Kommentare (20) | 3 + „Alle 20 Kommentare zeigen“; danach paginiert in 10er-Schritten | dto. |
| Sehr langer Kommentar | voller Text, kein Abschneiden; ab ca. 600 Zeichen auf 8 Zeilen kürzen + „Weiterlesen“ (Vorschlag) | dto. |
| Minimales Wort (1 Bedeutung, ohne Herkunft, Beispiele, Bilder, Audio, Verwandte) | Etymologie, Beispiele, Bilder, Audio, Phonologie und Verwandte entfallen. Umfeld zeigt nur die Nachbarn, Analyse bleibt | Grenzfall · minimale Daten |
| Kein Artikel | Artikel-Span entfällt | – |
| Mehrwort-Ausdruck („Ab Notam“) | Grammatik listet pro Token; Badge zeigt die Wortart des Ausdrucks | – |
| 1 Bild | Strip mit einer Figur in voller Breite; Desktop ohne Thumbs | – |
| Keine Bücher | Sektion entfällt komplett | – |
| Langsame Verbindung | Bilder `loading="lazy"` (außer dem 1. Bild auf Desktop), `aspect-ratio: 4/3` reserviert Platz (kein CLS). Audio mit `preload="none"` | – |

---

## 13. Animation und Motion

| Element | Auslöser | Animation | Dauer | Easing |
|---|---|---|---|---|
| Bedienelemente (Rand, Glow, Grund) | Hover | `border-style` solid → dashed, Glow ein | 300ms | ease (DS-Standard) |
| Umfrage-Icon | Hover Kachel | `rotate(-8deg) scale(1.08)`, Farbe orange-400 → 300 | 300ms | ease |
| Menü-Eintrag | Hover/Fokus | Grund-Wash ein | 200ms | ease |
| Chip-Link Pfeil | Hover | „→“ fährt ein | 150ms | ease |
| Skeleton | Laden | Shimmer `background-position` | 1400ms, endlos | linear |
| Lightbox | öffnen | Fade 0→1 + Backdrop-Blur 4px (Vorschlag) | 200ms | ease-out |
| Tab-Klick | Klick | `scroll-behavior: smooth` | Browser | – |

Alles respektiert `prefers-reduced-motion: reduce`.

---

## 14. Barrierefreiheit

**Fokus-Reihenfolge:** Tabs bzw. Seitenleiste → Like → Dislike → ⋮ → Themen-Links → „Selbe Bedeutung wie“ → Trend-Link → Audio → Bilder → Umfrage → Karten in DOM-Reihenfolge → Kommentare → „Und nu?“.

**Fokusring:** `outline: 2px dashed var(--orange-400); outline-offset: 2px` auf allen Bedienelementen. Nie entfernen.

**ARIA:**
- Tab-Leiste: `<nav aria-label="Inhalt der Wortseite">`, aktiver Link mit `aria-current="true"`. Bewusst keine `role="tablist"`, denn es sind Anker-Links.
- Reaktionen: Gruppe `role="group"` mit `aria-label`; Buttons `aria-pressed`, `aria-label` mit Zahl („Jefällt ma, 12“).
- ⋮: `aria-haspopup="menu"`, `aria-expanded`, `aria-label="Weitere Aktionen"`; Liste `role="menu"`, Einträge `role="menuitem"`.
- Themen: `<p>` mit Label, Links mit Text; das „·“ kommt per CSS und wird nicht vorgelesen.
- Audio-Gruppe: `role="group" aria-labelledby` → „Anhören“; Buttons mit `aria-pressed`.
- Bilder: Button `aria-label="Bild {i} von {n} vergrößern: {alt}"`. `<img alt="">` im Button, weil der Button-Text schon beschreibt.
- Trend-Balken: `aria-hidden="true"`, die Zahlen stehen im Text.
- Buchstaben-Kacheln: `aria-hidden="true"`; Kennzahlen und Toggle-Liste sind die zugängliche Version.
- Umfrage-Kacheln: `aria-pressed`. Gesperrt: `aria-disabled="true"` + sichtbarer Hinweis.
- Zustände: Fehler `role="alert"`, Offline/Erfolg `role="status"`, Skeleton-Container `aria-busy="true" aria-label="Wort wird jeladen"`.
- Formular: `<label for>`, Name-Hint über `aria-describedby`, Zähler als `aria-live="polite"`. Er meldet erst ab 900 Zeichen, sonst ist er zu gesprächig.

**Tastatur:**
- Menü: Enter/Space öffnet, ↑/↓ bewegt, Esc schließt und gibt den Fokus an ⋮ zurück, Tab schließt.
- Lightbox: Esc schließt, ←/→ blättert, Fokus ist gefangen und kehrt zum Thumbnail zurück.
- Bezirkskarte: Jede Fläche ist ein fokussierbares `<a>` bzw. `<button>` mit Namen; die Listenansicht ist die gleichwertige Alternative.

**Ansagen:**
- Kopieren: Live-Region `polite` „Link kopiert“.
- Stimme abgegeben: Fokus auf die erste Frage „Wo wohnste?“ (h3, `tabindex="-1"`), Live-Region `polite` „Stimme jezählt“.
- Schrittwechsel: Fokus auf die neue Frage.

**Kontrast:** Alle Textfarben erreichen mindestens 4.5:1 in beiden Themes (Tokens oben). Rot und Grün kommen nur als Streifen bzw. Icon vor, nie als Text.

---

## 15. Header und Footer (Kurzfassung)

Volle Specs folgen mit der Index-Seite. Boards: Seite „v3 · Header, Footer & Index“.

**Header mobil (56px):**
- Logo 32px + Wortmarke Berliner 1.35rem.
- Rechts Suche (`.c-icon-button`) und Menü (☰/✕).
- Die Suche klappt eine Zeile mit Feld und Vorschlägen auf („Knorke ᛫ großartig, toll“).
- Das Menü klappt die Hauptnavigation auf: Wort-Index, Im Trend, Spiele, Magazin, dann Trenner, Wort vorschlagen, Theme, App installieren.

**Header Desktop (64px, max 1160):**
- Logo 36px + Wortmarke 1.6rem.
- Nav-Links mit 3px-Unterstrich in orange-600 bei `aria-current="page"`.
- Suchfeld 260px mit `/`-Kürzel.
- Theme-Icon und Textlink „Wort vorschlagen“.
- Suchfeld mit `border-inline-start: 3px solid var(--red-berlin-500)`. Das ist der vorgesehene „Searchbar-Akzent“.

**Footer:**
- Bär + `Knorke, ditt du mich hier unten besuchst.` (Berliner).
- Grund `--surface-paper` mit App-Block und 4 Link-Gruppen: Seiten, Unterstützen, Social Media, Rechtliches.
- Endleiste in `--red-berlin-700` mit weißem Text (5.8:1): Version · „Ein Projekt von Webshaped / Felix Scholze“ · „Hergestellt mit 🐻-Kräften in Berlin“.

---

## 16. Offene Punkte (Produktentscheidungen)

1. **Kommentare bearbeiten:** unbegrenzt oder nur z. B. 15 Minuten nach dem Abschicken? Und ab wie vielen Meldungen wird ein Kommentar automatisch ausgeblendet?
2. **Trend-Metrik:** Aufrufe in 7 Tagen oder Wachstum zur Vorwoche? Wie viele Plätze bekommen das Badge? Vorschlag: Top 10.
3. **„In welcher Hälfte?“:** Wird es auch bei „Zujezogen, über 10 Jahre her“ gefragt? Aktuell ja.
4. **Header-Verhalten:** ein- und ausblenden beim Scrollen (Empfehlung) oder statisch?
5. **Kommentare:** Moderation vor Veröffentlichung? Der Text „sobald wa ihn jesehen haben“ geht davon aus.

---

## 17. Dateien

```
wortseite-v3-handoff/
├── SPEC.md                        ← dieses Dokument
├── design/
│   ├── Mobile2.dc.html            ← Master (390px): Markup, Daten, Logik; Props theme/word/comments/trending/status
│   ├── Desktop3.dc.html           ← Desktop, 2 Spalten, Bilder im Hero (aus Mobile2 generiert)
│   ├── Poll.dc.html               ← Umfrage inkl. Bezirkskarte (SVG) und Schrittlogik
│   ├── Header.dc.html, Footer.dc.html
│   └── generate-desktop.py        ← zeigt exakt, was Desktop gegenüber Mobil ändert
└── ds/
    ├── components/bundle.css      ← DS v3: alle c-*-Klassen (inkl. t-label/t-em/t-small)
    ├── tokens.css, colors_and_type.css
    └── components-v3.md           ← README-Auszug: Regeln + Bausteine
```

**So liest du die `.dc.html`:**
- `{{x}}` sind Werte aus `renderVals()`.
- `<sc-if>` und `<sc-for>` entsprechen `v-if` und `v-for`.
- `<dc-import name="Poll">` ist eine Kindkomponente.
- Inline-Styles sind die exakten Maße.
- Die Klassen `bs-n`, `bs-d`, `bs-hero`, `bs-heroimg` und `bs-2col` sind reine Layout-Hilfen des Mocks und entsprechen `.c-word-page` und `.c-word-main`.
