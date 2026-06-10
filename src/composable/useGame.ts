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
