# Themen-Audit — Gesamtbestand (Publish + Draft)

Durchgeführt: 2026-09-14. Umfang: **5935 Wörter** (2544 publish, 3391 draft —
die Meyer-1904-Importe). Datenquelle: WPGraphQL-Vollabfrage über
`scripts/fetch-all-words-for-audit.ts` (kein `per_page`-Limit, siehe
Erkenntnis unten). Der Rohdaten-Export ist ein Momentaufnahme-Snapshot und
nicht Teil des Repos (schnell veraltet, sobald Korrekturen angewendet
werden) — bei Bedarf einfach erneut laufen lassen:

```bash
infisical run -- pnpm dlx tsx scripts/fetch-all-words-for-audit.ts
```

schreibt nach `data/lexikon-import/audit-themen-export.json` (gitignored
Arbeitsdatei).

Ein unabhängiger Review (Dialekt-/Soziolekt-Experte, per Subagent) wurde
zweimal konsultiert, um Kategorisierungsentscheidungen kritisch zu prüfen
statt sie unreflektiert umzusetzen — siehe "Review-Ergebnis" unten.

## Wichtige Nebenerkenntnisse

1. **Alle 3391 Meyer-Drafts haben einen leeren Slug** (`slug: ""`).
   `import-words-to-wp.ts` erstellt Drafts ohne expliziten `slug`, und
   WordPress vergibt post_name für Drafts offenbar erst beim ersten
   Veröffentlichen. Das bricht jede slug-basierte Nachbearbeitung (u. a.
   `import-categories-to-wp.ts` in seiner bisherigen Form) — deshalb wurde
   dieses Script auf ID-Matching umgestellt (siehe unten). Für Live-URLs
   nach dem Publish-Vorgang unkritisch (WP generiert den Slug dann aus dem
   Titel), aber bis dahin ist jede Verlinkung auf den Slug eines Drafts
   hinfällig.
2. **`with-multible-audio`** (Post-ID im Export, Status publish) ist offenbar
   ein liegengebliebener Test-Eintrag (Titel = technischer String, Beispieltext
   „Beispiel 1"/„Beispiel 1 Erklärung", `berolinismus: true` ohne jeden
   Bezug). Empfehlung: in WP-Admin manuell prüfen und vermutlich löschen —
   kein Themen-Fix, sondern ein Datenhygiene-Fund.

## Strukturelle Befunde (harte Zahlen)

| Befund | Anzahl |
| --- | --- |
| Wörter ganz ohne Thema | 1682 (1096 draft, 586 publish) |
| Ungültige Themen-Slugs | 0 |
| `berolinismus=true` ohne Thema `orte-spitzname` | 3 |
| Thema `orte-spitzname` ohne `berolinismus=true` | 84 |
| Wörter mit ≥4 Themen (Übertaggung) | 0 |

### Die 3 Berolinismus-Bugs (behoben in `themen-corrections.json`)

- **Bulle** → Spitzname für die Industriebahn Oberschöneweide; hatte nur
  `stadtleben`. Fix: `orte-spitzname` ergänzt.
- **hohler Zahn** → Spitzname für die Kaiser-Wilhelm-Gedächtniskirche
  (Redensart-Nebenbedeutung „für den hohlen Zahn" = zu wenig Essen führte
  zur Verschlagwortung nach `essen-trinken`/`koerper`/`alltag-wohnen`, aber
  ohne den eigentlichen Ortsbezug). Fix: `orte-spitzname` ergänzt, bestehende
  Themen bleiben (ein Wort kann mehrere Bedeutungsebenen haben).
- **with-multible-audio** → kein echtes Wort, siehe oben. Nicht korrigiert,
  zur Löschung vorgeschlagen.

### Die 84 orte-spitzname/Berolinismus-Fälle

Absichtlich **nicht automatisiert** korrigiert — der Review-Agent riet hier
klar von Pauschalregeln ab: „Ein Spitzname für ein *Denkmal* ist etwas
anderes als ein Spitzname für den *Ort*, den es markiert." Kategorisierter
Vorschlag in `themen-manual-review.md`:

- **~22 klare Fehlzuordnungen** (kein Ortsbezug erkennbar, z. B. „Alleweile"
  = jetzt, „Ableja" = Kosewort fürs eigene Kind, „Akedemie" = Verballhornung)
  → `orte-spitzname` sollte vermutlich entfernt werden.
- **~20 klare Berolinismen** (Bammelecke, Café Karo, Dalldorf, Gold-Else,
  Hungerharke, Pallasseum, Telespargel, Zelten, ...) → fehlt nur das
  `berolinismus`-Flag. **Hinweis**: `berolinismus` ist ein ACF-Boolean-Feld,
  keine Taxonomie — nicht Teil von `themen-corrections.json`, muss manuell
  in WP-Admin oder per kleinem Zusatzscript gesetzt werden (bei Bedarf baue
  ich das nach).
- **~42 echte Grenzfälle** (Denkmal-Zitate wie „Blücher"/„Brandenburg",
  regionale Neckwörter wie „Fischköppe", Wortspiele wie „Erkner") — bewusst
  unentschieden gelassen, Definitionsfrage für euch als Projekt.

## Neue Kategorie: `bewegung-gehen` (Bewegung & Fortbewegung)

**106 Treffer im Gesamtbestand** (53 aktuell themenlos, die anderen 53 ad-hoc
über 12 verschiedene bestehende Themen verstreut — kein Thema deckt mehr als
13 davon ab, es gab also kein natürliches Zuhause). Beispiele: abloofen,
absocken, verduften, sich verkrümeln, verfatzen, teilachen, tippeln, steijen,
entern, jondeln, zuckeln, schampeln, preschen, pesen, fegen (=schnell
laufen). Vom Review-Agenten ausdrücklich bestätigt (klar abgrenzbares
Sachfeld, keine Überschneidung mit `stadtleben`/`machen-tun`). Wurde als
Kategorie angelegt (`scripts/lib/word-category.ts`).

## Label-Erweiterung: `schimpfwoerter-beleidigungen`

Zwei weitere Cluster wurden identifiziert, aber **nicht** als eigene
Kategorien angelegt (Review-Agent: zu klein für eigene Top-Level-Themen,
gehören inhaltlich zu zwischenmenschlicher Aggression):

- **Schläge/Prügel**: 88 Treffer gesamt (Dresche, Haue, Keile, Kloppe,
  Wichse, Wamse, Senge, Tachtel, verkloppen, verwichsen, vertobaken, ...)
- **Betrügen/Anschmieren/Stehlen**: 48 Treffer gesamt (lackieren, mauscheln,
  verkohlen, schummeln, stibitzen, striezen, petzen, gelackmeiert, ...)

Beide wurden in `schimpfwoerter-beleidigungen` integriert (Slug unverändert
— URLs/SEO bleiben stabil). Das **Label** wurde erweitert von
„Schimpfwörter & Beleidigungen" auf **„Schimpfwörter, Zoff & Ärger"**, damit
Nutzer beim Browsen nicht überrascht sind, dort auch „Dresche" oder
„mauscheln" zu finden (Review-Agent: reines Beibehalten des alten engen
Labels hätte die Erweiterung vor Nutzern versteckt).

## Verworfene Themen-Kandidaten

- **„Kindersprache"** (Aua, Autsch, Bäba/Bett-Kinderwort, Eien=streicheln,
  Hemdenmatz=kleines Kind, ...): Review-Agent widerspricht — das ist eine
  Sprachregister-Kategorie, keine Sachthema-Kategorie, und würde dieselbe
  Ebenen-Vermischung reproduzieren, die dieser Audit gerade aufräumt. Bleibt
  überwiegend korrekt themenlos.
- **„Zeit/Zeitangaben"**: nach echter Vollzählung nur ~10-15 Wörter
  (Anjetzt=jetzt, Dazumal/dunnemals=damals, Balle=bald, ...) — klar unter
  der vom Review-Agenten empfohlenen 25-30-Mindestgröße. Bleibt themenlos
  (reine Funktionswörter, kein Sachthema-Gehalt).

## Umfang der automatisierten Korrektur

| | Anzahl |
| --- | --- |
| Themenlose Wörter geprüft | 1682 (alle, Zeile für Zeile gelesen) |
| Automatisch korrigiert (`themen-corrections.json`) | 158 (inkl. 2 Berolinismus-Fixes) |
| Als Vorschlag geloggt, nicht automatisch geschrieben (`themen-manual-review.md`, Tier B) | 109 |
| Verbleibend ohne Themen-Treffer | 1425 |

Die 158 automatisch geschriebenen Korrekturen stammen ausschließlich aus
**strukturell sicheren Signalen**: der feste Marker „(in der Wendung ...)" /
„(in der Redensart)" für `redewendungen-sprueche`, und den beiden
evidenzgestützten, vom Review-Agenten bestätigten Clustern
`bewegung-gehen`/`schimpfwoerter-beleidigungen`. Alle 158 wurden von mir
einzeln gegengelesen (vollständige Liste im Chat-Verlauf), keine
Falschzuordnung gefunden.

**Bewusst nicht automatisiert**: 109 Treffer auf die übrigen 10
Themen-Keywords (essen-trinken, koerper, geld, ...). Stichproben zeigten
echte Fehlalarme durch Zitat-Rauschen (z. B. eine Quellenangabe „...Kalisch,
Posse »Einhunderttausend Taler« (1849)" liest fälschlich als „geld") und
Idiom-Substrings („Tee reiten" = beim Lehrer einschmeicheln, liest fälschlich
als „essen-trinken"). Diese liegen als Vorschlag in
`themen-manual-review.md` zur Einzelprüfung.

Die verbleibenden ~1425 Wörter sind nach fachlicher Einschätzung
überwiegend **korrekt themenlos**: reine Lautvarianten von Hochdeutsch ohne
Dialektgehalt (Hanschuh=Handschuh), Verstärkungsadverbien (diebisch=sehr),
Kindersprache-Interjektionen, Eigennamen/Koseformen und Zeit-Adverbien. Das
ist kein Kategorisierungsfehler, sondern eine bewusste linguistische
Entscheidung (siehe Review-Agent-Urteil oben) — nicht jedes Dialektwort
braucht ein Sachthema.

## Wie die Korrekturen angewendet werden

`scripts/import-categories-to-wp.ts` wurde erweitert (nicht neu gebaut):

1. `fetchAllPostSlugs` fragt jetzt alle Stati ab (publish/draft/pending/
   future/private), nicht nur publish — Voraussetzung, um die Meyer-Drafts
   überhaupt zu erreichen.
2. Zuordnung erfolgt jetzt primär über die numerische Post-ID
   (`berlinerWordId`), nicht über `slug` — wegen des leeren-Slug-Problems
   bei Drafts (s. o.). Fällt auf Slug zurück, falls keine ID vorhanden.
3. Neuer `--file`-Parameter, um eine beliebige Korrekturdatei statt
   `data/word-categories.json` zu laden.

Anwendung:

```bash
# Vorschau
infisical run -- pnpm dlx tsx scripts/import-categories-to-wp.ts --dry-run --file data/lexikon-import/themen-corrections.json

# Echt schreiben
infisical run -- pnpm dlx tsx scripts/import-categories-to-wp.ts --file data/lexikon-import/themen-corrections.json

# Einzelnes Wort testen
infisical run -- pnpm dlx tsx scripts/import-categories-to-wp.ts --file data/lexikon-import/themen-corrections.json --slug bulle
```

Das Script setzt die Themen-Taxonomie vollständig neu (nicht additiv) — für
die 158 Korrekturen enthält jeder Eintrag daher die vollständige gewünschte
Themenliste (bestehende + neue), nicht nur die Ergänzung.

## Offene Punkte für euch

1. `with-multible-audio` prüfen/löschen (Datenhygiene, keine Themen-Frage).
2. Die ~22 klaren orte-spitzname-Fehlzuordnungen und ~20 fehlenden
   Berolinismus-Flags manuell in WP-Admin nachziehen (Liste in
   `themen-manual-review.md`) — oder sagt Bescheid, dann baue ich ein
   kleines ACF-Patch-Script dafür.
3. Die 109 Tier-B-Themenvorschläge durchsehen und die für gut befundenen
   Zeilen von Hand in `themen-corrections.json` übernehmen (Format siehe
   dort), dann erneut mit `--dry-run` prüfen.
4. Die ~1425 „bewusst themenlos"-Wörter sind nur zur Stichprobe gelistet,
   keine Handlung nötig — außer euch fällt beim Durchblättern eine
   systematische Lücke auf.
