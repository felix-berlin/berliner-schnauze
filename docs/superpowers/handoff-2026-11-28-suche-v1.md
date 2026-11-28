# Handoff: Suche v1 (Stand 2026-11-28)

Branch `felix-berlin/new-search`, gepusht bis `fb05282e`. Plan: `docs/superpowers/plans/2026-11-27-suche-v1.md` (Tasks 1-14) und `2026-11-28-suche-v1-update.md` (Tasks 15-19). Spec: `docs/design/suche-v1/SPEC.md` (Teil A Suchseite, Teil B Schnellsuche).

## Fertig
- Tasks 1-14: Suchseite `/wort`, Filter, Mobile-Sheet, Chrome-KI, Header-Schnellsuche (alt), Altes entfernt, E2E/a11y. Final-Fix-Wave (13 Commits) + Index-Rundung (`00b04c00`).
- Update-Handoff eingearbeitet (`76c92202`).
- Task 15 Tablet 808-999 (`bd07cc22`, `8f8e3be7`).
- Task 16 Schnellsuche-Modell (`15dfa7b6`): `lib/search/quick.ts`, `composable/useSearchHistory.ts`.
- Task 17 Schnellsuche-Dialog (`8668c3ed`, `fb05282e`).
- Bugfix Footer vor Hydration (`322a3cfb`): HitList setzt bis zum Mount `height:auto`.

## Offen
1. Review der Tasks 16+17 lief (Opus) und lieferte noch nichts: Rulings zu Scrim-Blur 3px statt 2/4px, `quickContext` pro Seitensitzung gecacht, Enter während 120ms-Debounce, Firefox-Subpixel `toBe(44)`/`toBe(360)` in den Tablet-Tests, Header-Insel nicht auf der Startseite (Spec §18 verlangt Dialog über jeder Seite).
2. Task 18: KI-Zeilen im Dialog (`SemanticSearch` als Zeilen-Variante, §21.2/§21.4, Shift+Enter, nichts im Bundle ohne `LanguageModel`).
3. Task 19: Abnahme (E2E §27, axe, Visual), dann gezielter Re-Review `4323e3ca..HEAD`, Rulings-Liste, Abschlussbericht.
4. Danach Merge-Entscheidung.

## Entscheidungen für dich (Owner)
- Spec §26: Verlauf nur lokal, Maximalzahl (Platzhalter 10, `TODO(schnellsuche):`); Header-Suche mobil = Vollbild-Dialog; "Gerade beliebt" im Leerzustand (nur trend oder mit "Im Aufwind").
- Tablet: Container-Padding 32/24 aus §3.1 nicht angewendet (gemeinsamer 20px-Rand); Chips brechen bei aktivem Filter in zweite Zeile.
- Index-Größe: mit Umfrage-Shares ungewiss, Anteile sind auf 3 Stellen gerundet; echte Größe erst mit Produktionsdaten messbar.
- Nested-interactive in Trefferzeile (axe teilweise deaktiviert), Buchstaben-h2 mit `role=none`, Highlight ß/ss.
- Start-/Redewendungen-Links: Seed zeigt auf `/wort?thema=redewendungen-sprueche`; die Produktions-CMS-Startseite musst du selbst anpassen.

## Arbeitsweise
- Subagent-driven: Implementer, dann Review, dann Fix-Runde; Ledger lokal in `.superpowers/sdd/2026-11-27-suche-v1/` (gitignored, geht NICHT auf den anderen Rechner: progress.md, Reports, Briefs).
- Token sparen: Sonnet/Haiku für Implementer, keine Review pro Task außer dem Gesamt-Re-Review.
- E2E: Wegwerf-DB, `NODE_ENV=production`, nie Payload-Schema-Push-Prompt beantworten. `docs/claude/website-e2e.md` lesen.
- Nichts mit Produktionsnamen in Tests. Code englisch, UI-Texte deutsch.
