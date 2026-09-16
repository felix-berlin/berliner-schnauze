# Kuratierungs-Fortschritt — Meyer 1904

Quelle: „Der Richtige Berliner in Wörtern und Redensarten" von Hans Meyer,
6. Auflage, Berlin 1904 (gemeinfrei). Plaintext-Export (ZLB, 190 Seiten,
eine `.txt`-Datei pro Seite) aus `14707251_plaintext.zip`, extrahiert nach
`/tmp/.../scratchpad/meyer1904/`. Eine Markdown-Konvertierung (markitdown)
wurde geprüft und verworfen — sie verschränkt die zweispaltige Vorlage
zeilenweise und zerreißt Einträge mitten im Satz (siehe Chat-Verlauf); der
Plaintext-Export erhält die korrekte Lesereihenfolge trotz OCR-Rauschen.

Seiten 1–15 (Vorwort/Lautlehre): übersprungen, OCR unbrauchbar (s.
`skipped-meyer.md`). Wörterbuchteil beginnt Seite 20 ("Wörterbuch"-Titel
auf S. 19).

Buchstabengrenzen (ermittelt via Section-Header-Grep):
A: S. 20–30 (Z. 56) · B: S. 30 (Z. 56)–41 (Z. 74) · C: S. 41 (Z. 75)–42 (Z. 29)
· D: S. 42 (Z. 30)–49 (Z. 25) · E: S. 49 (Z. 26)–53 (Z. 31) · F: S. 53 (Z. 32)–59 (Z. 27)
· G: S. 59 (Z. 28)–59 (Z. 44) · H: S. 59 (Z. 45)– … (weitere Grenzen noch zu ermitteln)

| Seiten  | Status        | Datei                          |
| ------- | ------------- | ------------------------------- |
| 1–19    | ⏭ übersprungen (Vorwort/Grammatik/OCR unbrauchbar) | — |
| 20–24   | ✅ kuratiert (A, „Aasig"–„Anjeetert") | words-meyer-01-a1.json |
| 25–30   | ✅ kuratiert (A, „Anjehn"–„Azteke") | words-meyer-02-a2.json |
| 30–41   | ✅ kuratiert (B, „Baa"–„Buxter") | words-meyer-03-b1.json |
| 41–42   | ✅ kuratiert (C, „Casus"–„Cottbus") | words-meyer-04-c.json |
| 42–49   | ✅ kuratiert (D, „Dabehalten"–„Duzel") | words-meyer-05-d.json |
| 49–53   | ✅ kuratiert (E, „Ebend"–„Ertern") | words-meyer-06-e.json |
| 53–59   | ✅ kuratiert (F, G — G ist im Buch extrem kurz) | words-meyer-07-fg.json |
| 59–66   | ✅ kuratiert (H, I — S. 63 stark OCR-beschädigt) | words-meyer-08-hi.json |
| 66–76   | ✅ kuratiert (J, sehr lang — 10 Seiten, viele „Je-"/„Ge-"-Partizipien) | words-meyer-09-j.json |
| 76–90   | ✅ kuratiert (K, sehr lang — 14 Seiten, in 2 Dateien) | words-meyer-10-k1.json, words-meyer-11-k2.json |
| 90–95   | ✅ kuratiert (L) | words-meyer-12-l.json |
| 95–102  | ✅ kuratiert (M) | words-meyer-13-m.json |
| 102–105 | ✅ kuratiert (N) | words-meyer-14-n.json |
| 105–108 | ✅ kuratiert (O) | words-meyer-15-o.json |
| 108–116 | ✅ kuratiert (P, „Packaje"–„Prüschen") | words-meyer-16-p1.json, words-meyer-17-p2.json |
| 115–116 | ✅ kuratiert (Q, sehr kurz) | words-meyer-18-q.json |
| 116–121 | ✅ kuratiert (R, S. 116 Mitte bis S. 121 oben — stark OCR-beschädigt, R häufig als „N" gelesen) | words-meyer-19-r1.json, words-meyer-20-r2.json |
| 121–139 | ✅ kuratiert (S, sehr lang — 18 Seiten, in 3 Dateien) | words-meyer-21-s1.json, words-meyer-22-s2.json, words-meyer-23-s3.json |
| 139–142 | ✅ kuratiert (T) | words-meyer-24-t.json |
| 142–145 | ✅ kuratiert (U) | words-meyer-25-u.json |
| 145–150 | ✅ kuratiert (V) | words-meyer-26-v1.json, words-meyer-27-v2.json |
| 151–155 | ✅ kuratiert (W) | words-meyer-28-w.json |
| 155     | ✅ kuratiert (X, sehr kurz) | words-meyer-29-x.json |
| 155–157 | ✅ kuratiert (Z) | words-meyer-30-z.json |
| 158–190 | ⏭ übersprungen (Anhang: thematische Wortlisten/Synonymgruppen, „Volkstümliche Namen von Restaurationen", Volksfeste, Kinderverse — kein Wörterbuchteil, keine Kopfwort+Definition-Struktur, passt nicht ins `LexikonEntry`-Schema; die meisten Einzelwörter darin sind ohnehin bereits im A–Z-Teil erfasst) | — |

**Wörterbuchteil A–Z vollständig kuratiert (S. 20–157).**

**Buchstabe A komplett** (S. 20–30): 258 neue Kandidaten in 2 Dateien, dry-run-validiert.
**Buchstabe B komplett** (S. 30–41): 251 neue Kandidaten in 1 Datei, dry-run-validiert.
**Buchstabe C komplett** (S. 41–42): 9 neue Kandidaten, dry-run-validiert.
**Buchstabe D komplett** (S. 42–49): 149 neue Kandidaten, dry-run-validiert. (Hinweis: beim ersten Schreibversuch wurden 8 mit dem Bestand kollidierende Wörter versehentlich als neu markiert und ein jq-Fehler hat die Datei kurz geleert — beides korrigiert, siehe Chat-Verlauf; die Datei ist jetzt sauber dry-run-validiert.)
**Buchstabe E komplett** (S. 49–53): 82 neue Kandidaten, dry-run-validiert. (5 Bestandskollisionen beim Schreiben passiert und sauber per jq-Filter mit Vorher/Nachher-Diff entfernt, siehe Chat-Verlauf.)
**Buchstabe F+G komplett** (S. 53–59): 136 neue Kandidaten, dry-run-validiert. (11 Kollisionen mit der **noch nicht importierten** Schlobinski-Datei `words-03-f.json` gefunden und entfernt — wichtige Erkenntnis, siehe Hinweis unten.)
**Buchstabe P komplett** (S. 108–116): 171 neue Kandidaten in 2 Dateien, dry-run-validiert. (8 Kollisionen mit den Schlobinski-Dateien `words-12-p1.json`/`words-13-p2.json` gefunden und entfernt: „Par Order di Mufti", „Pechhengst", „Pellen", „Penne", „Piejatz", „Piekfein", „Piepmatz", „Pietschen".)
**Buchstabe Q komplett** (S. 115–116): 30 neue Kandidaten, dry-run-validiert. (5 Kollisionen mit `words-13-p2.json`/`words-14-q.json` entfernt.)
**Buchstabe R komplett** (S. 116–121): 180 neue Kandidaten in 2 Dateien, dry-run-validiert. Quelltext stark OCR-beschädigt (R wird durchgehend als „N" gelesen, viele Buchstaben vertauscht) — Rekonstruktion konservativ, entsprechend weniger reiche Anekdoten als bei besser erhaltenen Buchstaben. (3 Kollisionen mit `words-15-r.json` entfernt: „Rausmachen, sich", „Riechkolben", „Rumboddern". Zusätzlich: JSON-Syntaxfehler durch falsch geschlossene „…"-Anführungszeichen in Q/R1/R2 nach dem Schreiben entdeckt und per Skript korrigiert — künftig auf korrektes Schließen mit “ statt " achten.)
**Buchstabe S komplett** (S. 121–139): mit Abstand längster Buchstabe bisher — 18 Seiten, 416 neue Kandidaten in 3 Dateien, dry-run-validiert. S ist in den Schlobinski-Dateien besonders dicht abgedeckt (`words-16-s1.json`/`words-17-s2.json`, 297 Wörter); 43 Kollisionen gefunden und entfernt (u. a. Schickse, Schote, Schrippe, Senge, Soff, Stampe, Stunk, Suffkopp — vollständige Liste in supplement-suggestions-meyer.md). Gleicher „…"-Anführungszeichen-Fehler wie bei Q/R erneut aufgetreten und per Skript korrigiert.
**Buchstabe T komplett** (S. 139–142): 117 neue Kandidaten, dry-run-validiert. (4 Kollisionen mit `words-18-t.json` entfernt: „Talpschen", „Totschick", „Triesel", „Tülle".)
**Buchstabe U komplett** (S. 142–145): 103 neue Kandidaten, dry-run-validiert. (3 Kollisionen mit `words-19-u-v.json` entfernt: „Umknixen", „Urig", „Üppig".)
**Buchstabe V komplett** (S. 145–150): 193 neue Kandidaten in 2 Dateien, dry-run-validiert. Sehr dichtes „ver-"-Präfixkapitel. (10 Kollisionen mit `words-19-u-v.json` entfernt: „Verkieken, sich", „Verkrümeln, sich", „Verpecken", „Verpimpeln", „Verpusten, sich", „Verschimpfieren", „Verschludern", „Verschmaddern", „Verschmeißen", „Vertobaken".)
**Buchstabe W komplett** (S. 151–155): 95 neue Kandidaten, dry-run-validiert. (1 Kollision mit `words-20-w.json` entfernt: „Wenn schon, denn schon".)
**Buchstabe X komplett** (S. 155): 3 Kandidaten (sehr kurz), dry-run-validiert, 0 Kollisionen.
**Buchstabe Z komplett** (S. 155–157): 61 neue Kandidaten, dry-run-validiert. (14 Kollisionen mit `words-21-z.json` entfernt: „Zanktippe", „Zaster", „Zauber", „Zerknautschen", „Zibbe", „Zicke", „Ziehe", „Ziepen", „Zille", „Zimt", „Zu", „Zuckeln", „Zumpel", „Zwitschern".)

**Gesamtergebnis: 5208 Einträge über alle Dateien (Schlobinski + Meyer 1904), 0 Validierungsprobleme im finalen Dry-Run. Wörterbuchteil A–Z (S. 20–157) vollständig kuratiert und importbereit.**

⚠ **Korrektur nach vollständigem Live-Abgleich (siehe unten): 5170 Einträge** —
38 zusätzliche echte Duplikate mit dem Live-Bestand gefunden und entfernt.

## Nachtrag: vollständiger Live-Abgleich deckt 38 übersehene Duplikate auf

Der bisherige Dedup-Check nahm an, `berliner-schnauze/get-words` sei durch das
WP-REST-`per_page`-Limit gedeckelt und liefere daher nur zuverlässig
Buchstaben A–I (1000 von 2544 Einträgen). Auf Nutzerhinweis wurde geprüft, ob
das wirklich eine harte Grenze ist — **war es nicht**: Die Ability akzeptiert
`per_page` ohne Obergrenze; ein einzelner Aufruf mit `per_page: 3000` lieferte
alle 2544 publizierten Einträge (zzgl. Prüfung auf `draft`/`pending`: 0
Treffer, also vollständig). Der komplette Abgleich aller 30
Meyer-Batchdateien (3429 Kandidaten) gegen diese vollständige Liste ergab 38
zusätzliche echte Kollisionen (23 exakt, 15 nur Groß-/Kleinschreibung), die
beim ursprünglichen A–I-Check unentdeckt blieben (v. a. Buchstaben J, K, M,
N, P, S, Z, die außerhalb der A–I-Abdeckung lagen, sowie ein paar
Groß-/Kleinschreibungsfälle bei A–D). Alle 38 wurden aus den Batchdateien
entfernt und in `supplement-suggestions-meyer.md` dokumentiert. Finaler
Dry-Run nach Korrektur: **5170 Einträge, 0 Validierungsprobleme.**

⚠ **Wichtige Dedup-Erkenntnis (ab Buchstabe H zu beachten):** Es gibt zwei getrennte Dedup-Quellen:
1. Live-WP-Bestand via `get-words` — `existing-words.txt`, deckt wegen `per_page`-Deckel (1000 von 2544) nur Buchstaben **A–I** ab.
2. **Noch nicht importierte** Schlobinski-Batches (`data/lexikon-import/words-01-d.json` … `words-21-z.json`, 1778 Wörter, decken A–Z ab, da bereits komplett kuratiert) — diese liegen im selben Ordner und werden vom Import-Skript **mitgeladen**, kollidieren also genauso wie Live-Wörter.
Kombinierte Liste liegt im Scratchpad als `master-dedup.txt` (2323 Einträge, deckt A–I aus dem Live-Bestand + A–Z aus Schlobinski ab). Für Buchstaben J–Z: Schlobinski-Abdeckung ist vollständig, Live-Bestand-Abdeckung fehlt — Restrisiko liegt beim Live-Check des Import-Skripts beim tatsächlichen Schreiben (paginiert vollständig, jeder echte Duplikat-Titel wird dort sicher übersprungen).

⚠ Vorsicht bei künftigen Batches: vor dem Schreiben jedes Wort explizit gegen `existing-words.txt` prüfen (nicht nur mental abgleichen) — bei D sind trotz vorherigem `comm`-Dedup-Check 8 bereits existierende Wörter versehentlich in die neue Datei gerutscht.

Dubletten-Check: live gegen bestehende WP-Titel (`berliner-schnauze/get-words`,
alle Status) zum Zeitpunkt der Kuratierung. Bereits existierende Kopfwörter →
`supplement-suggestions-meyer.md` statt Neuanlage.
