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

vi.mock('@stores/savedBon', () => ({
  $savedBon: {
    get: vi.fn(() => null),
    set: vi.fn(),
  },
}))

vi.mock('@stores/toastNotify', () => ({
  createToastNotify: vi.fn(),
}))

import { buildDeck, computeMultiplier, useBon } from '@composables/useBon'
import type { FakeWord } from '@/data/fakeWords'
import type { SavedBonSnapshot } from '@stores/savedBon'
import { $savedBon } from '@stores/savedBon'

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

describe('session persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('resumeGame does nothing before init (no words loaded)', () => {
    const { resumeGame, phase } = useBon()
    resumeGame()
    expect(phase.value).toBe('idle')
  })

  it('resumeGame does nothing when saved game is null', () => {
    const { init, resumeGame, phase } = useBon()
    init(makeRealWords(30), makeFakeWords(20))
    vi.mocked($savedBon.get).mockReturnValue(null)
    resumeGame()
    expect(phase.value).toBe('idle')
  })

  it('resumeGame restores state from snapshot', () => {
    const { init, resumeGame, phase, score, lives, streak } = useBon()
    init(makeRealWords(30), makeFakeWords(20))

    const snapshot: SavedBonSnapshot = {
      phase: 'playing',
      lives: 2,
      score: 50,
      streak: 3,
      bestStreak: 5,
      multiplier: 2,
      totalAnswered: 8,
      correctAnswers: 7,
      currentCard: { word: 'Stulle', isReal: true },
      deck: [],
      lastAnswerCorrect: true,
      lastCard: null,
      realQueue: [],
      fakeQueue: [],
    }
    vi.mocked($savedBon.get).mockReturnValue(snapshot)

    resumeGame()
    expect(phase.value).toBe('playing')
    expect(score.value).toBe(50)
    expect(lives.value).toBe(2)
    expect(streak.value).toBe(3)
  })

  it('startGame clears saved game', () => {
    const { init, startGame } = useBon()
    init(makeRealWords(30), makeFakeWords(20))
    startGame()
    expect($savedBon.set).toHaveBeenCalledWith(null)
  })

  it('correct answer saves snapshot to storage', () => {
    const { init, startGame, answer, currentCard } = useBon()
    init(makeRealWords(30), makeFakeWords(20))
    startGame()

    const isReal = currentCard.value!.isReal
    vi.mocked($savedBon.set).mockClear()
    answer(isReal)

    expect($savedBon.set).toHaveBeenCalledWith(expect.objectContaining({ phase: 'playing' }))
  })

  it('wrong answer saves snapshot when lives remain', () => {
    const { init, startGame, answer, currentCard, lives } = useBon()
    init(makeRealWords(30), makeFakeWords(20))
    startGame()

    const isReal = currentCard.value!.isReal
    vi.mocked($savedBon.set).mockClear()
    answer(!isReal)

    if (lives.value > 0) {
      expect($savedBon.set).toHaveBeenCalledWith(expect.objectContaining({ phase: 'playing' }))
    }
  })

  it('game over clears saved game', () => {
    const { init, startGame, answer, currentCard } = useBon()
    init(makeRealWords(30), makeFakeWords(20))
    startGame()

    for (let i = 0; i < 3; i++) {
      answer(!currentCard.value!.isReal)
    }

    expect($savedBon.set).toHaveBeenLastCalledWith(null)
  })
})

describe('useBon — isReady guard', () => {
  it('isReady is false before init', () => {
    const { isReady } = useBon()
    expect(isReady.value).toBe(false)
  })

  it('isReady is true after init', () => {
    const { init, isReady } = useBon()
    init(makeRealWords(15), makeFakeWords(20))
    expect(isReady.value).toBe(true)
  })

  it('startGame before init leaves phase as idle', () => {
    const { startGame, phase } = useBon()
    startGame()
    expect(phase.value).toBe('idle')
  })

  it('startGame after init sets currentCard and phase to playing', () => {
    const { init, startGame, currentCard, phase } = useBon()
    init(makeRealWords(15), makeFakeWords(20))
    startGame()
    expect(phase.value).toBe('playing')
    expect(currentCard.value).not.toBeNull()
  })
})
