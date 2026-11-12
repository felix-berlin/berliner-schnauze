# BON Redesign v3.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the „Berliner oder nicht?“ handoff v3.1 (start, game, feedback, result, player code, leaderboard with name filter). The game plays on server-dealt cards, and the server reveals each answer.

**Architecture:** A new `POST /api/bon/answer` stores every answer in the game's `cards` JSON and returns the solution for that one card. `finish` then scores the stored answers. `useBon.ts` is rewritten as a phase machine on top of the API, and no longer uses the search index or `fakeWords` in the client. The components are rebuilt on the DS v3.1 classes that already exist in `website/src/styles/components/`.

**Tech Stack:** Astro API routes, Payload Local API, Vue 3 `<script setup>`, Nanostores, VueUse, `uqr` (already a dependency), Vitest, Playwright.

**Spec:** `docs/design/bon/SPEC.md` (handoff, copied into the repo in Task 0). Mocks are in `docs/design/bon/design/*.dc.html`, tokens and the DS bundle in `docs/design/bon/ds/`. The copy in the spec is binding, except for the deviations listed below.

## Global Constraints

- **Wait for the other session:** the player-code session (`bon-player-code-exec`, Task 5) works in the same worktree. Start coding and committing only once that list is closed and `git status` shows nothing of theirs.
- Path stays `/games/berliner-oder-nicht` (`playerLink`, `BON_FRAGMENT_SCRIPT` and the JSON-LD hardcode it). No `/spiele/…`.
- The player code stays the shipped `XXXX-XXXX-XXXX` (12 characters from `CODE_ALPHABET`, `payload/src/lib/bonPlayer.ts`). The placeholder is „XXXX-XXXX-XXXX“. The Ä/AE hint and the BÄR prefix normalization from §12 are dropped. The hint reads: „Groß- und Kleinschreibung, Leerzeichen und Bindestriche sind egal.“
- The non-Berlin pool has two categories (`fakeWords.ts`: `invented` 499, `hochdeutsch` 301). The copy follows that (user correction):
  - „So jeht’s“: „Nach rechts wischen oder „Ja“ = Berlinerisch, nach links oder „Nee“ = erfunden oder Hochdeutsch.“
  - Intro text: „Echtes Berlinerisch – oder erfunden oder Hochdeutsch? Wisch oder tipp – du hast 3 Leben.“
  - Card label: „Berlinerisch oder nich?“
  - Buttons: „← Nee, nich Berlinerisch“ / „Ja, Berlinerisch →“
  - Wrong answer, sentence by card: real word „Dit is echtes Berlinerisch:“, `invented` „Dit Wort is erfunden – jibt’s nich.“, `hochdeutsch` „Dit is Hochdeutsch, keen Berlinerisch.“
  - „Deine Runde“: the label is „erfunden“ or „Hochdeutsch“. Strikethrough only for `invented`. Hochdeutsch words are not strikethrough, but are muted and have no link.
- Open point 1 is settled: the multiplier already counts for the answer that reaches the threshold (`streak++` before `computeMultiplier`, locked by the agreement test). Keep the export `computeMultiplier` in `useBon.ts`.
- **Stays from the old version (user):** the swipe hint on the first card (hand icon, left/right animation, `showSwipeHint` in `BonCard.vue`, shown once via `$bonStats.hasSeenIntro`), plus vibration (`useVibrate`: right `[50]`, wrong `[80, 60, 80]`).
- **Dropped:** the correct-answer toast (`createToastNotify` in `useBon`), `ConfettiEffect` in the game, resume (`$savedBon`, `stores/savedBon.ts`, „Weiterspielen“/„Neu starten“), the client-side `fetchSearchIndex` and `fakeWords` load.
- Radius at most `--radius-sm`. No pills. `--success`/`--danger` only for stripes and icons. The game word is `font-family: var(--font-body)` 700. BEMIT, unscoped SCSS, one file per component under `src/styles/components/`, breakpoints only via `mx.breakpoint`. The 808px from the spec = `mx.breakpoint("word")`.
- Use the existing global classes, never rebuild them: `.c-band`, `.c-choice`, `.c-button--primary`, `.c-section-card*`, `.c-state--{error,offline,done}`, `.c-skeleton*`, `.c-badge--strong`, `.c-headword`, `.c-textlink`. Add only classes that are missing (game-specific ones under `c-bon-*`).
- Every UI task counts as done only after a browser check in light and dark mode, at 390px and 1280px (`website/CLAUDE.md`, Design Context). Dev server only with `NO_DEV_TOOLBAR=1`, never Playwright against berliner-schnauze.wtf.

## Review Focus

1. **Double tap / double swipe in the feedback phase:** two quick inputs must not send two `answer` calls for the same card, and must not answer the next card. Server: second call for the same position → 409. Client: input lock 250 ms, and only one `answer` in flight (Task 1, Task 4).
2. **A script reads the solutions in advance:** `answer` reveals only the card just answered. A position other than the next unanswered one → 409. Every response of `start`/`next` contains only `{id, word}` (Task 1).
3. **Blocked cookies:** playing must still work (`next`/`answer` find the game by token alone). `finish` without a cookie → the result shows „Platz –“ and „Platzierung jerade nich da“, with score and stats computed in the client (Task 1, Task 6).
4. **„Spiel beenden“ before the third mistake:** `verifyRun` rejects that, `finish` answers 400. The client still shows the result (without a rank) with the line „Du hast dit Spiel beendet.“ instead of „Drei Fehler – dit Spiel is vorbei.“ (Task 6).
5. **Network gone mid-game:** a failing `next` or `answer` leads to `phase: 'error'`. Points, lives and streak stay. „Nochmal versuchen“ repeats exactly the failed call (Task 2).

---

### Task 0: Handoff into the repo

**Files:**
- Create: `docs/design/bon/SPEC.md` (from `bon-handoff.zip`, identical to `SPEC (1).md`), `docs/design/bon/design/*.dc.html`, `docs/design/bon/ds/*`, `docs/design/bon/README.md` (3 lines like `docs/design/wortseite/README.md`)
- Modify: `website/CLAUDE.md` (BON paragraph: pointer to `docs/design/bon/SPEC.md`, „copy binding, deviations in the plan“)

- [ ] **Step 1:** Unpack the zip into `docs/design/bon/`. In `SPEC.md`, write the deviations from „Global Constraints“ into §1 (path), §2 (settled assumption), §6/§7/§9 (copy erfunden/Hochdeutsch), §12 (code format) and §16 (point 1 settled). Leave the user's `SPEC (1).md` and `bon-handoff.zip` in the root untouched; they are not committed.
- [ ] **Step 2: Commit** `docs(bon): add the v3.1 handoff`

### Task 1: Server: reveal answers one at a time

**Files:**
- Modify: `website/src/utils/bonDeck.ts` (`DealtCard`), `website/src/services/bonPool.ts`, `website/src/services/bonGame.ts`, `website/src/utils/bonSchema.ts`, `website/src/pages/api/bon/next.ts`, `website/src/pages/api/bon/finish.ts`, `website/src/utils/rateLimit.ts`
- Create: `website/src/pages/api/bon/answer.ts`
- Test: `website/src/tests/unit/pages/api/bon.test.ts`, `website/src/tests/unit/utils/bonDeck.test.ts`, `website/src/tests/unit/utils/rateLimit.test.ts`

**Interfaces:**
- Produces:
  - `DealtCard = { id; word; isReal; translation?; slug?: string; category?: "invented" | "hochdeutsch"; answer?: boolean; answeredAt?: number }`. The last two are set only by `answer`. Everything lives in `bon-games.cards` (JSON), **so no migration**.
  - `answerSchema = z.strictObject({ token, card: z.string().max(20), real: z.boolean() })`. `finishSchema` loses `answers` (no client uses it yet).
  - `findGame(payload, token, visitor?: string)`: without `visitor`, it looks up by token alone.
  - `POST /api/bon/answer` → 200 `AnswerReply = { correct: boolean; isReal: boolean; translation?: string; slug?: string; category?: "invented" | "hochdeutsch"; lives: number; gameOver: boolean }`. 400 invalid input, 404 unknown/not `playing`, 409 wrong position, already answered or already 3 mistakes.
  - `POST /api/bon/finish` body `{ token, playerName? }`. The response stays the same (`score, bestStreak, totalAnswered, correctAnswers, rank, totalGames`).

- [ ] **Step 1: Write the failing tests** in `bon.test.ts` (existing in-memory fake):
  - `answer reveals only the answered card`: start, then answer `"0"`. The response contains `isReal`/`translation`/`slug` of card 0, and the stored card 0 has `answer` + `answeredAt`. The `start` response has only `{id, word}` per card.
  - `answer rejects any position but the next unanswered` → `"1"` before `"0"` = 409. `"0"` twice = 409.
  - `answer rejects after the third wrong answer` → 409, `gameOver: true` in the third response, `lives: 0`.
  - `next and answer work without the visitor cookie` (token only).
  - `finish scores the stored answers` → three wrong answers stored, `finish {token}` returns the `verifyRun` result. A `finish` before the third mistake → 400.
  - `finish keeps the timing check` (existing test, adapted to stored answers).
  - `bonDeck.test.ts`: `toPublic` still gives only `{id, word}`, even for a card with `slug`/`category`/`answer`.
  - `rateLimit.test.ts`: rule `{ max: 450, method: "POST", prefix: "/api/bon/answer", windowMs: 10 * 60_000 }` exists.
- [ ] **Step 2:** `(cd website && rtk vitest run src/tests/unit/pages/api/bon.test.ts src/tests/unit/utils/bonDeck.test.ts src/tests/unit/utils/rateLimit.test.ts)`: FAIL.
- [ ] **Step 3: Implement.**
  - `bonPool`: real cards get `slug: w.slug`, fake cards `category: f.category`.
  - `answer.ts`: the next position is `cards.findIndex(c => c.answer === undefined)`. `lives = LIVES − wrong`. Serialize per token with an in-process `Set` like `finish.ts`, including the `shortcut:` comment.
  - `answer` does **not** check timing. That stays only in `finish`, so a fast honest player never breaks mid-game.
  - `finish`: `guesses = cards.filter(c => c.answer !== undefined).map(c => c.answer)`, then `verifyRun` and `plausibleTiming` as before.
- [ ] **Step 4:** Same command: PASS. `pnpm lint` on the changed files.
- [ ] **Step 5: Commit** `feat(bon): reveal each answer from the server`

### Task 2: `useBon` as a phase machine on top of the API

**Files:**
- Create: `website/src/services/bonGameApi.ts`
- Modify (rewrite): `website/src/composable/useBon.ts`
- Delete: `website/src/stores/savedBon.ts`, the resume parts in `website/src/tests/unit/stores/bonPersistence.test.ts`
- Test: `website/src/tests/unit/composable/useBon.test.ts` (rewrite, `fetch` mocked), `website/src/tests/unit/services/bonGameApi.test.ts`

**Interfaces:**
- Consumes: `AnswerReply`, the routes from Task 1.
- Produces:
  - `bonGameApi.ts`: `startRun(): Promise<{ token: string; cards: PublicCard[] }>`, `nextCards(token): Promise<PublicCard[]>`, `answerCard(token, card: string, real: boolean): Promise<AnswerReply>`, `finishRun(token, playerName?: string): Promise<FinishResult | undefined>`. `finishRun` returns `undefined` on 4xx/5xx; it never throws. The others throw `Error` with the server's `error` text (pattern: `post()` in `bonPlayerApi.ts`, reuse it, export it there).
  - `type PublicCard = { id: string; word: string }`. `type FinishResult = { score; bestStreak; totalAnswered; correctAnswers; rank?: number; totalGames?: number }`.
  - `type RoundEntry = { word: string; correct: boolean; isReal: boolean; translation?: string; slug?: string; category?: "invented" | "hochdeutsch"; points: number; multiplier: number }`
  - `useBon()` → `{ phase: Ref<'intro'|'play'|'feedback'|'loading'|'error'|'over'>, lives, score, streak, bestStreak, multiplier, card: Ref<PublicCard|null>, cardInStack: Ref<number> /*1–20*/, stack: Ref<number>, history: Ref<RoundEntry[]>, last: Ref<RoundEntry|null>, result: Ref<FinishResult|undefined>, endedEarly: Ref<boolean>, start(), answer(real: boolean), advance(), retry(), end() }`
  - `computeMultiplier` stays exported unchanged.

- [ ] **Step 1: Write the failing tests:**
  - `start deals the first card` → `phase 'play'`, `cardInStack 1`, `stack 1`.
  - `answer goes to feedback with points` → correct on streak 3 = `last.points 20`, `multiplier 2`.
  - `third wrong answer ends the game` → after `advance()`, `phase 'over'`, `finishRun` called once, `result` set.
  - `prefetches the next stack at card 15, once` → exactly one `next` call, even with quick answers. After card 20, `advance()` without `loading` when the prefetch is already there.
  - `stack switch without prefetch shows loading`, then `play`, `stack 2`, `cardInStack 1`.
  - `a failed next or answer keeps score, lives and streak`, `phase 'error'`, `retry()` repeats the same call.
  - `answer is ignored while one is in flight` and outside `play`.
  - `end() before the third mistake` → `endedEarly true`, `phase 'over'`, `result undefined` when `finish` returns 400.
  - `over updates $bonStats` (highScore, bestStreak, totalGamesPlayed, …, as before) and tracks the existing `trackEvent`s.
- [ ] **Step 2:** `(cd website && rtk vitest run src/tests/unit/composable/useBon.test.ts src/tests/unit/services/bonGameApi.test.ts)`: FAIL.
- [ ] **Step 3: Implement.**
  - Score, streak and lives are computed in the client from `AnswerReply.correct` with `computeMultiplier`. The client copy is only for display; the ranking comes from `finish`.
  - In `answer`, at the third mistake the phase stays `feedback`. Only `advance()` calls `finishRun` (spec §7: 2.5 s feedback, then finish).
- [ ] **Step 4:** PASS. Run `website/src/tests/unit/**/bonRules*` or the agreement test (grep `computeMultiplier` in `payload/src/**/*.test.ts`): PASS.
- [ ] **Step 5: Commit** `feat(bon): play on server-dealt cards`

### Task 3: Shell and start (`intro`)

**Files:**
- Modify (rebuild): `website/src/components/games/BerlinerOderNicht.vue` (= `BonGame` from the spec; the file name stays because of the page import and tests), `website/src/styles/components/_berliner-oder-nicht.scss`
- Create: `website/src/components/games/BonIntro.vue`, `website/src/styles/components/_bon-intro.scss`
- Modify: `website/src/pages/games/berliner-oder-nicht.astro` (remove the `u-sr-only` h1; the visible `h1.c-band` comes from the component)
- Test: `website/src/tests/unit/components/games/BerlinerOderNicht.test.ts` (rewrite), `BonIntro.test.ts`

**Interfaces:**
- Consumes: `useBon()` (Task 2), `$bonStats` (`playerName`, `highScore`, `hasSeenIntro`), `BonPlayerCode` (restyled in Task 7, the props come from there).
- Produces: `BonIntro` props `{ highScore: number; offline: boolean; linkRedeem: boolean }`, emits `start(name: string)`. The name is written to `$bonStats.playerName`, max 24.

- [ ] **Step 1: Write the failing tests:**
  - Intro renders the h1 „Berliner oder nicht?“, the name field (`maxlength 24`, placeholder „Anonym“, pre-filled from `$bonStats`), „Los jeht’s“, „Dein Rekord: {n} Punkte“ (only when `highScore > 0`), and „So jeht’s“ with the „erfunden oder Hochdeutsch“ line.
  - `offline` → `.c-state--offline` with the spec text, and „Los jeht’s“ has `aria-disabled="true"` and starts nothing.
  - „Spielercode einlösen“ opens `BonPlayerCode` in place, in redeem mode.
  - With a code from the link (`takeRedeemCode()`), the code card sits at the top of the left column (spec §6, last paragraph).
- [ ] **Step 2:** FAIL. **Step 3:** Implement the layout from §3 (mobile one column; from `word`, 2 columns `1.1fr / 1fr`, `gap: 3rem`, `max-width: 1060px`, padding `56px 24px 96px`; mobile `1.5rem 1rem 3rem`). Offline comes from `useOnline()` (VueUse). Exact sizes come from `BonGame.dc.html`, prop `start=intro|offline|link`.
- [ ] **Step 4:** PASS. Browser check light/dark × 390/1280.
- [ ] **Step 5: Commit** `feat(bon): redesign the start screen`

### Task 4: HUD, card, answers, swipe

**Files:**
- Modify (rebuild): `website/src/components/games/BonHUD.vue`, `website/src/components/games/BonCard.vue` and their SCSS files
- Test: `BonHUD.test.ts`, `BonCard.test.ts` (rewrite)

**Interfaces:**
- Consumes: `useBon` slices.
- Produces:
  - `BonHUD` props `{ lives; score; streak; multiplier; playerLabel: string }`. `playerLabel` = name, or „Anonym“. The `#K7QX` tag comes in Task 11.
  - `BonCard` props `{ word; cardInStack; stack; showSwipeHint: boolean; locked: boolean }`, emits `answer(real: boolean)`.
  - The answer buttons live in `BonCard`. The keyboard listeners (←/→) live on the game component while it is mounted (`useEventListener` on its root element or `document`, removed on unmount), never on `window` outside the component's lifetime.

- [ ] **Step 1: Write the failing tests:**
  - HUD: `role="img"` with „Noch {n} Leben von 3“. Points with `aria-live="polite"`. „noch {k} bis ×{m}“, at ×5 „volle Pulle: ×5“. 4 multiplier fields: the current one has the active class, the ones reached have the wash class.
  - Card: `h2` with the word, „Karte {n} von 20 · Stapel {s}“. Buttons with `aria-keyshortcuts` ArrowLeft/ArrowRight and the labels from Global Constraints.
  - Swipe: a drag over 30 % of the width, or a velocity > 0.5 px/ms, emits `answer`; below that, no emit. Pointer events are simulated as in the old `BonCard.test.ts`.
  - `locked` → buttons, keys and swipe emit nothing.
  - `showSwipeHint` renders the hand hint (old behavior kept).
- [ ] **Step 2:** FAIL. **Step 3:** Implement per §7 and §10. The swipe code comes from the old `BonCard.vue` (rotation ±14°, `touch-action: pan-y`, overlay „← Nee“/„Ja →“ `aria-hidden`, spring-back 200 ms). The hint line under the buttons is „Jeht ooch mit Wischen.“ / from `word` „Jeht ooch mit den Pfeiltasten.“. Below that, the `.c-textlink` „Spiel beenden“.
- [ ] **Step 4:** PASS. Browser check.
- [ ] **Step 5: Commit** `feat(bon): redesign the game card and HUD`

### Task 5: Feedback with timer, pause and lock

**Files:**
- Create: `website/src/components/games/BonFeedback.vue`, `website/src/styles/components/_bon-feedback.scss`
- Modify: `BerlinerOderNicht.vue` (feedback slot, vibration, input lock)
- Test: `website/src/tests/unit/components/games/BonFeedback.test.ts`, `BerlinerOderNicht.test.ts`

**Interfaces:**
- Consumes: `RoundEntry` (Task 2), `advance()`.
- Produces: `BonFeedback` props `{ last: RoundEntry; gameOver: boolean }`, emits `next`. It controls its own timer; the parent only calls `advance()` on `next`.

- [ ] **Step 1: Write the failing tests** (`vi.useFakeTimers()`):
  - right: `next` after exactly 900 ms. wrong: after 2500 ms. `gameOver`: 2500 ms plus the hint „Gleich kommt dein Ergebnis – tippen für sofort.“
  - `pointerenter`/`pointerdown` stops the timer. After `pointerleave`/`pointerup`, `next` follows 1200 ms later.
  - A click on the card, a swipe, ←/→/Enter/Space → `next` immediately.
  - Copy per §7 table: right „Richtig!“, from ×3 „Knorke, weiter so!“, „+{p} Punkte (×{m})“. Wrong „Daneben!“, the sentence per category (Global Constraints), „−1 Leben · Serie futsch“. For real words „Mehr zu „{Wort}“ ↗“ to `/wort/{slug}`, `target="_blank" rel="noopener"`.
  - `role="status"` text, e.g. „Richtig! Knorke heißt großartig. Plus 20 Punkte.“ / „Daneben! Dit Wort is erfunden. Noch 1 Leben.“
  - Shell: after an answer and after `next`, input is ignored for 250 ms. Focus stays on the button that was pressed (or its position).
  - Shell: a wrong answer calls `vibrate([80, 60, 80])`, a right one `vibrate([50])`.
- [ ] **Step 2:** FAIL. **Step 3:** Implement. The timer bar is 3px, `--color-muted` at 50 %, `scaleX(1→0)` linear over the standing time. Under `prefers-reduced-motion` there is no bar animation, but the standing time stays. The pause stops the bar too (`animation-play-state`).
- [ ] **Step 4:** PASS. Browser check.
- [ ] **Step 5: Commit** `feat(bon): add answer feedback with pausable timer`

### Task 6: Stack switch, error, result, „Deine Runde“

**Files:**
- Modify (rebuild): `website/src/components/games/BonResult.vue`, `_bon-result.scss` (or rename the existing file; check that one exists)
- Modify: `BerlinerOderNicht.vue` (`loading`/`error`)
- Test: `BonResult.test.ts` (rewrite), `BerlinerOderNicht.test.ts`

**Interfaces:**
- Consumes: `result`, `history`, `endedEarly`, `bestStreak`, `$bonStats.highScore` (read **before** `over` updates it), `buildShareUrl`/`accuracyPercent` from `utils/bonShare.ts`.
- Produces: `BonResult` props `{ result?: FinishResult; history: RoundEntry[]; score; bestStreak; previousHighScore: number; playerName: string; endedEarly: boolean }`, emits `restart`.

- [ ] **Step 1: Write the failing tests:**
  - `loading`: skeleton with „Stapel {n} jeschafft – neue Karten werden jemischt …“, buttons `aria-disabled`.
  - `error`: `.c-state--error` with the §8 text, `role="alert"`, „Nochmal versuchen“ → `retry()`.
  - Result: badge „Neuer Rekord!“ only when `score > previousHighScore`. h1 „Aus die Maus, {Name}!“ / without a name „Aus die Maus!“. Below it „Drei Fehler – dit Spiel is vorbei.“, or with `endedEarly` „Du hast dit Spiel beendet.“
  - Stats as `<dl>`: rank 12 of 400 → „besser als 97 %“ (`round((total − rank) / total × 100)`). Without `rank` → „–“ and „Platzierung jerade nich da“. Hit rate „{c} von {t} richtig“. Best streak „in Folge richtig · bis ×{m}“.
  - Share: with `navigator.share` it is called with the §9 text. Without it, `clipboard.writeText` and the label becomes „Text kopiert“.
  - „Dein Rekord: {n} Punkte · gespeichert auf diesem Jerät“.
  - „Deine Runde“: one row per `history` entry in order. ✓/✗ with `aria-label` „richtig“/„falsch“. Real words link to `/wort/{slug}` with „→“. `invented` is strikethrough + „erfunden“, `hochdeutsch` + „Hochdeutsch“, both without a link. Footer link „Alle Wörter im Wort-Index“ to `/`.
  - `BonPlayerCode` shows in the „Noch kein Code“ state.
  - „Hier stehste“ is **not** rendered yet (comes in Task 11).
- [ ] **Step 2:** FAIL. **Step 3:** Implement the layout from §3/§9 (mobile one column in the order stats → actions → player code → Deine Runde; from `word`, 2 columns `1fr / 1fr`, `gap: 2.5rem`). The share URL comes from `buildShareUrl` (existing share page stays). Check `BonShareView`: its tests stay green.
- [ ] **Step 4:** PASS. Browser check.
- [ ] **Step 5: Commit** `feat(bon): redesign the result screen`

### Task 7: Restyle the player code to §12

**Files:**
- Modify: `website/src/components/games/BonPlayerCode.vue`, `website/src/styles/components/_bon-player-code.scss`
- Test: `website/src/tests/unit/components/BonPlayerCode.test.ts`

**Interfaces:**
- Consumes: `createPlayerCode`, `redeemPlayerCode`, `applyPlayerStats`, `playerLink`, `takeRedeemCode` (`bonPlayerApi.ts`, unchanged), `normalizeCode` from `payload-app/bon-player` **only if it is client-safe**. It imports `node:crypto`, so no: normalize in the client to „uppercase, strip whitespace/`-`/`_`, check 12 characters from the alphabet“ and copy the alphabet into `utils/`. The server normalizes again.
- Produces: props `{ mode?: 'none' | 'redeem' }` (start: `redeem` via „Spielercode einlösen“), emits `close`.

- [ ] **Step 1: Write the failing tests** for the states that the existing backend supports:
  - 1 „Noch kein Code“: title „Auf anderem Jerät weiterspielen“, `.c-choice` „Spielercode holen“, textlink „Hab schon ’n Code“.
  - 2 Code shown: „Dein Spielercode für {Name}:“, code in 3 blocks on `--surface-chip`, `user-select: all`, and an `aria-label` that spells it character by character. „Code kopieren“→„Code kopiert“, „Link kopieren“→„Link kopiert“, „QR-Code zeigen“/„QR-Code ausblenden“. Warning stripe with the §12 text.
  - 2b QR: `renderSVG` from `uqr` with `ecc: "M"`, `border` so that it is 200px with a 12px white border, black on white in dark mode too. `role="img"` + label. Caption „Mit dem Handy scannen – dann biste dort gleich als {Name} drin.“
  - 3 Redeem: field attributes from §12, placeholder „XXXX-XXXX-XXXX“, the hint from Global Constraints, `aria-describedby` on hint and error. Invalid format → error without a server call.
  - 3a Wrong: `aria-invalid`, „Den Code kenn ick nich.“ The server error text in `aria-live="assertive"`.
  - 3b Locked: on HTTP 429 „Zu ville Versuche.“ / „Mach ma Pause und probier’s in 15 Minuten nochmal.“, button `aria-disabled`.
  - 4 Success / 5 Link: „Willkommen zurück, {Name}!“ with the success text. The link variant gets a skeleton „Spielercode aus dem Link wird einjelöst …“ first.
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Not part of this plan** (no backend yet): 2c/2d new code, 3c switch with confirmation, „Noch {n} Versuche“ (the server returns no count). Leave them out of the UI, with no placeholder.
- [ ] **Step 4:** PASS. Browser check, including the QR in dark mode.
- [ ] **Step 5: Commit** `feat(bon): restyle the player code card`

### Task 8: Ranking server: periods, best game, tag, endpoint

Rulings for the spec's open points (my call, noted in `docs/design/bon/SPEC.md` §16):
- **Point 4:** each pseudonym counts with its **best game in the period**. The pseudonym is `player` if set, otherwise `visitor`. On a tie, the earlier `finishedAt` wins.
- **Point 4:** the tag shows **only for „Anonym“**.
- **Point 3:** after a switch, the old pseudonym is reachable only through its own code, as built.

**Files:**
- Create: `payload/src/lib/bonRanking.ts` (pure, export `payload-app/bon-ranking` in `payload/package.json` like `bon-rules`), `website/src/services/bonRanking.ts` (Payload query + `ttl` cache), `website/src/pages/api/bon/leaderboard.ts`
- Modify: `website/src/pages/api/bon/start.ts` (response gains `tag`), `website/src/utils/rateLimit.ts`
- Test: `payload/src/lib/bonRanking.test.ts` (or wherever `bonRules` tests live), `website/src/tests/unit/pages/api/bon.test.ts`

**Interfaces:**
- Produces:
  - `type Period = "week" | "month" | "all"`.
  - `periodStart(period, now: Date): Date | undefined`. Week = Monday 00:00 Europe/Berlin, month = the 1st 00:00 Europe/Berlin, all = `undefined`.
  - `bonTag(identity: string): string`: 4 characters from `CODE_ALPHABET` over `sha256("bon-tag:" + identity)`, byte `% 31`. The bias is acceptable, so note it with a `shortcut:` comment.
  - `rankGames(games: RankInput[]): RankedEntry[]` with `RankInput = { id: number; identity: string; name: string; score; correctAnswers; totalAnswered; bestStreak; finishedAt: string }` and `RankedEntry = { rank; id; identity; name; tag?: string; score; accuracy /*0–100 rounded*/; bestStreak; finishedAt }`. It groups by identity (keeping the best game), sorts by score desc then `finishedAt` asc, and assigns rank 1..n (equal score = consecutive ranks, no shared rank).
  - `GET /api/bon/leaderboard?period=week|month|all&offset=0&limit=25` (limit 0–25, zod-checked; invalid → 400) → `{ entries: PublicEntry[]; total: number; me?: { rank; score; accuracy; bestStreak; around: PublicEntry[] /*own row + up to 2 above/below*/ } }`. `PublicEntry = RankedEntry` without `identity`, plus `isMe?: true`. „me“ = the identity from the `bon_player` cookie (`playerFromCookie`), otherwise `bonVisitor(visitor cookie)`. `visitorId(cookies, false)` must not set a cookie.
  - `POST /api/bon/start` → `{ cards, token, tag }` (the tag of the current identity, for the HUD „Anonym #K7QX“).
  - Rate-limit rule `{ max: 60, method: "GET", prefix: "/api/bon/leaderboard", windowMs: 10 * 60_000 }`.

- [ ] **Step 1: Write the failing tests:**
  - `periodStart`: Sunday 23:30 Berlin still belongs to the old week, Monday 00:00 Berlin starts the new one. The 1st of the month around a DST switch.
  - `rankGames`: 3 games of one identity → one row with the best score. Tie → earlier first. Accuracy `round(c/t*100)`. A tag only for name „Anonym“. `bonTag` is stable and uses only `CODE_ALPHABET`.
  - Route: only `status: finished` with `finishedAt >= periodStart`. `offset`/`limit` slice. `me.around` for rank 1 has no rows above, for the last rank none below. Without a cookie, no `me`. `identity` never appears in the response.
  - `start` returns a 4-character `tag`.
- [ ] **Step 2:** FAIL. **Step 3:** Implement. `services/bonRanking.ts` loads the finished games of the period with `pagination: false, depth: 0, select` (only the needed fields), behind `ttl(60_000)` per period. It needs `shortcut: whole period in memory, move to SQL (DISTINCT ON) when bon_games grows past ~50k rows`. Names come through `displayName()` from Task 9. Until Task 9 exists, the name is shown unchanged.
- [ ] **Step 4:** PASS, and `pnpm --filter payload-app test` for the new lib.
- [ ] **Step 5: Commit** `feat(bon): add the leaderboard endpoint`

### Task 9: Name filter and „Namen melden“ (launch blocker §14)

**Files:**
- Create: `payload/src/lib/bonNames.ts` (pure, export `payload-app/bon-names`), `website/src/pages/api/bon/report-name.ts`, a Payload migration (rule: `.claude/rules/payload-migrations.md`, expand only, with a working `down` and `IF EXISTS`)
- Modify: `payload/src/collections/BonGames.ts` (fields `nameReports: number, default 0`, `nameHidden: checkbox, default false`, both editable in the admin), `website/src/utils/bonSchema.ts` (`playerName` through `cleanName`), `website/src/services/bonRanking.ts`, `website/src/utils/rateLimit.ts`, `payload/src/payload-types.ts` (regenerate)
- Test: `payload/src/lib/bonNames.test.ts`, `website/src/tests/unit/pages/api/bon.test.ts`

**Interfaces:**
- Produces:
  - `isOffensiveName(name: string): boolean`: normalizes (lowercase, umlauts → base letters, `0→o 1→i 3→e 4→a 5→s 7→t @→a $→s`, strips everything except a–z). It then checks for substrings from a short list (insults, slurs, Nazi codes like `heil`, `hitler`, `88` before normalization). The list lives in the same file as `const BLOCKED: string[]`.
  - `cleanName(name: string): string`: returns „Anonym“ when `isOffensiveName`, otherwise the name.
  - `displayName(game: { playerName; nameHidden; nameReports }): string`: „Anonym“ when `nameHidden || nameReports >= NAME_REPORT_LIMIT` (`= 3`).
  - `POST /api/bon/report-name { id: number }` → 204. It increments `nameReports` once per visitor and game (in memory `Set` of `bonVisitor + id`, `shortcut:` comment). When the limit is reached it mails the editors through the existing `notifyEditors` (pattern from the comment reports). Unknown id → 404. Rate limit `{ max: 10, method: "POST", prefix: "/api/bon/report-name", windowMs: 10 * 60_000 }`.
  - `finish` stores `cleanName(playerName)`, and so does the player name update.
- [ ] **Step 1: Write the failing tests:**
  - `isOffensiveName` catches `"H1tler"`, `"A r s c h"`, `"FICK"`, and does not catch `"Klaus"`, `"Schnitzel"`, `"Anonym"`. The list is short and German-focused; false positives on common first names are tested (`"Hannelore"`, `"Ingo"`).
  - `finish` with an offensive name stores „Anonym“.
  - `report-name` 3× from different visitors → the leaderboard shows „Anonym“ + tag. The same visitor twice → counts once.
- [ ] **Step 2:** FAIL. **Step 3:** Implement. Create the migration through `scripts/with-env.sh pnpm --filter payload-app migrate:create` (it needs Infisical; if that fails, report it to the coordinator, do not write it by hand without `down`).
- [ ] **Step 4:** PASS. Run the payload migration test (`pnpm --filter payload-app test`).
- [ ] **Step 5: Commit** `feat(bon): filter and report player names`

### Task 10: Leaderboard page

**Files:**
- Create: `website/src/pages/games/berliner-oder-nicht/rangliste.astro` (Layout, `<BonLeaderboard client:load />`), `website/src/components/games/BonLeaderboard.vue`, `website/src/styles/components/_bon-leaderboard.scss`, `website/src/services/bonLeaderboardApi.ts`
- Modify: `website/src/components/games/BonIntro.vue` (link „Rangliste“ below the start; my call), sitemap only if the game page is in it (grep `berliner-oder-nicht` in `pages/sitemap-0.xml.ts`/services and add it the same way)
- Test: `website/src/tests/unit/components/games/BonLeaderboard.test.ts`

**Interfaces:**
- Consumes: `GET /api/bon/leaderboard` (Task 8), `POST /api/bon/report-name` (Task 9), `BonPlayerCode` `mode: 'redeem'` (Task 7).
- Produces: `fetchLeaderboard(period, offset, limit): Promise<LeaderboardReply>`, `reportName(id): Promise<void>`. The types are re-exported from `payload-app/bon-ranking` (type-only import, client-safe).

- [ ] **Step 1: Write the failing tests** (copy from §11):
  - Header: textlink „← Berliner oder nicht?“, `h1.c-band` „Rangliste“, „{n} Spiele · diese Woche“. Period as a `.c-choice` group with `aria-pressed`, Diese Woche by default. A switch loads anew with `offset 0`.
  - List as `<ol aria-label="Rangliste Diese Woche">`, „Platz {n}“ visually hidden. Own row `aria-current="true"` + „du“. Anonymous rows „Anonym“ + `#TAG` (small, muted). Ranks 1–3 have the accent class.
  - Mobile (`useMediaQuery` below `word`): top 10, „···“, own row ± 1 neighbour (from `me.around`), fixed bar „{rank}. Du · {score} Punkte · von {total} · besser als {pct}“ + „Zu mir“ (scrolls to the own row). Desktop: 25 rows + card „Dein Platz“ (rank, points, meta, „Zu mir springen“, „Nochmal spielen“ → `/games/berliner-oder-nicht`, cookie hint from §11).
  - Footer „Platz 1–{n} von {total}“ + „Mehr laden“ (next 25, appended). Below it: „Namen sind frei jewählt. Anstößige Namen blenden wa aus.“ + „Namen melden“. „Namen melden“ opens a selection mode: each foreign row gets a `.c-textlink` „Melden“ → `reportName`, then „Jemeldet, danke!“. Remember once per device in `localStorage` `bs-reported-bon-names` (try/catch).
  - States: without a cookie (no `me`) the §11 text + „Jetzt spielen“ + „Spielercode einlösen“ (opens `BonPlayerCode` redeem); on mobile it sits above the list. Empty: the §11 text. Loading: skeleton with 8 rows. Error: `role="alert"` text + „Nochmal versuchen“.
- [ ] **Step 2:** FAIL. **Step 3:** Implement the layout from §3/§11 (desktop `max-width: 1160px`, grid `3.5rem 1fr 5rem 4rem 6.5rem 5rem`, right column 300px; mobile `2.25rem 1fr auto`, rows 56px, dashed separators). Exact values come from `BonLeaderboard.dc.html` (props `size`, `me`, `status`). „Wann“ is relative, via `Intl.RelativeTimeFormat("de")`.
- [ ] **Step 4:** PASS. Browser check light/dark × 390/1280.
- [ ] **Step 5: Commit** `feat(bon): add the leaderboard page`

### Task 11: „Hier stehste“ in the result, tag in the HUD

**Files:**
- Create: `website/src/components/games/BonPlacement.vue` (+ SCSS)
- Modify: `BonResult.vue`, `BerlinerOderNicht.vue` / `useBon.ts` (store `tag` from `start`, `playerLabel` = name or `Anonym #TAG`)
- Test: `BonPlacement.test.ts`, `BonResult.test.ts`, `useBon.test.ts`

**Interfaces:**
- Consumes: `fetchLeaderboard("week", 0, 0)` → `me.around` (Task 10). It is called after `finishRun` returns a result.
- Produces: `BonPlacement` props `{ around: PublicEntry[] }`.

- [ ] **Step 1: Write the failing tests:**
  - 5 rows, 44px, own row with `aria-current="true"`. „Noch {n} Punkte bis Platz {rank−1}.“ with `n = score of the player ahead − score + 1`; it is left out at rank 1. Link „Ganze Rangliste ansehen →“ to `/games/berliner-oder-nicht/rangliste`.
  - Without `result.rank`, or when the leaderboard call fails → the block is missing entirely.
  - HUD label „Punkte · Anonym #K7QX“ without a name, „Punkte · Klaus“ with one.
- [ ] **Step 2:** FAIL. **Step 3:** Implement. The own row gets `view-transition-name: bon-me`, and so does the leaderboard's own row (Task 10). The cross-document morph runs through `@view-transition { navigation: auto; }` on both pages. Check the `ClientRouter` conflict: `BaseHead.astro` enables `ClientRouter` globally. If it intercepts the navigation, the morph runs through Astro's `transition:name="bon-me"` instead.
- [ ] **Step 4:** PASS. Browser check.
- [ ] **Step 5: Commit** `feat(bon): show the placement on the result`

### Task 12: Motion, E2E, docs

**Files:**
- Create: `website/src/utils/viewTransition.ts` (`vt(update: () => void, dir: string): void` exactly as in §13)
- Modify: `BerlinerOderNicht.vue`, the SCSS files from Tasks 3–7, `website/src/tests/e2e/bon-game.spec.ts`, `website/CLAUDE.md` (BON paragraph: answer endpoint, cookie-free play, `savedBon` gone)
- Test: `website/src/tests/unit/utils/viewTransition.test.ts`, `bon-game.spec.ts`

- [ ] **Step 1: Write the failing tests:**
  - `vt` without `startViewTransition`, or with reduced motion, calls `update` synchronously.
  - E2E (seed DB): start → answer 3× with the arrow key until the game ends → result with „Deine Runde“ containing 3+ rows. Swipe on 390px. No horizontal overflow at 390/1280. One h1 per phase.
- [ ] **Step 2:** Implement. Phase changes (intro→play, play→over) go through `vt`, with `view-transition-name` `bon-card`/`bon-score`. Card fly-out and feedback flip use CSS with the values from the §13 table. Reduced motion → no animation. The view transitions „Ranglisten-Liste“ (period switch) and „Dein Platz“ bar (mobile) from §13 apply to `BonLeaderboard`. **Left out:** the `pc-*` morphs (CSS fade is enough). E2E additionally: `/games/berliner-oder-nicht/rangliste` after one game shows the own row with `aria-current`.
- [ ] **Step 3:** `(cd website && rtk vitest run)` and E2E per `website/CLAUDE.md` (throwaway DB `bsw_<workspace>_e2e`, `--project=chromium`): green. `pnpm lint`, `pnpm typechecking`.
- [ ] **Step 4:** Final browser check of all phases, light/dark × 390/1280, with screenshots.
- [ ] **Step 5: Commit** `feat(bon): add motion and update the bon docs`

---

## Not in this plan

New player code (§12 2c/2d) and switching players (3c), including „Noch {n} Versuche“: there is no backend for them yet, and they depend on open point 2 (do devices stay signed in after a new code?).
