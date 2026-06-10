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
