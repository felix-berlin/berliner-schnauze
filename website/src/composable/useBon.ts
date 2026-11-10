import type { FinishResult, PublicCard } from "@services/bonGameApi";

import { answerCard, finishRun, nextCards, startRun } from "@services/bonGameApi";
import { $bonStats } from "@stores/bonStats";
import { trackEvent } from "@utils/analytics";
import { ref } from "vue";

export type RoundEntry = {
  word: string;
  correct: boolean;
  isReal: boolean;
  translation?: string;
  slug?: string;
  category?: "invented" | "hochdeutsch";
  points: number;
  multiplier: number;
};

export type BonPhase = "intro" | "play" | "feedback" | "loading" | "error" | "over";

export function computeMultiplier(streak: number): number {
  if (streak >= 10) return 5;
  if (streak >= 6) return 3;
  if (streak >= 3) return 2;
  return 1;
}

const LIVES = 3;
const PREFETCH_AT = 15;
const LABEL = "berliner-oder-nicht";

export function useBon() {
  const phase = ref<BonPhase>("intro");
  const lives = ref(LIVES);
  const score = ref(0);
  const streak = ref(0);
  const bestStreak = ref(0);
  const multiplier = ref(1);
  const card = ref<PublicCard | null>(null);
  const cardInStack = ref(0);
  const stack = ref(0);
  const history = ref<RoundEntry[]>([]);
  const last = ref<RoundEntry | null>(null);
  const result = ref<FinishResult | undefined>();
  const endedEarly = ref(false);
  const previousHighScore = ref(0);

  let token = "";
  let cards: PublicCard[] = [];
  let upcoming: PublicCard[] | undefined;
  let prefetch: Promise<void> | undefined;
  let gameOver = false;
  let busy = false;
  let retryFn: () => void = () => {};
  // The server rejects overlapping calls of one game (409), so every call goes through this chain.
  let chain: Promise<unknown> = Promise.resolve();
  const queued = <T>(fn: () => Promise<T>): Promise<T> => {
    const run = chain.then(fn);
    chain = run.catch(() => {});
    return run;
  };

  function fail(retry: () => void) {
    retryFn = retry;
    phase.value = "error";
  }

  function loadNext(): Promise<void> {
    prefetch ??= queued(() => nextCards(token)).then(
      (c) => {
        upcoming = c;
      },
      (error) => {
        prefetch = undefined;
        throw error;
      },
    );
    return prefetch;
  }

  function showCard(index: number) {
    cardInStack.value = index;
    card.value = cards[index - 1];
    phase.value = "play";
    // Silent: a failed prefetch is requested again when the stack runs out.
    if (index === PREFETCH_AT) loadNext().catch(() => {});
  }

  async function start() {
    previousHighScore.value = $bonStats.get().highScore;
    lives.value = LIVES;
    score.value = streak.value = bestStreak.value = 0;
    multiplier.value = 1;
    history.value = [];
    last.value = null;
    result.value = undefined;
    endedEarly.value = false;
    upcoming = prefetch = undefined;
    gameOver = busy = false;
    chain = Promise.resolve();
    phase.value = "loading";
    try {
      const run = await startRun();
      token = run.token;
      cards = run.cards;
      stack.value = 1;
      showCard(1);
      trackEvent("Game", "Game Started", LABEL);
    } catch {
      fail(start);
    }
  }

  async function answer(real: boolean) {
    if (phase.value !== "play" || busy || !card.value) return;
    busy = true;
    try {
      const reply = await queued(() => answerCard(token, card.value!.id, real));
      streak.value = reply.correct ? streak.value + 1 : 0;
      multiplier.value = computeMultiplier(streak.value);
      bestStreak.value = Math.max(bestStreak.value, streak.value);
      const points = reply.correct ? 10 * multiplier.value : 0;
      score.value += points;
      lives.value = reply.lives;
      gameOver = reply.gameOver;
      const { correct, category, isReal, slug, translation } = reply;
      last.value = {
        category,
        correct,
        isReal,
        multiplier: multiplier.value,
        points,
        slug,
        translation,
        word: card.value.word,
      };
      history.value.push(last.value);
      if (!endedEarly.value) phase.value = "feedback";
    } catch {
      fail(() => {
        phase.value = "play";
        void answer(real);
      });
    } finally {
      busy = false;
    }
  }

  async function finish() {
    phase.value = "loading";
    const name = $bonStats.get().playerName;
    result.value = await finishRun(token, name || undefined);
    const stats = $bonStats.get();
    $bonStats.setKey("totalGamesPlayed", stats.totalGamesPlayed + 1);
    $bonStats.setKey(
      "totalCorrect",
      stats.totalCorrect + history.value.filter((e) => e.correct).length,
    );
    $bonStats.setKey("totalAnswered", stats.totalAnswered + history.value.length);
    if (score.value > stats.highScore) {
      $bonStats.setKey("highScore", score.value);
      trackEvent("Game", "New Highscore", LABEL, score.value);
    }
    if (bestStreak.value > stats.bestStreak) {
      $bonStats.setKey("bestStreak", bestStreak.value);
      trackEvent("Game", "New Best Streak", LABEL, bestStreak.value);
    }
    trackEvent("Game", "Game Over", LABEL, score.value);
    phase.value = "over";
  }

  async function advance() {
    if (phase.value !== "feedback") return;
    if (gameOver) return finish();
    if (cardInStack.value < cards.length) return showCard(cardInStack.value + 1);
    if (!upcoming) {
      phase.value = "loading";
      try {
        await loadNext();
      } catch {
        return fail(() => {
          phase.value = "feedback";
          void advance();
        });
      }
    }
    cards = upcoming!;
    upcoming = prefetch = undefined;
    stack.value++;
    showCard(1);
  }

  const retry = () => retryFn();

  async function end() {
    if (phase.value === "intro" || phase.value === "over" || phase.value === "loading") return;
    endedEarly.value = true;
    await finish();
  }

  return {
    advance,
    answer,
    bestStreak,
    card,
    cardInStack,
    end,
    endedEarly,
    history,
    last,
    lives,
    multiplier,
    phase,
    previousHighScore,
    result,
    retry,
    score,
    stack,
    start,
    streak,
  };
}
