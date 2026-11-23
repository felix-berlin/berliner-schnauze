# Wortseite v18 „Mitmachen an Ort und Stelle“: Umsetzungsdesign

Stand: 2026-11-22. Gilt zusammen mit dem Handoff `wortseite-v18-handoff_new.zip` (`SPEC.md` ist der verbindliche Stand für Design, Texte und Maße; `PROMPT.md` die Regeln). Dieses Dokument legt fest, **wie** umgebaut wird und was entschieden ist. Es wiederholt die SPEC nicht.

## Intent

`/wort/<slug>` bekommt ein neues Design, das alte entfällt komplett. Die Seite wird von einer Einzelperson betrieben und soll Besucher (meist mobil, über die Suche) das Wort verstehen lassen und zum Mitmachen an der Stelle einladen, an der der Inhalt steht. Kommentare werden zu Jeschichten, neu sind O-Ton, Formulare je Karte, Meldungen, Zitieren und ein neues Umfrage-Ergebnis.

## Goals

- Wortseite exakt nach SPEC v18 in drei Layouts: mobil `< 808px`, Tablet `808–999px`, Desktop `≥ 1000px`.
- Backend nach SPEC §18: neue `suggestions`-Typen, Collection `reports`, neue `words`-Felder.
- Bestehende Kommentare werden zu Jeschichten (gleiche Collection `comments`, kein Kopieren).
- Eine `ContributeForm.vue` für alle fünf Formulare.
- Tests nach SPEC §22.

## Non-goals

- Kein Bild-Formular. Die „Bild hinzufügen“-Kachel wird ausgeblendet.
- Kein Audio-Einsprechen. Der Button bleibt `aria-disabled` mit Tooltip.
- Keine Unterseite `/wort/{slug}/jeschichten`.
- Keine Änderung der Umfrage-Antwortstufen oder ihrer Speicherung.
- Keine Variante B „Randnotizen“.

## Anti-goals

- Texte mit „wir/uns/unser/wa“ oder „mit Quellen belegt“.
- Daten oder Texte aus der Produktions-Datenbank in Tests, Fixtures, Storybook (die Dev-Datenbank ist ein Prod-Backup).
- Orange außerhalb SPEC §4.1, Text unter 13px (Ausnahme SVG-Bezirkskarte), Emojis, Fraktur.
- Ein Zwischenstand auf `main`, der Prod bricht.

## Constraints

- Prod-Reihenfolge: CMS migriert vor Web (Expand/Contract, `payload/CLAUDE.md`). Alles Löschende kommt erst im letzten PR.
- Migrationen müssen umkehrbar sein (`down`).
- Frontend-Umsetzung läuft jedes Mal über den Skill `modern-web-guidance` (Browser-Floor: `docs/superpowers/specs/2026-11-13-design-system-design.md` §9).
- Footer v21 und Kalle (`BerlinerBaer.vue`) existieren schon und werden wiederverwendet.
- Code, Kommentare, Bezeichner, Tests und Commits sind Englisch, nur UI-Texte Deutsch.
- Offene Punkte aus der SPEC, die noch nicht entschieden sind, bekommen `TODO(wortseite):`.

## Approaches

|                 | Beschreibung                                              | Abwägung                                                                                                                      |
| --------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **A** (gewählt) | Zuerst Vertrag und Daten, danach Oberfläche, in fünf PRs. | Prod bleibt intakt, parallelisierbar. Mehrere Zwischenstände auf `main`.                                                      |
| B               | Senkrecht, Karte für Karte.                               | Jeder Schnitt einzeln prüfbar, aber alte und neue Seite laufen lange nebeneinander und die Formular-Basis muss zuerst stehen. |
| C               | Ein großer Zweig.                                         | Schnell, aber ein riesiger Review.                                                                                            |

Gewählt wurde A, weil Prod bis zum Schluss unverändert bleibt und sich die Arbeit auf Subagents verteilen lässt.

## Entscheidungen

Zu den offenen Punkten der SPEC §21 (Stand der neuen Version, sieben Punkte):

1. **„Alle {n} Jeschichten lesen“:** Aufklappen an Ort und Stelle, keine Unterseite.
2. **Netzplan ab 5 Wörtern:** die vier mit der Beziehungsreihenfolge gleich, Gegenteil, verwandt, Redewendung, dann alphabetisch. Der Rest steht als Liste darunter.
3. **Bild-Kachel:** ausblenden.
4. **Nutzungsrecht:** entfällt. Es gibt keine Checkbox und keinen Text dazu (SPEC §13 und §21.4 sind damit erledigt).
5. **Frage der Woche:** globales Payload-Feld, Standardtext `Wo haste „{Wort}“ zuletzt jehört?`, wenn leer.
6. **Ergebnis „Sag ick selbst“ (bestätigt):** Wohnort zeigt Ost, West, Umland: Ost/West aus der Hälften-Antwort (`HALVES`, „both“ zählt nicht mit), Umland aus dem Wohnort `brandenburg`. Alter zeigt **alle 8 Stufen** von `AGES` (u20 bis 80plus), nicht die drei Gruppen aus dem Mock. Keine Schema-Änderung. Die Regel „nur Gruppen ab 10 Stimmen“ gilt je Zeile, einzelne Altersstufen können also entfallen.
7. **Kommentare = Jeschichten, dieselbe Collection.** `comments` wird weiterverwendet (kein `stories`, keine Kopie): Moderationsstatus, Texte und Autoren bleiben, keine zweite Prüfung. Neue Felder `bezirk` und `featured` (O-Ton). Pseudonyme werden in der Anzeige zu „aus der Community“ (v18 hat keine Zufallsnamen, SPEC §13). Neue Jeschichten starten `pending` (vor Veröffentlichung geprüft), bestehende Kommentare bleiben `published`. `comment-votes` trägt die Reaktionen: die Werte +1/−1 behalten ihre Bedeutung („Hilfreich“ / „Nich hilfreich“), nur die Beschriftung wird „Jenau!“ / „Kenn ick anders“; bestehende Votes und `score` bleiben. `comment-reports` trägt die Meldungen zu einzelnen Jeschichten.
8. **Tablet:** nach SPEC §3 (Desktop-Basis mit Overrides, sticky Pillenleiste).
9. **Stimme löschen:** Es gibt bisher nur „Stimme zurückziehen“ (löscht nur `usage`) und „Alle meine Antworten löschen“ (alle Wörter). Neu: `DELETE ?word=<slug>` löscht Stimme und Profilangaben dieses Geräts für dieses Wort (SPEC §7.4). Das globale Löschen bleibt.
10. **Buch und Thema:** Die Zuordnung liegt in Payload: jedes Buch im Global `affiliate` bekommt `themen`; das Buch des ersten Themas des Worts wird gezeigt, ohne Treffer entfällt der Block.
11. **Ost/West:** aus `half` (nur bei „uffjewachsen“ gesetzt), Umland aus `brandenburg`.
12. **Neue `suggestions`-Typen** nutzen `targetWord`, nicht `word` (Sperrschlüssel).
13. **Trend:** nur „Gerade beliebt“ (Top 10 der Woche); „Im Aufwind“ hat noch keine Daten (`TODO(wortseite):`).

## Calls made by the author after the builder check (not yet confirmed by the owner)

- **Jeschichten reuse `comments`.** No `stories` collection, no copy migration. `suggestions` gets only `example`, `fact` (`kind`) and `related` (`relation`); `berlinerWord`/`translation` become conditional on the type, and a free-text `related` entry has its own text field. Deviates from SPEC §13/§18, which lists `story` as a suggestion type.
- **Replies (`parent` set) are not shown.** The Jeschichten list shows top-level rows only; replies stay in the collection untouched and are removed with the rest of the old code path in PR 5, after an export. New input is limited to 500 characters (SPEC §13); existing rows up to 1000 stay valid and are shown as they are.
- **Reactions reuse `comment-votes`** with unchanged values and meaning; only the labels change (owner decision after PR 0).
- **No half-built page on `main`:** PR 3 and 4 add the new components beside the old ones. The page route switches to the new page in the last of the two PRs. Until then the old `/wort/<slug>` stays live.
- **Trend and Wort des Tages:** `api/trending.ts`, `api/word-of-the-day.ts` and `WordStats.views` exist. Badges are built on them; if a value (for example the weekly change) is missing, the badge is left out and a `TODO(wortseite):` marks it.
- **Book for „Zum Weiterlesen“:** mapping lives in Payload (`affiliate.books[].themen`), see decision 10.

## Aufteilung in PRs

Jeder PR hat einen eigenen Zweig. PR 0 ist reines Lesen.

0. **Bestandsaufnahme** (Dokument, kein Code): was bleibt, was wird umgebaut, was fällt weg (SPEC §1), Ist-Stand der Felder aus §18, Altersgruppen, Löschen. Wird mir gezeigt, bevor etwas gelöscht wird.
1. **Daten:** Typen für §18, additive Migrationen (`reports`, neue `suggestions`-Typen mit `kind`/`relation`, neue `words`-Felder, globales Feld „Frage der Woche“, `bezirk` und `featured` an `comments`). Alle `down` getestet.
2. **API und Services:** Endpunkte für Formulare, Reaktionen, Meldungen, Jeschichten (aus `comments`), Ergebnis (Gruppen mit weniger als 10 Stimmen entfallen, Punkte = `round(pct / 5)`), Wort-Service liefert das Modell aus §18.
3. **Seitenhülle (Astro):** `WordPage`, `WordHead`, Karten mit Lücken, Netzplan, Analyse, Tablet-Pillenleiste, Mobil-Aktionsleiste, Footer-Slot `buch`.
4. **Islands (Vue):** `ContributeForm` (mit Store für „nur ein Formular offen“), `WordPoll` (Ergebnis, Ändern, Löschen), `WordStories` (Reaktionen, Aufklappen), `WordActions` (Mehr-Menü, Zitieren), `WordBadges`, `WordReport`, `WordToc`.
5. **Aufräumen:** alte Komponenten und Kommentar-UI (die Collections `comments`, `comment-votes`, `comment-reports` bleiben), Antworten (`parent`) nach Export, Doku (`website/CLAUDE.md`, `payload/CLAUDE.md`), `docs/design/wortseite`.

PR 3 und 4 können parallel zu PR 2 laufen, sobald PR 1 den Vertrag festlegt. PR 5 erst, wenn 1–4 auf `main` sind und die Migration in Prod gelaufen ist.

## Tests

SPEC §22: Unit (Zitierformate, Ergebnis-Gruppen, Lücken-Logik, `ContributeForm`, Textverbot-Snapshot), E2E (Umfrage komplett, Menü, 390px, Tastatur, reduced motion, Tablet 834px), visuell gegen `assets/v18/boards` bei 390, 834 und 1280 in beiden Themes, axe ohne Verstöße.

## Dem Builder überlassen

Innere Struktur der Komponenten, Namen der Felder und Collections im Detail, Reihenfolge innerhalb eines PR, Zuordnung der alten Votes zu den neuen Reaktionen, Clipboard- und Offline-Fallbacks nach SPEC §15, Kosmetik der Pillenleiste.
