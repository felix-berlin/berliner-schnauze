# Bon: Spielername ändern — Design

Stand: 11. November 2026. Baut auf dem Bon-Redesign v3.1 auf (Branch `felix-berlin/bon-game-ergebnisse-persistieren`, Plan `docs/superpowers/plans/2026-11-10-bon-redesign.md`).

## Absicht

Ein Spieler soll seinen Namen ändern können, ohne neu anzufangen. Der Name gehört zum Spieler (Pseudonym), nicht zu einem einzelnen Spiel: Eine Änderung gilt für alle bisherigen Ergebnisse in der Rangliste. Wer wegen Meldungen als „Anonym“ ausgeblendet wurde, kann sich so einen neuen, sauberen Namen geben.

Quelle der Gestaltung ist die neue Handoff-Fassung (`bon-SPEC.md` und `bon-handoff (1).zip` im Worktree-Root, nicht eingecheckt). Umgesetzt wird **nur die Namensänderung** daraus (Abschnitt 12b und die Stellen, die auf ihn verweisen).

Zusätzlich schließt dieser Branch die offenen kleineren Punkte des Namensfilters und der Meldefunktion aus dem letzten Review.

## Ziele

1. `BonName.vue`: eine Komponente zum Anzeigen und Ändern des Namens, nach `BonName.dc.html` und SPEC §12b (Zustände Anzeige, Bearbeiten, Speichern, Abgelehnt, Netzfehler, Gespeichert; Texte, ARIA und Tastatur wie in §12b).
2. Sie erscheint an drei Stellen:
   - **Start-Intro**, nur für bekannte Spieler, statt des Namensfelds („Du spielst als {Name} · Namen ändern“). Neue Spieler sehen weiter das Feld „Dein Name (optional)“.
   - **Ergebnis**, unter dem Titel.
   - **Rangliste**, in der Karte „Dein Platz“: Desktop rechts unter den Knöpfen, vor dem Cookie-Hinweis. Mobil steht die Karte „Dein Platz“ jetzt **unter der Liste** (bisher bei Cookie und normalem Status ausgeblendet), siehe `BonLeaderboard.dc.html` (`asideStyle`).
3. Server: `GET /api/bon/player` → `{ name, tag? }` und `PATCH /api/bon/player { name }` → `{ name, tag? }`.
4. Nach dem Speichern zeigen HUD, Ergebnis-Titel, „Hier stehste“ (Platzierung) und Rangliste sofort den neuen Namen.
5. Namensfilter und Meldungen: die Restpunkte (siehe unten).

## Nicht-Ziele

- Nichts anderes aus der neuen Handoff-Fassung. Die beiden Handoff-Dateien sind sonst identisch mit der alten Fassung, abgesehen von Datum und 12b-Verweisen.
- Keine Namenshistorie, keine Admin-Oberfläche für Umbenennungen.
- Keine Schemaänderung, keine Migration.
- Kein Umbau der Rangliste auf „Name kommt vom Spieler statt vom Spiel“.

## Anti-Ziele (wäre ein Fehlschlag, auch wenn es läuft)

- Ein Name, den der Filter beim Start ablehnt, lässt sich per Umbenennen doch setzen.
- Ein Spieler kann die Namen fremder Spiele ändern (falsche Identität, fremde Cookies).
- Umbenennen wird zum Spam-Kanal in der Rangliste (kein Limit).
- Rechtsextreme Namen kommen wieder durch (Nutzerentscheidung aus dem Redesign: muss unmöglich sein).

## Entscheidungen des Nutzers

- Umsetzen: nur die Namensänderung aus der neuen Spec, dazu die Restpunkte von Filter und Meldungen („1. Kann umgesetzt werden“).
- **Gemeldete oder ausgeblendete Namen können geändert werden.** Ein neuer Name setzt die Meldungen zurück und macht ihn wieder sichtbar.
- Die Absätze unten unter „Server“ und „Client“ hat der Nutzer so bestätigt („passt so“).

## Server

### Identität

Wie in der Rangliste (`website/src/pages/api/bon/leaderboard.ts`): Spieler mit Code → `p:<playerId>` (aus `playerFromCookie`), sonst Besucher → `v:<bonVisitor(visitorId(cookies, false))>`. Kein Cookie wird gesetzt. Ohne beides: 404 („Du hast noch nich jespielt.“ o. ä., eigene Wahl des Builders).

### `GET /api/bon/player` → `{ name, tag? }`

Liefert den aktuellen Namen zur Anzeige im Start-Intro (wo es noch kein Spiel gibt) und die Kennung bei „Anonym“.
- Name (eigene Wahl): der `displayName` des neuesten beendeten Spiels der Identität (berücksichtigt Ausblendung und Meldungen). Bei Spieler mit Code ohne beendetes Spiel `bon-players.name`. Ohne beides 404. `bon-players.name` allein reicht nicht: Nach dem Einlösen eines Codes ist es leer, und Ausblendung gibt es nur pro Spiel.
- Der Name geht zusätzlich durch `cleanName` (beleidigend → „Anonym“).
- `tag` nur bei „Anonym“: `bonTag(identity)` (gleiche Identitätszeichenkette wie die Rangliste, damit „Anonym #K7QX“ überall gleich ist).
- Bekannter Spieler im Sinne der Spec = GET liefert 200.

### `PATCH /api/bon/player { name }` → `{ name, tag? }`

1. Eingabe mit zod: String, getrimmt, höchstens 24 Zeichen (wie das Startfeld; das bestehende Namensschema in `website/src/utils/bonSchema.ts` wiederverwenden, ggf. anpassen). Zu lang/kein String → 400. Leer → „Anonym“.
2. Filter: `nameCategory(name)` aus `payload-app/bon-names`. Treffer (beleidigend **oder** rechtsextrem) → **422**. Kein EXIT-Hinweis hier; den gibt es weiter nur im Start-Intro. Ein link-artiger Name wird wie beim Abschluss behandelt (wird „Anonym“), nicht abgelehnt.
3. Limit: höchstens **5 Änderungen pro Identität in einem 24-Stunden-Fenster** (festes Fenster ab der ersten gezählten Änderung, so zählt `rateLimitedBy`) über `rateLimitedBy(identity, "bon-rename", 5, DAY)` aus `website/src/utils/rateLimit.ts` → **429** „Heute jenug umjetauft – morjen wieder.“. Gezählt wird nur ein Versuch, der den Filter passiert hat (eigene Wahl: abgelehnte Namen verbrauchen kein Kontingent, damit Tippfehler nicht bestrafen). `shortcut: in memory per Node process, a restart or second web container resets it; move to the DB if renames get abused`.
4. Schreiben:
   - alle `bon-games` der Identität, genau wie die Rangliste sie zuordnet: `player = id` bzw. `visitor = hash` **und kein `player`** (eigene Wahl: von einem Spieler mit Code übernommene Besucher-Spiele gehören nicht mehr dem Besucher), Status egal: `playerName = name`;
   - Meldungen zurücksetzen (`nameReports = 0`, `nameHidden = false`) **nur in Spielen, deren gespeicherter Name sich tatsächlich ändert** (Vergleich getrimmt, ohne Groß/Klein). Eigene Wahl: Wer denselben Namen nochmal speichert, holt einen ausgeblendeten Namen nicht zurück. Ein Umweg A → B → A bleibt möglich, begrenzt durch das Tageslimit; der Filter bleibt die eigentliche Schranke.
   - bei Spieler mit Code zusätzlich `bon-players.name = name` („Anonym“ wird dort als leer gespeichert, so wie `playerFromCookie` es heute liest).
   - Fehler beim Schreiben → 502 (Client zeigt „Netzfehler“).
5. Ranglisten-Cache für alle Zeiträume leeren (dieselbe Invalidierung wie nach `finish`).
6. Antwort `{ name, tag? }` wie bei GET.

`finish` (eigene Wahl, kleine Änderung): Für einen Spieler mit Code und nicht leerem `bon-players.name` speichert ein neues Spiel diesen Namen statt des vom Browser geschickten. Sonst bleibt es beim Namen aus `$bonStats.playerName`. Grund: Nach einer Umbenennung auf Gerät A würde ein Spiel auf Gerät B sonst den alten (evtl. gemeldeten) Namen zurückbringen. Ein Besucher ohne Code hat nur ein Gerät, dort ist `$bonStats` nach dem Umbenennen schon neu. Zusätzlich setzt der Client `$bonStats.playerName` aus GET, wenn der Start-Bildschirm lädt.

Die Meldungen (`report-name.ts`) zählen pro Spiel. Nach dem Zurücksetzen ist das In-Memory-Set der schon gezählten Melder für diese Spiele zu leeren oder so zu schlüsseln, dass ein neuer Name neu gemeldet werden kann (Builder entscheidet wie, z. B. Name im Schlüssel).

## Client

- `website/src/components/games/BonName.vue`, Props/Ereignisse nach Bedarf. Zustände und Texte wörtlich aus SPEC §12b und `BonName.dc.html` (`.c-textlink`, `.c-field`, `.c-choice`, `.c-state`).
  - Anzeige: „Du spielst als **{Name}**“, bei Anonym „Du spielst als **Anonym** #K7QX“, Textlink „Namen ändern“ mit `aria-expanded`.
  - Bearbeiten: klappt an Ort und Stelle auf (`--surface-chip`), Label „Dein Name“, Zähler „{n} / 24“ (`aria-live="polite"`), Feld `maxlength="24"`, `autocomplete="nickname"`, vorbefüllt, Placeholder „Anonym“, Fokus mit markiertem Text, Hinweistext aus §12b, „Speichern“ + „Abbrechen“ (auch Esc), Enter speichert.
  - Speichern: `aria-busy="true"`, Eingabe gesperrt.
  - Abgelehnt (422): `aria-invalid`, Fehlertext aus §12b, Feld bleibt offen.
  - 429: Text „Heute jenug umjetauft – morjen wieder.“, Feld bleibt offen (eigene Wahl des Darstellungsorts: wie „Abgelehnt“).
  - Netzfehler (sonst): Texte aus §12b, Button „Nochmal speichern“.
  - Gespeichert: „✓ Jespeichert“ (`role="status"`), verschwindet nach 3 s.
- Ein Client-Vorabcheck mit `nameCategory` ist erlaubt (spart einen Request), maßgeblich ist der Server.
- Nach Erfolg: `$bonStats.playerName` setzen (bei „Anonym“ leer, wie heute), damit HUD und Ergebnis-Titel umschalten. Die Rangliste und „Hier stehste“ laden neu bzw. ersetzen den eigenen Namen lokal (Builder entscheidet, solange beide sofort stimmen).
- Laufendes Spiel: Die Komponente steht nicht im Spiel-Bildschirm, nur Start, Ergebnis, Rangliste.
- API-Aufrufe über die bestehende Warteschlange/den bestehenden fetch-Weg der Bon-Seite (Regel R4: alle Bon-Aufrufe serialisiert), soweit die Komponente auf der Spielseite läuft.

## Namensfilter und Meldungen (Restpunkte)

In `payload/src/lib/bonNames.ts` bzw. `website/src/pages/api/bon/report-name.ts`, je mit Tests in `payload/tests/bonNames.test.ts` bzw. `website/src/tests/unit/…/bon.test.ts`:

1. Kapitälchen (`ɴᴀᴢɪ`) und Regional-Indicator-Buchstaben (Flaggenbuchstaben 🇳🇦🇿🇮) als Latein lesen.
2. Zahlencodes auch erkennen, wenn zwischen den Ziffern Satzzeichen oder unsichtbar wirkende Zeichen stehen („8.8“, „8-8“, „8_8“, Braille-Leerzeichen U+2800, Hangul-Füller U+3164), ohne Daten wie „8.8.1990“ oder „14.08.“ zu treffen.
3. Fehltreffer „Klasse 1 98“ beheben (ein Zusammenziehen über Leerzeichen darf keinen Code aus zwei unabhängigen Zahlen bauen); die bisherigen Fälle „8 8“ und „1 4 8 8“ bleiben erkannt. Builder darf die Regel so eng fassen, dass nur einstellige Gruppen zusammengezogen werden.
4. Melde-Dedupe bei IPv6 auf das /64-Präfix schlüsseln.
5. Das In-Memory-Set der Meldungen bekommt eine Obergrenze (z. B. ältesten Eintrag verwerfen ab N Einträgen), mit `shortcut:`-Kommentar.

Alle bisherigen Fang- und Durchlass-Listen in `bonNames.test.ts` bleiben grün.

## Doku

- `docs/design/bon/SPEC.md` (verbindliche Fassung im Repo) bekommt die 12b-Änderungen aus `bon-SPEC.md` (Abschnitt 12b, Verweise in §§ Start/Ergebnis/Rangliste, Datei- und Komponententabelle, API-Zeile, offene Frage → als entschieden markiert: Limit 5/24 h, alte Namen sofort ersetzt, gemeldete Namen änderbar). Die vorhandenen „Abweichung (Umsetzung)“-Vermerke bleiben. Abweichungen dieser Umsetzung (24 h rollierend statt Kalendertag, GET-Route, 422 auch für rechtsextreme Namen ohne EXIT-Hinweis) werden so markiert.
- `docs/design/bon/design/`: `BonName.dc.html` neu, `BonGame.dc.html` und `BonLeaderboard.dc.html` durch die neue Fassung ersetzen.
- `website/CLAUDE.md`, Abschnitt Bon: Umbenennen, Limit, Zurücksetzen der Meldungen; `payload/CLAUDE.md` nur, falls sich an `bon-games` etwas Beschreibendes ändert.

## Tests

- Unit (Server): PATCH 200 (Spieler mit Code und nur Besucher), schreibt alle eigenen Spiele und keine fremden, setzt Meldungen zurück; 400, 404, 422 (beleidigend und rechtsextrem), 429 beim 6. Mal; GET 200/404, `tag` nur bei Anonym.
- Unit (Client): `BonName.vue` alle Zustände, Esc/Enter, Zähler, Fokus, „Jespeichert“ verschwindet; Intro zeigt Feld vs. Zeile.
- E2E: eine Umbenennung auf der Ergebnisseite, danach Rangliste zeigt den neuen Namen. Wenige Spielstarts (Startlimit 20/10 min).
- Screenshots aller Zustände hell/dunkel, mobil/desktop wie in den bisherigen Tasks (dunkel = `dark`-Klasse auf `<html>`).

## Eigene Entscheidungen nach dem Builder-Check (zum Gegenlesen)

- Meldungen werden nur zurückgesetzt, wenn sich der Name wirklich ändert.
- GET liest den Namen aus dem neuesten beendeten Spiel, nicht nur aus `bon-players`.
- `finish` übernimmt für Spieler mit Code den Namen aus `bon-players`.
- Umbenennen als Besucher ändert keine Spiele, die schon einem Spieler mit Code gehören.
- Das Limit zählt in einem festen 24-Stunden-Fenster, nicht pro Kalendertag.

## Dem Builder überlassen

Aufteilung in Tasks, Dateischnitt innerhalb der genannten Orte, Wortlaut der 404-Meldung, wie die Rangliste nach dem Speichern aktualisiert, wie das Melde-Set nach einer Umbenennung neu greift, genaue Obergrenze des Melde-Sets.
