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
