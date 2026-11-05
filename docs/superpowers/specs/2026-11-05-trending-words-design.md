# Trending-Wörter: Wort-Statistiken und Lese-Endpunkte (Backend)

## Warum

Besucher sollen auf der Startseite und bei der Suche Wörter entdecken, die sie nicht gesucht haben: Das ist der Anreiz, länger auf der Seite zu bleiben und mehr Wörter kennenzulernen. Dafür braucht die Seite Zahlen pro Wort über die Zeit. Heute gibt es nur Reaktionen (`word-feedback`) und Kommentare, aber keine Aufrufe und keine Interaktionen.

## Ziele

- Pro Wort und Tag werden Aufrufe und Interaktionen gezählt, auf eigener Infrastruktur (Payload/Postgres). Matomo scheidet aus, weil Adblocker es häufig blockieren.
- Drei Ranglisten stehen als Lese-Endpunkte bereit:
  - **meistgesehen** (Aufrufe im Zeitraum),
  - **steigend** (Aufrufe jetzt gegenüber dem Zeitraum davor),
  - **viel Interaktion** (Interaktionen im Verhältnis zu den Aufrufen).
- Zeiträume sind wählbar, bis zu einem Jahr. "Die beliebtesten Wörter des Jahres" muss möglich sein.
- Tageszeilen werden dauerhaft gespeichert, es gibt kein Löschen und kein Aufräumen.

## Nicht-Ziele

- **Kein Frontend.** Wie Startseite und Suche die Listen zeigen, wird später entschieden. Dieser Entwurf liefert nur Daten und Endpunkte.
- Kein Tracking einzelner Besucher: keine Verweildauer, keine Wiederkehr, keine Besucher-IDs in der Statistik.
- Keine Zahlen für Seiten, die keine Wortseiten sind. Auch Suchanfragen ohne Treffer gehören nicht dazu. Beides wäre später ein eigenes Projekt.

## Anti-Ziele (das wäre ein Fehlschlag, auch wenn es technisch läuft)

- Crawler, Link-Vorschauen und Reloads treiben die Zahlen hoch.
- Die Ranglisten werden bei jedem Seitenaufruf teuer berechnet.
- Aus den gespeicherten Daten lässt sich eine einzelne Person ableiten.

## Entscheidungen von Felix

- Eigene Zähler, kein Matomo.
- Alle drei Listen: meistgesehen, steigend, viel Interaktion.
- Mehrfachaufrufe desselben Besuchers am selben Tag zählen als einer.
- Tageszeilen bleiben dauerhaft, damit Jahresranglisten möglich sind.
- Nur Backend, die Lese-Endpunkte werden mitgeliefert.

## Entwurf (Claudes Vorschläge, noch ohne Gegenzeichnung)

**Daten.** Neue Collection `word-stats` mit einer Zeile pro Wort und Tag (UTC-Tag oder Berliner Tag, offen). Felder: Wort (Relationship), Tag, Zähler für Aufrufe, Audio, Teilen und Weiterklick. Eindeutiger Index auf Wort und Tag. Zähler werden atomar hochgesetzt (Upsert mit `+ 1`), nicht gelesen und neu geschrieben. Access wie `word-feedback`: nur authentifizierte Nutzer.

**Erfassen.** Der Browser meldet einen Aufruf per `POST` an eine Route mit neutralem Namen. Der Name ist bewusst kein "track" oder "analytics", denn Adblocker greifen eher bei bekannten Namen an. Das ist eine Vermutung und nicht getestet. Die Meldung kommt vom Client, damit Crawler und Link-Vorschauen, die kein JavaScript ausführen, nicht mitzählen. Das Wort wird geprüft (existiert und ist veröffentlicht, wie in `word-feedback.ts`), und es gibt ein Rate-Limit pro IP (`rateLimitedBy`).

**Dedupe.** Der Server speichert nicht, wer ein Wort gesehen hat. Der Browser merkt sich in `localStorage`, welche Wörter er heute schon gemeldet hat, und meldet sie nicht noch einmal. Das ist leicht zu umgehen. Das reicht für diese Seite, und dafür bleibt die Statistik anonym. Interaktionen (Audio, Teilen, Weiterklick) werden ebenfalls einmal pro Wort und Tag gemeldet.

**Auswertung.** Die Ranglisten sind Aggregationen über `word-stats`, plus die Anzahl Reaktionen (`word-feedback`) und Kommentare im Zeitraum, soweit diese ein Datum tragen. Der Interaktionswert ist Interaktionen pro Aufruf, mit einer Mindestanzahl Aufrufe, damit ein Wort mit einem Aufruf und einem Klick nicht gewinnt. "Steigend" vergleicht den Zeitraum mit dem gleich langen davor, ebenfalls mit Mindestanzahl. Die genaue Formel und die Gewichte legt der Bauende fest.

**Lesen.** `GET /api/trending?type=viewed|rising|engaged&days=7|30|365&limit=N`. Antwort: Liste mit Wort-Referenz (wie `toWordRef`) und der Zahl, nach der sortiert wurde. Ergebnisse werden kurz gecacht (Größenordnung Minuten, im Prozess oder über die vorhandenen Cache-Header, `setPageCache`), damit nicht jeder Aufruf Postgres trifft.

## Festgelegt (Claudes Entscheidungen, bitte gegenlesen)

- **Gezählt wird nach dem Berliner Kalendertag**, gespeichert als reines Datum (`date`, keine Uhrzeit). Felix hat das bestätigt.
- Der Abschnitt "Entwurf" ist verbindlich, soweit Felix zugestimmt hat: Collection `word-stats`, Melden per `POST`, ein Lese-Endpunkt `GET /api/trending`. Der Bauende plant direkt die Umsetzung, ohne vorherigen Bestätigungsschritt.
- **Astro-Routen im `website`-Paket**, nach dem Muster von `word-feedback.ts`: Zugriff auf Payload über `getPayloadClient()` (Server-Zugriff, kein Login der Besucher). Die IP für das Rate-Limit kommt aus `clientIp(...)`, wie dort. Das Limit ist großzügiger als bei den Stimmen, weil ein Besucher pro Wortseite bis zu vier Meldungen schickt.
- **Aufrufe zählen nur Besuche der Wortseite selbst.** Wörter, die inline in Suchergebnissen oder auf der Startseite erscheinen, zählen nicht.
- **Interaktionen:** *Audio* = Wiedergabe gestartet. *Teilen* = Teilen-Aktion ausgelöst, einschließlich Bon-Share. *Weiterklick* = Klick von einer Wortseite auf ein anderes Wort (ähnliche oder verwandte Wörter). "Kein Frontend" meint die Anzeige der Ranglisten. Die Melde-Aufrufe in den vorhandenen Wortseiten-Komponenten gehören zum Umfang.
- **Reaktionen und Kommentare zählen als Interaktion** und werden live aus ihren Collections gezählt, nicht in `word-stats`.
- **Antwortform von `/api/trending`:** Rang, Wort-Referenz, Wert des Zeitraums und bei "steigend" zusätzlich der Wert des Vergleichszeitraums und die Veränderung.
- **Datenmenge:** Live-Aggregation über einen Index auf (Tag, Wort), dazu der kurze Cache. Eine vorberechnete Tabelle kommt erst, wenn die Messung sie nötig macht.

- **Formeln ohne feste Schwellen** (die Seite hat etwa 3.000 Besucher im Monat, also ein bis zwei Aufrufe pro Wort und Monat; Felix hat zugestimmt):
  - *Steigend* = `(jetzt − davor) / (davor + m)`, mit `m` = durchschnittliche Aufrufe eines Worts mit Aktivität im Zeitraum. Gleichstand entscheidet die Gesamtzahl der Aufrufe.
  - *Viel Interaktion* = `(Interaktionen + k · Gesamtrate) / (Aufrufe + k)` (Bayes-Glättung), mit `k` = derselbe Durchschnitt `m` und `Gesamtrate` = Interaktionen pro Aufruf über alle Wörter.
  - Gewichte als feste Konstanten: Audio, Teilen, Weiterklick und Reaktion je 1, Kommentar 3.
  - Standardzeitraum **30 Tage**; `days` bleibt wählbar.

## Offen für den Bauenden

- Konkrete Cache-Dauer, Wert von `limit`, Route für das Melden.
- Wie die Migration aussieht. Die Regeln dazu stehen in `payload/CLAUDE.md` und in den Migrationsregeln (Expand/Contract).
- Tests: Zähler, Rate-Limit, Wort-Prüfung, Sortierung der drei Listen.
