# Plan: Fix Game Rendering + Per-Game Fresh Pool

## Problem

Two issues in `src/components/games/BerlinerOderNicht.vue` + `src/composable/useGame.ts`:

### Bug: Card doesn't render after "Spielen"

`onMounted` fetches `/api/search/index.json` **asynchronously**, then calls `init()`. If the user
clicks "Spielen" before the fetch resolves, `_fakeWords` is still `[]` (init not yet called),
`_makeQueuedDeck()` builds `fakeSource = []`, `drawFromQueue` returns `[]`, deck is empty,
`_nextCard()` sets `currentCard = null`, and `v-if="currentCard"` hides the `GameCard` → nothing
renders.

**Root cause** (`useGame.ts:118–125`):

```ts
function _makeQueuedDeck(): GameCard[] {
  const fakeSource = _fakeWords.map(...) // [] if init not called yet
  const fake = drawFromQueue(_fakeQueue, fakeSource, fakeCount) // returns [] from empty source
  return fisherYates([...real, ...fake]) // deck = []
}
```

### Requirement: Fresh pool per game

Queues (`_realQueue`, `_fakeQueue`) persist across `startGame()` calls. Words seen in one game
can appear again soon in the next. User wants each new game to start from a freshly shuffled full
pool.

---

## Context

- **`useGame.ts`**: `src/composable/useGame.ts` — composable owning all game state
- **`BerlinerOderNicht.vue`**: `src/components/games/BerlinerOderNicht.vue` — calls `init()` in
  `onMounted` async block, calls `startGame()` / `resumeGame()` on button click
- `fakeWords` is a **static import** (available synchronously before fetch)
- `init(realWords, fakeWords)` sets `_realWords`, `_fakeWords`, `_realQueue`, `_fakeQueue`
- `startGame()` does NOT reset queues — they carry over from previous games
- `resumeGame()` restores saved queue state from `$savedGame` — must stay unchanged

---

## Phase 1 — Fix race condition (guard + loading state)

### 1a — Add `isReady` state to `useGame`

In `useGame.ts`, add an `isReady` ref (boolean, initially `false`), set to `true` at end of
`init()`. Expose it from the composable return.

```ts
// inside useGame()
const isReady = ref(false)

function init(realWords: GameCard[], fakeWords: FakeWord[]) {
  _realWords = realWords
  _fakeWords = fakeWords
  _realQueue = fisherYates([...realWords])
  _fakeQueue = fisherYates(fakeWords.map((f) => ({ isReal: false as const, word: f.word })))
  isReady.value = true
}

// add to return {}
isReady,
```

### 1b — Guard buttons in `BerlinerOderNicht.vue`

Destructure `isReady` from `useGame()`. Disable "Spielen" and "Weiterspielen" buttons while
`!isReady`. Show a short loading indicator (spinner or dimmed button) so the user knows the game
is initializing.

```html
<button
  class="c-berliner-oder-nicht__start-btn"
  :disabled="!isReady"
  @click="startGame"
>
  {{ isReady ? (hasSavedGame ? 'Neu starten' : 'Spielen') : 'Laden…' }}
</button>
```

Apply same `:disabled="!isReady"` to the "Weiterspielen" resume button.

### 1c — Guard `startGame` in composable

Add early-return guard in `startGame()` as a safety net (belt-and-suspenders):

```ts
function startGame() {
  if (!isReady.value) return
  // ... rest unchanged
}
```

**Verification after Phase 1**:

- `pnpm test:unit` — all green
- In browser: clicking "Spielen" immediately on page load → button is disabled/shows "Laden…"
- After fetch completes → button enables → clicking starts game → card renders correctly
- Check: no `currentCard = null` after `startGame()`

---

## Phase 2 — Per-game fresh pool

### 2a — Reset queues in `startGame()`

At the top of `startGame()` in `useGame.ts`, reshuffle both queues from their source arrays.
This ensures every new game starts from the full pool in a new random order.

```ts
function startGame() {
  if (!isReady.value) return
  // Fresh shuffle for each new game
  _realQueue = fisherYates([..._realWords])
  _fakeQueue = fisherYates(_fakeWords.map((f) => ({ isReal: false as const, word: f.word })))
  _clearStorage()
  state.value = {
    // ... unchanged
    deck: _makeQueuedDeck(),
    // ...
  }
  _nextCard()
}
```

### 2b — Pre-compute fakeSource in `init()` (cleanup)

`_makeQueuedDeck()` currently rebuilds `fakeSource` on every call (`_fakeWords.map(...)`).
Pre-compute it once in `init()` and store as module-level `_fakeSource: GameCard[]`.

```ts
let _fakeSource: GameCard[] = []

function init(realWords: GameCard[], fakeWords: FakeWord[]) {
  _realWords = realWords
  _fakeWords = fakeWords
  _fakeSource = fakeWords.map((f) => ({ isReal: false as const, word: f.word }))
  _realQueue = fisherYates([...realWords])
  _fakeQueue = fisherYates([..._fakeSource])
  isReady.value = true
}

function _makeQueuedDeck(): GameCard[] {
  const realCount = Math.floor(Math.random() * 6) + 10
  const fakeCount = 20 - realCount
  const real = drawFromQueue(_realQueue, _realWords, realCount)
  const fake = drawFromQueue(_fakeQueue, _fakeSource, fakeCount)
  return fisherYates([...real, ...fake])
}
```

Also update `startGame()` to use `_fakeSource`:
```ts
_fakeQueue = fisherYates([..._fakeSource])
```

**Verification after Phase 2**:

- Start two consecutive games → word order differs between games
- `pnpm test:unit` — all green
- `_fakeQueue` length at game start = 800 each time (full pool)
- `resumeGame()` path unchanged — still restores from `$savedGame.fakeQueue`

---

## Phase 3 — Tests

### 3a — Update `useGame` tests

In `src/tests/unit/composable/useGame.test.ts` (or create if missing):

- Test `isReady` is `false` before `init()`, `true` after
- Test `startGame()` before `init()` → state stays `idle` (early return)
- Test `startGame()` after `init()` → `currentCard` is not null, deck has cards
- Test two consecutive `startGame()` calls → deck order can differ (shuffled)

### 3b — Run full suite

```bash
pnpm test:unit     # all green
pnpm lint          # no errors
```

---

## Anti-Patterns

- Do NOT call `init()` earlier than `onMounted` — it depends on the fetch result
- Do NOT make `isReady` part of `GameState` ref — it's not game state, keep it a plain `ref<boolean>`
- Do NOT reset queues in `resumeGame()` — resume must restore exact saved queue state
- Do NOT add `fakeWords` as a reactive store — static import is correct, no reactivity needed
- Do NOT call `_startGame()` directly from the template — always go through the component wrapper
