# Berliner oder nicht? — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a swipe-card game at `/games/berliner-oder-nicht` where players decide if a word is real Berlinerisch or invented — with lives, streak multipliers, and persistent high scores.

**Architecture:** Composable-driven: `useGame.ts` owns all game logic and state. Four focused Vue components (`BerlinerOderNicht`, `GameCard`, `GameHUD`, `GameResult`) are purely presentational. Stats persist via nanostores `persistentMap`.

**Tech Stack:** Vue 3 Composition API, VueUse (`useSwipe`, `onKeyStroke`, `useShare`), nanostores `persistentMap`, Lucide icons via `defineAsyncComponent`, Astro SSG, SCSS BEM (`c-` prefix, no `scoped`)

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/data/fakeWords.ts` | Create | Static dataset of invented + hochdeutsch impostor words |
| `src/stores/gameStats.ts` | Create | `persistentMap` for cross-session highscore/stats |
| `src/composable/useGame.ts` | Create | All game logic: deck, scoring, lives, state machine |
| `src/styles/components/_berliner-oder-nicht.scss` | Create | BEM styles for all game components |
| `src/components/games/GameHUD.vue` | Create | Lives (hearts), score, streak+multiplier display |
| `src/components/games/GameCard.vue` | Create | Swipeable word card with animations |
| `src/components/games/GameResult.vue` | Create | End screen: stats, share, link to word, restart |
| `src/components/games/BerlinerOderNicht.vue` | Create | Root island: fetches words, wires composable, phase switching |
| `src/pages/games/berliner-oder-nicht.astro` | Create | Route at `/games/berliner-oder-nicht` |
| `src/tests/unit/composable/useGame.test.ts` | Create | Unit tests for game logic |

---

## Task 1: Fake Words Dataset

**Files:**
- Create: `src/data/fakeWords.ts`

- [ ] **Step 1: Create the file**

```typescript
export interface FakeWord {
  word: string
  category: 'invented' | 'hochdeutsch'
}

export const fakeWords: FakeWord[] = [
  // Erfunden — klingen plausibel berlinerisch
  { word: 'Schnörrke', category: 'invented' },
  { word: 'Wabbatz', category: 'invented' },
  { word: 'Pröllke', category: 'invented' },
  { word: 'Knüffke', category: 'invented' },
  { word: 'Döllmer', category: 'invented' },
  { word: 'Zabbel', category: 'invented' },
  { word: 'Wubbke', category: 'invented' },
  { word: 'Plörrn', category: 'invented' },
  { word: 'Schnüffel', category: 'invented' },
  { word: 'Tröddelke', category: 'invented' },
  { word: 'Knorze', category: 'invented' },
  { word: 'Quabbel', category: 'invented' },
  { word: 'Schnackel', category: 'invented' },
  { word: 'Döbbel', category: 'invented' },
  { word: 'Worrke', category: 'invented' },
  { word: 'Plubbatz', category: 'invented' },
  { word: 'Zöbbel', category: 'invented' },
  { word: 'Knüpps', category: 'invented' },
  { word: 'Schnubber', category: 'invented' },
  { word: 'Trabbel', category: 'invented' },
  { word: 'Dörrke', category: 'invented' },
  { word: 'Wabbel', category: 'invented' },
  { word: 'Pluddel', category: 'invented' },
  { word: 'Schnorkel', category: 'invented' },
  { word: 'Knuffel', category: 'invented' },
  { word: 'Zöppke', category: 'invented' },
  { word: 'Dörratz', category: 'invented' },
  { word: 'Wubbelke', category: 'invented' },
  { word: 'Pröppel', category: 'invented' },
  { word: 'Schnabbel', category: 'invented' },
  { word: 'Knübbel', category: 'invented' },
  { word: 'Zubbelke', category: 'invented' },
  { word: 'Trödds', category: 'invented' },
  { word: 'Wuppke', category: 'invented' },
  { word: 'Schnüllke', category: 'invented' },
  { word: 'Plörre', category: 'invented' },
  { word: 'Döbbatz', category: 'invented' },
  { word: 'Knurzel', category: 'invented' },
  { word: 'Zuppke', category: 'invented' },
  { word: 'Wabbern', category: 'invented' },
  { word: 'Schnörkel', category: 'invented' },
  { word: 'Pröbbel', category: 'invented' },
  { word: 'Knubbatz', category: 'invented' },
  { word: 'Döbbelke', category: 'invented' },
  { word: 'Zörrn', category: 'invented' },
  { word: 'Wupperling', category: 'invented' },
  { word: 'Schnobbelke', category: 'invented' },
  { word: 'Trabbatz', category: 'invented' },
  { word: 'Knüppatz', category: 'invented' },
  { word: 'Plubbke', category: 'invented' },
  // Hochdeutsch — echte Wörter, aber nicht berlinerisch
  { word: 'Fernseher', category: 'hochdeutsch' },
  { word: 'Bürgersteig', category: 'hochdeutsch' },
  { word: 'Schmetterling', category: 'hochdeutsch' },
  { word: 'Krankenhaus', category: 'hochdeutsch' },
  { word: 'Handtuch', category: 'hochdeutsch' },
  { word: 'Blumenkohl', category: 'hochdeutsch' },
  { word: 'Streichholz', category: 'hochdeutsch' },
  { word: 'Taschenlampe', category: 'hochdeutsch' },
  { word: 'Würfelzucker', category: 'hochdeutsch' },
  { word: 'Pflasterstein', category: 'hochdeutsch' },
  { word: 'Schornsteinfeger', category: 'hochdeutsch' },
  { word: 'Gurke', category: 'hochdeutsch' },
  { word: 'Fußgänger', category: 'hochdeutsch' },
  { word: 'Briefkasten', category: 'hochdeutsch' },
  { word: 'Hausschlüssel', category: 'hochdeutsch' },
  { word: 'Fahrradkette', category: 'hochdeutsch' },
  { word: 'Kühlschrank', category: 'hochdeutsch' },
  { word: 'Waschbecken', category: 'hochdeutsch' },
  { word: 'Gardine', category: 'hochdeutsch' },
  { word: 'Türklinke', category: 'hochdeutsch' },
  { word: 'Kerze', category: 'hochdeutsch' },
  { word: 'Wäscheklammer', category: 'hochdeutsch' },
  { word: 'Kopfkissen', category: 'hochdeutsch' },
  { word: 'Regenschirm', category: 'hochdeutsch' },
  { word: 'Zimmerpflanze', category: 'hochdeutsch' },
  { word: 'Vorhang', category: 'hochdeutsch' },
  { word: 'Treppengeländer', category: 'hochdeutsch' },
  { word: 'Lichtschalter', category: 'hochdeutsch' },
  { word: 'Fensterscheibe', category: 'hochdeutsch' },
  { word: 'Schreibtisch', category: 'hochdeutsch' },
]
```

- [ ] **Step 2: Commit**

```bash
git add src/data/fakeWords.ts
git commit -m "feat(game): add fake words dataset for Berliner oder nicht game"
```

---

## Task 2: Game Stats Store

**Files:**
- Create: `src/stores/gameStats.ts`

- [ ] **Step 1: Create the store**

```typescript
import { persistentMap } from '@nanostores/persistent'

export interface GameStats {
  highScore: number
  bestStreak: number
  totalGamesPlayed: number
  totalCorrect: number
  totalAnswered: number
}

export const $gameStats = persistentMap<GameStats>(
  'gameStats:',
  {
    highScore: 0,
    bestStreak: 0,
    totalGamesPlayed: 0,
    totalCorrect: 0,
    totalAnswered: 0,
  },
  {
    decode(value) {
      try {
        return JSON.parse(value)
      } catch {
        return value
      }
    },
    encode: (value) => JSON.stringify(value),
  },
)
```

- [ ] **Step 2: Commit**

```bash
git add src/stores/gameStats.ts
git commit -m "feat(game): add persistent game stats store"
```

---

## Task 3: useGame Composable + Tests (TDD)

**Files:**
- Create: `src/composable/useGame.ts`
- Create: `src/tests/unit/composable/useGame.test.ts`

The composable exports pure helper functions (`buildDeck`, `computeMultiplier`) alongside the reactive composable. Test the helpers directly — they're the decision-logic core.

- [ ] **Step 1: Write failing tests**

Create `src/tests/unit/composable/useGame.test.ts`:

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock persistentMap so tests don't need localStorage
vi.mock('@nanostores/persistent', () => ({
  persistentMap: vi.fn(() => ({
    get: vi.fn(() => ({
      highScore: 0,
      bestStreak: 0,
      totalGamesPlayed: 0,
      totalCorrect: 0,
      totalAnswered: 0,
    })),
    setKey: vi.fn(),
  })),
}))

import { buildDeck, computeMultiplier } from '@composables/useGame'
import type { FakeWord } from '@/data/fakeWords'

const makeRealWords = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    word: `Wort${i}`,
    isReal: true as const,
    slug: `wort-${i}`,
    translation: `Translation ${i}`,
  }))

const makeFakeWords = (n: number): FakeWord[] =>
  Array.from({ length: n }, (_, i) => ({
    word: `Fake${i}`,
    category: 'invented' as const,
  }))

describe('computeMultiplier', () => {
  it('returns 1 for streak 0', () => expect(computeMultiplier(0)).toBe(1))
  it('returns 1 for streak 2', () => expect(computeMultiplier(2)).toBe(1))
  it('returns 2 for streak 3', () => expect(computeMultiplier(3)).toBe(2))
  it('returns 2 for streak 5', () => expect(computeMultiplier(5)).toBe(2))
  it('returns 3 for streak 6', () => expect(computeMultiplier(6)).toBe(3))
  it('returns 3 for streak 9', () => expect(computeMultiplier(9)).toBe(3))
  it('returns 5 for streak 10', () => expect(computeMultiplier(10)).toBe(5))
  it('returns 5 for streak 20', () => expect(computeMultiplier(20)).toBe(5))
})

describe('buildDeck', () => {
  it('always returns exactly 20 cards', () => {
    const deck = buildDeck(makeRealWords(50), makeFakeWords(30))
    expect(deck).toHaveLength(20)
  })

  it('real card count is between 10 and 15 (50–75%)', () => {
    // Run 20 times — variable split should stay within bounds every time
    for (let i = 0; i < 20; i++) {
      const deck = buildDeck(makeRealWords(50), makeFakeWords(30))
      const realCount = deck.filter((c) => c.isReal).length
      expect(realCount).toBeGreaterThanOrEqual(10)
      expect(realCount).toBeLessThanOrEqual(15)
    }
  })

  it('fake cards have isReal = false', () => {
    const deck = buildDeck(makeRealWords(50), makeFakeWords(30))
    const fakeCards = deck.filter((c) => !c.isReal)
    fakeCards.forEach((c) => expect(c.isReal).toBe(false))
  })

  it('real cards carry slug and word', () => {
    const deck = buildDeck(makeRealWords(50), makeFakeWords(30))
    const realCards = deck.filter((c) => c.isReal)
    realCards.forEach((c) => {
      expect(c.slug).toBeDefined()
      expect(c.word).toBeTruthy()
    })
  })

  it('no duplicate words within one deck', () => {
    const deck = buildDeck(makeRealWords(50), makeFakeWords(30))
    const words = deck.map((c) => c.word)
    expect(new Set(words).size).toBe(20)
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL (buildDeck and computeMultiplier not yet exported)**

```bash
pnpm vitest run src/tests/unit/composable/useGame.test.ts
```

Expected: `Error: Failed to resolve import "@composables/useGame"`

- [ ] **Step 3: Create `src/composable/useGame.ts`**

```typescript
import { ref, computed } from 'vue'
import { $gameStats } from '@stores/gameStats'
import { createToastNotify } from '@stores/toastNotify'
import { trackEvent } from '@utils/analytics'
import type { FakeWord } from '@/data/fakeWords'

export interface GameCard {
  word: string
  isReal: boolean
  slug?: string
  translation?: string
}

interface GameState {
  phase: 'idle' | 'playing' | 'result'
  lives: number
  score: number
  streak: number
  bestStreak: number
  multiplier: number
  totalAnswered: number
  correctAnswers: number
  currentCard: GameCard | null
  deck: GameCard[]
  lastAnswerCorrect: boolean | null
  lastCard: GameCard | null
}

// --- Pure helpers (exported for testing) ---

export function computeMultiplier(streak: number): number {
  if (streak >= 10) return 5
  if (streak >= 6) return 3
  if (streak >= 3) return 2
  return 1
}

function fisherYates<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function buildDeck(
  realWords: GameCard[],
  fakes: FakeWord[],
): GameCard[] {
  const DECK_SIZE = 20
  // Variable split: 50–75% real (10–15 cards), rest fake
  const realCount = Math.floor(Math.random() * 6) + 10 // 10..15
  const fakeCount = DECK_SIZE - realCount

  const shuffledReal = fisherYates(realWords).slice(0, realCount)
  const shuffledFake = fisherYates(fakes)
    .slice(0, fakeCount)
    .map((f): GameCard => ({ word: f.word, isReal: false }))

  return fisherYates([...shuffledReal, ...shuffledFake])
}

// --- Composable ---

export function useGame() {
  const state = ref<GameState>({
    phase: 'idle',
    lives: 3,
    score: 0,
    streak: 0,
    bestStreak: 0,
    multiplier: 1,
    totalAnswered: 0,
    correctAnswers: 0,
    currentCard: null,
    deck: [],
    lastAnswerCorrect: null,
    lastCard: null,
  })

  // Exposed reactive slices
  const phase = computed(() => state.value.phase)
  const lives = computed(() => state.value.lives)
  const score = computed(() => state.value.score)
  const streak = computed(() => state.value.streak)
  const bestStreak = computed(() => state.value.bestStreak)
  const multiplier = computed(() => state.value.multiplier)
  const totalAnswered = computed(() => state.value.totalAnswered)
  const correctAnswers = computed(() => state.value.correctAnswers)
  const currentCard = computed(() => state.value.currentCard)
  const lastAnswerCorrect = computed(() => state.value.lastAnswerCorrect)
  const lastCard = computed(() => state.value.lastCard)

  let _realWords: GameCard[] = []
  let _fakeWords: FakeWord[] = []

  function init(realWords: GameCard[], fakeWords: FakeWord[]) {
    _realWords = realWords
    _fakeWords = fakeWords
  }

  function startGame() {
    state.value = {
      phase: 'playing',
      lives: 3,
      score: 0,
      streak: 0,
      bestStreak: 0,
      multiplier: 1,
      totalAnswered: 0,
      correctAnswers: 0,
      currentCard: null,
      deck: buildDeck(_realWords, _fakeWords),
      lastAnswerCorrect: null,
      lastCard: null,
    }
    _nextCard()
  }

  function _nextCard() {
    if (state.value.deck.length === 0) {
      // Endless: reshuffle
      state.value.deck = buildDeck(_realWords, _fakeWords)
    }
    const [next, ...rest] = state.value.deck
    state.value.deck = rest
    state.value.currentCard = next ?? null
  }

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

      // Advance after short delay (animation plays)
      setTimeout(() => _nextCard(), 400)
    } else {
      state.value.streak = 0
      state.value.multiplier = 1
      state.value.lives--

      if (state.value.lives <= 0) {
        _endGame()
      } else {
        // Stay on card for 1200ms (overlay shows correct answer)
        setTimeout(() => _nextCard(), 1200)
      }
    }
  }

  function _endGame() {
    state.value.phase = 'result'
    const stats = $gameStats.get()
    const isNewHighScore = state.value.score > stats.highScore
    const isNewBestStreak = state.value.bestStreak > stats.bestStreak

    $gameStats.setKey('totalGamesPlayed', stats.totalGamesPlayed + 1)
    $gameStats.setKey('totalCorrect', stats.totalCorrect + state.value.correctAnswers)
    $gameStats.setKey('totalAnswered', stats.totalAnswered + state.value.totalAnswered)

    if (isNewHighScore) {
      $gameStats.setKey('highScore', state.value.score)
      trackEvent('game', 'new_highscore', 'berliner-oder-nicht', state.value.score)
    }
    if (isNewBestStreak) {
      $gameStats.setKey('bestStreak', state.value.bestStreak)
    }

    trackEvent('game', 'game_over', 'berliner-oder-nicht', state.value.score)
  }

  const isNewHighScore = computed(() => {
    const stats = $gameStats.get()
    return state.value.phase === 'result' && state.value.score >= stats.highScore && state.value.score > 0
  })

  return {
    answer,
    bestStreak,
    correctAnswers,
    currentCard,
    init,
    isNewHighScore,
    lastAnswerCorrect,
    lastCard,
    lives,
    multiplier,
    phase,
    score,
    startGame,
    streak,
    totalAnswered,
  }
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
pnpm vitest run src/tests/unit/composable/useGame.test.ts
```

Expected: all 12 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/composable/useGame.ts src/tests/unit/composable/useGame.test.ts
git commit -m "feat(game): add useGame composable with deck building and scoring logic"
```

---

## Task 4: SCSS

**Files:**
- Create: `src/styles/components/_berliner-oder-nicht.scss`

- [ ] **Step 1: Create the stylesheet**

```scss
@use "@styles/settings/colors" as *;
@use "@styles/settings/breakpoints" as *;

// ---------------------------------------------------------------------------
// Page wrapper
// ---------------------------------------------------------------------------

.c-berliner-oder-nicht {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  padding: 1.5rem 1rem 2rem;
  min-height: 60vh;

  &__idle {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.25rem;
    text-align: center;
    max-width: 420px;
  }

  &__idle-title {
    font-size: 2rem;
    font-weight: 900;
    line-height: 1.1;
  }

  &__idle-description {
    color: var(--color-text-muted, #888);
    font-size: 1rem;
  }

  &__idle-prev-stats {
    display: flex;
    gap: 1.5rem;
    font-size: 0.875rem;
    color: var(--color-text-muted, #888);
  }

  &__idle-stat-value {
    display: block;
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--color-text, currentColor);
  }

  &__start-btn {
    padding: 0.875rem 2.5rem;
    font-size: 1.125rem;
    font-weight: 700;
    border: none;
    border-radius: 50px;
    cursor: pointer;
    background: var(--color-primary, #e9b000);
    color: var(--color-on-primary, #111);
    transition: opacity 0.15s;

    &:hover {
      opacity: 0.88;
    }
  }
}

// ---------------------------------------------------------------------------
// HUD
// ---------------------------------------------------------------------------

.c-game-hud {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  max-width: 420px;

  &__lives {
    display: flex;
    gap: 0.375rem;
    align-items: center;
  }

  &__life-icon {
    color: var(--color-error, #e74c3c);
    transition: color 0.2s, transform 0.2s;

    &--lost {
      color: var(--color-text-muted, #555);
    }
  }

  &__score-wrap {
    text-align: center;
  }

  &__score {
    display: block;
    font-size: 1.5rem;
    font-weight: 900;
    line-height: 1;

    &--highscore {
      color: var(--color-primary, #e9b000);
    }
  }

  &__score-label {
    font-size: 0.625rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--color-text-muted, #888);
  }

  &__streak {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.125rem;
  }

  &__streak-count {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 1rem;
    font-weight: 700;
  }

  &__multiplier {
    font-size: 0.625rem;
    letter-spacing: 0.05em;
    color: var(--color-text-muted, #888);
  }

  &__multiplier-badge {
    display: inline-block;
    padding: 0.125rem 0.375rem;
    border-radius: 4px;
    background: var(--color-primary, #e9b000);
    color: var(--color-on-primary, #111);
    font-size: 0.7rem;
    font-weight: 700;
    opacity: 0;
    transition: opacity 0.2s;

    &--active {
      opacity: 1;
    }
  }
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

.c-game-card {
  position: relative;
  width: 100%;
  max-width: 420px;

  &__hint {
    display: flex;
    justify-content: space-between;
    padding: 0 0.5rem;
    margin-bottom: 0.5rem;
    font-size: 0.75rem;
    color: var(--color-text-muted, #888);
    opacity: 0.5;
  }

  &__card {
    background: var(--color-surface, #1e1e2e);
    border: 1px solid var(--color-border, #3a3a5e);
    border-radius: 1rem;
    padding: 2.5rem 1.5rem;
    text-align: center;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    cursor: grab;
    user-select: none;
    transition: transform 0.25s ease, border-color 0.2s, box-shadow 0.2s;
    will-change: transform;

    &--exit-right {
      transform: translateX(110%) rotate(12deg);
      border-color: var(--color-success, #2ecc71);
      box-shadow: 0 8px 32px rgba(46, 204, 113, 0.3);
    }

    &--exit-left {
      transform: translateX(-110%) rotate(-12deg);
      border-color: var(--color-error, #e74c3c);
      box-shadow: 0 8px 32px rgba(231, 76, 60, 0.3);
    }

    &--shake {
      animation: c-game-card-shake 0.4s ease;
      border-color: var(--color-error, #e74c3c);
      box-shadow: 0 8px 32px rgba(231, 76, 60, 0.3);
    }
  }

  &__label {
    font-size: 0.625rem;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--color-text-muted, #888);
    margin-bottom: 0.75rem;
  }

  &__word {
    font-size: 2.5rem;
    font-weight: 900;
    line-height: 1.1;
    word-break: break-word;
  }

  &__progress {
    font-size: 0.75rem;
    color: var(--color-text-muted, #888);
    margin-top: 1rem;
  }

  &__overlay {
    position: absolute;
    inset: 0;
    border-radius: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.125rem;
    font-weight: 700;
    background: rgba(231, 76, 60, 0.88);
    color: #fff;
    pointer-events: none;
  }

  &__buttons {
    display: flex;
    gap: 1rem;
    margin-top: 1.25rem;
  }

  &__btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.875rem;
    border: none;
    border-radius: 50px;
    font-weight: 700;
    font-size: 1rem;
    cursor: pointer;
    transition: opacity 0.15s;

    &:hover {
      opacity: 0.88;
    }

    &--no {
      background: var(--color-error, #e74c3c);
      color: #fff;
    }

    &--yes {
      background: var(--color-success, #2ecc71);
      color: #fff;
    }
  }

  &__keyboard-hint {
    margin-top: 0.5rem;
    font-size: 0.7rem;
    color: var(--color-text-muted, #888);
    text-align: center;
    opacity: 0.6;
  }
}

@keyframes c-game-card-shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-8px) rotate(-1deg); }
  40% { transform: translateX(8px) rotate(1deg); }
  60% { transform: translateX(-6px) rotate(-0.5deg); }
  80% { transform: translateX(6px) rotate(0.5deg); }
}

// ---------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------

.c-game-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
  width: 100%;
  max-width: 420px;
  text-align: center;

  &__title {
    font-size: 1.75rem;
    font-weight: 900;
  }

  &__stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
    width: 100%;
  }

  &__stat {
    background: var(--color-surface, #1e1e2e);
    border: 1px solid var(--color-border, #3a3a5e);
    border-radius: 0.75rem;
    padding: 0.875rem 1rem;

    &--highlight {
      border-color: var(--color-primary, #e9b000);
      background: color-mix(in srgb, var(--color-primary, #e9b000) 10%, transparent);
    }
  }

  &__stat-value {
    display: block;
    font-size: 1.375rem;
    font-weight: 900;
    line-height: 1.2;
  }

  &__stat-label {
    font-size: 0.625rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--color-text-muted, #888);
  }

  &__word-link {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    width: 100%;
    background: color-mix(in srgb, var(--color-success, #2ecc71) 12%, transparent);
    border: 1px solid var(--color-success, #2ecc71);
    border-radius: 0.75rem;
    color: var(--color-success, #2ecc71);
    text-decoration: none;
    font-size: 0.875rem;
    font-weight: 600;

    &:hover {
      opacity: 0.88;
    }
  }

  &__actions {
    display: flex;
    gap: 0.75rem;
    width: 100%;
  }

  &__share-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.875rem;
    border: 1px solid var(--color-border, #3a3a5e);
    border-radius: 50px;
    background: transparent;
    color: var(--color-text, currentColor);
    font-size: 0.9rem;
    cursor: pointer;
    transition: opacity 0.15s;

    &:hover { opacity: 0.75; }
  }

  &__restart-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.875rem;
    border: none;
    border-radius: 50px;
    background: var(--color-primary, #e9b000);
    color: var(--color-on-primary, #111);
    font-size: 0.9rem;
    font-weight: 700;
    cursor: pointer;
    transition: opacity 0.15s;

    &:hover { opacity: 0.88; }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/components/_berliner-oder-nicht.scss
git commit -m "feat(game): add SCSS for Berliner oder nicht game components"
```

---

## Task 5: GameHUD Component

**Files:**
- Create: `src/components/games/GameHUD.vue`

- [ ] **Step 1: Create the component**

```vue
<template>
  <div class="c-game-hud">
    <div class="c-game-hud__lives" aria-label="Leben">
      <component
        :is="i <= lives ? HeartIcon : HeartIcon"
        v-for="i in MAX_LIVES"
        :key="i"
        :class="['c-game-hud__life-icon', { 'c-game-hud__life-icon--lost': i > lives }]"
        :aria-hidden="true"
        width="22"
        height="22"
      />
    </div>

    <div class="c-game-hud__score-wrap">
      <span :class="['c-game-hud__score', { 'c-game-hud__score--highscore': isHighscore }]">
        {{ score }}
      </span>
      <span class="c-game-hud__score-label">Score</span>
    </div>

    <div class="c-game-hud__streak">
      <div class="c-game-hud__streak-count">
        <FlameIcon width="16" height="16" aria-hidden="true" />
        {{ streak }}
      </div>
      <div class="c-game-hud__multiplier">
        <span
          :class="['c-game-hud__multiplier-badge', { 'c-game-hud__multiplier-badge--active': multiplier > 1 }]"
        >{{ multiplier }}×</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from 'vue'

const HeartIcon = defineAsyncComponent(() => import('virtual:icons/lucide/heart'))
const FlameIcon = defineAsyncComponent(() => import('virtual:icons/lucide/flame'))

const MAX_LIVES = 3

defineProps<{
  lives: number
  score: number
  streak: number
  multiplier: number
  isHighscore: boolean
}>()
</script>

<style lang="scss">
@use '@styles/components/berliner-oder-nicht';
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/games/GameHUD.vue
git commit -m "feat(game): add GameHUD component with lives, score, streak display"
```

---

## Task 6: GameCard Component

**Files:**
- Create: `src/components/games/GameCard.vue`

The card handles swipe detection via `useSwipe` and keyboard via `onKeyStroke`, then emits `answer` events upward. Animation state (exit direction, shake) is driven by props from the parent.

- [ ] **Step 1: Create the component**

```vue
<template>
  <div class="c-game-card">
    <div class="c-game-card__hint" aria-hidden="true">
      <span>← NEE</span>
      <span>JA →</span>
    </div>

    <div
      ref="cardRef"
      :class="[
        'c-game-card__card',
        exitDirection === 'right' && isAnimatingOut && 'c-game-card__card--exit-right',
        exitDirection === 'left' && isAnimatingOut && 'c-game-card__card--exit-left',
        isShaking && 'c-game-card__card--shake',
      ]"
    >
      <p class="c-game-card__label">Berlinerisch?</p>
      <p class="c-game-card__word">{{ word }}</p>
      <p class="c-game-card__progress">{{ cardNumber }} / 20</p>

      <Transition name="fade-fast">
        <div v-if="showOverlay" class="c-game-card__overlay">
          War {{ overlayText }}!
        </div>
      </Transition>
    </div>

    <div class="c-game-card__buttons">
      <button
        class="c-game-card__btn c-game-card__btn--no"
        aria-label="Nee, nicht Berlinerisch"
        @click="emit('answer', false)"
      >
        <XIcon width="20" height="20" aria-hidden="true" />
        Nee
      </button>
      <button
        class="c-game-card__btn c-game-card__btn--yes"
        aria-label="Ja, Berlinerisch!"
        @click="emit('answer', true)"
      >
        Ja
        <CheckIcon width="20" height="20" aria-hidden="true" />
      </button>
    </div>

    <p class="c-game-card__keyboard-hint" aria-hidden="true">← Pfeiltasten auch möglich →</p>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, ref } from 'vue'
import { onKeyStroke, useSwipe } from '@vueuse/core'

const XIcon = defineAsyncComponent(() => import('virtual:icons/lucide/x'))
const CheckIcon = defineAsyncComponent(() => import('virtual:icons/lucide/check'))

const props = defineProps<{
  word: string
  cardNumber: number
  isAnimatingOut: boolean
  exitDirection: 'left' | 'right' | null
  isShaking: boolean
  lastAnswerCorrect: boolean | null
  isReal: boolean | null // revealed after wrong answer for overlay
}>()

const emit = defineEmits<{
  answer: [isReal: boolean]
}>()

const cardRef = ref<HTMLElement | null>(null)

const showOverlay = computed(() =>
  props.isShaking && props.lastAnswerCorrect === false && props.isReal !== null,
)

const overlayText = computed(() =>
  props.isReal ? 'echtes Berlinerisch' : 'erfunden',
)

const { direction } = useSwipe(cardRef, {
  threshold: 50,
  onSwipeEnd(_, dir) {
    if (dir === 'right') emit('answer', true)
    else if (dir === 'left') emit('answer', false)
  },
})

onKeyStroke('ArrowRight', () => emit('answer', true))
onKeyStroke('ArrowLeft', () => emit('answer', false))
</script>

<style lang="scss">
@use '@styles/components/berliner-oder-nicht';
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/games/GameCard.vue
git commit -m "feat(game): add GameCard component with swipe, keyboard, and animation support"
```

---

## Task 7: GameResult Component

**Files:**
- Create: `src/components/games/GameResult.vue`

- [ ] **Step 1: Create the component**

```vue
<template>
  <div class="c-game-result">
    <p class="c-game-result__title">Game Over</p>

    <div class="c-game-result__stats">
      <div class="c-game-result__stat">
        <span class="c-game-result__stat-value">{{ score }}</span>
        <span class="c-game-result__stat-label">Score</span>
      </div>
      <div class="c-game-result__stat">
        <span class="c-game-result__stat-value">{{ bestStreak }}</span>
        <span class="c-game-result__stat-label">Best Streak</span>
      </div>
      <div class="c-game-result__stat">
        <span class="c-game-result__stat-value">{{ accuracyPercent }}%</span>
        <span class="c-game-result__stat-label">Genauigkeit</span>
      </div>
      <div :class="['c-game-result__stat', isNewHighScore && 'c-game-result__stat--highlight']">
        <span class="c-game-result__stat-value">
          <TrophyIcon v-if="isNewHighScore" width="18" height="18" aria-hidden="true" />
          {{ isNewHighScore ? 'Neu!' : allTimeHighScore }}
        </span>
        <span class="c-game-result__stat-label">Highscore</span>
      </div>
    </div>

    <a
      v-if="lastCard?.isReal && lastCard.slug"
      :href="`/wort/${lastCard.slug}`"
      class="c-game-result__word-link"
    >
      <span>💡 „{{ lastCard.word }}" erkunden</span>
      <ExternalLinkIcon width="16" height="16" aria-hidden="true" />
    </a>

    <div class="c-game-result__actions">
      <button
        v-if="canShare"
        class="c-game-result__share-btn"
        @click="share"
      >
        <Share2Icon width="18" height="18" aria-hidden="true" />
        Teilen
      </button>
      <button class="c-game-result__restart-btn" @click="emit('restart')">
        <RefreshCwIcon width="18" height="18" aria-hidden="true" />
        Nochmal
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useShare } from '@vueuse/core'
import type { GameCard } from '@composables/useGame'

const TrophyIcon = defineAsyncComponent(() => import('virtual:icons/lucide/trophy'))
const ExternalLinkIcon = defineAsyncComponent(() => import('virtual:icons/lucide/external-link'))
const Share2Icon = defineAsyncComponent(() => import('virtual:icons/lucide/share-2'))
const RefreshCwIcon = defineAsyncComponent(() => import('virtual:icons/lucide/refresh-cw'))

const props = defineProps<{
  score: number
  bestStreak: number
  totalAnswered: number
  correctAnswers: number
  isNewHighScore: boolean
  allTimeHighScore: number
  lastCard: GameCard | null
}>()

const emit = defineEmits<{
  restart: []
}>()

const accuracyPercent = computed(() =>
  props.totalAnswered > 0
    ? Math.round((props.correctAnswers / props.totalAnswered) * 100)
    : 0,
)

const { share: _share, isSupported: canShare } = useShare()

function share() {
  _share({
    title: 'Berliner oder nicht?',
    text: `Ich hab ${props.score} Punkte bei „Berliner oder nicht?" 🐻`,
    url: 'https://berliner-schnauze.de/games/berliner-oder-nicht',
  })
}
</script>

<style lang="scss">
@use '@styles/components/berliner-oder-nicht';
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/games/GameResult.vue
git commit -m "feat(game): add GameResult component with stats, share, and word link"
```

---

## Task 8: BerlinerOderNicht Root Component

**Files:**
- Create: `src/components/games/BerlinerOderNicht.vue`

This component fetches `/api/search/index.json`, maps words to `GameCard[]`, initialises `useGame`, and orchestrates phase transitions. It also triggers `ConfettiEffect` on new high score.

- [ ] **Step 1: Create the component**

```vue
<template>
  <div class="c-berliner-oder-nicht">
    <!-- Idle -->
    <div v-if="phase === 'idle'" class="c-berliner-oder-nicht__idle">
      <h1 class="c-berliner-oder-nicht__idle-title">Berliner<br />oder nicht?</h1>
      <p class="c-berliner-oder-nicht__idle-description">
        Echtes Berlinerisch oder erfunden? Swipe oder klick — du hast 3 Leben!
      </p>
      <div v-if="allTimeHighScore > 0" class="c-berliner-oder-nicht__idle-prev-stats">
        <div>
          <span class="c-berliner-oder-nicht__idle-stat-value">{{ allTimeHighScore }}</span>
          Highscore
        </div>
        <div>
          <span class="c-berliner-oder-nicht__idle-stat-value">{{ allTimeBestStreak }}</span>
          Best Streak
        </div>
      </div>
      <button class="c-berliner-oder-nicht__start-btn" @click="startGame">
        Spielen
      </button>
    </div>

    <!-- Playing -->
    <template v-if="phase === 'playing'">
      <GameHUD
        :lives="lives"
        :score="score"
        :streak="streak"
        :multiplier="multiplier"
        :is-highscore="score > allTimeHighScore"
      />
      <GameCard
        v-if="currentCard"
        :word="currentCard.word"
        :card-number="cardNumber"
        :is-animating-out="isAnimatingOut"
        :exit-direction="exitDirection"
        :is-shaking="isShaking"
        :last-answer-correct="lastAnswerCorrect"
        :is-real="currentCard.isReal"
        @answer="onAnswer"
      />
    </template>

    <!-- Result -->
    <template v-if="phase === 'result'">
      <ConfettiEffect v-if="isNewHighScore" />
      <GameResult
        :score="score"
        :best-streak="bestStreak"
        :total-answered="totalAnswered"
        :correct-answers="correctAnswers"
        :is-new-high-score="isNewHighScore"
        :all-time-high-score="allTimeHighScore"
        :last-card="lastCard"
        @restart="startGame"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useStore } from '@nanostores/vue'
import ConfettiEffect from '@components/ConfettiEffect.vue'
import { $gameStats } from '@stores/gameStats'
import { fakeWords } from '@/data/fakeWords'
import { useGame, type GameCard as GameCardData } from '@composables/useGame'
import GameCard from '@components/games/GameCard.vue'
import GameHUD from '@components/games/GameHUD.vue'
import GameResult from '@components/games/GameResult.vue'

const {
  answer,
  bestStreak,
  correctAnswers,
  currentCard,
  init,
  isNewHighScore,
  lastAnswerCorrect,
  lastCard,
  lives,
  multiplier,
  phase,
  score,
  startGame: _startGame,
  streak,
  totalAnswered,
} = useGame()

const stats = useStore($gameStats)
const allTimeHighScore = computed(() => stats.value.highScore)
const allTimeBestStreak = computed(() => stats.value.bestStreak)

// Animation state
const isAnimatingOut = ref(false)
const exitDirection = ref<'left' | 'right' | null>(null)
const isShaking = ref(false)
const cardNumber = ref(1)

onMounted(async () => {
  try {
    const res = await fetch('/api/search/index.json')
    if (!res.ok) throw new Error('Failed to load word index')
    const data = await res.json()

    // data is an Orama serialised index — the actual records are nested
    // Extract word objects from the Orama index structure
    const records: Array<{ wordProperties: { berlinerisch: string; translations: string[] }; slug: string }> =
      Object.values((data as any)?.data?.docs?.docs ?? {})

    const realWords: GameCard[] = records
      .filter((r) => r?.wordProperties?.berlinerisch)
      .map((r) => ({
        word: r.wordProperties.berlinerisch,
        isReal: true,
        slug: r.slug,
        translation: r.wordProperties.translations?.[0] ?? undefined,
      }))

    init(realWords, fakeWords)
  } catch (err) {
    console.error('[BerlinerOderNicht] Failed to load words:', err)
  }
})

function startGame() {
  cardNumber.value = 1
  isAnimatingOut.value = false
  exitDirection.value = null
  isShaking.value = false
  _startGame()
}

function onAnswer(guessedReal: boolean) {
  // Check correct before calling answer() to animate accordingly
  const card = currentCard.value
  if (!card) return

  const correct = card.isReal === guessedReal

  if (correct) {
    exitDirection.value = guessedReal ? 'right' : 'left'
    isAnimatingOut.value = true
    setTimeout(() => {
      isAnimatingOut.value = false
      exitDirection.value = null
      cardNumber.value++
    }, 350)
  } else {
    isShaking.value = true
    setTimeout(() => {
      isShaking.value = false
      cardNumber.value++
    }, 1200)
  }

  answer(guessedReal)
}
</script>

<style lang="scss">
@use '@styles/components/berliner-oder-nicht';
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/games/BerlinerOderNicht.vue
git commit -m "feat(game): add BerlinerOderNicht root component with phase switching and animation"
```

---

## Task 9: Astro Page

**Files:**
- Create: `src/pages/games/berliner-oder-nicht.astro`

- [ ] **Step 1: Create the page**

```astro
---
import BerlinerOderNicht from '@components/games/BerlinerOderNicht.vue'
import Layout from '@layouts/Layout.astro'

const page = {
  description: 'Echtes Berlinerisch oder erfunden? Swipe-Game mit Streak-Multiplikator und Highscore.',
  title: 'Berliner oder nicht? – Das Swipe-Game | Berliner Schnauze',
}
---

<Layout content={page}>
  <BerlinerOderNicht client:load />
</Layout>
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/games/berliner-oder-nicht.astro
git commit -m "feat(game): add /games/berliner-oder-nicht route"
```

---

## Task 10: Smoke Test

- [ ] **Step 1: Run full test suite**

```bash
pnpm test:unit
```

Expected: all tests pass including the new `useGame.test.ts`.

- [ ] **Step 2: Run lint**

```bash
pnpm lint
```

Fix any reported issues before continuing.

- [ ] **Step 3: Start dev server and verify**

```bash
pnpm dev
```

Navigate to `http://localhost:4321/games/berliner-oder-nicht`.

Verify:
- Idle screen shows title + "Spielen" button
- Clicking "Spielen" starts the game, cards appear
- Correct answer: card animates out, score increases
- Wrong answer: card shakes, life icon goes grey
- Streak 3+: multiplier badge appears in HUD
- 0 lives → result screen appears
- Result screen shows stats, restart button works
- Repeat twice to verify high score persists after reload (check localStorage key `gameStats:highScore`)

- [ ] **Step 4: Final commit if any fixes were made during smoke test**

```bash
git add -p
git commit -m "fix(game): smoke test fixes for Berliner oder nicht game"
```
