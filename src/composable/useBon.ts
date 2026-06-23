import { $bonStats } from "@stores/bonStats";
import { $savedBon } from "@stores/savedBon";
import { createToastNotify } from "@stores/toastNotify";
import { trackEvent } from "@utils/analytics";
import { ref, computed } from "vue";

import type { FakeWord } from "@/data/fakeWords";

export interface BonCard {
  word: string;
  isReal: boolean;
  slug?: string;
  translation?: string;
}

interface BonState {
  phase: "idle" | "playing" | "result";
  lives: number;
  score: number;
  streak: number;
  bestStreak: number;
  multiplier: number;
  totalAnswered: number;
  correctAnswers: number;
  currentCard: BonCard | null;
  deck: BonCard[];
  lastAnswerCorrect: boolean | null;
  lastCard: BonCard | null;
}

// --- Pure helpers (exported for testing) ---

export function computeMultiplier(streak: number): number {
  if (streak >= 10) return 5;
  if (streak >= 6) return 3;
  if (streak >= 3) return 2;
  return 1;
}

function fisherYates<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildDeck(realWords: BonCard[], fakes: FakeWord[]): BonCard[] {
  const DECK_SIZE = 20;
  // Variable split: 50–75% real (10–15 cards), rest fake
  const realCount = Math.floor(Math.random() * 6) + 10; // 10..15
  const fakeCount = DECK_SIZE - realCount;

  const shuffledReal = fisherYates(realWords).slice(0, realCount);
  const shuffledFake = fisherYates(fakes)
    .slice(0, fakeCount)
    .map((f): BonCard => ({ isReal: false, word: f.word }));

  return fisherYates([...shuffledReal, ...shuffledFake]);
}

// Draw n cards from queue without repeating; refills by reshuffling source when empty
function drawFromQueue(queue: BonCard[], source: BonCard[], n: number): BonCard[] {
  const result: BonCard[] = [];
  for (let i = 0; i < n; i++) {
    if (queue.length === 0) queue.push(...fisherYates([...source]));
    if (queue.length === 0) break;
    result.push(queue.shift()!);
  }
  return result;
}

// --- Composable ---

export function useBon() {
  const state = ref<BonState>({
    bestStreak: 0,
    correctAnswers: 0,
    currentCard: null,
    deck: [],
    lastAnswerCorrect: null,
    lastCard: null,
    lives: 3,
    multiplier: 1,
    phase: "idle",
    score: 0,
    streak: 0,
    totalAnswered: 0,
  });
  const isReady = ref(false)

  // Exposed reactive slices
  const phase = computed(() => state.value.phase);
  const lives = computed(() => state.value.lives);
  const score = computed(() => state.value.score);
  const streak = computed(() => state.value.streak);
  const bestStreak = computed(() => state.value.bestStreak);
  const multiplier = computed(() => state.value.multiplier);
  const totalAnswered = computed(() => state.value.totalAnswered);
  const correctAnswers = computed(() => state.value.correctAnswers);
  const currentCard = computed(() => state.value.currentCard);
  const lastAnswerCorrect = computed(() => state.value.lastAnswerCorrect);
  const lastCard = computed(() => state.value.lastCard);

  let _realWords: BonCard[] = [];
  let _fakeSource: BonCard[] = [];
  // Persistent queues — cycle through all words before repeating
  let _realQueue: BonCard[] = [];
  let _fakeQueue: BonCard[] = [];

  function init(realWords: BonCard[], fakeWords: FakeWord[]) {
    _realWords = realWords;
    _fakeSource = fakeWords.map((f) => ({ isReal: false as const, word: f.word }));
    _realQueue = fisherYates([...realWords]);
    _fakeQueue = fisherYates([..._fakeSource]);
    isReady.value = true
  }

  function _makeQueuedDeck(): BonCard[] {
    const realCount = Math.floor(Math.random() * 6) + 10; // 10..15
    const fakeCount = 20 - realCount;
    const real = drawFromQueue(_realQueue, _realWords, realCount);
    const fake = drawFromQueue(_fakeQueue, _fakeSource, fakeCount);
    return fisherYates([...real, ...fake]);
  }

  function startGame() {
    if (!isReady.value) return
    _realQueue = fisherYates([..._realWords]);
    _fakeQueue = fisherYates([..._fakeSource]);
    _clearStorage();
    state.value = {
      bestStreak: 0,
      correctAnswers: 0,
      currentCard: null,
      deck: _makeQueuedDeck(),
      lastAnswerCorrect: null,
      lastCard: null,
      lives: 3,
      multiplier: 1,
      phase: "playing",
      score: 0,
      streak: 0,
      totalAnswered: 0,
    };
    _nextCard();
  }

  function _nextCard() {
    if (state.value.deck.length === 0) {
      state.value.deck = _makeQueuedDeck();
    }
    const [next, ...rest] = state.value.deck;
    state.value.deck = rest;
    state.value.currentCard = next ?? null;
  }

  function nextCard() {
    _nextCard();
  }

  function _saveToStorage() {
    if (state.value.phase !== 'playing' || !state.value.currentCard) return
    $savedBon.set({
      bestStreak: state.value.bestStreak,
      correctAnswers: state.value.correctAnswers,
      currentCard: state.value.currentCard,
      deck: state.value.deck,
      fakeQueue: [..._fakeQueue],
      lastAnswerCorrect: state.value.lastAnswerCorrect,
      lastCard: state.value.lastCard,
      lives: state.value.lives,
      multiplier: state.value.multiplier,
      phase: 'playing',
      realQueue: [..._realQueue],
      score: state.value.score,
      streak: state.value.streak,
      totalAnswered: state.value.totalAnswered,
    })
  }

  function _clearStorage() {
    $savedBon.set(null)
  }

  function answer(guessedReal: boolean) {
    const card = state.value.currentCard;
    if (!card || state.value.phase !== "playing") return;

    const correct = card.isReal === guessedReal;
    state.value.lastCard = card;
    state.value.lastAnswerCorrect = correct;
    state.value.totalAnswered++;

    if (correct) {
      state.value.correctAnswers++;
      state.value.streak++;
      state.value.multiplier = computeMultiplier(state.value.streak);
      if (state.value.streak > state.value.bestStreak) {
        state.value.bestStreak = state.value.streak;
      }
      state.value.score += 10 * state.value.multiplier;

      if (card.isReal && card.translation) {
        // Delay one rAF so the card transition has already claimed its GPU
        // compositor layer. Without this, both the card exit/entry animation and
        // the toast entry animation start in the same frame, causing a one-frame
        // flash on mobile (compositor contention).
        requestAnimationFrame(() => {
          createToastNotify({
            message: `„${card.word}" = ${card.translation}`,
            status: "success",
            timeout: 3000,
          });
        });
      }
      _saveToStorage();
      return;
    }
    state.value.streak = 0;
    state.value.multiplier = 1;
    state.value.lives--;

    if (state.value.lives <= 0) {
      _endGame();
    } else {
      _saveToStorage();
    }
  }

  function _endGame() {
    _clearStorage();
    state.value.phase = "result";
    const stats = $bonStats.get();
    const isNewHighScore = state.value.score > stats.highScore;
    const isNewBestStreak = state.value.bestStreak > stats.bestStreak;

    $bonStats.setKey("totalGamesPlayed", stats.totalGamesPlayed + 1);
    $bonStats.setKey("totalCorrect", stats.totalCorrect + state.value.correctAnswers);
    $bonStats.setKey("totalAnswered", stats.totalAnswered + state.value.totalAnswered);

    if (isNewHighScore) {
      $bonStats.setKey("highScore", state.value.score);
      trackEvent("game", "new_highscore", "berliner-oder-nicht", state.value.score);
    }
    if (isNewBestStreak) {
      $bonStats.setKey("bestStreak", state.value.bestStreak);
    }

    trackEvent("game", "game_over", "berliner-oder-nicht", state.value.score);
  }

  const isNewHighScore = computed(() => {
    const stats = $bonStats.get();
    return (
      state.value.phase === "result" &&
      state.value.score >= stats.highScore &&
      state.value.score > 0
    );
  });

  function resumeGame() {
    if (_realWords.length === 0) return
    const saved = $savedBon.get()
    if (!saved || saved.phase !== 'playing') return
    state.value = {
      bestStreak: saved.bestStreak,
      correctAnswers: saved.correctAnswers,
      currentCard: saved.currentCard,
      deck: saved.deck,
      lastAnswerCorrect: saved.lastAnswerCorrect,
      lastCard: saved.lastCard,
      lives: saved.lives,
      multiplier: saved.multiplier,
      phase: 'playing',
      score: saved.score,
      streak: saved.streak,
      totalAnswered: saved.totalAnswered,
    }
    _realQueue = [...saved.realQueue]
    _fakeQueue = [...saved.fakeQueue]
  }

  return {
    answer,
    bestStreak,
    correctAnswers,
    currentCard,
    init,
    isNewHighScore,
    isReady,
    lastAnswerCorrect,
    lastCard,
    lives,
    multiplier,
    nextCard,
    phase,
    resumeGame,
    score,
    startGame,
    streak,
    totalAnswered,
  };
}
