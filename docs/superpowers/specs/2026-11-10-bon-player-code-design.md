# Berliner oder Nicht: Spielercode (Name und Ergebnisse auf ein anderes Gerät mitnehmen)

Status: Entwurf, 2026-11-10. Baut auf `2026-11-05-bon-game-results-design.md` auf (Ergebnisse serverseitig, Pseudonym per Cookie). Backend und die Oberfläche für den Code; die Ergebnisseite selbst bleibt das Frontend-Ticket des ersten Specs.

## Ziel und Hintergrund

Ein Spieler ist für den Server heute nur sein Besucher-Cookie (httpOnly, ein Jahr, ein Browser). Wechselt er das Gerät oder löscht er die Browser-Daten, ist er ein Fremder: Name und alle bisherigen Ergebnisse sind nicht mehr seine.

Neu: Ein **Spielercode** verbindet einen Browser wieder mit demselben Spieler. Ein Code deckt zwei Fälle ab:

- **Übertragen:** Gerät A zeigt den Code (als Text, Link, QR-Code), Gerät B löst ihn ein.
- **Wiederherstellen:** Die Browser-Daten sind gelöscht; der Spieler tippt einen vorher notierten Code ein.

## Entschieden (vom Auftraggeber)

- Es geht nur um Name und Ergebnisse (Highscore, bisherige Spiele). Ein laufendes Spiel wandert nicht mit.
- Beide Fälle, Übertragen und Wiederherstellen, sollen möglich sein.
- Ein persönlicher Code, mehrfach verwendbar, läuft nicht ab. Der Auftraggeber sieht darin kein Problem; wer den Code hat, kann den Spieler übernehmen (Name und Ergebnisse). Das ist gewollt, es gibt keine Konten.
- Der Code wird per Knopf im Spiel angezeigt, nicht automatisch.

## Ziele

- Code erzeugen: Der Spieler holt sich seinen Code, bekommt ihn als Text, als Link und als QR-Code.
- Code einlösen: Code eintippen oder Link öffnen; danach gehört der Browser zum selben Spieler, Name und Ergebnisse sind wieder da.
- Mehrere Browser können denselben Spieler gleichzeitig haben.
- Wer schon Spiele ohne Code gespielt hat, verliert sie nicht: Beim ersten Erzeugen eines Codes gehen die bisherigen Spiele des Browsers in den Spieler über.

## Nicht-Ziele

- Kein Mitnehmen eines laufenden Spiels (Streak, Leben, Kartenstand).
- Keine Konten, kein Login, keine E-Mail.
- Kein „Code zurücksetzen oder widerrufen" und kein Ablauf. Später ergänzbar; jetzt nicht.
- Keine Rangliste „Top N" (steht schon als Nicht-Ziel im ersten Spec).

## Anti-Ziele (wäre ein Fehlschlag, auch wenn es technisch läuft)

- Der Code ist erratbar oder mit wenigen Versuchen durchprobierbar (kein Rate-Limit pro IP).
- Der Klartext-Code steht in der Datenbank. Gespeichert wird nur ein Hash (wie bei der Besucher-ID).
- Ein Link oder QR-Code verrät den Code an Dritte über Referrer, Logs oder Analytics (der Code gehört in den URL-Fragment-Teil `#…`, nicht in den Pfad oder die Query, und in keine Matomo-Seitenaufruf-URL).
- Das Einlösen übernimmt Kommentare, Stimmen, Meldungen oder Wort-Feedback des Browsers. Der Code betrifft nur das Spiel (siehe Datenschutz).

## Constraints

- Das Besucher-Cookie (`visitorId`, `website/src/services/payload/comments.ts`) wird von Kommentaren, Stimmen, Meldungen und Wort-Feedback mitbenutzt und ist httpOnly. Der Spielercode darf es nicht setzen oder überschreiben.
- Rate-Limit nur pro IP im Speicher (`website/src/utils/rateLimit.ts`), keine IPs gespeichert.
- Migration nach den Regeln in `.claude/rules/` für Payload-Migrationen (expand/contract, `down` funktioniert). Neue Collection bekommt `authenticatedOnly` und einen Forbidden-Test in `payload/tests/access.test.ts`.
- Pflicht-Texte auf Deutsch, Fehlermeldungen im Ton der bestehenden BON-Fehler.

## Datenschutz

Der Code ist ein Pseudonym wie das Cookie, nur über Geräte hinweg. Gespeichert werden: Hash des Codes, die Zuordnung zu den Spielen, Anzeigename, Ergebnisse, Zeitstempel. Keine IPs.

Mein Call (zu prüfen): Der Spielercode führt einen **eigenen Spieler** ein, getrennt vom Besucher-Cookie. Der Code verknüpft also nur BON-Spiele, nicht Kommentare, Stimmen, Feedback. Sonst würde ein Code, den jemand teilt, auch die Kommentare seiner Gerätenutzung verknüpfen. Die Datenschutzerklärung (CMS-Seite) braucht einen kurzen Absatz dazu.

## Wie es aussieht (Skizze für das Design)

Der Code ist zufällig, lang genug zum Nicht-Erraten und abtippbar, etwa `BÄR-4KQ-9ZT-M2X`, ohne verwechselbare Zeichen (0/O, 1/I/L). Der Link trägt den Code im Fragment, zum Beispiel `/berliner-oder-nicht#code=BÄR-4KQ-9ZT-M2X`; der QR-Code kodiert diesen Link.

Zustände der Oberfläche (für Claude Design):

1. **Kein Code vorhanden:** Knopf „Spielercode holen" (Hinweis: damit kannst du auf anderen Geräten weiterspielen).
2. **Code anzeigen:** Code groß und kopierbar, Knöpfe „Link kopieren" und „QR-Code zeigen", Hinweis „Wer diesen Code hat, kann deinen Namen und deine Ergebnisse nutzen. Schreib ihn dir auf."
3. **Code einlösen:** Eingabefeld, Knopf „Weiterspielen", Platz für Fehler („Den Code kenn ick nich.", Rate-Limit).
4. **Erfolg:** Bestätigung mit Spielername und bestem Ergebnis; danach geht es mit dem gewohnten Spiel weiter.
5. **Link geöffnet:** Der Link löst den Code ein und zeigt den Erfolgszustand. Er muss auf dem Handy funktionieren.

Platz in der Oberfläche: Ergebnisseite und Spielstart (genaue Stelle entscheidet das Design). Der Einlösen-Pfad muss auch ohne laufendes Spiel erreichbar sein.

## Entscheidungen, die dem Builder bleiben

- Datenmodell: eigene Collection für Spieler (Name, Code-Hash) oder ein Feld, wie die Spiele zugeordnet werden, Token-/Cookie-Verfahren fürs Merken des Spielers im Browser nach dem Einlösen (ein eigenes httpOnly-Cookie ist naheliegend).
- Länge und Alphabet des Codes (Mindestanforderung: nicht in sinnvoller Zeit durchprobierbar mit dem Rate-Limit; vorgeschlagen: 12 Zeichen aus 31 Zeichen, also etwa 59 Bit).
- Rate-Limit-Werte fürs Einlösen und Erzeugen.
- Umgang mit Spielen, die ein Browser schon hat, wenn er einen fremden Code einlöst (Vorschlag: der Browser wird dem fremden Spieler zugeordnet; frühere Spiele bleiben anonym im alten Pseudonym).
- Wie QR-Code erzeugt wird (clientseitig, ohne neue schwere Abhängigkeit, wenn möglich).
- Tests: Erzeugen, Einlösen, falscher Code, Rate-Limit, Übernahme alter Spiele, Hash statt Klartext.

## Meine Calls (bitte prüfen)

- Der Spielercode ist vom Besucher-Cookie getrennt (siehe Datenschutz).
- Der Code steht im URL-Fragment des Links.
- Beim ersten Erzeugen eines Codes werden die bisherigen Spiele des Browsers dem neuen Spieler zugeordnet.

Aus dem Builder-Check (alle von mir entschieden, bitte prüfen):

- **Zuordnung alter Spiele:** Die Spiel-Zeilen behalten ihren BON-eigenen Besucher-Hash (`bonVisitor`, eigenes Präfix `bon-game:`, ist mit keiner anderen Collection verknüpfbar) und bekommen zusätzlich eine Spieler-ID. Beim ersten Code werden die Zeilen dieses Hashs auf den Spieler gesetzt. Neue Spiele tragen beides. Rang, Highscore und „bisherige Spiele" suchen über die Spieler-ID, solange eine da ist.
- **Laufende Identität:** Nach dem Einlösen setzt der Server ein eigenes httpOnly-Cookie mit einer zufälligen Spieler-ID (nicht mit dem Code). Start und Ende nehmen das Spieler-Cookie, wenn es da ist, sonst das Besucher-Cookie wie bisher.
- **Mehrere Codes:** Ein Spieler kann mehrere Code-Hashes haben. Jeder Druck auf „Spielercode holen" erzeugt einen neuen gültigen Code. Der Klartext wird nur direkt nach dem Erzeugen angezeigt und als Komfort in localStorage dieses Browsers gemerkt; ist er dort noch da, wird derselbe Code erneut gezeigt statt eines neuen. Auf einem Gerät, das nur eingelöst hat, gibt der Knopf einen neuen Code aus. Alte Codes bleiben gültig (kein Widerruf).
- **Name:** Der Name gehört zum Spieler und wird bei jedem Spielende aktualisiert (wie bisher aus dem Spielende-Request). Beim Einlösen überschreibt der Client Name und besten Score in `$bonStats` mit den Werten des Servers.
- **Link und Fragment:** Ein kleines Client-Skript auf der Spielseite liest `#code=`, ruft das Einlösen auf und entfernt das Fragment danach per `history.replaceState`. Der Builder prüft, dass Matomo keinen Seitenaufruf mit dem Fragment sendet (zum Beispiel Tracker erst nach dem Entfernen starten oder die URL bereinigen).
- **Rate-Limit:** Wie beim Rest per IP im Speicher. Der Builder prüft, ob hinter Traefik die echte Client-IP ankommt (wie bei `word-feedback`). Pro Instanz und nach Neustart zurückgesetzt; bei 59 Bit hingenommen.
- **Umfang:** Der Plan enthält Backend, API und eine funktionierende, schlichte Oberfläche in den vorhandenen Komponenten und Tokens. Das endgültige Aussehen kommt aus dem Entwurf von Claude Design und wird danach angepasst.
