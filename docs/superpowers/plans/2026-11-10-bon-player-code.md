# BON player code Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A "Berliner oder Nicht" player gets a personal code (text, link, QR) that links another browser, or a browser with wiped data, to the same player: name and results come along.

**Architecture:** New collection `bon-players` (`name`, hashed `codeHash`); `bon-games` gets a nullable `player` relation. The code itself is the player's credential: redeeming sets a httpOnly cookie `bon_player` holding the code, and the server looks the player up by `sha256("bon-code:" + code)`. Three small routes (`player`, `redeem`, plus changes to `start`/`finish`), a pure code generator in `payload/src/lib/bonPlayer.ts`, and one Vue component. Existing `visitorId` cookie and game-token binding stay as they are.

**Tech Stack:** Payload (Postgres, Local API), Astro API routes, zod, Vue 3, nanostores, Vitest, a small zero-dependency QR library (loaded lazily).

**Spec:** `docs/superpowers/specs/2026-11-10-bon-player-code-design.md` (this plan changes two of its "Meine Calls", see "Deviations").

## Deviations from the spec's calls (approved behavior stays, mechanism is simpler)

- **One code per player, not many.** The cookie holds the code, so the server can show it again on any browser that has it. "Spielercode holen" with a valid `bon_player` cookie returns that same code; there is no localStorage copy and no second code. Spec call "Mehrere Codes" is replaced by this. Update that bullet in the spec in Task 5.
- **Code format:** three groups of four characters, e.g. `K7QD-M2X9-ZT4B` (12 chars of a 31-char alphabet, ~59 bits), as the spec's suggested strength. The spec's `BÄR-…` is only an illustration.

## Global Constraints

- The code never leaves the browser in clear text except in: the `POST /api/bon/player` response, the `bon_player` cookie (httpOnly, `sameSite: "lax"`, `secure` in prod, `path: "/api/"`, one year, same attributes as `visitorId` in `website/src/services/payload/comments.ts`) and the link fragment. The DB stores only `sha256("bon-code:" + code)` as hex.
- The code is for BON only. Do not read or set the `visitorId` cookie in the redeem route, and never join with comments, votes, reports or feedback.
- Alphabet (31 chars, no `0 O 1 I L`): `ABCDEFGHJKMNPQRSTUVWXYZ23456789`. Input is normalized: uppercased, spaces and dashes removed, regrouped.
- No IPs stored; rate limits per IP in memory via `website/src/utils/rateLimit.ts`.
- New collection: `authenticatedOnly` access + a Forbidden entry in `payload/tests/access.test.ts`. Migration is additive (nullable relation, new table), `down` uses `IF EXISTS` (`.claude/rules/` Payload migration rules).
- User-facing errors in German, Berlin tone, like the existing BON routes. Redeem failure: `"Den Code kenn ick nich."`. No cookie when creating: `"Ohne Cookie jibt's keen Spielercode."`.
- The link is `/games/berliner-oder-nicht#code=<CODE>`. The fragment is removed from the URL before Matomo can send a page view.
- Redeem and stats apply to `$bonStats` only where the server has data (see Task 4).

## Review Focus

- Wrong, empty, over-long or malformed code at redeem → `404`/`400`, no cookie set, no stack trace.
- Redeem hammered from one IP → `429` before the DB is queried (brute-force defence).
- "Spielercode holen" twice, in two browsers, or with a stale `bon_player` cookie whose player no longer exists → same code for a valid cookie; a stale cookie is treated as no cookie.
- Creating a code when the visitor cookie is missing → clear error, no player row.
- Existing games of the browser are not lost on first code; games of another visitor are not claimed.
- Fragment link opened twice or with garbage after `#code=` → no crash, fragment gone from the address bar.
- Redeeming on a browser with local results while the server has none must not zero the local highscore.

---

### Task 1: Code format (pure) and hashing

**Files:**
- Create: `payload/src/lib/bonPlayer.ts`
- Modify: `payload/package.json` (exports: `"./bon-player": "./src/lib/bonPlayer.ts"`)
- Test: `payload/tests/bonPlayer.test.ts`

**Interfaces:**
- Produces: `generateCode(): string` (format `XXXX-XXXX-XXXX`, every char in the alphabet), `normalizeCode(input: string): string | undefined` (canonical `XXXX-XXXX-XXXX` or `undefined`), `CODE_ALPHABET: string`.

- [ ] **Step 1: Write the failing test** in `payload/tests/bonPlayer.test.ts`: `generateCode` matches `/^[A-HJKMNP-Z2-9]{4}(-[A-HJKMNP-Z2-9]{4}){2}$/`; 200 generated codes are all different; `normalizeCode("k7qd m2x9 zt4b")` and `normalizeCode(" K7QD-M2X9-ZT4B ")` both equal `"K7QD-M2X9-ZT4B"`; `normalizeCode("")`, `normalizeCode("K7QD-M2X9")`, `normalizeCode("K7QD-M2X9-ZT4B-AAAA")`, `normalizeCode("K7QD-M2X9-ZT4O")` (contains `O`) and a 10 000-char string all return `undefined`.
- [ ] **Step 2: Run** `pnpm --filter payload-app exec vitest run tests/bonPlayer.test.ts` (set `PAYLOAD_SECRET` and `.env.worktree` as in the existing payload tests). Expected: FAIL, module missing.
- [ ] **Step 3: Implement** the three exports in `payload/src/lib/bonPlayer.ts`. Use `node:crypto` `randomBytes` with rejection sampling (discard bytes ≥ 248) so every character is uniform. No payload/next imports (the file is consumed from the website like `bonRules.ts`).
- [ ] **Step 4: Run the test.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(bon): add the player code format`.

### Task 2: Collection, relation and migration

**Files:**
- Create: `payload/src/collections/BonPlayers.ts`, `payload/src/migrations/<timestamp>_bon_players.ts` (+ `.json`, generated)
- Modify: `payload/src/collections/BonGames.ts`, `payload/src/payload.config.ts`, `payload/src/migrations/index.ts`, `payload/src/payload-types.ts` (generated), `payload/tests/access.test.ts`
- Test: `payload/tests/bonGames.test.ts`, `payload/tests/bonPlayers.test.ts`

**Interfaces:**
- Produces: collection `bon-players` with fields `name: text`, `codeHash: text` (required, unique index); `bon-games.player`: relationship to `bon-players`, not required, indexed.

- [ ] **Step 1: Write failing tests.** `bonPlayers.test.ts` (pattern of `bonGames.test.ts`): a row can be created with `codeHash`; a second row with the same `codeHash` fails with `ValidationError`; reading without a user is denied. In `bonGames.test.ts`: a game row accepts a `player` id and still saves without one. In `access.test.ts` add `"bon-players"` to `lockedCollections`.
- [ ] **Step 2: Run** the three test files. Expected: FAIL (unknown collection).
- [ ] **Step 3: Implement** `BonPlayers` (`slug: "bon-players"`, `access: authenticatedOnly`, `admin.defaultColumns: ["name", "updatedAt"]`, unique index on `codeHash`); add the `player` relation to `BonGames`; register `BonPlayers` in `payload.config.ts` next to `BonGames`.
- [ ] **Step 4: Generate types and migration:** `pnpm --filter payload-app generate:types`, then `pnpm cms:migrate:create bon_players`. Infisical may not be logged in: source `.env.worktree` and set a dummy `PAYLOAD_SECRET` (worked for `bon_games` on 2026-11-10). Check the generated `down` uses `IF EXISTS` for every `DROP CONSTRAINT/INDEX/COLUMN/TYPE` and edit it if not. Add nothing else to the migration.
- [ ] **Step 4b: Run** the three test files plus `scripts/migration-upgrade-test.sh` if a local Postgres is available. Expected: PASS.
- [ ] **Step 5: Commit** `feat(bon): add the bon-players collection`.

### Task 3: API routes `player` and `redeem`, identity in `start` and `finish`

**Files:**
- Create: `website/src/services/bonPlayer.ts`, `website/src/pages/api/bon/player.ts`, `website/src/pages/api/bon/redeem.ts`
- Modify: `website/src/pages/api/bon/start.ts`, `website/src/pages/api/bon/finish.ts`, `website/src/utils/bonSchema.ts`, `website/src/utils/rateLimit.ts`, `website/src/tests/unit/utils/rateLimit.test.ts`
- Test: `website/src/tests/unit/pages/api/bon.test.ts` (extend the in-memory fake: accept collection `bon-players`, add the filter op `exists` with a boolean value, keep the strictness that unknown filters throw)

**Interfaces:**
- Produces in `services/bonPlayer.ts`:
  - `bonCodeHash(code: string): string` (`sha256("bon-code:" + code)` hex)
  - `playerFromCookie(payload: Client, cookies: AstroCookies): Promise<{ id: number; code: string; name: string } | undefined>` (reads `bon_player`, normalizes, looks up by hash; `undefined` for missing, malformed or unknown)
  - `setPlayerCookie(cookies: AstroCookies, code: string): void`
  - `playerStats(payload: Client, id: number): Promise<{ playerName: string; highScore: number; bestStreak: number; gamesPlayed: number }>` (finished games of the player; `highScore`/`bestStreak` are the maxima; all `0` when none)
- Produces routes:
  - `POST /api/bon/player` → `200 { code }`
  - `POST /api/bon/redeem` body `{ code: string }` (zod `strictObject`, string max 40) → `200 { playerName, highScore, bestStreak, gamesPlayed }`
- Rate limits (add to `RULES`): `POST /api/bon/player` 10 per 10 min, `POST /api/bon/redeem` 10 per 10 min; add a case to `rateLimit.test.ts` for each.

- [ ] **Step 1: Write failing tests** in `bon.test.ts` (each as its own `it`):
  - `player` with a valid `bon_player` cookie returns that cookie's code and creates no row; without it but with a visitor cookie creates one `bon-players` row (stored `codeHash` equals `bonCodeHash(code)`, no clear code in any row), sets the cookie, and returns a code that matches the format.
  - First code claims the visitor's games: two finished games of `v-1` get the `player`; a game of `v-2` does not.
  - `player` without any cookie → `400` and no row; stale `bon_player` cookie (no such player) is treated as no cookie.
  - `redeem` with the right code (also `"k7qd m2x9 zt4b"` style input) returns the stats (`highScore` 80 after a game worth 80, `gamesPlayed` 1) and calls `cookies.set("bon_player", <canonical code>, …)`; wrong code, empty string and a 10 000-char string → `404`/`400`, `set` not called.
  - `redeem` does not read or set the visitor cookie.
  - `start` with a valid `bon_player` cookie stores the `player` on the new game; `finish` with a player writes `playerName` to the `bon-players` row; without a player cookie both behave as today (existing tests stay green).
- [ ] **Step 2: Run** `(cd website && rtk vitest run src/tests/unit/pages/api/bon.test.ts src/tests/unit/utils/rateLimit.test.ts)`. Expected: FAIL.
- [ ] **Step 3: Implement** the service and both routes. `player`: `playerFromCookie` → return its code; else need `visitorId(cookies, false)` (else 400), create the player with `generateCode()` (retry once on a unique violation, then 502; `isUniqueViolation(error, columns)` needs the real error path of a duplicate `codeHash`, so pin it first in `payload/tests/bonPlayers.test.ts` as `comments.test.ts` does), update games `where: { visitor: { equals: bonVisitor(cookie) }, player: { exists: false } }` with `{ player: id }`, set the cookie. `redeem`: parse, `normalizeCode`, find by hash, set cookie, return `playerStats`. In `start.ts` add `player` to the created data when `playerFromCookie` finds one; in `finish.ts` update `bon-players.name` with the validated `playerName` after the game is stored (a failure there is logged, never blocks the result, like the rank lookup). Reuse `reply`, `INVALID`-style errors and the surrounding try/catch pattern; copy the 502 handling of `start.ts`.
- [ ] **Step 4: Run the tests.** Expected: PASS, then `pnpm lint` clean.
- [ ] **Step 5: Commit** `feat(bon): add player code routes`.

### Task 4: Client: fragment capture, API calls, component

**Files:**
- Create: `website/src/services/bonPlayerApi.ts`, `website/src/components/games/BonPlayerCode.vue`
- Modify: `website/src/pages/games/berliner-oder-nicht.astro`, `website/src/components/games/BerlinerOderNicht.vue`, `website/package.json` (QR library)
- Test: `website/src/tests/unit/services/bonPlayerApi.test.ts`, `website/src/tests/unit/components/BonPlayerCode.test.ts`

**Interfaces:**
- Produces in `bonPlayerApi.ts`:
  - `createPlayerCode(): Promise<string>` (POST `/api/bon/player`, throws `Error(message)` with the server's German text)
  - `redeemPlayerCode(code: string): Promise<PlayerStats>` (POST `/api/bon/redeem`)
  - `applyPlayerStats(stats: PlayerStats): void` writes into `$bonStats`: `playerName` only if non-empty; `highScore` and `bestStreak` only if `gamesPlayed > 0` (the server's values then win, as the spec says); otherwise leaves the local values untouched.
  - `playerLink(code: string): string` → `${location.origin}/games/berliner-oder-nicht#code=${code}`
  - `takeRedeemCode(): string | undefined` reads and removes `sessionStorage["bonRedeem"]`.
- Component `BonPlayerCode.vue`, no props, five states (spec "Wie es aussieht"): no code, show code (code, "Link kopieren", "QR-Code zeigen", the warning text from the spec), redeem form, success (name and best score), error text. On mount it calls `takeRedeemCode()` and, if set, redeems and shows the success state. The QR code is generated client-side from `playerLink(code)` with a lazy `import()` of a small zero-dependency QR library (`uqr` or `qrcode-generator`; pick one that passes the repo's 24 h age gate) so it adds nothing to the game's first load.

- [ ] **Step 1: Write failing tests.** `bonPlayerApi.test.ts` (mock `fetch`): `applyPlayerStats` with `gamesPlayed: 0` leaves `highScore` 120 and `playerName` "Ede" unchanged when the server name is `""`; with `gamesPlayed: 2`, `highScore: 200`, `playerName: "Berta"` sets all three; `playerLink("K7QD-M2X9-ZT4B")` contains `#code=K7QD-M2X9-ZT4B`; `takeRedeemCode` returns the stored code once and `undefined` the second time. `BonPlayerCode.test.ts`: the button shows the code from the mocked API; a server error renders its text; entering a code calls `redeemPlayerCode` and shows the success name; a stored `bonRedeem` is redeemed on mount.
- [ ] **Step 2: Run** `(cd website && rtk vitest run src/tests/unit/services/bonPlayerApi.test.ts src/tests/unit/components/BonPlayerCode.test.ts)`. Expected: FAIL.
- [ ] **Step 3: Implement** the service and component with the existing design tokens and BEM style of the other `Bon*.vue` components (read `.claude/rules/` for SCSS/Vue first); mount `<BonPlayerCode />` on the start screen next to the player name in `BerlinerOderNicht.vue`. If Claude Design's layout is available, follow it. In `berliner-oder-nicht.astro` add an inline script in `<head>` (runs before Matomo): if `location.hash` starts with `#code=`, store the value in `sessionStorage["bonRedeem"]` and call `history.replaceState(null, "", location.pathname + location.search)`; wrap storage access in try/catch. Check in `website/astro.config.mjs` (Matomo setup) that its first page view cannot run before this script; if it can, move the script earlier or delay the tracker, and note the finding in the commit message.
- [ ] **Step 4: Run the tests**, then `pnpm lint`. Expected: PASS and clean. Check once in the dev server (`NO_DEV_TOOLBAR=1`, never against the production site): create a code, open the link in a fresh private window, the address bar loses `#code=`, the success state shows.
- [ ] **Step 5: Commit** `feat(bon): add the player code component`.

### Task 5: Docs and final verification

**Files:**
- Modify: `docs/superpowers/specs/2026-11-10-bon-player-code-design.md` ("Mehrere Codes" call and the "Laufende Identität" bullet to match the Deviations above), `website/CLAUDE.md` or `payload/CLAUDE.md` (one line on the player code where the BON game is documented)

- [ ] **Step 1:** Update the spec bullets and the CLAUDE.md line. Add to the spec's Datenschutz section that the privacy text (CMS page) needs a short paragraph on the player code; this plan does not edit CMS content.
- [ ] **Step 2: Verify:** `pnpm lint`; `(cd website && rtk vitest run src/tests/unit)`; `pnpm --filter payload-app exec vitest run tests/bonPlayer.test.ts tests/bonPlayers.test.ts tests/bonGames.test.ts tests/access.test.ts`; `pnpm typechecking` once (slow). Expected: all green.
- [ ] **Step 3: Commit** `docs(bon): document the player code`.

---

## Known limits (state them in the PR)

- The game client does not yet call `/api/bon/start|next|finish` (frontend ticket of the first spec), so until then a redeemed player has no server results: `gamesPlayed` is `0` and local stats are kept.
- Rate limit is in memory per instance and resets on restart; at ~59 bits that is accepted (spec).
- Whoever has the code (or the link) owns the player: name and results, nothing else.
- A player can be created without any game (no visitor cookie needed); bounded only by the 10 per 10 min per-IP limit on POST /api/bon/player.
