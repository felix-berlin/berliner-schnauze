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
        return JSON.parse(value) as SavedGameSnapshot
      } catch (err) {
        console.warn('[savedGame] Failed to parse snapshot:', value, err)
        return null
      }
    },
    encode: (value) => (value === null ? undefined : JSON.stringify(value)),
  },
)
