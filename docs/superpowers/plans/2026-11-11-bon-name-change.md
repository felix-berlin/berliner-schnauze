# Bon: Spielername ändern — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a Bon player change their name (SPEC §12b): one `BonName` component on start, result and leaderboard, backed by `GET`/`PATCH /api/bon/player`; plus the remaining name-filter and report fixes.

**Architecture:** The name stays stored per game (`bon-games.playerName`). `PATCH /api/bon/player` rewrites it in all games of the caller's identity (same identity as the leaderboard: `p:<playerId>` else `v:<visitor hash>`), resets reports where the name really changes, updates `bon-players.name` and invalidates the ranking cache. `GET` returns the current display name and tag. `BonName.vue` talks to these routes through `bonPlayerApi.ts` and emits `saved`, the parents reload.

**Tech Stack:** Astro API routes, Payload Local API, zod, Vue 3 `<script setup>`, Nanostores, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-11-bon-name-change-design.md` (design, binding), `bon-SPEC.md` §12b and `bon-handoff (1).zip` → `design/BonName.dc.html` in the worktree root (source of copy and layout; Task 2 copies them into `docs/design/bon/`).

## Global Constraints

- Copy, verbatim from SPEC §12b:
  - Display: „Du spielst als **{Name}**“, anonymous „Du spielst als **Anonym** #{tag}“; text link „Namen ändern“ (`aria-expanded`).
  - Edit: label „Dein Name“, counter „{n} / 24“ (`aria-live="polite"`), input `maxlength="24"`, `autocomplete="nickname"`, prefilled, placeholder „Anonym“, focus with text selected. Hint: „Gilt ooch für deine bisherigen Ergebnisse in der Rangliste. Leer jelassen = „Anonym #{tag}“.“ `.c-choice` „Speichern“ + text link „Abbrechen“ (also Esc). Enter saves.
  - Saving: button `aria-busy="true"`, input disabled.
  - Rejected (422): `aria-invalid`, `.c-state--error` „Der Name jeht so nich.“ / „Bitte keene Beleidigungen oder Schimpfwörter – versuch’s mit ’nem andern.“ Field stays open.
  - Limit (429): „Heute jenug umjetauft – morjen wieder.“ shown like Rejected (field stays open).
  - Network error (other): „Ditt hat nich jeklappt.“ / „Dein Name is nich anjekommen. Versuch’s gleich nochmal.“, button „Nochmal speichern“.
  - Saved: „✓ Jespeichert“ (accent, 700, `role="status"`), gone after 3 s.
- Name rules: trim; empty → „Anonym“ with tag; max 24 characters; a link-like name becomes „Anonym“ (like `finishSchema`); filter `nameCategory` from `payload-app/bon-names` on the server, any hit (offensive **or** far-right) → 422, no EXIT notice in `BonName`.
- Rename limit: 5 per identity, `rateLimitedBy(identity, "bon-rename", 5, 24 * 60 * 60_000)`; only renames that pass the filter count.
- Use the existing global classes (`.c-textlink`, `.c-field`, `.c-choice`, `.c-state--error`); new ones only as `c-bon-name*` in `website/src/styles/components/_bon-name.scss` (BEMIT, unscoped, breakpoints via `mx.breakpoint`). Radius at most `--radius-sm`.
- Every UI task is done only after a browser check, light and dark (dark = `dark` class on `<html>`), 390px and 1280px, screenshots into `.superpowers/sdd/2026-11-11-bon-name-change/task-N-shots/`. Dev server with `NO_DEV_TOOLBAR=1` via `scripts/with-env.sh`; never a browser tool against berliner-schnauze.wtf.
- Payload tests: `scripts/with-env.sh pnpm cms:test` (or `../scripts/with-env.sh npx vitest run <file>` from `payload/`). Website tests: `(cd website && rtk vitest run <file>)`. Commits: Conventional Commits, scope `bon`.
- No schema change, no migration.

## Review Focus

1. A visitor without any cookie (first visit) opens start: `GET` 404 → the intro shows the normal name field, no error. (Task 3 test: intro with 404 shows the field.)
2. A visitor who later redeemed a code: `PATCH` as visitor must not touch games with a `player` set. (Task 1 test: game with `player` and the same visitor hash keeps its name.)
3. A name hidden by reports, saved again unchanged: stays hidden. (Task 1 test.)
4. Double submit (Enter + click, or two quick Enter): only one PATCH in flight. (Task 2 test: second save while saving makes no second call.)
5. Rename while the result's placement is still loading: the placement ends with the new name, not a stale reply. (Task 3 test: `saved` triggers a reload; a late first reply does not overwrite the second.)

---

### Task 1: Server — `GET`/`PATCH /api/bon/player`, `finish` takes the player's name, report key follows the name

**Files:**

- Modify: `website/src/services/bonPlayer.ts` (identity helper)
- Modify: `website/src/pages/api/bon/player.ts` (add `GET`, `PATCH`)
- Modify: `website/src/pages/api/bon/leaderboard.ts` (use the identity helper, no behavior change)
- Modify: `website/src/pages/api/bon/finish.ts:58-68` (name for code players)
- Modify: `website/src/pages/api/bon/report-name.ts` (key includes the game's current name)
- Modify: `website/src/utils/bonSchema.ts` (add `renameSchema`)
- Modify: `website/src/utils/rateLimit.ts:25` (rules for GET/PATCH `/api/bon/player`)
- Test: `website/src/tests/unit/pages/api/bon.test.ts`

**Interfaces:**

- Produces: `bonIdentity(payload: Client, cookies: AstroCookies): Promise<{ identity: string; playerId?: number; visitor?: string; playerName?: string } | undefined>` in `bonPlayer.ts` (`identity` = `p:<id>` or `v:<hash>`; `playerName` = raw `bon-players.name` for code players; no cookie is set).
- Produces: `renameSchema = z.strictObject({ name: z.string() })` whose output is the cleaned name: trimmed, `max(24)` (400 above), empty or link-like → `"Anonym"`. Filter is NOT in the schema (the route needs 422, not 400).
- Produces HTTP: `GET /api/bon/player` → 200 `{ name: string; tag?: string }` | 404 `{ error }`; `PATCH /api/bon/player` body `{ name }` → 200 `{ name; tag? }` | 400 | 404 | 422 | 429 `{ error }` | 502.
- `tag` present only when `name === "Anonym"`, value `bonTag(identity)`.

- [ ] **Step 1: Write the failing tests** in `bon.test.ts`, new `describe("PATCH /api/bon/player")` and `describe("GET /api/bon/player")`, using the file's existing payload mock pattern:
  - `renames all games of a code player and the player row`: update called on `bon-games` with `where` on `player = 7`, data `playerName: "Kiez-Kalle"`; `bon-players` update `{ name: "Kiez-Kalle" }`; reply 200 `{ name: "Kiez-Kalle" }`; `invalidateRanking` called.
  - `renames a visitor's games but not games already claimed by a player`: `where` contains `visitor = <hash>` AND `player exists false`.
  - `resets reports only where the name changes`: games `[{playerName:"Kalle", nameHidden:true, nameReports:3}, {playerName:"Old", nameReports:1}]`, rename to `" kalle "` → first game keeps `nameHidden: true`/`nameReports: 3` (case-insensitive equal), second gets `nameReports: 0, nameHidden: false`.
  - `refuses an insult and a far-right name with 422 and counts neither against the limit`: `"Arschloch"` → 422, `"Heil Adolf"` → 422; then 5 valid renames → 200 each, the 6th → 429 `{ error: "Heute jenug umjetauft – morjen wieder." }`.
  - `400 for 25 characters, 404 without visitor and player cookie`.
  - `empty name becomes Anonym with tag`: `{ name: "  " }` → `{ name: "Anonym", tag: bonTag("p:7") }`; `bon-players` updated with `name: ""`.
  - `502 when the update fails`.
  - GET: `returns the latest finished game's display name`; `Anonym with tag when that game is hidden`; `code player without finished game falls back to bon-players.name`; `404 without identity`; visitor with no finished game → 404.
  - finish: `a code player's new game stores bon-players.name, not the sent name` (player row name `"Kiez-Kalle"`, body `playerName: "Alt"` → game update with `playerName: "Kiez-Kalle"`); `a code player with an empty row name keeps the sent name` (existing behavior: row then updated to the sent name).
  - report-name: `a renamed game can be reported again from the same IP` (report → rename game name in mock → report again → `nameReports` update called twice).
- [ ] **Step 2: Run, expect FAIL**: `(cd website && rtk vitest run src/tests/unit/pages/api/bon.test.ts)` → the new tests fail (no `GET`/`PATCH` export).
- [ ] **Step 3: Implement.**
  - `bonIdentity` from `playerFromCookie` and `visitorId(cookies, false)` + `bonVisitor`, the same rule `leaderboard.ts` has inline today; switch `leaderboard.ts` to it.
  - Games of an identity: `{ player: { equals: id } }` or `{ and: [{ visitor: { equals: hash } }, { player: { exists: false } }] }`.
  - PATCH order: identity (404) → schema (400) → `nameCategory` (422) → `rateLimitedBy` (429) → find games (`select: { playerName, nameHidden, nameReports }`, `pagination: false`) → per game update (`playerName`, plus `nameReports: 0, nameHidden: false` only when `trim().toLowerCase()` differs) → `bon-players` `name` (`"Anonym"` stored as `""`) → `invalidateRanking()` → reply. Any thrown error → 502 `{ error: "Dein Name is nich anjekommen." }`.
  - GET: latest `status: finished` game of the identity (`sort: "-finishedAt"`, `limit: 1`), name = `cleanName(displayName(game))`; else code player → `cleanName(playerName || "Anonym")`; else 404 `{ error: "Du hast noch nich jespielt." }`.
  - `finish`: when `game.player` is set, read the player's `name` (`depth: 0`); non-empty → use it as `playerName` for the game; empty → keep today's behavior (sent name, then row update when not „Anonym“).
  - `report-name`: select `playerName` too; key = `sha256(\`bon-report:${ip}:${id}:${playerName ?? ""}\`)`.
  - `rateLimit.ts` RULES: `{ max: 20, method: "PATCH", prefix: "/api/bon/player", windowMs: 10 * 60_000 }`, `{ max: 60, method: "GET", prefix: "/api/bon/player", windowMs: 10 * 60_000 }`.
- [ ] **Step 4: Run, expect PASS**: same command, then `(cd website && rtk vitest run src/tests/unit/services src/tests/unit/pages)`.
- [ ] **Step 5: Commit** `feat(bon): rename a player through PATCH /api/bon/player`.

---

### Task 2: `BonName.vue` and its client API

**Files:**

- Create: `website/src/components/games/BonName.vue`
- Create: `website/src/styles/components/_bon-name.scss`
- Modify: `website/src/services/bonPlayerApi.ts`
- Create: `docs/design/bon/design/BonName.dc.html` (copy from the extracted handoff); replace `docs/design/bon/design/BonGame.dc.html` and `BonLeaderboard.dc.html` with the handoff (1) versions.
- Test: `website/src/tests/unit/components/games/BonName.test.ts`, `website/src/tests/unit/services/bonPlayerApi.test.ts`

**Interfaces:**

- Consumes: Task 1 HTTP routes.
- Produces in `bonPlayerApi.ts`:
  - `type PlayerName = { name: string; tag?: string }`
  - `fetchPlayerName(): Promise<PlayerName | undefined>` — 404 → `undefined`, other errors throw.
  - `renamePlayer(name: string): Promise<PlayerName>` — throws `Error & { status?: number }` (reuse the `post` error shape; add a `method` parameter to `post` or a sibling `send(method, url, body)`, keep `post` callers unchanged).
  - `rememberName(name: string): void` — sets `$bonStats.playerName` (`"Anonym"` → `""`).
- Produces `BonName.vue`: props `{ name: string; tag?: string }`, emits `saved: [PlayerName]`. On success it calls `rememberName`, shows „✓ Jespeichert“ for 3 s, emits `saved`.
- The handoff `BonName.dc.html` is the layout reference (prop `start: anzeigen|bearbeiten|abgelehnt|fehler|gespeichert`).

- [ ] **Step 1: Copy design files** (step has no test): unzip `bon-handoff (1).zip` into a scratch dir, copy the three `.dc.html` files as listed. Copy only; no other doc changes in this task.
- [ ] **Step 2: Write the failing tests.**
  - `bonPlayerApi.test.ts`: `fetchPlayerName` → 200 body returned, 404 → `undefined`; `renamePlayer("Kalle")` sends `PATCH /api/bon/player` with JSON `{ name: "Kalle" }`; a 422 rejects with `status: 422`; `rememberName("Anonym")` stores `""`.
  - `BonName.test.ts` (mount with `renamePlayer` mocked):
    - display: text „Du spielst als Kalle“; anonymous with `tag: "K7QX"` shows „Anonym“ and „#K7QX“; link „Namen ändern“ has `aria-expanded="false"`.
    - edit: click → `aria-expanded="true"`, input prefilled with „Kalle“, focused, selected (`selectionStart 0`, `selectionEnd 5`), counter „5 / 24“, `maxlength="24"`, `autocomplete="nickname"`, placeholder „Anonym“.
    - Esc and „Abbrechen“ close without a call; Enter calls `renamePlayer("Kalle2")`.
    - saving: while the promise is pending, button `aria-busy="true"`, input disabled; a second Enter makes no second call (Review Focus 4).
    - 422 → `aria-invalid="true"`, both rejected texts, field still open; 429 → „Heute jenug umjetauft – morjen wieder.“; 502/network → both network texts and button „Nochmal speichern“, which retries.
    - success → emits `saved` with the reply, `$bonStats.playerName` updated, „✓ Jespeichert“ with `role="status"`, gone after `vi.advanceTimersByTime(3000)`.
- [ ] **Step 3: Run, expect FAIL**: `(cd website && rtk vitest run src/tests/unit/components/games/BonName.test.ts src/tests/unit/services/bonPlayerApi.test.ts)`.
- [ ] **Step 4: Implement** `BonName.vue`, `_bon-name.scss`, the API functions. A client pre-check with `nameCategory` is allowed (show the Rejected state without a request); the server stays authoritative.
- [ ] **Step 5: Run, expect PASS** (same command).
- [ ] **Step 6: Browser check**: mount on a scratch page or in Task 3's places is not possible yet, so check via the dev server only in Task 3; here run `pnpm exec oxlint --format=agent` on the new files and `pnpm exec stylelint website/src/styles/components/_bon-name.scss`.
- [ ] **Step 7: Commit** `feat(bon): add the name display and editor`.

---

### Task 3: Wire `BonName` into start, result and leaderboard

**Files:**

- Modify: `website/src/components/games/BonIntro.vue` (known player → `BonName` instead of the field)
- Modify: `website/src/components/games/BonResult.vue` (below the title; reload placement on `saved`)
- Modify: `website/src/components/games/BerlinerOderNicht.vue` (only if needed to pass name/tag)
- Modify: `website/src/components/games/BonLeaderboard.vue` (card „Dein Platz“: `BonName` under the buttons, before the cookie hint; mobile: card under the list when `me` exists)
- Modify: matching SCSS in `website/src/styles/components/` if layout needs it
- Test: `BonIntro.test.ts`, `BonResult.test.ts`, `BonLeaderboard.test.ts` in `website/src/tests/unit/components/games/`

**Interfaces:**

- Consumes: `fetchPlayerName`, `rememberName`, `PlayerName`, `BonName` (props `name`, `tag?`; emits `saved`) from Task 2.

- [ ] **Step 1: Write the failing tests.**
  - Intro: `fetchPlayerName` → `{ name: "Kalle" }` → no name input, text „Du spielst als Kalle“, and `$bonStats.playerName === "Kalle"`; → `undefined` (404) → field „Dein Name (optional)“ as today (Review Focus 1); → rejects → field as today, no error shown. Start still emits the stored name for a known player.
  - Result: `BonName` rendered below the heading with the current `playerName` (cleaned) and the tag from the game; after `saved` the heading shows the new name and `fetchLeaderboard` is called again; a late first leaderboard reply resolving after the second does not win (Review Focus 5).
  - Leaderboard: with `me` and `fetchPlayerName` → `{ name: "Kalle" }`, the card shows `BonName`; mobile (`isDesktop` false) with `me` and status ready renders the card after the list (DOM order) instead of hiding it; after `saved` the list is fetched again.
- [ ] **Step 2: Run, expect FAIL**: `(cd website && rtk vitest run src/tests/unit/components/games)`.
- [ ] **Step 3: Implement.** Intro fetches once on mount (`onMounted`), shows the field until the reply says „known“. The anonymous tag for result comes from the `tag` already returned by `startRun` (HUD uses it); leaderboard and intro take it from `fetchPlayerName`. Leaderboard card on mobile: follow `BonLeaderboard.dc.html` `asideStyle` (card visible, after the list).
- [ ] **Step 4: Run, expect PASS** (same command), then the full unit suite `(cd website && rtk vitest run src/tests/unit)`.
- [ ] **Step 5: Browser check** (Global Constraints): screenshots of every `BonName` state (display, edit, saving, rejected, limit, network, saved) in intro, result and leaderboard, light/dark, 390/1280. Check focus ring, counter live region, Esc.
- [ ] **Step 6: Commit** `feat(bon): change the name on start, result and leaderboard`.

---

### Task 4: Name filter rest and report dedupe

**Files:**

- Modify: `payload/src/lib/bonNames.ts` (`prep`, number-code merge)
- Modify: `website/src/pages/api/bon/report-name.ts` (/64 key, set cap)
- Modify: `website/src/utils/rateLimit.ts` (new `networkKey`)
- Test: `payload/tests/bonNames.test.ts`, `website/src/tests/unit/pages/api/bon.test.ts`, `website/src/tests/unit/utils/rateLimit.test.ts` (create if missing)

**Interfaces:**

- Produces: `networkKey(ip: string): string` in `rateLimit.ts` — IPv4 unchanged; IPv4-mapped `::ffff:a.b.c.d` → `a.b.c.d`; IPv6 → its first four hextets, expanded and lowercased (`2001:db8::1` and `2001:0DB8:0:0:ffff::2` → `2001:0db8:0000:0000`).

- [ ] **Step 1: Write the failing tests.**
  - `bonNames.test.ts`, far-right: `"ɴᴀᴢɪ"`, `"🇳🇦🇿🇮"`, `"8.8"`, `"8-8"`, `"8_8"`, `"Max 8.8"`, `"8⠀8"`, `"8ㅤ8"`.
  - pass (`undefined`): `"Klasse 1 98"`, `"8.8.1990"`, `"14.08."`, `"Tim 18"`, `"Jahrgang 1988"`.
  - still far-right: `"8 8"`, `"1 4 8 8"`, `"14 88"`.
  - All existing lists stay green.
  - `rateLimit.test.ts`: the `networkKey` examples above.
  - `bon.test.ts`: `two reports from the same /64 count once` (`x-forwarded-for` `2001:db8::1` then `2001:db8::2` → one `nameReports` update); `the reported set drops its oldest entry beyond the cap` (export the cap constant `REPORTED_CAP` from the route module, or test via a small injected value; implementer's choice).
- [ ] **Step 2: Run, expect FAIL**: `../scripts/with-env.sh npx vitest run tests/bonNames.test.ts` (from `payload/`), `(cd website && rtk vitest run src/tests/unit/utils/rateLimit.test.ts src/tests/unit/pages/api/bon.test.ts)`.
- [ ] **Step 3: Implement.**
  - `prep`: map small capitals (`ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘʀꜱᴛᴜᴠᴡʏᴢ` → latin) and Regional Indicator Symbols U+1F1E6–U+1F1FF → `a`–`z`, before `toLowerCase`.
  - Number codes: replace today's `name.replace(/(?<=\d)\s+(?=\d)/g, "")` copy by a merge of **maximal runs of single digits** separated by non-letter, non-digit characters (so `8.8`, `1 4 8 8` merge; `1 98`, `8.8.1990`, `14.08.` do not):
    ```ts
    // A run of single digits with separators between them, not touching another digit group on either side.
    /(?<!\d[^\p{L}\d]*)\d(?:[^\p{L}\d]+\d)+(?![^\p{L}\d]*\d)/gu; // replace each match by its digits only
    ```
  - `report-name.ts`: hash `networkKey(clientIp(...))` instead of the raw IP; `REPORTED_CAP = 50_000`, on insert beyond it delete the oldest (`reported.values().next().value`), comment `shortcut: in memory, oldest dropped first; a flood can make old reports count again`.
- [ ] **Step 4: Run, expect PASS** (same commands), plus `scripts/with-env.sh pnpm cms:test`.
- [ ] **Step 5: Commit** `fix(bon): close the last name filter gaps, count reports per IPv6 network`.

---

### Task 5: E2E, spec and docs

**Files:**

- Modify: `website/src/tests/e2e/bon-game.spec.ts`
- Modify: `docs/design/bon/SPEC.md`
- Modify: `website/CLAUDE.md` (Bon paragraph)

- [ ] **Step 1: E2E test** `renames the player on the result and the leaderboard shows it`: play one game to the end (reuse the spec's existing helper for losing three lives), on the result click „Namen ändern“, type „E2E Kalle“, Enter, see „✓ Jespeichert“, go to `/games/berliner-oder-nicht/rangliste`, see „E2E Kalle“ in the list. One game start only (start limit 20/10 min).
- [ ] **Step 2: Run** the bon e2e specs as `website/CLAUDE.md` describes (E2E DB via `with-env`, `E2E_PORT`). Expected: all bon specs pass.
- [ ] **Step 3: SPEC.md**: port from `bon-SPEC.md` the §12b section, the §§ start/result/leaderboard references, the file table row (`BonName.dc.html`), the component table row (`BonName.vue`), the API row (`PATCH /api/bon/player` → **vorhanden**, plus `GET`), the tree line. Keep every existing „Abweichung (Umsetzung)“. Open question „Namen ändern“ (new number after the repo's 7) → struck through, **Entschieden:** 5 pro Identität in einem 24-Stunden-Fenster; alte Namen werden sofort ersetzt; gemeldete Namen können geändert werden (Meldungen zurück nur bei echter Änderung). Mark as **Abweichung (Umsetzung):** the fixed 24-h window instead of per day, the extra `GET` route, 422 also for far-right names without EXIT notice.
- [ ] **Step 4: `website/CLAUDE.md`**: in the Bon paragraph, one or two sentences: rename via `PATCH /api/bon/player` (all games of the identity, claimed visitor games excluded, reports reset only on a real change, 5 per 24 h in memory, ranking cache invalidated); `finish` takes `bon-players.name` for code players.
- [ ] **Step 5: Run** `pnpm lint` and `pnpm typechecking`; expected: no errors.
- [ ] **Step 6: Commit** `docs(bon): document the name change, e2e for renaming`.
