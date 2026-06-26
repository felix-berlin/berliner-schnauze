import { beforeEach, describe, expect, it, vi } from 'vitest'

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
  persistentAtom: vi.fn(() => ({
    get: vi.fn(() => null),
    set: vi.fn(),
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

vi.mock('@utils/analytics', () => ({
  trackEvent: vi.fn(),
}))

import { buildDeck, computeMultiplier, useBon } from '@composables/useBon'
import type { FakeWord } from '@/data/fakeWords'
import type { SavedBonSnapshot } from '@stores/savedBon'
import { $savedBon } from '@stores/savedBon'
import { $bonStats } from '@stores/bonStats'
import { createToastNotify } from '@stores/toastNotify'
import { trackEvent } from '@utils/analytics'

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

// ─── computeMultiplier ────────────────────────────────────────────────────────

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

// ─── buildDeck ────────────────────────────────────────────────────────────────

describe('buildDeck', () => {
  it('always returns exactly 20 cards', () => {
    const deck = buildDeck(makeRealWords(50), makeFakeWords(30))
    expect(deck).toHaveLength(20)
  })

  it('real card count is between 10 and 15 (50–75%)', () => {
    for (let i = 0; i < 20; i++) {
      const deck = buildDeck(makeRealWords(50), makeFakeWords(30))
      const realCount = deck.filter((c) => c.isReal).length
      expect(realCount).toBeGreaterThanOrEqual(10)
      expect(realCount).toBeLessThanOrEqual(15)
    }
  })

  it('fake cards have isReal = false', () => {
    const deck = buildDeck(makeRealWords(50), makeFakeWords(30))
    deck.filter((c) => !c.isReal).forEach((c) => expect(c.isReal).toBe(false))
  })

  it('real cards carry slug and word', () => {
    const deck = buildDeck(makeRealWords(50), makeFakeWords(30))
    deck.filter((c) => c.isReal).forEach((c) => {
      expect(c.slug).toBeDefined()
      expect(c.word).toBeTruthy()
    })
  })

  it('no duplicate words within one deck', () => {
    const deck = buildDeck(makeRealWords(50), makeFakeWords(30))
    expect(new Set(deck.map((c) => c.word)).size).toBe(20)
  })
})

// ─── isReady guard ────────────────────────────────────────────────────────────

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

// ─── answer — guards ─────────────────────────────────────────────────────────

describe('answer — guards', () => {
  it('does nothing when phase is idle (no init)', () => {
    const { answer, phase, score } = useBon()
    answer(true)
    expect(phase.value).toBe('idle')
    expect(score.value).toBe(0)
  })

  it('does nothing when phase is idle (after init, before startGame)', () => {
    const { init, answer, phase } = useBon()
    init(makeRealWords(30), makeFakeWords(20))
    answer(true)
    expect(phase.value).toBe('idle')
  })
})

// ─── answer — correct path ───────────────────────────────────────────────────

describe('answer — correct path', () => {
  beforeEach(() => vi.clearAllMocks())

  it('increments score by 10 on first correct answer', () => {
    const { init, startGame, answer, currentCard, score } = useBon()
    init(makeRealWords(30), makeFakeWords(20))
    startGame()
    answer(currentCard.value!.isReal)
    expect(score.value).toBe(10)
  })

  it('increments streak', () => {
    const { init, startGame, answer, currentCard, streak } = useBon()
    init(makeRealWords(30), makeFakeWords(20))
    startGame()
    answer(currentCard.value!.isReal)
    expect(streak.value).toBe(1)
  })

  it('tracks bestStreak', () => {
    const { init, startGame, answer, currentCard, bestStreak } = useBon()
    init(makeRealWords(30), makeFakeWords(20))
    startGame()
    answer(currentCard.value!.isReal)
    expect(bestStreak.value).toBe(1)
  })

  it('increments correctAnswers', () => {
    const { init, startGame, answer, currentCard, correctAnswers } = useBon()
    init(makeRealWords(30), makeFakeWords(20))
    startGame()
    answer(currentCard.value!.isReal)
    expect(correctAnswers.value).toBe(1)
  })

  it('applies multiplier x2 at streak 3', () => {
    const { init, startGame, answer, currentCard, score } = useBon()
    init(makeRealWords(30), makeFakeWords(20))
    startGame()
    // answer same card 3 times (card doesn't auto-advance in composable)
    answer(currentCard.value!.isReal) // streak 1, mult 1 → +10 = 10
    answer(currentCard.value!.isReal) // streak 2, mult 1 → +10 = 20
    answer(currentCard.value!.isReal) // streak 3, mult 2 → +20 = 40
    expect(score.value).toBe(40)
  })

  it('applies multiplier x3 at streak 6', () => {
    const { init, startGame, answer, currentCard, score, multiplier } = useBon()
    init(makeRealWords(30), makeFakeWords(20))
    startGame()
    for (let i = 0; i < 6; i++) answer(currentCard.value!.isReal)
    expect(multiplier.value).toBe(3)
    // score: 10+10+20+20+20+30 = 110
    expect(score.value).toBe(110)
  })

  it('applies multiplier x5 at streak 10', () => {
    const { init, startGame, answer, currentCard, multiplier } = useBon()
    init(makeRealWords(30), makeFakeWords(20))
    startGame()
    for (let i = 0; i < 10; i++) answer(currentCard.value!.isReal)
    expect(multiplier.value).toBe(5)
  })

  it('triggers toast for correct real card with translation', async () => {
    vi.useFakeTimers()
    try {
      const { init, startGame, answer, currentCard, nextCard } = useBon()
      init(makeRealWords(30), makeFakeWords(20))
      startGame()
      vi.mocked(createToastNotify).mockClear()

      // advance to a real card (50-75% of deck is real)
      let attempts = 0
      while (!currentCard.value?.isReal && attempts < 20) {
        nextCard()
        attempts++
      }
      expect(currentCard.value?.isReal).toBe(true)
      answer(true)
      // createToastNotify is deferred one rAF to avoid GPU compositor contention
      // with the card animation on mobile — flush fake timers to trigger it.
      await vi.runAllTimersAsync()
      expect(createToastNotify).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'success' }),
      )
    } finally {
      // finally — a failing assertion must not leak fake timers into other tests
      vi.useRealTimers()
    }
  })

  it('does NOT trigger toast for correct fake card', () => {
    const { init, startGame, answer, currentCard, nextCard } = useBon()
    init(makeRealWords(30), makeFakeWords(20))
    startGame()
    vi.mocked(createToastNotify).mockClear()

    // advance to a fake card
    let attempts = 0
    while (currentCard.value?.isReal && attempts < 20) {
      nextCard()
      attempts++
    }
    if (!currentCard.value?.isReal) {
      answer(false) // correctly identify as fake
      expect(createToastNotify).not.toHaveBeenCalled()
    }
  })

  it('saves snapshot to storage after correct answer', () => {
    const { init, startGame, answer, currentCard } = useBon()
    init(makeRealWords(30), makeFakeWords(20))
    startGame()
    vi.mocked($savedBon.set).mockClear()
    answer(currentCard.value!.isReal)
    expect($savedBon.set).toHaveBeenCalledWith(expect.objectContaining({ phase: 'playing' }))
  })
})

// ─── answer — wrong path ─────────────────────────────────────────────────────

describe('answer — wrong path', () => {
  beforeEach(() => vi.clearAllMocks())

  it('decrements lives on wrong answer', () => {
    const { init, startGame, answer, currentCard, lives } = useBon()
    init(makeRealWords(30), makeFakeWords(20))
    startGame()
    answer(!currentCard.value!.isReal)
    expect(lives.value).toBe(2)
  })

  it('resets streak to 0 on wrong answer', () => {
    const { init, startGame, answer, currentCard, streak } = useBon()
    init(makeRealWords(30), makeFakeWords(20))
    startGame()
    answer(currentCard.value!.isReal) // streak → 1
    answer(!currentCard.value!.isReal) // wrong → streak → 0
    expect(streak.value).toBe(0)
  })

  it('resets multiplier to 1 on wrong answer', () => {
    const { init, startGame, answer, currentCard, multiplier } = useBon()
    init(makeRealWords(30), makeFakeWords(20))
    startGame()
    for (let i = 0; i < 3; i++) answer(currentCard.value!.isReal) // mult → 2
    answer(!currentCard.value!.isReal) // wrong → mult → 1
    expect(multiplier.value).toBe(1)
  })

  it('ends game when 3 lives are lost', () => {
    const { init, startGame, answer, currentCard, phase } = useBon()
    init(makeRealWords(30), makeFakeWords(20))
    startGame()
    for (let i = 0; i < 3; i++) answer(!currentCard.value!.isReal)
    expect(phase.value).toBe('result')
  })

  it('saves snapshot when lives remain after wrong answer', () => {
    const { init, startGame, answer, currentCard } = useBon()
    init(makeRealWords(30), makeFakeWords(20))
    startGame()
    vi.mocked($savedBon.set).mockClear()
    answer(!currentCard.value!.isReal) // 1 wrong → 2 lives remain
    expect($savedBon.set).toHaveBeenCalledWith(expect.objectContaining({ phase: 'playing' }))
  })

  it('clears storage (not saves) when game ends', () => {
    const { init, startGame, answer, currentCard } = useBon()
    init(makeRealWords(30), makeFakeWords(20))
    startGame()
    for (let i = 0; i < 3; i++) answer(!currentCard.value!.isReal)
    expect($savedBon.set).toHaveBeenLastCalledWith(null)
  })

  it('increments totalAnswered on wrong answer', () => {
    const { init, startGame, answer, currentCard, totalAnswered } = useBon()
    init(makeRealWords(30), makeFakeWords(20))
    startGame()
    answer(!currentCard.value!.isReal)
    expect(totalAnswered.value).toBe(1)
  })
})

// ─── _endGame ─────────────────────────────────────────────────────────────────

describe('_endGame', () => {
  beforeEach(() => vi.clearAllMocks())

  const playUntilGameOver = (correctFirst = 0) => {
    const game = useBon()
    game.init(makeRealWords(30), makeFakeWords(20))
    game.startGame()
    for (let i = 0; i < correctFirst; i++) game.answer(game.currentCard.value!.isReal)
    for (let i = 0; i < 3; i++) game.answer(!game.currentCard.value!.isReal)
    return game
  }

  it('sets phase to result', () => {
    const { phase } = playUntilGameOver()
    expect(phase.value).toBe('result')
  })

  it('increments totalGamesPlayed by 1', () => {
    playUntilGameOver()
    expect($bonStats.setKey).toHaveBeenCalledWith('totalGamesPlayed', 1)
  })

  it('updates totalCorrect', () => {
    playUntilGameOver(2)
    expect($bonStats.setKey).toHaveBeenCalledWith('totalCorrect', 2)
  })

  it('updates totalAnswered', () => {
    playUntilGameOver(2) // 2 correct + 3 wrong = 5 answered
    expect($bonStats.setKey).toHaveBeenCalledWith('totalAnswered', 5)
  })

  it('updates highScore when score beats stored highScore (0)', () => {
    playUntilGameOver(1) // score > 0 → beats stored highScore of 0
    expect($bonStats.setKey).toHaveBeenCalledWith('highScore', expect.any(Number))
  })

  it('does NOT update highScore when score is 0', () => {
    playUntilGameOver(0) // no correct answers → score stays 0, not > 0
    expect($bonStats.setKey).not.toHaveBeenCalledWith('highScore', expect.anything())
  })

  it('updates bestStreak when beaten', () => {
    playUntilGameOver(1) // 1 correct → bestStreak becomes 1 > stored 0
    expect($bonStats.setKey).toHaveBeenCalledWith('bestStreak', 1)
  })

  it('does NOT update bestStreak when score is 0', () => {
    playUntilGameOver(0) // no correct answers → bestStreak stays 0, not > 0
    expect($bonStats.setKey).not.toHaveBeenCalledWith('bestStreak', expect.anything())
  })

  it('fires game_over analytics event', () => {
    playUntilGameOver()
    expect(trackEvent).toHaveBeenCalledWith('game', 'game_over', 'berliner-oder-nicht', expect.any(Number))
  })

  it('fires new_highscore analytics event when score beats stored 0', () => {
    playUntilGameOver(1)
    expect(trackEvent).toHaveBeenCalledWith('game', 'new_highscore', 'berliner-oder-nicht', expect.any(Number))
  })

  it('does NOT fire new_highscore event when score is 0', () => {
    playUntilGameOver(0)
    expect(trackEvent).not.toHaveBeenCalledWith('game', 'new_highscore', expect.anything(), expect.anything())
  })
})

// ─── nextCard ─────────────────────────────────────────────────────────────────

describe('nextCard', () => {
  it('advances to a different card', () => {
    const { init, startGame, nextCard, currentCard } = useBon()
    init(makeRealWords(30), makeFakeWords(20))
    startGame()
    const first = currentCard.value
    nextCard()
    expect(currentCard.value).not.toStrictEqual(first)
  })

  it('refills deck when exhausted', () => {
    const { init, startGame, nextCard, currentCard } = useBon()
    init(makeRealWords(30), makeFakeWords(20))
    startGame()
    for (let i = 0; i < 20; i++) nextCard()
    expect(currentCard.value).not.toBeNull()
  })

  it('refills real/fake queue when cycling through all words (small pool)', () => {
    // With only 12 real words the queue exhausts after the 1st deck draw,
    // triggering the drawFromQueue refill branch on the 2nd _makeQueuedDeck call.
    const { init, startGame, nextCard, currentCard } = useBon()
    init(makeRealWords(12), makeFakeWords(20))
    startGame()
    // exhaust first deck (20 cards) + part of second to force queue refill
    for (let i = 0; i < 40; i++) nextCard()
    expect(currentCard.value).not.toBeNull()
  })
})

describe('bestStreak not updated when new streak is lower', () => {
  it('bestStreak stays at previous peak when later streak is shorter', () => {
    const { init, startGame, answer, currentCard, bestStreak } = useBon()
    init(makeRealWords(30), makeFakeWords(20))
    startGame()
    // Build streak of 3
    for (let i = 0; i < 3; i++) answer(currentCard.value!.isReal)
    expect(bestStreak.value).toBe(3)
    // Wrong answer resets streak
    answer(!currentCard.value!.isReal)
    // Correct again — streak is 1, bestStreak stays at 3
    answer(currentCard.value!.isReal)
    expect(bestStreak.value).toBe(3)
  })
})

// ─── isNewHighScore computed ──────────────────────────────────────────────────

describe('isNewHighScore', () => {
  beforeEach(() => vi.clearAllMocks())

  it('is false in idle phase', () => {
    const { isNewHighScore } = useBon()
    expect(isNewHighScore.value).toBe(false)
  })

  it('is false in playing phase', () => {
    const { init, startGame, isNewHighScore } = useBon()
    init(makeRealWords(30), makeFakeWords(20))
    startGame()
    expect(isNewHighScore.value).toBe(false)
  })

  it('is true after result with positive score', () => {
    const { init, startGame, answer, currentCard, isNewHighScore, phase } = useBon()
    init(makeRealWords(30), makeFakeWords(20))
    startGame()
    answer(currentCard.value!.isReal) // score > 0
    for (let i = 0; i < 3; i++) answer(!currentCard.value!.isReal)
    expect(phase.value).toBe('result')
    expect(isNewHighScore.value).toBe(true) // stored highScore = 0, we scored > 0
  })

  it('is false after result with score 0', () => {
    const { init, startGame, answer, currentCard, isNewHighScore, phase } = useBon()
    init(makeRealWords(30), makeFakeWords(20))
    startGame()
    for (let i = 0; i < 3; i++) answer(!currentCard.value!.isReal)
    expect(phase.value).toBe('result')
    expect(isNewHighScore.value).toBe(false) // score=0 is not > stored highScore=0
  })
})

// ─── session persistence ──────────────────────────────────────────────────────

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

  it('resumeGame restores queues from snapshot', () => {
    const { init, resumeGame, phase } = useBon()
    const realWords = makeRealWords(30)
    init(realWords, makeFakeWords(20))

    const snapshot: SavedBonSnapshot = {
      phase: 'playing',
      lives: 3,
      score: 0,
      streak: 0,
      bestStreak: 0,
      multiplier: 1,
      totalAnswered: 0,
      correctAnswers: 0,
      currentCard: { word: 'Stulle', isReal: true },
      deck: [],
      lastAnswerCorrect: null,
      lastCard: null,
      realQueue: [{ word: 'QueueWord', isReal: true }],
      fakeQueue: [{ word: 'FakeQueue', isReal: false }],
    }
    vi.mocked($savedBon.get).mockReturnValue(snapshot)
    resumeGame()
    expect(phase.value).toBe('playing')
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
    vi.mocked($savedBon.set).mockClear()
    answer(currentCard.value!.isReal)
    expect($savedBon.set).toHaveBeenCalledWith(expect.objectContaining({ phase: 'playing' }))
  })

  it('wrong answer saves snapshot when lives remain', () => {
    const { init, startGame, answer, currentCard, lives } = useBon()
    init(makeRealWords(30), makeFakeWords(20))
    startGame()
    vi.mocked($savedBon.set).mockClear()
    answer(!currentCard.value!.isReal)
    if (lives.value > 0) {
      expect($savedBon.set).toHaveBeenCalledWith(expect.objectContaining({ phase: 'playing' }))
    }
  })

  it('game over clears saved game', () => {
    const { init, startGame, answer, currentCard } = useBon()
    init(makeRealWords(30), makeFakeWords(20))
    startGame()
    for (let i = 0; i < 3; i++) answer(!currentCard.value!.isReal)
    expect($savedBon.set).toHaveBeenLastCalledWith(null)
  })

  it('lastAnswerCorrect and lastCard reflect the most recent answer', () => {
    const { init, startGame, answer, currentCard, lastAnswerCorrect, lastCard } = useBon()
    init(makeRealWords(30), makeFakeWords(20))
    startGame()
    const card = currentCard.value!
    answer(card.isReal)
    expect(lastAnswerCorrect.value).toBe(true)
    expect(lastCard.value).toBe(card)
  })

  it('drawFromQueue breaks when source is empty (covers line 68) and currentCard is null when deck is empty (covers line 156)', () => {
    const { init, startGame, currentCard } = useBon()
    // Both sources empty: drawFromQueue([],[],n) → queue stays empty → break
    // deck ends up [] → _nextCard sets currentCard = undefined ?? null = null
    init([], [])
    startGame()
    expect(currentCard.value).toBeNull()
  })

  it('_saveToStorage early-return branch: phase not playing after game over', () => {
    const { init, startGame, answer, currentCard } = useBon()
    init(makeRealWords(30), makeFakeWords(20))
    startGame()
    // Lose all lives → phase becomes result, _saveToStorage not called with set
    for (let i = 0; i < 3; i++) answer(!currentCard.value!.isReal)
    // After game over, $savedBon.set(null) is called, not _saveToStorage
    expect(vi.mocked($savedBon.set)).toHaveBeenLastCalledWith(null)
  })
})
