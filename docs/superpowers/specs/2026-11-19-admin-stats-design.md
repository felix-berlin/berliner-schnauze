# Admin-Statistik: Übersichtsseite mit Zeitraumwahl

Status: Entwurf, wartet auf Freigabe. Datum: 2026-11-19.

## Absicht und Warum

Felix (alleiniger Betreiber) will einen guten Gesamtüberblick über die einzelnen Zahlen der Seite, mit einstellbarem Zeitraum, im Payload-Admin. Heute stehen die Zahlen nur als Tabellenzeilen in den Collections (`word-stats`, `word-feedback`, …) oder indirekt im Trending (`trending()` / `/api/trending`). Er will auf einen Blick sehen, wie sich die Seite entwickelt, und mehrere Diagrammarten zur Auswahl haben. Mehr ausdrücklich nicht („Mehr brauchts erstmal nicht“).

## Ziele

- Eine Admin-Seite `/admin/stats` (Payload Custom View, Link in der Navigation), nur für eingeloggte Admins.
- Zeitraum einstellbar: Schnellwahl 7 Tage, 30 Tage, 1 Jahr, dazu freie Datumsfelder von/bis. Tage zählen nach Berliner Zeit (`berlinDay`, wie `word-stats`).
- Kennzahl-Kacheln mit der Summe im Zeitraum und dem Vergleich zum gleich langen Zeitraum davor.
- Mehrere Diagrammarten: Verlauf pro Tag (Linie/Fläche, Reihen wählbar), Vergleich (Balken), Verteilung (z. B. Reaktionen oder Nutzung als gestapelter Balken oder Torte), Top-Wörter-Liste.
- Zwei zusätzliche Top-Listen neben den Top-Wörtern nach Aufrufen:
  - **Beliebt:** Anteil der Likes an allen Reaktionen (`like` / (`like` + `dislike`)) je Wort im Zeitraum.
  - **Typisch berlinerisch:** Anteil von „Sag ick selbst“ an allen Nutzungs-Antworten (`usage`) je Wort im Zeitraum.
  - Beide nur für veröffentlichte, nicht gelöschte Wörter und erst ab einer Mindestzahl an Stimmen (Konstante `MIN_GROUP` aus `lib/wordFeedback`, damit ein Wort mit einer einzigen Stimme nicht auf Platz 1 steht). Je Liste 10 Einträge, mit Anteil in Prozent und Stimmenzahl.
- Zeitraum und Auswahl stehen in der URL (Ansicht teilbar, Neuladen behält sie).

## Nicht-Ziele und Anti-Ziele

- Keine Detailseiten, kein Verlauf pro Wort, kein Export, keine Alarme, keine öffentliche Seite.
- `trending()` und `/api/trending` bleiben unverändert. Reaktionen zählen dort schon mit (Like und Dislike gleich), die Umfrage (Nutzung) bewusst nicht: Trending misst Aufmerksamkeit, nicht Beliebtheit oder Echtheit. „Beliebt“ und „Typisch berlinerisch“ erscheinen nur in der Admin-Statistik. Als Ranking auf der Website wären sie eine eigene spätere Entscheidung.
- Keine Heatmap oder Kalender-Ansicht (nur Tageswerte; ECharts wurde deshalb abgelehnt).
- Anti-Ziel: Die Seite darf nie einzelne Personen zeigen oder erkennbar machen (`word-stats` hat bewusst keine Zeitstempel; `visitor`-Hashes von Feedback und BON bleiben unsichtbar). Nur Summen.
- Keine Änderung an der Erfassung der Zahlen und keine neuen Tabellen.

## Randbedingungen

- Payload 3.93.0, Next 16.4.6, React 19.3.1. Admin-Komponenten werden über den importMap (`pnpm --filter payload-app generate:importmap`) registriert.
- Datenquellen und ihre Zeitachse: `word_stats` (Spalte `day` als Text `YYYY-MM-DD`; `views`, `audio`, `shares`, `clicks`), `word_feedback` (Reaktionen/Nutzung, `created_at`), `comments` (`status`, `created_at`), `suggestions` (`created_at`, `status`), `bon_games` (`finished_at`, `status`, `score`).
- Aggregation in SQL (wie `collect()` in `lib/wordStats.ts`, `drizzle.execute`), nicht pro Zeile über die Payload-API: ein Jahr mit ca. 6000 Wörtern × 365 Tagen sind zu viele Zeilen. Rohes SQL umgeht Payload-Access, die Seite prüft den Login deshalb selbst. Tabellen- und Spaltennamen müssen einer Umbenennung folgen (Test).
- Neue Abhängigkeit: Chart.js plus `react-chartjs-2` in `payload-app`. Das pnpm-Alterslimit (24 h) gilt; Version vor Installation prüfen. Nur die benötigten Chart.js-Typen registrieren (Tree-Shaking).
- Canvas statt SVG: Farben kommen nicht per CSS. Admin-Farben und Dark Mode aus den CSS-Variablen des Admin auslesen und an Chart.js übergeben.
- Es braucht keine Migration (nur Lesen). Die Seite darf die Website nicht berühren und keinen Code in `payload-app`-Exports ziehen, den die Seite lädt.
- Sprache der Oberfläche: Deutsch, im Ton der anderen Admin-Texte.

## Ansätze (Auswahl durch Felix)

1. **Eigene Admin-Seite, SVG selbst gezeichnet.** Keine Abhängigkeit, aber Tooltips/Legende selbst bauen. Abgelehnt: Felix will viele Diagrammarten.
2. **Eigene Admin-Seite mit Diagramm-Bibliothek. (gewählt)** Bibliotheken verglichen: Recharts (SVG), Chart.js (Canvas), ECharts (Canvas, sehr groß, Heatmap), visx, Nivo, ApexCharts, uPlot. Felix wollte Canvas (Entscheidung von ihm; bei unserer Datenmenge bringt Canvas keinen Tempovorteil, kostet aber manuelle Farbanbindung) und wählte **Chart.js**.
3. **Dashboard-Widgets** (`admin.dashboard.widgets`). Nur als spätere Ergänzung, nicht als Hauptlösung (Zeitraumwahl für alle Zahlen gemeinsam ist dort umständlich).

## Von Felix entschiedene Teile

- Eine Übersichtsseite mit Zeitraumwahl, nichts darüber hinaus.
- Chart.js, Canvas.
- Kacheln, Verlauf, Top-Liste sowie mehrere Diagrammarten (Details unten).

## Meine Annahmen (Felix kann sie ändern)

- Kacheln: Aufrufe, Audio, Teilen, Weiterklick, Reaktionen, Kommentare (veröffentlicht), Vorschläge, BON-Spiele (beendet). Vergleichswert: gleich langer Zeitraum davor, in Prozent. Bei Vorwert 0 wird „neu“ statt eines Prozentwerts gezeigt.
- Diagramme: (a) Verlauf pro Tag, Reihen per Legende ein- und ausblendbar; (b) Balken: Summen der Kennzahlen im Vergleich zum Vorzeitraum; (c) Verteilung der Reaktionen als gestapelter Balken oder Torte; (d) Top-Wörter nach Aufrufen (Tabelle mit Mini-Balken), Anzahl 10.
- Bei Zeiträumen über ca. 90 Tage zeigt der Verlauf Wochensummen statt Tageswerte, damit er lesbar bleibt (Umschaltung automatisch).
- Zeitraum wird begrenzt: höchstens 366 Tage, von ≤ bis, nicht in der Zukunft; ungültige Parameter fallen auf 30 Tage zurück.
- Trash (Soft-Delete von Wörtern): Aufrufe getrashter Wörter zählen in den Summen mit, tauchen aber in der Top-Liste nicht auf (Top-Liste zeigt nur veröffentlichte, nicht gelöschte Wörter wie `trending()`).

## Festlegungen nach der Prüfung (meine Entscheidungen)

- **Zeitachse:** überall Berliner Zeit (`AT TIME ZONE 'Europe/Berlin'`), damit alle Reihen mit den Berliner Tagen von `word_stats` übereinstimmen. Das Enddatum zählt komplett mit. Die Spalten: `created_at` (Feedback, Kommentare, Vorschläge), `finished_at` (BON-Spiele). Spätere Änderungen (`updated_at`) zählen nicht.
- **Reaktionen:** Kachel = Feedback-Zeilen mit gesetzter `reaction` (`like`/`dislike`). Die Verteilung hat einen Umschalter Reaktion / Nutzung (Felder und Beschriftungen aus `REACTIONS` und `USAGES` in `lib/wordFeedback`).
- **Filter je Quelle:** Kommentare nur `status = published`, Vorschläge alle (nach Erstellungsdatum), BON-Spiele nur beendete (`finished_at` gesetzt).
- **Skalen:** Der Verlauf zeigt standardmäßig nur „Aufrufe“; weitere Reihen schaltet man über die Legende zu. Reihen mit sehr verschiedenen Größen laufen auf einer zweiten Achse (Aufrufe links, alle anderen rechts). Das Balken-Diagramm zeigt die prozentuale Veränderung zum Vorzeitraum pro Kennzahl, nicht die Rohwerte.
- **URL-Parameter:** `von`, `bis` (Datum), `reihen` (Liste), `verteilung` (reaktion|nutzung), `ansicht` (linie|flaeche). Die Schnellwahl setzt `von`/`bis` neu (7, 30 und 365 Tage rückwärts bis heute). Ein laufender Tag zählt als Teiltag mit.
- **Vorzeitraum:** wird auf gleiche Länge direkt davor berechnet und nicht gekappt. Gibt es dort keine Daten, steht „neu“ statt Prozent.
- **Zugriff:** `Users` hat keine Rollen, jeder eingeloggte Nutzer reicht (wie `authenticatedOnly`). Link über `admin.components.afterNavLinks`.
- **Trash:** Die Seite baut auf dem Stand dieser Branch auf (Soft-Delete der Wörter, Spalte `deleted_at`). Die Top-Liste filtert veröffentlicht und `deleted_at is null`.
- **Wochen:** ISO-Wochen (Montag), über 90 Tage; Teilwochen am Rand werden auf den gewählten Zeitraum begrenzt.
- **Farben:** Payload-Variablen `--theme-elevation-*` und `--theme-success-*`, `--theme-error-*`; beim Bauen gegen 3.93 prüfen.

## Dem Bauenden überlassen

- Genaue Gestaltung, Abstände, Farbwahl innerhalb der Admin-Farben.
- Aufteilung in Dateien (Seite, Datenabfrage in `lib/`, Diagramm-Komponenten) und Tests (reine Rechenfunktionen wie Zeitraumparsing, Vergleich und Wochenaggregation als Unit-Tests; eine SQL-Abfrage-Test gegen die Test-DB).
- Welche Chart.js-Version, wenn mehrere dem Alterslimit entsprechen.
