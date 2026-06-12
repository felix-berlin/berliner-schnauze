import { persistentMap } from '@nanostores/persistent'

export interface BonStats {
  highScore: number
  bestStreak: number
  totalGamesPlayed: number
  totalCorrect: number
  totalAnswered: number
  playerName: string
}

export const $bonStats = persistentMap<BonStats>(
  'bonStats:',
  {
    bestStreak: 0,
    highScore: 0,
    playerName: '',
    totalAnswered: 0,
    totalCorrect: 0,
    totalGamesPlayed: 0,
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
