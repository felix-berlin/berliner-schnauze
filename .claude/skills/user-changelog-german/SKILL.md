---
name: user-changelog-german
description: Use when creating a human-readable German changelog for non-technical end users of berliner-schnauze.wtf from a GitHub PR or version entry in CHANGELOG.md. Triggers on requests like "schreib einen User-Changelog", "menschenlesbarer Changelog", "Changelog für meine User", or any changelog task targeting non-developers. Supports args: a version number, "latest", "aufholen" (generate all missing changelogs), "update" (re-apply current schema to existing files).
argument-hint: "[version|latest|aufholen|update]"
---

# User-Changelog auf Deutsch (Non-Technical)

## Zweck

Technische Commit-Listen aus CHANGELOG.md oder GitHub-PRs in verständliche, nutzerorientierte Release-Notes auf Deutsch übersetzen — für Menschen, die nicht programmieren.

## Argumente

Der Skill nimmt ein optionales Argument, das den Modus bestimmt:

| Argument | Verhalten |
|---|---|
| *(leer)* oder `latest` | Changelog für die neueste Version in CHANGELOG.md schreiben |
| `x.y.z` (z. B. `3.41.0`) | Changelog für genau diese Version schreiben |
| `aufholen` | Alle fehlenden Changelogs nachziehen (siehe unten) |
| `update` | Bestehende Changelog-Dateien ans aktuelle Schema anpassen (siehe unten) |

### Modus `aufholen`

Lücken schließen: Versionen in CHANGELOG.md mit vorhandenen Dateien in `docs/user-changelog/` abgleichen.

1. Alle Versionsnummern aus CHANGELOG.md extrahieren (`# [x.y.z]`-Überschriften)
2. Mit `docs/user-changelog/v*.md` vergleichen — fehlende Versionen ermitteln
3. Für jede fehlende Version einen Changelog schreiben, **chronologisch von alt nach neu** — so bauen Titel-Variation und Themenbezüge sinnvoll aufeinander auf
4. Versionen, bei denen nach dem Clustering nichts Nutzersichtbares übrig bleibt (z. B. reine Patch-Releases mit CI-/Build-Fixes), **überspringen** und am Ende auflisten — eine leere Seite mit nur "Verbesserungen im Hintergrund" bringt niemandem was
5. Am Ende zusammenfassen: welche Dateien erstellt, welche Versionen übersprungen und warum

### Modus `update`

Für den Fall, dass sich das Schema geändert hat (Frontmatter-Felder, Titel-Regeln, Formatvorgaben): bestehende Dateien in `docs/user-changelog/` ans aktuelle Format anpassen — **ohne den redaktionellen Inhalt neu zu schreiben**.

1. Jede Datei in `docs/user-changelog/` gegen das aktuelle **Ausgabeformat**, die **Titel**-Regeln und die **Qualitätsprüfung** dieses Skills prüfen
2. Nur reparieren, was vom Schema abweicht: fehlende/falsche Frontmatter-Felder, verbotene H1/Datum-Zeilen im Inhalt, Titel nach altem Muster
3. Fließtext und Bullet-Inhalte unangetastet lassen — die wurden bewusst so geschrieben; beim Titel-Neuschreiben den Aufhänger aus dem vorhandenen Inhalt der Datei ableiten
4. Am Ende pro Datei auflisten, was geändert wurde — und welche Dateien schon konform waren

## Quellen

1. **GitHub PR lesen** — `mcp__plugin_github_github__pull_request_read` mit `method: get` für Titel, Beschreibung, Merge-Datum
2. **CHANGELOG.md lesen** — den vollständigen Versionsabschnitt (`# [x.y.z]` bis zur nächsten Überschrift) für alle Commits

## Clustering — Commits gruppieren

Technische Scopes auf nutzersichtbare Themen abbilden:

| Technische Scopes | Nutzerfreundliche Gruppe |
|---|---|
| `game`, `bon` | Spiel-Bereich (z. B. "Berliner oder Nicht") |
| `word-page`, `word-*`, `component` | Wort-Detailseite |
| `toast` | Hinweis-Meldungen |
| `pwa`, `sw` | App-Verhalten / Updates |
| `a11y`, `seo`, `styles`, `build` | "Verbesserungen im Hintergrund" |
| `dropdown`, `tooltip` | Bedienelemente |

Commits ohne sichtbare Nutzerwirkung (`test`, `ci`, `docs`, `fix: formatting`) **weglassen**.

## Ausgabeformat

Die Datei beginnt immer mit YAML-Frontmatter — diese Felder werden von der Astro Content Collection für die `/changelog/{version}`-Seite ausgelesen. H1-Heading und Datum-Zeile **nicht** in den Markdown-Inhalt schreiben — das Template rendert sie aus dem Frontmatter.

```markdown
---
version: "x.y.z"
releaseDate: "YYYY-MM-DD"
title: "[Aufhänger aus dem Release-Schwerpunkt] (Version x.y.z)"
description: "[1 Satz Zusammenfassung — erscheint auf der Übersichtsseite /changelog]"
---

[1–2 Sätze Zusammenfassung des Update-Schwerpunkts]

---

## [Hauptthema 1]

[Fließtext: Was kann der Nutzer jetzt tun, was vorher nicht möglich war?]

- Bullet-Liste mit konkreten Vorteilen aus Nutzersicht
- Kein Fachjargon (kein "refactored", "hydration", "SSR")

---

## [Hauptthema 2]
...

---

## Verbesserungen im Hintergrund

- Kleinere Fehlerbehebungen und technische Optimierungen als einfache Liste
```

**Frontmatter-Felder:**

| Feld | Inhalt |
|---|---|
| `version` | Versionsnummer als String, z. B. `"3.35.0"` (kein `v`-Prefix) |
| `releaseDate` | ISO-Datum, z. B. `"2026-06-27"` |
| `title` | Individueller Aufhänger pro Release — siehe **Titel** unten |
| `description` | 1 kurzer Satz für die Übersichtsseite — keine technischen Details, Nutzersprache |

## Titel

Kein festes Schema — die Übersichtsseite `/changelog` hat bereits die H1 "Was ist neu?", darunter wird jeder `title` gelistet. Wenn jeder Eintrag mit "Was ist neu in Version…" beginnt, liest sich die Liste wie ein kaputter Kopierer. Stattdessen:

- **Aufhänger aus dem größten sichtbaren Feature des Releases** — der Titel soll neugierig machen, was drin ist
- **Versionsnummer immer enthalten** — als Anker in der Übersichtsliste und im OG-Title beim Teilen. Position flexibel: vorne, hinten, in Klammern
- **Kurz halten** (~60 Zeichen) — der Titel ist auch `opengraphTitle`
- **Ton wie der Rest**: locker, direkt, gern mit Berliner Schnauze — aber kein Clickbait
- **Satzbau variieren** gegenüber den letzten Einträgen (vorher in `docs/user-changelog/` nachschauen) — nicht drei Releases hintereinander dasselbe Muster

**Beispiele:**

```
feat-Schwerpunkt: Spenden-Seite + Footer-Umbau
→ "Spendieren jeht jetzt — Version 3.38.0"

feat-Schwerpunkt: Haptik + Animationen im BON-Spiel
→ "Version 3.35.0: Det Spiel vibriert jetzt richtig"

Nur kleine Fixes, kein großes Feature
→ "Feinschliff überall (Version 3.36.0)"
```

## Sprache & Ton

- **Ich-Form** — Felix schreibt als Einzelentwickler: "Ich habe… gebaut", "Ich habe… eingebaut", "Ich habe… neu gemacht"
- Kein "Wir" — Felix ist allein der Entwickler
- **Ton: locker, direkt, erfahren** — kein Grundschul-Deutsch, kein trockener Feature-Listen-Stil. Schreiben wie ein Entwickler der einem Freund erzählt was er gebaut hat. Leichtes Denglish ist willkommen wenn es natürlich klingt: "swipen", "sharen", "Redesign", "buggy", "Stacking", "Sidebar", "Sections", "straight forward". Umgangssprache die jeder versteht: "hat mich genervt", "täuscht sich schnell", "ehrlich gesagt". Nicht übertreiben — es soll authentisch klingen, nicht wie forciertes Jugendsprech.
- Leser werden nicht direkt angesprochen ("du") — stattdessen unpersönlich: "lässt sich", "kann man", "gibt es", "geht"
- Datum niemals mit Zahl beginnen (`27. Juni…` → `Veröffentlicht am 27. Juni…`) — sonst Markdown-Linter-Fehler (MD029)
- Technische Begriffe erklären, nicht ersetzen: "haptisches Feedback (Vibration)"
- Kein Entwicklerjargon: kein "commit", "refactor", "SSR", "hydration", "chunk"
- Emojis nur wenn explizit gewünscht

## Humanizer-Pass (vor dem Speichern)

Jeden neu geschriebenen Entwurf (Modi `latest`, Versionsnummer, `aufholen`) vor dem Speichern einmal gezielt auf KI-Schreibmuster durchgehen. Warum: Die Release-Notes leben von der Ich-Erzähler-Authentizität — ein einziger generisch klingender Absatz kippt den ganzen Eintrag. Modus `update` ist ausgenommen, dort wird redaktioneller Inhalt nicht angefasst.

**Diese Muster rausschreiben:**

1. **Gedankenstriche (`—` und `–`) komplett vermeiden** — das zuverlässigste KI-Erkennungszeichen. Ersetzen durch Komma, Punkt (neuer Satz), Doppelpunkt oder Klammern. Vor dem Speichern per Suche prüfen: kein einziges `—`/`–` im fertigen Text, auch nicht im `title`.
2. **Wiederholte Sprach-Tics über Einträge hinweg.** Vor dem Schreiben die letzten 2–3 Dateien in `docs/user-changelog/` überfliegen: Taucht eine Wendung ("ehrlich gesagt", "hat mich genervt", "war überfällig") dort schon auf, eine andere Formulierung wählen. Ein Mensch wiederholt sich mal, aber nicht mit derselben Phrase in jedem Release.
3. **Kein Warm-up-Satz nach der Überschrift.** "Die Suche hat mehrere Verbesserungen bekommen:" unter "## Suche aufpoliert" sagt nichts — direkt mit dem Inhalt anfangen.
4. **Keine erzwungenen Dreierreihen.** Zwei Punkte sind zwei Punkte, vier sind vier. Aufzählungen nicht auf drei glattbügeln.
5. **Fragmente zu echten Sätzen machen.** Angehängte Strich-Fragmente ("Links reagieren schneller — kein Warten mehr") als vollständigen Satz mit Subjekt schreiben.
6. **Werbedeutsch dämpfen.** "blitzschnell", "nahtlos", "spürbar verbessert" durch konkrete Aussagen ersetzen: Was genau passiert jetzt anders?
7. **Kein generisch-positiver Schlusssatz** ("Viel Spaß beim Entdecken!"). Der letzte Punkt ist einfach der letzte Inhaltspunkt.
8. **Satzlängen mischen.** Kurzer Satz. Dann einer, der sich Zeit nimmt und einen Nebengedanken mitnimmt. Gleichförmige mittellange Sätze wirken generiert.

**Nicht wegbügeln (das ist Stimme, kein Muster):** Denglish ("swipen", "sharen", "hovered"), Meinung und Genervtsein, Umgangston, unvollständige Sätze als bewusstes Stilmittel ("Gab's vorher nicht, war aber überfällig."). Im Zweifel klingt der Text lieber etwas ruppig als glattpoliert.

## Speicherort

```
docs/user-changelog/v{VERSION}.md
```

## Beispiel-Mapping

```
fix(bon): defer correct-answer toast one rAF to avoid mobile compositor flash
→ weglassen (kein sichtbarer Nutzereffekt)

feat(game): add haptic vibration feedback via useVibrate
→ "Haptisches Feedback (Vibration) auf Smartphones bei richtigen und falschen Antworten"

fix(sidebar): scroll active nav tab into view on mobile
→ "Verbesserungen im Hintergrund: Seitenleisten-Navigation auf mobilen Geräten verbessert"
```

## Qualitätsprüfung vor dem Speichern

- [ ] Frontmatter vorhanden mit allen 4 Pflichtfeldern: `version`, `releaseDate`, `title`, `description`
- [ ] `version` ohne `v`-Prefix (z. B. `"3.35.0"`, nicht `"v3.35.0"`)
- [ ] `releaseDate` im ISO-Format `"YYYY-MM-DD"`
- [ ] `title` beginnt NICHT mit "Was ist neu" — individueller Aufhänger mit Versionsnummer, anderes Muster als die letzten Einträge
- [ ] Kein `# Was ist neu...` H1-Heading im Markdown-Inhalt (kommt aus Frontmatter)
- [ ] Kein `**Veröffentlicht am...**` im Inhalt (rendert das Astro-Template)
- [ ] Kein einziger technischer Term aus dem CHANGELOG übernommen
- [ ] Jede Funktion aus Nutzerperspektive beschrieben ("was kann ich damit tun?")
- [ ] Abschnitt "Verbesserungen im Hintergrund" für unsichtbare Fixes
- [ ] Humanizer-Pass gelaufen (bei neu geschriebenem Inhalt) — inkl. Suche nach `—`/`–`: null Treffer
- [ ] Gespeichert unter `docs/user-changelog/v{VERSION}.md`
