# BON game results (server-verified) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The server deals the cards of a "Berliner oder Nicht" game, re-computes the result from the submitted answers, stores finished games and answers with the rank of the game among all finished games.

**Architecture:** A new Payload collection `bon-games` holds one row per game (dealt cards with solutions, batch issue times, token, result). Pure rules (`computeMultiplier`, run verification, timing check) live in `payload/src/lib/bonRules.ts`; deck dealing in `website/src/utils/bonDeck.ts`; three Astro API routes (`start`, `next`, `finish`) follow the `word-feedback` pattern (visitor cookie via `visitorId`, hashed visitor, in-memory rate limit, `reply`).

**Tech Stack:** Payload (Postgres, Local API), Astro API routes, zod, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-05-bon-game-results-design.md`

## Global Constraints

- Backend only: no change to `useBon.ts` or stores. The one allowed game change: the real-word filter in `BerlinerOderNicht.vue` (Task 3).
- Real cards need a non-empty `berlinerisch` and at least one non-empty translation; `translation` is therefore always set on real cards.
- Batch = 20 cards, 10–15 real, rest fake, shuffled (as `_makeQueuedDeck` in `useBon.ts`). A card appears at most once per game.
- Rules (reference `computeMultiplier` in `useBon.ts`): 3 lives; correct answer = `10 * multiplier`, multiplier by streak: >=10 → 5, >=6 → 3, >=3 → 2, else 1; a wrong answer resets streak and costs a life.
- Only complete games count: the answer list must end exactly at the third wrong answer. Anything else is rejected and not ranked.
- Identity: `visitorId(cookies, true)` from `website/src/services/payload/comments.ts`; store only `sha256("bon-game:" + cookie)` as hex. No IPs stored. No cookie → start fails (no ranked game).
- Only server times count (batch issue times, finish request time). Client timestamps are not sent.
- The solution (`isReal`) and `translation` never appear in start/next responses.
- `playerName`: optional, trimmed, max 24 chars, no links (reject `://`, `www.`), default `"Anonym"`.
- Rank = 1 + number of finished games with a higher score; ties share a rank. Response also carries the count of finished games.
- Three endpoints only: `POST /api/bon/start`, `POST /api/bon/next`, `POST /api/bon/finish`.

## Review Focus

- Same token finished twice (double click, replay) → second call is refused, only one row is ranked.
- Token used by a different visitor cookie than the one that started the game → refused.
- Answers for cards that were never dealt, out of dealt order, duplicated, or more answers than dealt cards → refused (also an oversized array must not be iterated unbounded).
- Fewer than three wrong answers, or answers continuing after the third wrong one → refused.
- Missing/blocked cookie on finish; empty or too-small card pool → clear error, no endless loop.
- `playerName` with a link, only whitespace, or 10 000 chars.

---

### Task 1: Pure game rules

**Files:**
- Create: `payload/src/lib/bonRules.ts`
- Modify: `payload/package.json` (add export `./bon-rules` next to the existing `./word-feedback` export)
- Test: `payload/tests/bonRules.test.ts`, `website/src/tests/unit/composable/useBon.test.ts` (one added test)

**Interfaces:**
- Produces:
  - `export const LIVES = 3`, `export const MIN_MS_PER_ANSWER = 700`
  - `export function computeMultiplier(streak: number): number`
  - `export type RunResult = { score: number; bestStreak: number; totalAnswered: number; correctAnswers: number }`
  - `export function verifyRun(solutions: boolean[], guesses: boolean[]): RunResult | null` — `solutions[i]` is `isReal` of the i-th dealt card, `guesses[i]` the player's guess; `null` unless `guesses` is a non-empty list of at most `solutions.length` entries that ends exactly at the `LIVES`-th wrong guess.
  - `export function plausibleTiming(batches: { issuedAt: number; start: number }[], answered: number, now: number): boolean` — `start` is the index of the batch's first card; for every batch `b` that contains an answered card, `now - b.issuedAt >= MIN_MS_PER_ANSWER * (answered - b.start)`.

- [ ] **Step 1: Write failing tests** in `payload/tests/bonRules.test.ts` (no database needed): `computeMultiplier` for streaks 0,2,3,5,6,9,10,40 → 1,1,2,2,3,3,5,5; `verifyRun([true,true,false,true,true], [true,true,true,false,false])` → `{ score: 20, bestStreak: 2, totalAnswered: 5, correctAnswers: 2 }`; a 12-correct-then-3-wrong run pins the multiplier steps (compute the expected score by hand in the test); `verifyRun` returns `null` for: empty guesses, only two wrong, a sixth guess after the third wrong, more guesses than solutions; `plausibleTiming` true/false for one batch (20 answers need >= 14 000 ms) and for a second batch issued later (answers in batch 2 are bounded by batch 2's issue time).
- [ ] **Step 2: Run** `cd payload && pnpm vitest run tests/bonRules.test.ts` — Expected: FAIL (module missing).
- [ ] **Step 3: Implement** the four exports above in `payload/src/lib/bonRules.ts` (pure, no imports).
- [ ] **Step 4: Add the agreement test** to `website/src/tests/unit/composable/useBon.test.ts`: import `computeMultiplier as serverMultiplier` from `payload-app/bon-rules` and assert equality with `computeMultiplier` from `@composables/useBon` for streaks 0–25, so the two copies cannot drift.
- [ ] **Step 5: Run** both test files — Expected: PASS.
- [ ] **Step 6: Commit** `feat(bon): add server-side game rules`.

### Task 2: `bon-games` collection and migration

**Files:**
- Create: `payload/src/collections/BonGames.ts`, `payload/src/migrations/<timestamp>_bon_games.ts` (+ `.json` snapshot, generated)
- Modify: `payload/src/payload.config.ts` (register collection), `payload/src/migrations/index.ts` (generated), `payload/src/payload-types.ts` (regenerated)
- Test: `payload/tests/bonGames.test.ts`

**Interfaces:**
- Produces: collection slug `"bon-games"`, access `authenticatedOnly` (like `WordFeedback`), fields:
  - `visitor` text required, `token` text required unique, `status` select `playing|finished` required default `playing`
  - `cards` json required: `{ id: string; word: string; isReal: boolean; translation?: string }[]` in dealt order
  - `batches` json required: `{ issuedAt: number; start: number }[]`
  - `playerName` text, `score`, `bestStreak`, `totalAnswered`, `correctAnswers` numbers, `finishedAt` date
  - indexes: `{ fields: ["status", "score"] }`, `{ fields: ["token"], unique: true }`

- [ ] **Step 1: Write failing test** `payload/tests/bonGames.test.ts` (follow `payload/tests/wordFeedback.test.ts`): creating a row works; a second row with the same `token` fails with a unique violation; reading with `overrideAccess: false` and no user is denied.
- [ ] **Step 2: Run** it per `payload/CLAUDE.md` (test DB) — Expected: FAIL (unknown collection).
- [ ] **Step 3: Implement** the collection like `WordFeedback.ts` and register it in `payload.config.ts`.
- [ ] **Step 4: Generate** the migration with `pnpm cms:migrate:create bon_games` (through `scripts/with-env.sh`), check it only creates the new table and indexes (expand-only, see the expand/contract rule in `payload/CLAUDE.md`), regenerate `payload-types.ts` as `payload/CLAUDE.md` describes.
- [ ] **Step 5: Run** `bonGames.test.ts` and the access test suite (`payload/tests/access.test.ts`) — Expected: PASS.
- [ ] **Step 6: Commit** `feat(bon): add the bon-games collection`.

### Task 3: Deck dealing

**Files:**
- Create: `website/src/utils/bonDeck.ts`, `website/src/services/bonPool.ts`
- Modify: `website/src/components/games/BerlinerOderNicht.vue`
- Test: `website/src/tests/unit/components/games/BerlinerOderNicht.test.ts`, `website/src/tests/unit/utils/bonDeck.test.ts`

**Interfaces:**
- Produces (`bonDeck.ts`):
  - `export type DealtCard = { id: string; word: string; isReal: boolean; translation?: string }`
  - `export const BATCH_SIZE = 20`
  - `export function dealBatch(pool: { real: DealtCard[]; fake: DealtCard[] }, used: Set<string>, random?: () => number): DealtCard[]` — 10–15 real, remainder fake, shuffled, none in `used`; throws `Error("pool too small")` when a side cannot supply its share.
  - `export const toPublic = (c: DealtCard) => ({ id: c.id, word: c.word })`
- Produces (`bonPool.ts`): `export async function loadPool(): Promise<{ real: DealtCard[]; fake: DealtCard[] }>` — real = published words (`...siteRead()`, `depth: 0`, `pagination: false`, ids `r<wordId>`) with non-empty `berlinerisch` and a first non-empty translation (`translations[0].translation`), `translation` set on every real card; fake = `fakeWords` from `@/data/fakeWords` (ids `f<index>`); real part cached with `ttl()` from `@services/cache.ts`.

- [ ] **Step 1: Write failing tests** for `dealBatch` with a seeded `random`: length 20; real count between 10 and 15 over 200 seeds; no id in `used`; no duplicate ids; shuffled (not always real-first); `toPublic` has exactly the keys `id`, `word`; small pool throws.
- [ ] **Step 2: Run** `cd website && pnpm vitest run src/tests/unit/utils/bonDeck.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** `dealBatch`/`toPublic` (Fisher–Yates shuffle) and `loadPool`.
- [ ] **Step 4: Align the game's own filter:** in `website/src/components/games/BerlinerOderNicht.vue` (`onMounted`, the `.filter` on `fetchSearchIndex()`), also drop entries without `wordProperties.translations?.[0]`, so unranked/offline play uses the same pool; adjust `website/src/tests/unit/components/games/BerlinerOderNicht.test.ts` with a case where a word without translation is not offered.
- [ ] **Step 5: Run** `bonDeck.test.ts` (add a `loadPool` test: a published word without translation is not in `real`) and the `BerlinerOderNicht` test — Expected: PASS.
- [ ] **Step 6: Commit** `feat(bon): deal card batches on the server`.

### Task 4: API routes

**Files:**
- Create: `website/src/pages/api/bon/start.ts`, `next.ts`, `finish.ts`, `website/src/utils/bonSchema.ts`
- Modify: `website/src/utils/rateLimit.ts` (rules for `/api/bon/start` POST and `/api/bon/finish` POST, per-client; values are yours, `start` stricter than `next`)
- Test: `website/src/tests/unit/pages/api/bon.test.ts` (mock style of `word-feedback.test.ts` in the same folder)

**Interfaces:**
- Consumes: `verifyRun`, `plausibleTiming`, `LIVES` (Task 1); `dealBatch`, `toPublic`, `loadPool`, `BATCH_SIZE` (Task 3); collection `bon-games` (Task 2).
- Produces (`bonSchema.ts`): `finishSchema` (zod): `{ token: string, answers: { card: string; real: boolean }[] (max 400), playerName?: string }` with the `playerName` rules from Global Constraints (transform empty/missing to `"Anonym"`).
- Routes (all `POST`, JSON, `reply` from `@utils/apiReply.ts`, errors in the site's voice, German):
  - `start`: sets the visitor cookie via `visitorId(cookies, true)`. Deletes this visitor's `playing` games older than 24 h, creates a game (random 32-byte hex `token`, hashed visitor, first batch, `batches: [{ issuedAt: Date.now(), start: 0 }]`), returns `{ token, cards: toPublic[] }`.
  - `next`: body `{ token }`; game must exist, be `playing`, belong to the hashed visitor; deals a batch excluding all ids in `cards`, appends `cards` and a `batches` entry with `start = previous cards.length`, returns `{ cards }`. Max 50 batches per game.
  - `finish`: refuses with 400 when the request carries no visitor cookie (`visitorId(cookies, false)` undefined, so a client with blocked cookies never ranks); parses `finishSchema`; loads the game (`playing`, same visitor); maps each answer to the dealt card at the same index, requiring `answers[i].card === cards[i].id`; `verifyRun(solutions, guesses)` and `plausibleTiming(batches, answered, Date.now())` must pass, else 400 `Ungültiges Spiel`; marks the row finished with a conditional `payload.update({ where: { id: { equals }, status: { equals: "playing" } } })` and refuses when it updated 0 rows (replay); returns `{ score, bestStreak, totalAnswered, correctAnswers, rank, totalGames }` where `rank = 1 + count(finished, score > own)` and `totalGames = count(finished)`.

- [ ] **Step 1: Write failing tests** against the route handlers with a mocked/real test Payload (same approach as `word-feedback.test.ts`): start returns 20 cards with keys `id`,`word` only and sets a cookie; next excludes earlier ids; finish with a hand-built winning-then-3-wrong run returns the expected score and `rank: 1`; a second finished game with lower score ranks 2 of 2 and equal scores share rank 1; each Review Focus line gets one test (double finish → second is 400/409, other cookie → 404, wrong card order → 400, two wrongs only → 400, answers after third wrong → 400, `playerName` with `http://x` → 400, 10 000-char name → 400, timing too fast → 400, empty pool → 5xx with error body).
- [ ] **Step 2: Run** `cd website && pnpm vitest run src/tests/unit/pages/api/bon.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** `bonSchema.ts`, the three routes and the rate-limit rules as specified. Use `isUniqueViolation`-style handling only where a unique token collision is possible (retry once with a new token).
- [ ] **Step 4: Run** the test file and `pnpm vitest run src/tests/unit/utils` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(bon): add start, next and finish endpoints`.

### Task 5: Docs, lint, full run

**Files:**
- Modify: `website/CLAUDE.md` (extend the **BON game** bullet: server-dealt decks, three endpoints, collection, known limits), `payload/CLAUDE.md` (one line for `bon-games` access/privacy)

- [ ] **Step 1: Document** the flow, the "only complete games count" rule, the cookie/hash privacy note and the known limits from the spec (waiting bots, many pseudonyms) in the two CLAUDE.md files.
- [ ] **Step 2: Run** `pnpm lint` (autofixes), `pnpm format:check`, `pnpm test:unit`, `pnpm cms:test`, and `pnpm typechecking` once — Expected: all pass, no unrelated diffs.
- [ ] **Step 3: Commit** `docs(bon): document server-verified results`.
