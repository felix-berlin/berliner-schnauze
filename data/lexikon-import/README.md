# Berlinisch-Lexikon Import (Schlobinski)

Kuratierte Wörter aus dem SDLS/Schlobinski „Berlinisch Lexikon" (Spreeradio 1995,
PDF→Markdown-Konvertierung), ab dem Eintrag **nach „Dampf"** — alles davor wurde
bereits manuell in WordPress gepflegt.

## Dateien

- `words-<buchstabe(n)>.json` — kuratierte Einträge, Format siehe `LexikonEntry`
  in `scripts/import-words-to-wp.ts`
- `PROGRESS.md` — bis zu welcher Quellzeile kuratiert wurde (für Fortsetzung)
- `skipped.md` — übersprungene Passagen/Einträge mit Begründung

## Kuratierungsregeln

- Quelle ist ein zweispaltiges PDF; die Markdown-Konvertierung hat Spalten
  teils verschachtelt und Einträge mitten im Satz zerrissen. Jeder Eintrag
  wurde daher inhaltlich geprüft (passt die Übersetzung zum Wort?) und ggf.
  aus getrennten Fragmenten wieder zusammengesetzt.
- `translations`: kurze hochdeutsche Entsprechungen (eine pro Repeater-Zeile),
  keine Erklärtexte.
- `examples`: Originalzitate aus »…«-Anführungen; Erklärung des Beispiels in
  `explanation`, wenn die Quelle eine liefert.
- `infoText`: Etymologie/Hintergrund aus der Quelle (gekürzt).
- `themen`: Slugs aus `scripts/lib/word-category.ts` (12 erlaubte Kategorien);
  leer, wenn kein Thema passt.
- Kreuzverweise („Ø anderes Wort") ohne eigene Bedeutung, Metatext (Seitenzahlen,
  Kolumnentitel) und reine Grammatik-Hinweise wurden übersprungen → `skipped.md`.

## Import

```bash
infisical run -- pnpm tsx scripts/import-words-to-wp.ts --dry-run   # Vorschau
infisical run -- pnpm tsx scripts/import-words-to-wp.ts             # als Entwürfe
infisical run -- pnpm tsx scripts/import-words-to-wp.ts --publish   # direkt publiziert
```

Das Script überspringt Wörter, deren Slug in WP bereits existiert (egal ob
publish/draft) — Doppel-Importe und Überschneidungen mit dem Bestand sind
damit ausgeschlossen.
