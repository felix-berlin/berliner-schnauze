# Handoff Spec: Berliner oder nicht? (BON) – Spiel, Rangliste, Spielercode

Stand: 11. November 2026 · Design System „Berliner Schnauze“ v3.1

**Boards:** Canvas „Wortseite vereinheitlichen“, Seite **„v3 · Berliner oder nicht?“**.

**Dateien in `design/`:**

| Datei | Inhalt |
|---|---|
| `BonGame.dc.html` | Start, Spiel, Rückmeldung, Ergebnis |
| `BonLeaderboard.dc.html` | Rangliste |
| `BonCode.dc.html` | Spielercode |
| `BonName.dc.html` | Spielername anzeigen und ändern |
| `Header.dc.html`, `Footer.dc.html` | Rahmen der Seite |

Gemeinsame Klassen stehen in `ds/components/bundle.css` und sind im Design System dokumentiert (`ds/components-v3.md`).

**So liest du die `.dc.html`-Dateien:**
- `{{x}}` ist ein Wert aus `renderVals()`.
- `<sc-if>` und `<sc-for>` entsprechen `v-if` und `v-for`.
- `<dc-import>` ist eine Kindkomponente.
- Inline-Styles enthalten die exakten Maße.
- Der Prop `start` schaltet zwischen den Zuständen um.

Die Wortlisten in den Mocks sind Platzhalter. Die Namen in den Mocks sind erfunden, echte Namen oder Texte aus der Datenbank gehören nicht hinein.

---

## 1. Überblick

Ein Wischspiel: Ist das Wort echtes Berlinerisch oder erfunden? Gespielt wird mobil mit einer Hand, in kurzen Runden. Die Gestaltung folgt drei Zielen:

1. **Fluss.** Pro Karte gibt es genau eine Aktion, also Wischen, Tippen oder eine Pfeiltaste. Einen „Weiter“-Button gibt es nicht.
2. **Lernen.** Bei einem Fehler bleibt die Lösung länger stehen. Am Ende listet „Deine Runde“ alle Wörter mit Links zu den Wortseiten. Das bringt auch interne Links für SEO.
3. **Wiederkommen.** Dazu dienen die Rangliste mit „Hier stehste“ und der Spielercode für andere Geräte.

**Seiten:**

| Seite | Pfad (Vorschlag) |
|---|---|
| Spiel | `/spiele/berliner-oder-nicht` |
| Rangliste | `/spiele/berliner-oder-nicht/rangliste` |

Beide Seiten haben Header (`current="spiele"`) und Footer.

---

## 2. Spielregeln (Quelle: Backend)

- **Leben:** 3. Das Spiel endet beim dritten Fehler.
- **Punkte:** 10 × Multiplikator. Der Multiplikator ist abhängig von der Serie richtiger Antworten in Folge:

  | Serie | Multiplikator |
  |---|---|
  | 0–2 | ×1 |
  | ab 3 | ×2 |
  | ab 6 | ×3 |
  | ab 10 | ×5 |

  **Annahme, bitte prüfen:** Der Multiplikator gilt schon für die Antwort, mit der die Schwelle erreicht wird. Die dritte richtige Antwort in Folge zählt also 20 Punkte.
- **Karten:** Sie kommen in Stapeln zu 20. Zu jeder Karte gibt es `word`. Nach der Antwort kommt vom Server `translation` (nur bei echten Wörtern) und die Info, ob die Antwort richtig war. `isReal` sendet der Server nie vorher.
- **Spielende:** `POST /api/bon/finish` liefert `score`, `bestStreak`, `totalAnswered`, `correctAnswers`, `rank`, `totalGames` und `playerName`.

---

## 3. Layout

| | Mobil (< 808px) | Desktop (≥ 808px) |
|---|---|---|
| Seitenrahmen | Padding `1.5rem 1rem 3rem` | `max-width: 1060px`, Padding `56px 24px 96px` |
| Start | einspaltig: Text, Name, Start; darunter „So jeht’s“ | 2 Spalten `1.1fr / 1fr`, `gap: 3rem` |
| Spiel | volle Breite | eine Spalte, `max-width: 520px`, zentriert |
| Ergebnis | einspaltig: Kennzahlen → Aktionen → Hier stehste → Spielercode → Deine Runde | 2 Spalten `1fr / 1fr`, `gap: 2.5rem`; rechts „Deine Runde“ |
| Rangliste | Liste; „Dein Platz“ als feste Leiste unten | `max-width: 1160px`, Tabelle + rechte Spalte 300px „Dein Platz“ |

**Begründung:** Während des Spiels bleibt auch auf Desktop alles in einer schmalen Spalte. Die Augen sollen auf der Karte bleiben, und Kopfzeile, Karte und Antworten liegen nah beieinander.

---

## 4. Tokens

Es gelten ausschließlich die DS-Tokens. Die wichtigsten hier:

| Token | Verwendung |
|---|---|
| `--surface-sheet` + `--rule-card` (gestrichelt) + `--paper-lift` | Spielkarte, Karten „So jeht’s“, „Deine Runde“, Rangliste |
| `--surface-chip` | Kennzahlen, Multiplikator-Felder, Code-Feld, Nachbarzeilen „Hier stehste“ |
| `--orange-600` (Fläche) | nur „Los jeht’s“, „Nochmal spielen“, das aktuelle Multiplikator-Feld und das Badge „Neuer Rekord!“ |
| `--orange-500` 16–22 % Wash | erreichte Multiplikatoren, eigene Zeile in Rangliste und „Hier stehste“ |
| `--color-accent-text` | Punkte-Zuwachs, Plätze 1–3, „du“ |
| `--success` / `--danger` | **nur** Streifen (4px links an der Rückmeldungskarte), Icons ✓/✗ und gefüllte Herzen, nie als Fläche oder Text |
| `--orange-400` | Icons in „So jeht’s“, Warn-Streifen beim Spielercode |
| `--font-body` 700 | **das Spielwort**. Ausdrücklich nicht `--font-display`, weil die DS-Basis alle `h1–h6` auf Berliner setzt. Deshalb braucht das Wort, obwohl es ein `h2` ist, `font-family: var(--font-body)` |
| `.c-band` (Berliner) | nur „Berliner oder nicht?“, „Aus die Maus!“ und „Rangliste“ |

Radius maximal `--radius-sm` (4px). Es gibt **keine Pillen** und keine runden Buttons.

---

## 5. Komponenten (Vorschlag Vue)

| Komponente | DS-Klassen | Props / State | Hinweise |
|---|---|---|---|
| `BonPage.astro` | – | – | Header, `<BonGame client:load>`, Footer |
| `BonGame.vue` | `.c-band`, `.c-field`, `.c-button--primary`, `.c-choice`, `.c-section-card`, `.c-state`, `.c-skeleton`, `.c-badge--strong`, `.c-textlink` | State: `phase: 'intro' \| 'play' \| 'feedback' \| 'loading' \| 'error' \| 'over'`, `lives`, `score`, `streak`, `bestStreak`, `history[]`, `last` | Abschnitte 6–9 |
| `BonHud.vue` | – | `lives, score, streak, playerLabel` | Herzen, Punkte, Serie, Multiplikator-Leiste |
| `BonCard.vue` | `.bon__card` | `word, index, stack` | Wisch-Geste (Pointer Events), Abschnitt 10 |
| `BonFeedback.vue` | `.bon__card--right/--wrong` | `last, gameOver` | Timer, Pause, Abschnitt 7 |
| `BonResult.vue` | `.bon__stat`, `.bon__recap` | Daten aus `/api/bon/finish` + `history` | „Hier stehste“, Spielercode, „Deine Runde“ |
| `BonPlacement.vue` | – | `around[5]` (eigene Zeile + je 2 darüber und darunter) | Daten fehlen noch im Endpunkt, Abschnitt 14 |
| `BonLeaderboard.vue` | `.c-section-card`, `.c-choice` | `period`, Seite | Abschnitt 11 |
| `BonCode.vue` | `.c-section-card`, `.c-choice`, `.c-field`, `.c-state` | `mode` | Abschnitt 12; wird auf Start, Ergebnis und Rangliste eingebunden |
| `BonName.vue` | `.c-textlink`, `.c-field`, `.c-choice`, `.c-state` | `name, tag` | Abschnitt 12b; auf Start (bekannte Spieler), Ergebnis und Rangliste |

---

## 6. Start (`phase: 'intro'`)

**Linke Spalte:**
- `t-label` „Spiel“
- `h1.c-band` „Berliner oder nicht?“ (mobil 2.25rem, Desktop 3.25rem)
- `.t-em` „Echtes Berlinerisch oder erfunden? Wisch oder tipp – du hast 3 Leben.“
- **Name:**
  - **Bekannter Spieler** (Cookie mit Pseudonym vorhanden): statt des Felds die Zeile „Du spielst als {Name} · Namen ändern“ (Abschnitt 12b).
  - **Neuer Spieler:** Feld mit Label „Dein Name (optional)“
  - `maxlength="24"`, Placeholder „Anonym“
  - Hinweis: „Steht neben deiner Platzierung. Leer jelassen = „Anonym“ mit Kennung, z. B. „Anonym #K7QX“. Max. 24 Zeichen.“
  - Der Name wird lokal vorbefüllt, wenn er schon einmal gesetzt war.
- **Start:** Primary „Los jeht’s“ (52px hoch) und daneben `.t-small` „Dein Rekord: {n} Punkte“.
- Textlink „Spielercode einlösen“, der den Bereich aus Abschnitt 12 an Ort und Stelle aufklappt.

**Karte „So jeht’s“:**
- **Wort lesen, entscheiden.** Nach rechts wischen oder „Ja“ = Berlinerisch, nach links oder „Nee“ = erfunden. Am Rechner gehen auch die Pfeiltasten.
- **3 Leben.** Beim dritten Fehler is Schluss.
- **Serie zahlt sich aus.** 10 Punkte pro richtije Antwort, mal Multiplikator. Darunter die Leiste „×1 · ab 3 ×2 · ab 6 ×3 · ab 10 ×5“.
- *Tipp: Manche Wörter sind Abkürzungen für ’ne Redewendung – nich imma zu wörtlich nehmen.*

**Offline:**
- `.c-state--offline`: „Du bist offline.“ / „Die Karten kommen vom Server – spielen jeht wieder, sobald du Netz hast.“
- „Los jeht’s“ ist dann `aria-disabled`.

**Geöffnet über einen Link mit `#code=`:** Oben in der linken Spalte erscheint die Spielercode-Karte im Ladezustand und danach im Erfolgszustand (Abschnitt 12).

---

## 7. Spiel (`play` → `feedback` → `play`)

**Kopfzeile** (Grid `1fr auto 1fr`):
- **Links:** 3 Herzen, 24px. Gefüllt `--danger`, verloren als Kontur in `--color-muted`. `role="img"` mit `aria-label` „Noch {n} Leben von 3“.
- **Mitte:** Punkte in 2rem/900, tabellarische Ziffern. Darunter `t-label` „Punkte · {Name}“, bei Anonymen „Punkte · Anonym #K7QX“. `aria-live="polite"`.
- **Rechts:** Flammen-Icon + „Serie {n}“. Darunter `.t-small` „noch {k} bis ×{m}“, bei ×5 „volle Pulle: ×5“.
- **Darunter die Multiplikator-Leiste:** 4 Felder ×1/×2/×3/×5, je 22px hoch. Erreichte Felder als 22 %-Wash, das aktuelle Feld als Fläche in orange-600 mit weißer Schrift.

**Karte:**
- `min-height: 260px`, Inhalt zentriert.
- `t-label` „Berlinerisch oder erfunden?“
- Das Wort als `h2` in `--font-body` 700, `clamp(2rem, 12cqi, 3rem)`, Dark Mode `--orange-300`, mit `.c-headword`-Unterstrich. Lange Wörter: `overflow-wrap: anywhere; hyphens: auto`.
- `.t-small` „Karte {n} von 20 · Stapel {s}“.

**Antworten:**
- Grid mit 2 Spalten, je 60px hoch, `.c-choice`, gleich gewichtet.
- Links „← Nee, erfunden“ (`aria-keyshortcuts="ArrowLeft"`), rechts „Ja, Berlinerisch →“ (`ArrowRight`).
- **Keine roten oder grünen Flächen.** Ja und Nee sind gleichwertige Entscheidungen.
- „Nee“ und „Ja“ stehen nur einmal auf dem Bildschirm, es gibt keine zusätzlichen Hinweiszeilen mit denselben Wörtern.
- Darunter eine einzige Zeile: mobil „Jeht ooch mit Wischen.“, Desktop „Jeht ooch mit den Pfeiltasten.“
- Textlink „Spiel beenden“ führt zum Ergebnis.

**Rückmeldung** (ersetzt die Karte an derselben Stelle):

| | Richtig | Falsch |
|---|---|---|
| Streifen links | 4px `--success` | 4px `--danger` |
| Kopf | ✓-Icon + „Richtig!“, ab ×3 „Knorke, weiter so!“ | ✗-Icon + „Daneben!“ |
| Satz | – | echtes Wort: „Dit is echtes Berlinerisch:“; erfundenes Wort: „Dit Wort is erfunden – jibt’s nich.“ |
| Wort | Wort + „= {translation}“ (`.t-em`) | Wort + bei echten Wörtern „= {translation}“ |
| Zeile | „+{p} Punkte (×{m})“ (accent, 700) | „−1 Leben · Serie futsch“ |
| Link | – | bei echten Wörtern „Mehr zu „{Wort}“ ↗“ (neuer Tab, `rel="noopener"`) |
| **Standzeit** | **900 ms** | **2.500 ms** |
| Hinweis darunter | mobil „Weiter jeht’s …“, Desktop „Weiter jeht’s – oder gleich die nächste Pfeiltaste.“ | mobil „Jeht gleich weiter. Tippen für sofort.“, Desktop „Jeht gleich weiter. Maus drauf hält an, Klick oder Pfeiltaste für sofort.“ |

- **Timer:** Ein 3px-Balken am unteren Kartenrand (`--color-muted`, 50 % Deckkraft) läuft linear von voll nach leer. Ist er abgelaufen, kommt automatisch die nächste Karte.
- **Sofort weiter:** Antippen der Karte, Wischen in beliebige Richtung, jede Pfeiltaste, Enter oder Leertaste.
- **Pause:** Hover auf der Karte (Desktop) bzw. Finger auf der Karte halten (Touch) stoppt den Timer, auch den Balken. Danach geht es nach 1.200 ms weiter. Das deckt WCAG 2.2.1 ab: Eine Zeitbegrenzung muss anhaltbar sein.
- **Eingabesperre:** Direkt nach einem Kartenwechsel werden Eingaben 250 ms ignoriert. Mit Animation bis zum Ende der Animation (ca. 400 ms). So beantwortet ein Doppel-Wisch nicht versehentlich die nächste Karte.
- **Letztes Leben verloren:** Die Rückmeldung bleibt 2.500 ms mit dem Hinweis „Gleich kommt dein Ergebnis – tippen für sofort.“. Danach `POST /api/bon/finish` und das Ergebnis.

---

## 8. Stapel-Wechsel und Fehler

- **Nach 20 Karten** (`loading`):
  - Ein Karten-Skeleton mit „Stapel {n} jeschafft – neue Karten werden jemischt …“.
  - Die Antwort-Buttons sind `aria-disabled`.
  - Den nächsten Stapel ab Karte 15 im Hintergrund vorladen, damit dieser Zustand meist gar nicht sichtbar wird.
- **Fehler** (`error`):
  - `.c-state--error` „Ditt hat nich jeklappt.“ / „Die Karten wollten leider nich kommen. Deine Punkte und Leben bleiben – versuch’s gleich nochmal.“
  - Button `.c-choice` „Nochmal versuchen“.
  - Punkte, Leben und Serie bleiben erhalten.

---

## 9. Ergebnis (`phase: 'over'`)

**Linke Spalte:**
1. **Kopf:**
   - Badge `.c-badge--strong` „Neuer Rekord!“ mit Pokal-Icon, nur wenn der Score größer ist als der lokale Rekord.
   - `h1.c-band`: „Aus die Maus, {Name}!“, ohne Namen „Aus die Maus!“.
   - Darunter „Drei Fehler – dit Spiel is vorbei.“
   - Darunter „Du spielst als {Name} · Namen ändern“ (Abschnitt 12b).
2. **Kennzahlen** als `<dl>`, 2×2-Grid, `gap: .5rem`, Flächen `--surface-chip`:

   | Kennzahl | Wert | Zusatzzeile |
   |---|---|---|
   | Punkte | `score` | – |
   | Platz | `rank` | „von {totalGames} Spielen · besser als {pct}“, mit `pct = round((total − rank) / total × 100) %` |
   | Trefferquote | `correctAnswers / totalAnswered` in % | „{c} von {t} richtig“ |
   | Beste Serie | `bestStreak` | „in Folge richtig · bis ×{m}“ |

   Ohne `rank` (kein Cookie oder Fehler): Platz „–“ und „Platzierung jerade nich da“.
3. **Aktionen:** Primary „Nochmal spielen“ und `.c-choice` „Ergebnis teilen“.
   - Teilen nutzt `navigator.share`. Gibt es das nicht, wird der Text kopiert, und das Label wechselt zu „Text kopiert“.
   - Text (Vorschlag): „Ick hab {score} Punkte bei ‚Berliner oder nicht?‘ jeschafft – Platz {rank}. Schaffste mehr? {url}“
4. `.t-small` „Dein Rekord: {n} Punkte · gespeichert auf diesem Jerät“. Der Rekord liegt in `localStorage`, bis die API einen persönlichen Bestwert liefert.
5. **„Hier stehste · diese Woche“:**
   - 5 Zeilen, nämlich je 2 Plätze darüber und darunter und die eigene in der Mitte. Höhe 44px, Grund `--surface-chip`, die eigene Zeile 22 %-Wash mit `aria-current="true"`.
   - Darunter „Noch {n} Punkte bis Platz {rank−1}.“, wobei `n = score des Vordermanns − score + 1`.
   - Link „Ganze Rangliste ansehen →“.
   - Fehlt der Rang, entfällt der ganze Block.
6. **Spielercode-Karte**, Zustand „Noch kein Code“ (Abschnitt 12).

**Rechte Spalte, „Deine Runde“** (Section-Card):
- Alle gespielten Karten in Spielreihenfolge.
- Pro Zeile: ✓ (`--success`) oder ✗ (`--danger`) mit `aria-label` „richtig“/„falsch“, dazu Wort (700) und Übersetzung (`.t-small`).
- **Echte Wörter** sind ein Link zur Wortseite, mit „→“.
- **Erfundene Wörter** sind durchgestrichen, muted, mit „erfunden“ und ohne Link.
- Im Footer: „Alle Wörter im Wort-Index“.
- Mobil hat die Karte normalen Seitenabstand, kein Full-Bleed. Die Kanten der ganzen Seite fluchten.

---

## 10. Wisch-Geste

- Pointer Events auf der Karte. Die Karte folgt dem Finger horizontal und dreht sich proportional, maximal ±14°.
- **Schwelle:** 30 % der Kartenbreite oder Geschwindigkeit > 0,5 px/ms. Ab dann zählt die Antwort, darunter federt die Karte zurück (200 ms).
- Während des Ziehens zeigen „← Nee“ bzw. „Ja →“ als Overlay auf der Karte an, was gleich passiert. Deckkraft proportional zur Strecke, nur während der Geste, `aria-hidden`.
- **Vertikales Scrollen bleibt erlaubt:** `touch-action: pan-y`.
- Desktop: ← = Nee, → = Ja. Die Listener hängen an der Spielkomponente, solange sie aktiv ist, nicht global auf `window`.

---

## 11. Rangliste

**Kopf:**
- Textlink „← Berliner oder nicht?“
- `h1.c-band` „Rangliste“ mit `.t-small` „{n} Spiele · diese Woche“
- Zeitraum als `.c-choice`-Gruppe: **Diese Woche** (Standard) · Diesen Monat · Allzeit

**Liste:**
- **Spalten:** Desktop Platz · Name · Treffer · Serie · Wann · Punkte (Grid `3.5rem 1fr 5rem 4rem 6.5rem 5rem`). Mobil Platz · Name mit Meta-Zeile „82 % · Serie 6“ · Punkte (`2.25rem 1fr auto`).
- **Zeilen:** 56px hoch, gestrichelte Trenner. Plätze 1–3 mit größerer Platznummer in `--color-accent-text`. Die eigene Zeile hat einen 16 %-Wash, ein kleines oranges „du“ und `aria-current="true"`.
- **Anonyme Spieler:** „Anonym“ + `#K7QX` (klein, muted). Die Kennung besteht aus 4 Zeichen und wird per Hash aus der Pseudonym-ID abgeleitet, damit sie stabil ist und die ID nicht verrät. Zeichensatz ohne 0/O/1/I/L.
- **Mobil:** Die Karte „Dein Platz“ (mit Namen ändern) steht unter der Liste. Top 10, dann „···“, dann die eigene Zeile mit je einem Nachbarn. Eine feste Leiste unten zeigt „{rank}. Du · {score} Punkte · von {total} · besser als {pct}“ + „Zu mir“.
- **Desktop:** 25 Zeilen. Rechts die Karte „Dein Platz“ mit Platz groß, Punkte, Meta, „Zu mir springen“ und „Nochmal spielen“. Darunter „Du spielst als {Name} · Namen ändern“ (Abschnitt 12b) und der Hinweis: „Gezählt wird dein bestes Spiel im Zeitraum. Erkannt wirst du an einem Cookie auf diesem Jerät.“
- **Footer:** „Platz 1–{n} von {total}“ + „Mehr laden“ (25 pro Seite).
- **Darunter:** „Namen sind frei jewählt. Anstößige Namen blenden wa aus. Namen melden“.

**Zustände:**
- **Ohne Cookie:** „Du stehst hier noch nich drin. Spiel ’ne Runde, dann siehste, wo du landest.“ + Primary „Jetzt spielen“ + „Schon jespielt? Dann is der Cookie weg oder du spielst auf ’nem anderen Jerät.“ + Link „Spielercode einlösen“. Mobil steht die Karte über der Liste.
- **Leer:** „Diese Woche hat noch keener jespielt.“ / „Hier könnte dein Name stehen.“ + „Jetzt spielen“.
- **Laden:** Skeleton mit 8 Zeilen.
- **Fehler:** „Die Rangliste is jerade nich zu kriegen.“ + „Nochmal versuchen“.

---

## 12. Spielercode

Format `BÄR-4KQ-9ZT-M2X`, ohne verwechselbare Zeichen. Der Code verbindet einen Browser wieder mit demselben Spieler, also Name und Ergebnissen. Ein laufendes Spiel wandert nicht mit. Er gilt nur fürs Spiel. Das Besucher-Cookie für Kommentare und Stimmen bleibt unberührt.

**Wo:**
- Ergebnis: Karte unter „Hier stehste“.
- Start: Textlink „Spielercode einlösen“.
- Rangliste: Link im Zustand „ohne Cookie“.
- Einlösen ist also überall auch ohne laufendes Spiel möglich.

| Zustand | Inhalt |
|---|---|
| 1 Noch kein Code | Titel „Auf anderem Jerät weiterspielen“. „Mit ’nem Spielercode nimmste deinen Namen und deine Ergebnisse auf ein anderes Jerät mit – oder holst sie zurück, wenn die Cookies weg sind.“ `.c-choice` „Spielercode holen“ (kein Primary, der bleibt „Nochmal spielen“) + Textlink „Hab schon ’n Code“ |
| 2 Code anzeigen | „Dein Spielercode für {Name}:“. Code groß in 4 Blöcken auf `--surface-chip`, 900, `letter-spacing: .12em`, `user-select: all`, `aria-label` buchstabiert. Buttons „Code kopieren“ → „Code kopiert“, „Link kopieren“ → „Link kopiert“, „QR-Code zeigen“/„QR-Code ausblenden“. Warnung (Streifen `--orange-400`): **„Wer diesen Code hat, kann deinen Namen und deine Ergebnisse nutzen.“** „Schreib ihn dir auf – und zeig den QR-Code nich rum.“ Darunter Textlink „Code verraten? Neuen Code erzeugen“ |
| 2b QR | QR des Links, 200px, schwarz auf weiß mit 12px weißem Rand (auch im Dark Mode), Fehlerkorrektur M. Bildunterschrift „Mit dem Handy scannen – dann biste dort gleich als {Name} drin.“ |
| 2c Neuer Code? | `role="alertdialog"`: „Neuen Code erzeugen?“ / „Der alte Code jeht dann nich mehr – ooch nich der Link und der QR-Code. Dein Name und deine Ergebnisse bleiben.“ „Ja, neuen Code“ / „Abbrechen“ |
| 2d Neuer Code aktiv | `.c-state--done` „Neuer Code is aktiv. Der alte jeht ab jetzt nich mehr.“ + neuer Code; Link und QR nutzen ihn |
| 3 Einlösen | „Gib deinen Spielercode ein, dann spielste mit deinem Namen und deinen Ergebnissen weiter.“ Feld „Spielercode“: `autocapitalize="characters"`, `autocomplete="off"`, `spellcheck="false"`, zentriert, Großbuchstaben, Placeholder „BÄR-XXX-XXX-XXX“. Hinweis: „Groß- und Kleinschreibung und Bindestriche sind egal. Statt Ä jeht ooch AE.“ `.c-choice` „Weiterspielen“ + „Abbrechen“ |
| 3a Falsch | `aria-invalid`, `.c-state--error` „Den Code kenn ick nich.“ / „Guck nochmal jenau hin – vielleicht ’n Zeichen vertippt? Noch {n} Versuche.“ |
| 3b Gesperrt | „Zu ville Versuche.“ / „Mach ma Pause und probier’s in 15 Minuten nochmal.“ Button `aria-disabled` |
| 3c Wechseln? | Nur wenn der Browser schon einen anderen Spieler hat: „In diesem Browser spielste schon als {Alt} (Rekord {n} Punkte). Wenn du wechselst, biste hier ab jetzt {Neu}. {Alt} kriegste nur mit seinem eigenen Spielercode zurück.“ „Zu {Neu} wechseln“ / „Als {Alt} bleiben“ |
| 4 Erfolg | `.c-state--done` „Willkommen zurück, {Name}!“ / „Dein Name und deine Ergebnisse sind jetzt in diesem Browser.“ Kennzahlen „Bestes Ergebnis“ und „Platz {n} von {total}“, dazu Primary „Weiterspielen“ |
| 5 Link geöffnet | Ladezustand „Spielercode aus dem Link wird einjelöst …“ (Skeleton), dann Erfolg mit „Der Link hat dich anjemeldet. Dein Name und deine Ergebnisse sind jetzt hier.“ |

**Normalisierung der Eingabe:** Großschreiben. Leerzeichen, Bindestriche und Unterstriche entfernen. `AE` → `Ä`, ein `A` an der Präfix-Stelle → `Ä`. Dann gegen das Format prüfen. Danach erst den Server fragen.

**Link:** `…/spiele/berliner-oder-nicht#code=BÄR-4KQ-9ZT-M2X`. Der Code steht im `#`-Teil und landet so nicht in Logs, Referrern oder Matomo. **Nach dem Einlösen** den Hash mit `history.replaceState` entfernen, damit er nicht im Verlauf, in Lesezeichen oder beim Teilen weiterwandert.

---

## 12b. Spielername ändern

Der Name gehört zum Spieler (Pseudonym), nicht zu einem einzelnen Spiel. Eine Änderung gilt deshalb auch für alle bisherigen Ergebnisse in der Rangliste.

**Wo:** Start (nur bekannte Spieler), Ergebnis unter dem Titel und Rangliste in der Karte „Dein Platz“. Überall dieselbe Komponente.

| Zustand | Inhalt |
|---|---|
| Anzeige | Zeile: „Du spielst als **{Name}**“, bei Anonymen „Du spielst als **Anonym** #K7QX“. Dazu Textlink „Namen ändern“ (`aria-expanded`) |
| Bearbeiten | Klappt an Ort und Stelle auf, auf `--surface-chip`. Label „Dein Name“ + Zähler „{n} / 24“ (`aria-live="polite"`). Feld `maxlength="24"`, `autocomplete="nickname"`, vorbefüllt, Placeholder „Anonym“, Fokus ins Feld mit markiertem Text. Hinweis: „Gilt ooch für deine bisherigen Ergebnisse in der Rangliste. Leer jelassen = „Anonym #K7QX“.“ `.c-choice` „Speichern“ + Textlink „Abbrechen“ (auch Esc). Enter speichert |
| Speichern | Button `aria-busy="true"`, Eingabe gesperrt |
| Abgelehnt | Der Server-Filter lehnt den Namen ab: `aria-invalid`, `.c-state--error` „Der Name jeht so nich.“ / „Bitte keene Beleidigungen oder Schimpfwörter – versuch’s mit ’nem andern.“ Feld bleibt offen |
| Netzfehler | „Ditt hat nich jeklappt.“ / „Dein Name is nich anjekommen. Versuch’s gleich nochmal.“, Button „Nochmal speichern“ |
| Gespeichert | Zurück zur Anzeige mit „✓ Jespeichert“ (accent, 700, `role="status"`), verschwindet nach 3 s. HUD, Titel, „Hier stehste“ und Rangliste zeigen sofort den neuen Namen |

**Regeln:**
- Leerzeichen am Anfang und Ende entfernen. Leer → „Anonym“ mit Kennung.
- Der Filter läuft serverseitig beim Speichern, genauso beim ersten Namen im Startfeld.
- Gleiches Feld wie beim Start: max. 24 Zeichen.
- Vorschlag: höchstens 5 Änderungen pro Tag und Spieler, gegen Rangliste-Spam. Bei Überschreitung: „Heute jenug umjetauft – morjen wieder.“

## 13. Animation und Motion

**Im Code:** Same-Document View Transitions (`document.startViewTransition`) innerhalb der Komponenten. Zwischen Spiel und Rangliste Cross-Document mit `@view-transition { navigation: auto; }`, was Astro ohne Router kann. **Fallback:** Ohne Unterstützung oder bei `prefers-reduced-motion: reduce` wechseln die Zustände ohne Animation.

```ts
function vt(update: () => void, type: string) {
  if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) return update()
  // Ohne Transition-Typen (`:active-view-transition-type()`) kein Morph
  if (!CSS.supports('selector(:active-view-transition-type(a))')) return update()
  document.startViewTransition({ types: [type], update: async () => { update(); await nextTick() } })
}
```

| Element | Auslöser | Animation | Dauer | Easing |
|---|---|---|---|---|
| Karte (`bon-card`) | Antwort „Ja“ / „Nee“ | alte Karte fliegt nach rechts bzw. links raus, `translateX(±115%) rotate(±14deg)`, opacity 0 | 380 ms | `cubic-bezier(.4,0,1,1)` |
| Rückmeldung | nach dem Rausfliegen | klappt herein: `perspective(800px) rotateY(-60deg) scale(.96)` → 0 | 340 ms, 120–140 ms Verzögerung | `cubic-bezier(.2,.8,.2,1)` |
| nächste Karte | Timer abgelaufen / Tippen | alte sinkt (`translateY(12px) scale(.96)`, 220 ms), neue steigt (`translateY(16–24px) scale(.94–.97)` → 0, 320 ms) | 220 / 320 ms | ease-in / `cubic-bezier(.2,.8,.2,1)` |
| Punkte-Zuwachs / Punktzahl (`bon-score`) | richtig | Pop: Skalierung bis 1,15–1,25, zurück auf 1 | 450 ms | `cubic-bezier(.3,1.6,.5,1)` |
| Herzen (`bon-lives`) | falsch | Wackeln ±6px | 400 ms | ease-in-out |
| Timer-Balken | Rückmeldung | `scaleX(1 → 0)` | 900 / 2.500 ms | linear |
| „Los jeht’s“ → Karte | Start | Morph über gemeinsamen Namen `bon-card` | 400 ms | `cubic-bezier(.2,.8,.2,1)` |
| HUD-Punkte → Kennzahl „Punkte“ | Spielende | Morph über `bon-score` | 550 ms | `cubic-bezier(.2,.8,.2,1)` |
| Kennzahlen, Rekord-Badge, „Deine Runde“ | Ergebnis erscheint | gestaffelt einblenden (+60 ms pro Kachel) | 300–400 ms | `cubic-bezier(.2,.8,.2,1)` |
| eigene Zeile (`bon-me`) | „Ganze Rangliste ansehen →“ | Cross-Document-Morph von „Hier stehste“ in die Listenzeile | 500 ms | `cubic-bezier(.2,.8,.2,1)` |
| Ranglisten-Liste | Zeitraum wechseln | alte raus (`translateY(-6px)`, 160 ms), neue rein (`translateY(10px)` → 0, 300 ms) | 160 / 300 ms | ease-in / `cubic-bezier(.2,.8,.2,1)` |
| „Dein Platz“-Leiste mobil | Seite geladen | schiebt sich von unten hoch | 350 ms, 200 ms Verzögerung | `cubic-bezier(.2,.8,.2,1)` |
| „Spielercode holen“ → Code-Feld (`pc-code`) | Code holen | Morph | 400 ms | `cubic-bezier(.2,.8,.2,1)` |
| QR (`pc-qr`) | zeigen / ausblenden | aufklappen `scale(.6) translateY(-20px)` → 0, zuklappen 200 ms | 400 / 200 ms | `cubic-bezier(.2,.8,.2,1)` / ease-in |
| Code (`pc-code`) | neuer Code | alter klappt nach oben weg (`rotateX(70deg)`), neuer kommt von unten | 220 / 320 ms | ease-in / `cubic-bezier(.2,.8,.2,1)` |

**Regeln:**
- `view-transition-name` muss pro Seite eindeutig sein. Präfixe: `bon-`, `lb-`, `pc-`.
- Die Eingabesperre (Abschnitt 7) deckt die Animationszeit ab.
- Im Canvas sind die Übergänge als CSS-Einblend-Animationen nachgebaut, weil Scripts dort nicht auf `document` zugreifen dürfen. Maßgeblich ist diese Tabelle.

---

## 14. Daten und Endpunkte

| Bedarf | Status |
|---|---|
| Karten-Stapel (20) mit `word`; nach der Antwort `translation` und richtig/falsch | vorhanden |
| `POST /api/bon/finish` → `score, bestStreak, totalAnswered, correctAnswers, rank, totalGames, playerName` | vorhanden |
| **Rangliste** `GET /api/bon/leaderboard?period=week\|month\|all&offset=&limit=25` → `[{rank, name, tag, score, accuracy, bestStreak, finishedAt}]`, `total` | **fehlt**. War im Spec ein Nicht-Ziel; `finishedAt` gibt es in der Datenbank schon |
| **Eigene Position + Nachbarn** (je 2) im Zeitraum, über das httpOnly-Cookie | **fehlt**. Ebenso in `/api/bon/finish` für „Hier stehste“ |
| **Kennung** `tag` (4 Zeichen, Hash der Pseudonym-ID) für Anonyme | **fehlt** |
| Persönlicher Bestwert | **fehlt**. Bis dahin `localStorage` |
| Spielercode: erzeugen, einlösen (Rate-Limit, z. B. 5 Versuche / 15 Min.), erneuern | in Arbeit |
| Wertung | Annahme: pro Pseudonym zählt **das beste Spiel im Zeitraum** |
| **Name ändern** `PATCH /api/bon/player { name }` → `{ name, tag }`; 422 bei Filter-Treffer, 429 bei Limit | **fehlt** |
| **Namen prüfen** | **Blocker vor dem Launch der Rangliste**: Namen werden dort öffentlich. Filter beim Speichern + „Namen melden“ |

---

## 15. Barrierefreiheit

- **Fokus-Reihenfolge Spiel:** Kopfzeile (nur lesbar) → Karte → „Nee“ → „Ja“ → „Spiel beenden“. Nach jeder Antwort bleibt der Fokus auf dem gewählten Antwort-Button bzw. dessen Position. Kein Fokus-Sprung zur Rückmeldung, die Ansage läuft über `role="status"`.
- **Ansagen:** Rückmeldung als `role="status"`, z. B. „Richtig! Knorke heißt großartig. Plus 20 Punkte.“ bzw. „Daneben! Dit Wort is erfunden. Noch 1 Leben.“ Punkte über `aria-live="polite"`. Fehler als `role="alert"`.
- **Tastatur:**
  - ← und → antworten.
  - Während der Rückmeldung führen ←/→/Enter/Leertaste weiter.
  - Esc beendet nicht das Spiel, dafür ist der Link da.
  - Listener nur, solange die Spielkomponente gemountet ist.
- **Timer:** pausierbar (Hover, Finger halten); bei `prefers-reduced-motion` ohne Balken-Animation, die Standzeit bleibt aber.
- **Herzen:** ein `role="img"` für alle drei Herzen zusammen, mit Text-Label. Farbe ist nicht der einzige Hinweis, verlorene Herzen sind nur noch Kontur.
- **Rangliste:** `<ol>` mit `aria-label` „Rangliste Diese Woche“. Die Platzierung ist versteckt ausgeschrieben („Platz 12“). Die eigene Zeile hat `aria-current="true"`.
- **Spielercode:** Das Feld hat `aria-describedby` auf Hinweis und Fehler. Fehler mit `aria-live="assertive"`. Der Code wird per `aria-label` buchstabiert. Der QR-Code hat `role="img"` und ein Label.
- **Kontrast:** alle Texte ≥ 4.5:1 in beiden Themes (DS-Tokens). `--success`/`--danger` nur für Streifen und Icons.

---

## 16. Offene Punkte

1. **Multiplikator:** Gilt er schon für die Schwellen-Antwort? (Abschnitt 2)
2. **Neuer Spielercode:** Bleiben Geräte angemeldet, die den alten Code schon eingelöst haben? Wenn nicht, braucht 2c den Satz „Alle anderen Jeräte werden abjemeldet.“, und der Server braucht Sitzungen pro Gerät.
3. **Spieler wechseln (3c):** Ist das alte Pseudonym danach nur noch per eigenem Code erreichbar?
4. **Rangliste:** Zählt das beste Spiel im Zeitraum oder jedes Spiel einzeln? Soll die Kennung auch bei doppelten Namen erscheinen?
5. **Standzeiten 900 / 2.500 ms:** Startwerte, nach Tests nachjustieren.
6. **Teilen-Text** und Pfad der Rangliste bestätigen.
7. **Namen ändern:** Limit pro Tag (Vorschlag 5)? Sollen alte Namen in der Rangliste sofort ersetzt werden (Annahme: ja)?

---

## 17. Dateien

```
bon-handoff/
├── SPEC.md
├── design/
│   ├── BonGame.dc.html        ← Start, Spiel, Rückmeldung, Ergebnis (Prop start: intro|link|spiel|richtig|falsch|stapel|fehler|vorbei|vorbeiOhneRang|offline)
│   ├── BonLeaderboard.dc.html ← Rangliste (Props size, me, status)
│   ├── BonName.dc.html        ← Name anzeigen/ändern (Prop start: anzeigen|bearbeiten|abgelehnt|fehler|gespeichert)
│   ├── BonCode.dc.html        ← Spielercode (Prop start: zu|keinCode|code|qr|erneuern|erneuert|einloesen|falsch|gesperrt|wechseln|erfolg|link)
│   └── Header.dc.html, Footer.dc.html
└── ds/
    ├── components/bundle.css  ← DS v3.1
    ├── tokens.css, colors_and_type.css
    └── components-v3.md
```
