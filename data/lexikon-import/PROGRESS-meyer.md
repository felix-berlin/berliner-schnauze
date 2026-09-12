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
| 41–42   | ⏳ ausstehend (C, sehr kurz — s. Hinweis unten) | — |

**Buchstabe A komplett** (S. 20–30): 258 neue Kandidaten in 2 Dateien, dry-run-validiert.
**Buchstabe B komplett** (S. 30–41): 251 neue Kandidaten in 1 Datei, dry-run-validiert.

Hinweis: Meyer behandelt C sehr kurz — der Buchtext selbst sagt: „Andere Wörter mit C siehe unter K, S oder Z". Nur wenige echte C-Einträge zu erwarten (Casus, Champignon, Charlottenburjer, Chemische Leiter, Chor, ...), bevor D beginnt.

Dubletten-Check: live gegen bestehende WP-Titel (`berliner-schnauze/get-words`,
alle Status) zum Zeitpunkt der Kuratierung. Bereits existierende Kopfwörter →
`supplement-suggestions-meyer.md` statt Neuanlage.
