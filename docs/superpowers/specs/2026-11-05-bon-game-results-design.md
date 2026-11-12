# Berliner oder Nicht: Ergebnisse serverseitig speichern und ranken

Status: Entwurf, 2026-11-05. Nur Backend. Frontend (Ergebnisseite, Ranking-Anzeige, Umbau von `useBon`) folgt in einem eigenen Ticket.

## Ziel und Hintergrund

Das Spiel „Berliner oder Nicht" läuft heute komplett im Browser (`website/src/composable/useBon.ts`): Der Client mischt das Deck, kennt die Lösung jeder Karte (`isReal`) und rechnet den Score selbst. Highscore, Streak und Name liegen nur in localStorage (`$bonStats`). Es gibt keine Server-Persistenz und kein Ranking.

Neu: Ein beendetes Spiel wird auf dem Server gespeichert, und der Server liefert dem Spieler seinen Rang im Vergleich zu allen anderen Spielen. Weil das Ranking nicht leicht fälschbar sein soll, ist der Server maßgeblich: Er gibt die Karten aus, kennt die Lösungen und rechnet das Ergebnis aus den Antworten nach.

## Ziele

- Spiel starten: Server legt ein Spiel an, liefert Karten ohne Lösung und ein Spiel-Token.
- Weitere Karten nachladen, solange das Spiel läuft (kein festes Spielende, es endet beim dritten Fehler).
- Spiel beenden: Client schickt die Antworten, Server berechnet Score, bester Streak, Antworten gesamt und richtige Antworten, speichert das Spiel und antwortet mit Score, Platz und Gesamtzahl der Spiele.
- Mehrere Spiele desselben Browsers gehören zu einem Pseudonym.
- Ergebnisse sind nicht mit einem einzelnen erfundenen Request fälschbar.

## Nicht-Ziele

- Kein Frontend (Ergebnisseite, Ranking-UI, Umbau von `useBon.ts`, Offline-Fallback-Logik).
- Kein Login, keine Konten.
- Keine Rangliste „Top N" als Endpunkt (nur der Rang des eigenen Spiels); kann später ergänzt werden.
- Kein Schutz gegen jemanden, der echt und schnell genug spielt oder sich mit vielen Pseudonymen neu anmeldet.

## Anti-Ziele (wäre ein Fehlschlag, auch wenn es technisch läuft)

- Ein Spieler kann sich mit einem einzigen Request einen beliebigen Score eintragen.
- Die Lösungen (`isReal`) stehen in irgendeiner Antwort vor dem Spielende.
- Ein Token kann für mehr als ein Spiel benutzt werden.

## Entschieden (vom Auftraggeber)

- Identität: Pseudonym statt Login. Mehrere Spiele einer Session gehören zum selben Pseudonym.
- Jedes Spiel zählt einzeln im Ranking (nicht nur das beste pro Spieler).
- Der Server prüft mit: Er gibt die Decks aus und rechnet nach. Offline gespielte Spiele kommen nicht in die Rangliste.
- Nur Backend in diesem Ticket.
- Nur komplette Spiele zählen: Ein Spiel endet mit dem dritten Fehler. Der Ende-Endpunkt lehnt Antwortlisten mit weniger als drei Fehlern ab, abgebrochene Spiele kommen nicht ins Ranking.

## Meine Annahmen (bitte beim Lesen prüfen)

- Das Pseudonym ist eine zufällige ID, die der Browser erzeugt und mitschickt (Cookie, wie bei `word-feedback`/`comment-votes`). Der Anzeigename (`playerName` aus `$bonStats`) ist nur Beschriftung und nicht eindeutig. Gespeichert wird ein Hash der ID, nicht die ID (wie `feedbackVisitor` in `website/src/pages/api/word-feedback.ts`).
- Decks werden stapelweise ausgegeben (Stapelgröße 20, 10–15 echte Karten, Rest Fake, wie `DECK_SIZE` und `_makeQueuedDeck` in `useBon.ts`), und der Client holt den nächsten Stapel, wenn der aktuelle leer ist.
- Die Spielregeln (10 × Multiplikator, 3 Leben, Multiplikator ab Streak 3/6/10 = 2/3/5) werden einmal serverseitig abgebildet. `computeMultiplier` aus `useBon.ts` ist die Referenz; der Server importiert sie nicht aus der Vue-Composable-Datei, sondern die Logik wird in eine gemeinsame reine Datei gezogen oder dupliziert und per Test gegen `useBon` abgeglichen.
- Echte Wörter kommen aus der CMS-Datenbank, Fake-Wörter aus `website/src/data/fakeWords.ts`. Beides ist im Astro-Server verfügbar.
- Eine neue Payload-Collection (Arbeitsname `bon-games`, nur Login-Zugriff wie `word-feedback`) und Astro-API-Routen unter `website/src/pages/api/`, nach dem Muster von `word-feedback`.
- Rate-Limit nur pro IP im Speicher (ein Limit pro Pseudonym ist sinnlos, Cookies sind kostenlos), ohne IPs zu speichern (wie bei `word-feedback`).

## Missbrauchsschutz

- Das Spiel-Token wird beim Start vom Server ausgestellt und ist an das Spiel gebunden (signiert oder als zufälliger Wert im Datensatz). Es kann nur einmal zum Beenden eingelöst werden.
- Der Server speichert pro Spiel, welche Karten ausgegeben wurden (mit Lösung). Antworten, die nicht zu ausgegebenen Karten gehören, werden abgelehnt.
- Zeitprüfung: Der Server hält Ausgabe- und Abgabezeit fest. Eine Antwortliste, die schneller ist als ein Mensch lesen kann (Mindestzeit pro Karte, Wert wählt der Builder), wird abgelehnt.
- Der Server wertet nur bis zum dritten Fehler; weitere Antworten in der Liste werden ignoriert oder führen zur Ablehnung.
- Ein Spiel, das nie beendet wird, zählt nicht im Ranking und wird nach einer Frist verworfen.
- Bekannte Grenze: Wer schnell genug echt spielt (auch mit Hilfe eines Skripts, das alle Wörter nachschlägt) oder sich neue Pseudonyme erzeugt, wird nicht aufgehalten. Das wird so dokumentiert.

## Schnittstellen (Skizze, Namen und Form entscheidet der Builder)

- Start: liefert Spiel-Token plus ersten Stapel (pro Karte nur Karten-ID und Wort, nie die Lösung). Heute zeigt der Client nach einer richtigen Antwort die Übersetzung an (`translation`); der Server liefert sie erst in der Ende-Antwort oder in einer eigenen Antwort pro Karte, das entscheidet das Frontend-Ticket.
- Nachladen: Token plus nächster Stapel.
- Ende: Token, `{ token, answers: [{ card, real }], playerName? }`, `card` ist die Position im Spiel, keine Zeitstempel pro Antwort. Ein fehlgeschlagenes Ende verbraucht das Spiel nicht. Antwort: Score, bester Streak, Antworten gesamt, richtige Antworten, Platz, Gesamtzahl gespeicherter Spiele.
- Platz = 1 + Anzahl gespeicherter, beendeter Spiele mit höherem Score. Bei Gleichstand teilen sich Spiele denselben Platz (Entscheidung des Builders, wenn sie anders gewichtet werden soll).

## Datenschutz

Gespeichert werden: Hash des Pseudonyms, Anzeigename (frei vom Spieler gewählt), Spielergebnis, Zeitstempel. Keine IPs, keine weiteren personenbezogenen Daten. Der Anzeigename wird wie andere Nutzereingaben validiert (Länge, keine Links); ein Löschen pro Pseudonym gibt es wie bei `word-feedback` nur über das CMS.

## Dem Builder überlassen

Namen und Felder der Collection und Routen, Token-Verfahren, Mindestzeit pro Karte, Rate-Limit-Werte, Umgang mit Gleichstand, Aufräumen alter unbeendeter Spiele, Migration, Tests (Regelabgleich mit `useBon`, Fälschungsversuche, Rang).

## Entscheidungen aus dem Builder-Check (meine Calls, bitte prüfen)

- **Cookie:** Der Server setzt das Pseudonym-Cookie selbst beim Start, über `visitorId(cookies, true)` aus `website/src/services/payload/comments.ts` (httpOnly, 1 Jahr, Pfad `/api/`). Ohne Cookie (blockiert, privates Fenster) kann kein Spiel gestartet werden; das Frontend spielt dann ohne Ranking, wie offline.
- **Zeitprüfung:** Nur Serverzeiten zählen. Der Server prüft die Gesamtzeit zwischen Ausgabe der Stapel und dem Ende-Request gegen eine Mindestzeit pro beantworteter Karte. Die Zeitstempel des Clients sind nur Hinweis. Es bleiben drei Endpunkte (Start, Nachladen, Ende), keine Anfrage pro Antwort. Grenze: Ein Bot, der wartet, fällt nicht auf.
- **Kartenpool:** Echte Wörter: veröffentlicht, mit nicht leerem `berlinerisch` und erster Übersetzung nicht leer. Der Auftraggeber hat bestätigt, dass die Übersetzung Pflicht ist; das heutige Filtern in `BerlinerOderNicht.vue` (nur `berlinerisch`) wird dafür angepasst. Eine Karte kommt innerhalb eines Spiels nicht doppelt vor. Der Pool hat tausende Wörter, ein leerer Pool wird nicht gesondert behandelt (Fehler statt Endlosschleife).
- **Anzeigename:** optional, Standard „Anonym". Validiert nur auf Länge und Links. Eine Prüfung auf Schimpfwörter gehört ins Anzeige-Ticket, weil Namen erst dort öffentlich werden.
