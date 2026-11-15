# Audit-Fixes: Fahrplan

Quelle: `docs/audit-2026-11-13.md` (Stand `92e7d19a`). Geprüft gegen HEAD `4d047f98` am 2026-11-14: Alle bestätigten Befunde sind noch offen; CI-01 ist teilweise erledigt (Stylelint und `tokens:check` prüfen ohne `--fix`).

**Ziel:** Alle bestätigten Befunde (High/Medium und die Low-Tabelle) Schritt für Schritt abarbeiten, ohne jeden Schritt neu zu planen. Nicht verifizierte Punkte (SEC-06, DATA-01) bleiben außen vor.

**Arbeitsweise (meine Setzung, korrigierbar):**

- Ein Schritt = ein in sich geschlossener Commit (oder wenige), Conventional Commits.
- Schritte 1–9 sind klein (S): direkt umsetzen, ohne eigenen Plan. Logik mit Verzweigung bekommt einen Test (TDD).
- Schritte 10–15 sind M oder größer: Beim Start eine kurze Klärung und ein eigener Plan, eigener Branch.
- Schritte 1–9 liefen auf `felix-berlin/audit-quick-wins` (PR #1881, gestapelt auf #1880).
- Alles, was du selbst tun musst (Infisical, GitHub, Komodo-Deploy), sammelt sich in Schritt 16 ganz am Ende. Die Schritte davor erledigen nur den Teil im Repo und blockieren nicht auf dich.
- Fortschritt: Checkliste unten (wird nach jedem erledigten Schritt abgehakt, mit Commit-Hash) und claude-mem-Liste `audit-fixes`.

## Stand

- [x] 1. SEC-01 (`549ef857`)
- [x] 2. BUG-01, BUG-02 (`c840d894`)
- [x] 3. BUG-03, BUG-04, BUG-05 (`e992fdc9`)
- [x] 4. CI-01 (`2d40989b`, `b2dbc20f`; oxfmt ignoriert jetzt `data/`, Migrationen, generierte Payload-Dateien, Design-Mocks und `pnpm-workspace.yaml`)
- [x] 5. CI-03, CI-05, CFG-05 (`a858eb39`)
- [x] 6. SEC-03, SEC-04, SEC-05 (`7e67742d`)
- [x] 7. PERF-02 (`725f1aee`)
- [x] 8. CFG-01–04, DX-01–03, MAINT-02 (`e9fa34fd`; CFG-01 als Startprüfung im Server statt `validateSecrets`, das auch den Build ohne Secrets bräche; MAINT-02: `@nanostores/logger` und `@vue/devtools-api` sind optionale Peers der Devtools und bleiben; `MCP_DISABLED=false` in `.env.example` ergänzt)
- [x] 9. A11Y-01–04 (`76753464`)
- [x] 10. DEP-01 (49 → 23 Advisories, prod 41 → 23; offen nur zod 3.x im Codecov-Build-Plugin, ein Major-Sprung per Override wäre riskanter als die Lücke; `MCP_DISABLED` in `payload/README.md` dokumentiert)
- [ ] 11. CI-02, CI-04 (Repo-Teil)
- [ ] 12. PERF-01
- [ ] 13. SEC-02
- [ ] 14. MAINT-01
- [ ] 15. OPS-01 (zurückgestellt)
- [ ] 16. Deine Schritte

## Kleine Schritte (S)

### 1. SEC-01: `GET //` darf den Prozess nicht beenden

- `website/server/index.mjs:55`: URL-Parse in `try/catch`, bei Fehler `400`.
- Test: Request mit `//` (bzw. ungültiger URL) liefert 400, Prozess lebt. Wenn ein Unit-Test am Einstieg zu teuer ist, Fall in `website/scripts/docker-smoke.sh` ergänzen.

### 2. BUG-01 + BUG-02: Tastenkürzel nicht in Eingabefeldern

- `SearchModalTrigger.vue:44-53`: früh zurück, wenn das Ziel editierbar ist (`input`, `textarea`, `select`, `[contenteditable]`).
- `WordList.vue:122-135`: Pfeiltasten und Enter nur, wenn das Ziel nicht editierbar ist (Ausnahme: die Sucheingabe selbst) bzw. auf Suchfeld und Liste begrenzt.
- Ein gemeinsamer Helfer `isEditableTarget(e)` nur, wenn er an beiden Stellen gleich passt.
- Tests: Unit-Tests für beide Handler; im Browser gegenprüfen (deutsches Layout: Shift+7).

### 3. BUG-03, BUG-04, BUG-05: Client-Robustheit

- `stores/modal.ts`: Reset-Timer merken, in `open()` löschen.
- `services/pwa.ts:14`, `SetColorMode.astro:11`: Storage-Zugriff in `try/catch`.
- `stores/wordOfTheDay.ts:62-69`: Tageswechsel nach Berliner Zeit (`payload/src/lib/berlinDay` wiederverwenden), Countdown lädt bei 0 neu.
- Tests je Fix.

### 4. CI-01: CI soll scheitern statt reparieren

- `lint:js:check` ohne `--fix` (analog zu `lint:style:check`), in `ci.yml` statt `lint:js`.
- Payload-Lint und `pnpm format:check` in die CI.
- Einmal `pnpm format` als eigener `style`-Commit (rund 197 Dateien), vorher prüfen, dass nur Formatierung ändert.

### 5. CI-03, CI-05, CFG-05: CI-Lieferkette und Prod-Werte

- `anki-release.yml`: `genanki` mit Hash pinnen bzw. vor dem Infisical-Schritt installieren.
- `playwright.yml`: E2E immer gegen Infisical `staging`.
- Drittanbieter-Actions (Infisical, Sentry, Codecov) auf Commit-SHA pinnen; Renovate-Regel prüfen (`.claude/rules/renovate.md`).

### 6. Server-Kleinkram: SEC-03, SEC-04, SEC-05

- SEC-03: Turnstile bekommt dieselbe IP wie das Rate-Limit (letzter X-Forwarded-For-Eintrag), ein Helfer für beide.
- SEC-04: Bidi-/Formatzeichen aus Kommentartext und -name entfernen, mit der vorhandenen BON-Namenslogik.
- SEC-05: `scripts/prod-curl.sh` setzt Proxy- und CA-Variablen zurück.
- Tests für SEC-03/04.

### 7. PERF-02: Indizes für `bon_games`

- Index auf `visitor` und `finished_at` in `payload/src/collections/BonGames.ts`, Migration erzeugen (Regeln: `.claude/rules/` zu Migrationen, Expand/Contract in `payload/CLAUDE.md`).

### 8. Konfiguration und Doku: CFG-01–04, DX-01–03, MAINT-02

- CFG-01: `env.validateSecrets` an, sofern Build ohne Secrets weiter geht (sonst nur Laufzeit-Check beim Start).
- CFG-02: `engines` an `.nvmrc` angleichen.
- CFG-03: `migration-upgrade-test.sh` bricht ab, wenn der DB-Name nicht auf `_e2e` endet.
- CFG-04: veraltete `minimumReleaseAgeExclude`-Einträge entfernen.
- DX-01: README verweist auf `docs/worktree-setup.md`, `.env.example` vervollständigen.
- DX-02: `typechecking` erzeugt vorher `supportedBrowsers.mjs`.
- DX-03: `payload/README.md:18` korrigieren.
- MAINT-02: ungenutzte Pakete und totes Skript entfernen (vorher per Suche bestätigen).

### 9. A11y: A11Y-01 bis A11Y-04

- Modal-`<dialog>` mit `aria-labelledby`/`aria-label`.
- Trefferzahl in eigener `aria-live`-Region statt auf der virtualisierten Liste; Tab-Stopps pro Zeile reduzieren.
- `WordOfTheDay.vue`: überflüssiges `role="link"` weg.
- `WordFilter.vue`: Fokus ins Flyout, Escape schließt, Fokus zurück. (A11Y-04 ist M; falls zu groß, eigener Schritt.)
- Prüfen per Chrome DevTools / Playwright am lokalen Dev-Server, nie gegen Prod.

## Größere Schritte (M+), je eigener Plan

### 10. DEP-01: Advisories

- `pnpm audit` neu messen, Payload-Update prüfen, sonst gezielte `overrides`.
- `MCP_DISABLED` (Schalter existiert schon in `payload/src/mcp.ts:13`) bleibt aktiv nutzbar, Default `false`: in `.env.example` und `payload/README.md` dokumentieren. Den Eintrag `MCP_DISABLED=false` in der Komodo-Stack-Env bereite ich vor; mergen/deployen ist Schritt 16.

### 11. CI-02 + CI-04: Secrets und Release-Grenzen (Repo-Teil)

- Install und Tests in Jobs ohne Secrets, `id-token: write` nur pro Job.
- Release hängt an Tests (`workflow_call`).
- Die Infisical-OIDC-Bindung und Branch Protection gehen in Schritt 16.

### 12. PERF-01: Trending in SQL aggregieren

- `payload/src/lib/wordStats.ts` `collect()` per Drizzle `GROUP BY word_id`, wie `bumpWordStat`. Ergebnisgleichheit per Test absichern.

### 13. SEC-02: CSP mit Nonces oder Hashes

- `'unsafe-inline'` und `data:` aus `script-src`. Betrifft Inline-Skripte in Astro (Farbmodus, JSON-LD, Matomo).

### 14. MAINT-01: `WordFeedbackCard.vue` aufteilen

- Ablauf, Persistenz, Balken, Löschen trennen; `window.confirm` durch `ConfirmDialog`.

### 15. OPS-01: Geteilter Zustand für mehrere `web`-Container

- Spiel-Lock und Limits in die Datenbank. Erst angehen, wenn das Rollout-Konzept steht (Komodo). Kann bis dahin zurückgestellt bleiben.

### 16. Deine Schritte (zuletzt)

Ich liefere jeweils eine fertige Anleitung bzw. vorbereitete Änderung:

- **Komodo:** `MCP_DISABLED=false` in die `cms`-Stack-Env übernehmen und deployen (aus Schritt 10).
- **Infisical:** OIDC-Subject der Prod-Identity auf `refs/heads/main` binden (aus Schritt 11).
- **GitHub:** Branch Protection / Required Checks für `main` prüfen bzw. setzen (aus Schritt 11).
- **Rollout-Konzept** für mehrere `web`-Container klären, falls Schritt 15 angegangen werden soll.

## Nicht im Umfang

- SEC-06 (SVG-Uploads) und DATA-01 (Retention für BON): erst verifizieren bzw. fachlich klären.
- Die SEC-01-Frage, ob Traefik `//` normalisiert: Der Fix ist unabhängig davon richtig.
