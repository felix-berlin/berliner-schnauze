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
