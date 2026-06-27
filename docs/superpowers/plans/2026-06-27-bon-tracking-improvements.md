# Plan: BON Matomo Tracking Improvements

**Branch:** `feature/bon-tracking`  
**Files touched:** `src/composable/useBon.ts`, `src/components/games/BonResult.vue`, `src/tests/unit/composable/useBon.test.ts`

---

## Phase 0: Allowed APIs (already verified)

**Source:** `src/utils/analytics.ts`

```ts
trackEvent(category: string, action: string, name: string, value?: number): void
```

**App-wide naming convention** (verified by grep across all 20+ usages):

| Field      | Convention                         | Examples                                      |
|------------|------------------------------------|-----------------------------------------------|
| `category` | Title Case noun                    | `"App"`, `"WordList"`, `"Search"`, `"Form"`   |
| `action`   | Sentence-style verb phrase         | `"Installation completed"`, `"Word shared"`   |
| `name`     | Context string (Title Case or key) | `"PWA"`, `"berliner-oder-nicht"`, `"Settings"`|
| `value`    | Optional numeric score/count       | score, count                                  |

**Anti-pattern:** Do NOT use snake_case (`"game_over"`, `"new_highscore"`) — rest of app never uses it.

---

## Current State (as-is)

**In `useBon.ts` `_endGame()`:**
```ts
// ✓ tracked — but wrong naming convention
trackEvent("game", "new_highscore", "berliner-oder-nicht", score);  // lowercase category + snake_case action
trackEvent("game", "game_over", "berliner-oder-nicht", score);      // lowercase category + snake_case action
```

**Missing events:**
- `startGame()` — no "game started" event
- `resumeGame()` — no "game resumed" event
- New best streak (data already computed in `_endGame()` as `isNewBestStreak`)
- Share button click (`BonResult.vue` `share()`)
- "Wort erkunden" link click (`BonResult.vue`)

---

## Phase 1: Fix `useBon.ts` — naming + missing events

**File:** `src/composable/useBon.ts`

### 1a — Fix existing events in `_endGame()`

Replace:
```ts
trackEvent("game", "new_highscore", "berliner-oder-nicht", state.value.score);
// ...
trackEvent("game", "game_over", "berliner-oder-nicht", state.value.score);
```

With:
```ts
trackEvent("Game", "New Highscore", "berliner-oder-nicht", state.value.score);
// ...
trackEvent("Game", "New Best Streak", "berliner-oder-nicht", state.value.bestStreak);
// ...
trackEvent("Game", "Game Over", "berliner-oder-nicht", state.value.score);
```

Note: `"New Best Streak"` piggybacks on the already-computed `isNewBestStreak` variable directly above.

### 1b — Add `startGame` tracking

In `startGame()`, after the state reset, add:
```ts
trackEvent("Game", "Game Started", "berliner-oder-nicht");
```

### 1c — Add `resumeGame` tracking

In `resumeGame()`, after successfully restoring state, add:
```ts
trackEvent("Game", "Game Resumed", "berliner-oder-nicht");
```

**Verification:**
```bash
pnpm vitest run src/tests/unit/composable/useBon.test.ts
```

---

## Phase 2: Add tracking to `BonResult.vue`

**File:** `src/components/games/BonResult.vue`

### 2a — Import `trackEvent`

Add at top of `<script setup>`:
```ts
import { trackEvent } from '@utils/analytics'
```

### 2b — Track share button

In `share()`, before `_share({...})`:
```ts
trackEvent("Game", "Result Shared", "berliner-oder-nicht")
```

### 2c — Track "Wort erkunden" link click

The anchor tag currently has no handler. Add a click handler:

```html
<a
  v-if="lastCard?.isReal && lastCard.slug"
  :href="`/wort/${lastCard.slug}`"
  class="c-bon-result__word-link"
  @click="trackWordExplored"
>
```

And the handler in `<script setup>`:
```ts
function trackWordExplored() {
  trackEvent("Game", "Word Explored", "berliner-oder-nicht")
}
```

**No new tests needed for Phase 2** — `BonResult.vue` has no existing trackEvent test; adding tests is optional (no regression risk here). Can add in follow-up.

---

## Phase 3: Update `useBon.test.ts`

**File:** `src/tests/unit/composable/useBon.test.ts`

The existing assertions (lines ~396–406) reference the old strings:

```ts
// OLD — must change
expect(trackEvent).toHaveBeenCalledWith('game', 'game_over', 'berliner-oder-nicht', expect.any(Number))
expect(trackEvent).toHaveBeenCalledWith('game', 'new_highscore', 'berliner-oder-nicht', expect.any(Number))
expect(trackEvent).not.toHaveBeenCalledWith('game', 'new_highscore', expect.anything(), expect.anything())
```

Replace with:
```ts
// NEW
expect(trackEvent).toHaveBeenCalledWith('Game', 'Game Over', 'berliner-oder-nicht', expect.any(Number))
expect(trackEvent).toHaveBeenCalledWith('Game', 'New Highscore', 'berliner-oder-nicht', expect.any(Number))
expect(trackEvent).not.toHaveBeenCalledWith('Game', 'New Highscore', expect.anything(), expect.anything())
```

Add new test cases for the new events:
```ts
it('tracks Game Started on startGame', () => {
  // call startGame with ready state
  expect(trackEvent).toHaveBeenCalledWith('Game', 'Game Started', 'berliner-oder-nicht')
})

it('tracks Game Resumed on resumeGame', () => {
  // set up saved game, call resumeGame
  expect(trackEvent).toHaveBeenCalledWith('Game', 'Game Resumed', 'berliner-oder-nicht')
})

it('tracks New Best Streak when best streak is beaten', () => {
  expect(trackEvent).toHaveBeenCalledWith('Game', 'New Best Streak', 'berliner-oder-nicht', expect.any(Number))
})

it('does not track New Best Streak when streak is not beaten', () => {
  expect(trackEvent).not.toHaveBeenCalledWith('Game', 'New Best Streak', expect.anything(), expect.anything())
})
```

---

## Final Phase: Verify

```bash
pnpm vitest run src/tests/unit/composable/useBon.test.ts
pnpm test:unit
```

All BON-related tests must pass green. No new warnings.

---

## Summary of New Event Map

| Category | Action           | Name                    | Value         | Where          |
|----------|------------------|-------------------------|---------------|----------------|
| `Game`   | `Game Started`   | `berliner-oder-nicht`   | —             | `useBon.ts`    |
| `Game`   | `Game Resumed`   | `berliner-oder-nicht`   | —             | `useBon.ts`    |
| `Game`   | `Game Over`      | `berliner-oder-nicht`   | final score   | `useBon.ts`    |
| `Game`   | `New Highscore`  | `berliner-oder-nicht`   | new score     | `useBon.ts`    |
| `Game`   | `New Best Streak`| `berliner-oder-nicht`   | new streak    | `useBon.ts`    |
| `Game`   | `Result Shared`  | `berliner-oder-nicht`   | —             | `BonResult.vue`|
| `Game`   | `Word Explored`  | `berliner-oder-nicht`   | —             | `BonResult.vue`|
