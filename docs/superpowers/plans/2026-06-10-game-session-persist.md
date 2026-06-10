---

# Game Session Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist mid-game state to localStorage so users can resume a game-in-progress on return.

**Architecture:** New `$savedGame` persistentAtom stores a snapshot of GameState + queue positions. `useGame.ts` saves after every answer and clears on game-over/new-game. Idle screen shows "Weiterspielen" button when a valid snapshot exists. Restore happens after `init()` (word sources must be loaded before queue refill can work).

**Tech Stack:** `@nanostores/persistent` · `persistentAtom` · Vue 3 Composition API

---

## Allowed APIs (from codebase discovery)

- `persistentAtom<T>(key, default, { decode, encode })` — `@nanostores/persistent` — see `src/stores/darkMode.ts:1,5`
- `persistentMap<T>(key, default, { decode, encode })` — `@nanostores/persistent` — see `src/stores/gameStats.ts:1,12`
- `.get()` / `.set(value)` — atom read/write — see `src/stores/darkMode.ts:20-21`
- `.setKey(k, v)` — map field write — see `src/stores/gameStats.ts` (used in `useGame.ts:199-209`)
- Codec pattern: `{ decode: (v) => { try { return JSON.parse(v) } catch { return v } }, encode: (v) => JSON.stringify(v) }` — see `src/stores/gameStats.ts:20-29`
- `computed(() => ...)` from `vue` — expose reactive slice of atom — see `src/composable/useGame.ts:94-104`

## Anti-Patterns

- Do NOT put queue state inside `GameState` interface — it's a separate concern and would bloat startGame() reset
- Do NOT auto-restore on mount without user confirmation — jarring UX
- Do NOT restore `phase === 'result'` — no value, would show stale result screen
- Do NOT save on every `_nextCard()` — only save after `answer()` when state actually changed
- Do NOT import from `@stores/index` barrel — triggers wordList side-effects (see CLAUDE.md)

---

## Task 1: `src/stores/savedGame.ts` — new file

**Files:**
- Create: `src/stores/savedGame.ts`

Define the snapshot type and persistentAtom.

- [ ] **Step 1: Write the file**

```typescript
import { persistentAtom } from '@nanostores/persistent'
import type { GameCard } from '@composables/useGame'

export interface SavedGameSnapshot {
  phase: 'playing'
  lives: number
  score: number
  streak: number
  bestStreak: number
  multiplier: number
  totalAnswered: number
  correctAnswers: number
  currentCard: GameCard
  deck: GameCard[]
  lastAnswerCorrect: boolean | null
  lastCard: GameCard | null
  realQueue: GameCard[]
  fakeQueue: GameCard[]
}

export const $savedGame = persistentAtom<SavedGameSnapshot | null>(
  'gameSession:',
  null,
  {
    decode(value) {
      try {
        return JSON.parse(value)
      } catch {
        return null
      }
    },
    encode: (value) => JSON.stringify(value),
  },
)
```

- [ ] **Step 2: Verify file exists and compiles**

Run: `npx oxlint src/stores/savedGame.ts --deny-warnings`
Expected: no output (clean)

---

## Task 2: Extend `src/composable/useGame.ts`

**Files:**
- Modify: `src/composable/useGame.ts`

Add `_saveToStorage()`, `_clearStorage()`, `hasSavedGame` computed, and `resumeGame()`. Wire `_saveToStorage()` into `answer()` and `_clearStorage()` into `startGame()` + `_endGame()`.

- [ ] **Step 1: Add import for `$savedGame` at top of file**

After existing imports (line 5), add:

```typescript
import { $savedGame } from '@stores/savedGame'
```

- [ ] **Step 2: Add private save/clear helpers inside `useGame()`, after the `_nextCard` function**

```typescript
function _saveToStorage() {
  if (state.value.phase !== 'playing' || !state.value.currentCard) return
  $savedGame.set({
    phase: 'playing',
    lives: state.value.lives,
    score: state.value.score,
    streak: state.value.streak,
    bestStreak: state.value.bestStreak,
    multiplier: state.value.multiplier,
    totalAnswered: state.value.totalAnswered,
    correctAnswers: state.value.correctAnswers,
    currentCard: state.value.currentCard,
    deck: state.value.deck,
    lastAnswerCorrect: state.value.lastAnswerCorrect,
    lastCard: state.value.lastCard,
    realQueue: [..._realQueue],
    fakeQueue: [..._fakeQueue],
  })
}

function _clearStorage() {
  $savedGame.set(null)
}
```

- [ ] **Step 3: Call `_saveToStorage()` at end of `answer()`, inside the `if (correct)` branch and after `state.value.lives--` in the else branch (before the `if (state.value.lives <= 0)` check)**

The `answer()` function after edit:

```typescript
function answer(guessedReal: boolean) {
  const card = state.value.currentCard
  if (!card || state.value.phase !== 'playing') return

  const correct = card.isReal === guessedReal
  state.value.lastCard = card
  state.value.lastAnswerCorrect = correct
  state.value.totalAnswered++

  if (correct) {
    state.value.correctAnswers++
    state.value.streak++
    state.value.multiplier = computeMultiplier(state.value.streak)
    if (state.value.streak > state.value.bestStreak) {
      state.value.bestStreak = state.value.streak
    }
    state.value.score += 10 * state.value.multiplier

    if (card.isReal && card.translation) {
      createToastNotify({
        message: `„${card.word}" = ${card.translation}`,
        status: 'success',
        timeout: 3000,
      })
    }
    _saveToStorage()
  } else {
    state.value.streak = 0
    state.value.multiplier = 1
    state.value.lives--
    _saveToStorage()

    if (state.value.lives <= 0) {
      _endGame()
    }
  }
}
```

Note: `_saveToStorage()` in else branch runs before `_endGame()`. `_endGame()` will then call `_clearStorage()`, which is correct — game-over clears the save.

- [ ] **Step 4: Call `_clearStorage()` at start of `startGame()` and at start of `_endGame()`**

`startGame()` after edit (first line added):
```typescript
function startGame() {
  _clearStorage()
  state.value = {
    bestStreak: 0,
    // ... rest unchanged
  }
  _nextCard()
}
```

`_endGame()` after edit (first line added):
```typescript
function _endGame() {
  _clearStorage()
  state.value.phase = 'result'
  // ... rest unchanged
}
```

- [ ] **Step 5: Add `hasSavedGame` computed and `resumeGame()` function, then add both to the return object**

After `isNewHighScore` computed (line ~212):

```typescript
const hasSavedGame = computed(() => $savedGame.get()?.phase === 'playing')

function resumeGame() {
  const saved = $savedGame.get()
  if (!saved || saved.phase !== 'playing') return
  state.value = {
    phase: 'playing',
    lives: saved.lives,
    score: saved.score,
    streak: saved.streak,
    bestStreak: saved.bestStreak,
    multiplier: saved.multiplier,
    totalAnswered: saved.totalAnswered,
    correctAnswers: saved.correctAnswers,
    currentCard: saved.currentCard,
    deck: saved.deck,
    lastAnswerCorrect: saved.lastAnswerCorrect,
    lastCard: saved.lastCard,
  }
  _realQueue = [...saved.realQueue]
  _fakeQueue = [...saved.fakeQueue]
}
```

Return object additions:
```typescript
return {
  // ... existing keys ...
  hasSavedGame,
  resumeGame,
}
```

- [ ] **Step 6: Run lint on the file**

Run: `npx oxlint src/composable/useGame.ts --deny-warnings`
Expected: no output (only hints about early-return/unnecessary-else are pre-existing and non-blocking)

- [ ] **Step 7: Commit**

```bash
git add src/stores/savedGame.ts src/composable/useGame.ts
git commit -m "feat(game): persist session to localStorage with save/restore/resume"
```

---

## Task 3: Update `src/components/games/BerlinerOderNicht.vue`

**Files:**
- Modify: `src/components/games/BerlinerOderNicht.vue`

Add `hasSavedGame` and `resumeGame` to destructure. Add "Weiterspielen" button to idle screen. Wire `resumeGame()` wrapper in component.

- [ ] **Step 1: Add to destructure from `useGame()`**

```typescript
const {
  answer,
  bestStreak,
  correctAnswers,
  currentCard,
  hasSavedGame,       // ADD
  init,
  isNewHighScore,
  lastAnswerCorrect,
  lastCard,
  lives,
  multiplier,
  nextCard,
  phase,
  resumeGame: _resumeGame,  // ADD (aliased to avoid collision)
  score,
  startGame: _startGame,
  streak,
  totalAnswered,
} = useGame()
```

- [ ] **Step 2: Add `resumeGame()` wrapper function in script**

After `startGame()`:

```typescript
function resumeGame() {
  cardNumber.value = 1
  exitDirection.value = null
  isShaking.value = false
  _resumeGame()
}
```

- [ ] **Step 3: Add "Weiterspielen" button to idle screen template**

In the `c-berliner-oder-nicht__idle` div, after the stats block and before the start button:

```html
<button
  v-if="hasSavedGame"
  class="c-berliner-oder-nicht__resume-btn"
  @click="resumeGame"
>
  Weiterspielen
</button>
```

The start button label changes to "Neu starten" when a saved game exists:

```html
<button class="c-berliner-oder-nicht__start-btn" @click="startGame">
  {{ hasSavedGame ? 'Neu starten' : 'Spielen' }}
</button>
```

- [ ] **Step 4: Add SCSS for resume button in `src/styles/components/_berliner-oder-nicht.scss`**

After `&__start-btn` block:

```scss
&__resume-btn {
  padding: 0.875rem 2.5rem;
  font-size: 1.125rem;
  font-weight: 700;
  border: 2px solid var(--accent);
  border-radius: 50px;
  cursor: pointer;
  background: transparent;
  color: var(--accent);
  transition: opacity 0.15s;

  &:hover {
    opacity: 0.88;
  }
}
```

- [ ] **Step 5: Run lint on changed files**

Run: `npx oxlint src/components/games/BerlinerOderNicht.vue --deny-warnings && pnpm stylelint "src/styles/components/_berliner-oder-nicht.scss"`
Expected: no output (clean)

- [ ] **Step 6: Commit**

```bash
git add src/components/games/BerlinerOderNicht.vue src/styles/components/_berliner-oder-nicht.scss
git commit -m "feat(game): show Weiterspielen button in idle screen when saved session exists"
```

---

## Task 4: Tests

**Files:**
- Modify: `src/tests/unit/composable/useGame.test.ts`

- [ ] **Step 1: Add mock for `$savedGame` at top of test file alongside the existing `$gameStats` mock**

Check the existing mock pattern in the test file (look for `vi.mock('@stores/gameStats')`), then add:

```typescript
vi.mock('@stores/savedGame', () => ({
  $savedGame: {
    get: vi.fn(() => null),
    set: vi.fn(),
  },
}))
```

- [ ] **Step 2: Add test cases**

```typescript
describe('session persistence', () => {
  it('hasSavedGame is false when $savedGame is null', () => {
    const { hasSavedGame } = useGame()
    expect(hasSavedGame.value).toBe(false)
  })

  it('resumeGame does nothing when no saved game', () => {
    const { resumeGame, phase } = useGame()
    resumeGame()
    expect(phase.value).toBe('idle')
  })
})
```

- [ ] **Step 3: Run tests**

Run: `pnpm test:unit`
Expected: all 415+ tests pass

- [ ] **Step 4: Commit**

```bash
git add src/tests/unit/composable/useGame.test.ts
git commit -m "test(game): add session persistence tests for hasSavedGame and resumeGame"
```

---

## Final Verification

- [ ] `$savedGame.get()` returns null after game-over
- [ ] `$savedGame.get()` returns valid snapshot mid-game
- [ ] Refreshing mid-game → idle screen shows "Weiterspielen" + "Neu starten"
- [ ] Clicking "Weiterspielen" → game resumes at exact score/lives/streak/card
- [ ] Clicking "Neu starten" → fresh game, saved snapshot cleared
- [ ] Queue rotation continues correctly after resume (no repeat burst)
- [ ] `pnpm test:unit` — all tests pass
