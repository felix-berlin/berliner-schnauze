import { persistentAtom } from '@nanostores/persistent'
import type { BonCard } from '@composables/useBon'

export interface SavedBonSnapshot {
  phase: 'playing'
  lives: number
  score: number
  streak: number
  bestStreak: number
  multiplier: number
  totalAnswered: number
  correctAnswers: number
  currentCard: BonCard
  deck: BonCard[]
  lastAnswerCorrect: boolean | null
  lastCard: BonCard | null
  realQueue: BonCard[]
  fakeQueue: BonCard[]
}

export const $savedBon = persistentAtom<SavedBonSnapshot | null>(
  'bonSession:',
  null,
  {
    decode(value) {
      try {
        return JSON.parse(value) as SavedBonSnapshot
      } catch (err) {
        console.warn('[savedBon] Failed to parse snapshot:', value, err)
        return null
      }
    },
    encode: (value) => (value === null ? undefined : JSON.stringify(value)),
  },
)
