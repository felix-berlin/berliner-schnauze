# „Übernommen“ übernimmt wirklich: Design

Stand: 2026-11-27. Betrifft `payload/` (Collection `suggestions`, Hook `adoptSuggestion`). Kurzes Design (kleine Änderung, ein Hook).

## Intent

Der Betreiber setzte den Beispielsatz-Vorschlag „Nimm deene Griffel weg!“ auf „Übernommen“ und sah ihn nicht auf `/wort/griffel`. Der Status war nur ein Etikett: Beispielsatz, Wissenswertes und Verwandtes werden nie ins Wort geschrieben (`adoptSuggestion` überspringt alles außer „Neues Wort“), „Neues Wort“ legt nur einen Entwurf an. Regel des Betreibers: **ein expliziter Klick auf Übernehmen oder Veröffentlichen muss die Seite ändern, egal wo.** Ein Admin-Klick darf nicht stillschweigend nichts tun.

## Goals

- Status `accepted` an einem Vorschlag schreibt den Inhalt ins Wort und veröffentlicht ihn, in einer Transaktion mit dem Speichern des Vorschlags. Danach zeigt die Seite ihn (der Cache-Stempel leert den Cache).
  - `example` → neuer Eintrag in `examples` (`example` = Text, `exampleExplanation` = Highdeutsch, `contributorName` = User Name, `contributorSuggestion` = dieser Vorschlag).
- `examples` bekommt dieselben Felder `contributorName` und `contributorSuggestion` wie `facts` und `related`, und die Wortseite zeigt „Beitrag von …“ unter dem Beispiel wie bei Wissenswertem (Betreiber-Entscheidung).
  - `fact` → neuer Eintrag in `facts` (`kind`, `text` als einfacher Rich-Text-Absatz, `contributorName` = User Name, `contributorSuggestion` = dieser Vorschlag).
  - `related` → neuer Eintrag in `related` (`label` = Related Text, `relation`, `contributorName`, `contributorSuggestion`).
  - `word` (Neues Wort) → das Wort wird angelegt (wie bisher) **und veröffentlicht**.
- Scheitert etwas (leerer Slug, belegter Slug, Pflichtfeld fehlt, Wort nicht veröffentlicht), wird das Speichern mit lesbarer Fehlermeldung abgebrochen; der Status bleibt, das Wort bleibt unverändert.

## Non-goals

- Kein eigener Button; die Statusauswahl bleibt der Auslöser.
- Keine Zusammenführung in ein **vorhandenes** Wort bei „Neues Wort“ (Übersetzung, Beispiel): dort wird wie bisher nur verknüpft.
- „Erledigt“ bei Fehlermeldungen (`reports`) und das Speichern von Entwürfen bei Wörtern und Beiträgen bleiben unverändert.

## Anti-Goals

- Nichts darf unbeabsichtigt live gehen: hat das Zielwort einen **unveröffentlichten Entwurf mit anderen Änderungen** (Payload kennt nur einen Entwurf pro Wort), wird abgebrochen: „Wort hat ungespeicherte Entwurfsänderungen, erst veröffentlichen“. Entscheidung des Betreibers.
- Ein bereits übernommener Vorschlag wird nicht ein zweites Mal eingetragen (nur der Wechsel nach `accepted` löst aus).

## Approaches

- **A, im bestehenden Hook `adoptSuggestion` (gewählt):** gleicher Ort, gleiche Transaktion, auch für REST, MCP und Local API. Ein Fehler rollt alles zurück.
- **B, eigener Button „In Wort übernehmen“:** klarer, aber ein neues Admin-Bauteil, und die Statusauswahl bliebe weiter ein Etikett, das dasselbe Missverständnis erzeugt.
- **C, Statusauswahl behalten, aber „Übernommen“ nur erlauben, wenn der Eintrag schon im Wort steht (Validierung):** kein neuer Schreibpfad, aber die Handarbeit bleibt.

## Meine Entscheidungen (bitte prüfen)

- Das Zielwort muss **veröffentlicht** sein; sonst Abbruch (ein ganz neuer, nie veröffentlichter Entwurf würde sonst mit veröffentlicht).
- „Entwurf mit anderen Änderungen“ heißt: die neueste Version des Worts ist neuer als die veröffentlichte. Wie genau das erkannt wird, bestimmt der Bauherr.
- `fact`-Text (Textarea) wird ein einfacher Lexical-Absatz; kein HTML-Parser (jsdom darf nicht in den Bundle, siehe Migration `content_globals`).
- Die neuen Felder an `examples` sind wie bei `facts` für MCP unsichtbar und nicht änderbar (`notOverMcp`); die Datenschutzerklärung nennt die öffentliche Namensnennung schon für `facts`/`related` und muss `examples` mit abdecken (Hinweis an den Betreiber, kein Code).
- Ein Vorschlag mit gewähltem `word` oder `targetWord` auf ein Wort im Papierkorb bricht ab.
- Nach dem Veröffentlichen sperrt die bestehende Regel „Vorschlag ist gesperrt, solange sein Wort veröffentlicht ist“ nur Vorschläge mit `word`; `example`/`fact`/`related` nutzen `targetWord` und bleiben bearbeitbar.

## Constraints

- Code, Kommentare, Tests, Commits auf Englisch; Fehlermeldungen im Admin Deutsch (wie `adoptSuggestion`).
- Eine Migration nach expand/contract (`.claude/rules/payload-migrations.md`): nur zwei neue nullable Spalten an der Beispiel-Tabelle, alter Code ignoriert sie.
- Der Hook darf bei `skipCacheStamp`-Kontexten (Migrationen) nichts ändern.

## Tests

- Je Typ: „Übernommen“ erzeugt den Eintrag im veröffentlichten Wort (Credit-Felder bei fact/related), das Wort bleibt veröffentlicht.
- Abbruch: Zielwort mit neuerem Entwurf, unveröffentlichtes Zielwort, Wort im Papierkorb; jeweils bleibt Status und Wort unverändert (Rollback).
- Zweimal speichern trägt nicht doppelt ein.
- Wortseite: ein Beispiel mit `contributorName` zeigt „Beitrag von …“, eines ohne zeigt nichts; `payload-types` neu erzeugt, Migration läuft auf leerer Datenbank (`scripts/migration-upgrade-test.sh`).
- „Neues Wort“ landet veröffentlicht; belegter Slug und leerer Slug brechen wie bisher ab.
- Cache-Stempel ändert sich (das Wort stempelt).

## Dem Builder überlassen

- Erkennung „Entwurf neuer als veröffentlicht“ (Versionen vergleichen), Aufbau des Lexical-Absatzes, Reihenfolge der Prüfungen, Doku in `payload/CLAUDE.md` (Abschnitt „Suggestions → words“ und der Hilfetext am Status-Feld).
