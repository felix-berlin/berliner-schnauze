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
// Spec §7/§13 input locks = the animation: feedback flip-in is done 140 + 340 ms after it
// mounts, the next card has risen after 320 ms.
export const FEEDBACK_LOCK_MS = 480;
export const CARD_LOCK_MS = 320;

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
  // The 4-character suffix of the nameless "Anonym #TAG", as the leaderboard shows it.
  const tag = ref("");
  const previousHighScore = ref(0);
  // The loading phase also covers finishing a run; the screen words the two differently.
  const finishing = ref(false);

  let token = "";
  let cards: PublicCard[] = [];
  let upcoming: PublicCard[] | undefined;
  let prefetch: Promise<void> | undefined;
  let gameOver = false;
  let busy = false;
  let ending = false;
  // Bumped by start(): replies of an earlier game must not touch the current one.
  let gen = 0;
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
    const g = gen;
    prefetch ??= queued(async () => {
      const c = await nextCards(token);
      if (c.length === 0) throw new Error("empty stack");
      return c;
    }).then(
      (c) => {
        if (g === gen) upcoming = c;
      },
      (error) => {
        if (g === gen) prefetch = undefined;
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
    const g = ++gen;
    previousHighScore.value = $bonStats.get().highScore;
    lives.value = LIVES;
    score.value = streak.value = bestStreak.value = 0;
    multiplier.value = 1;
    history.value = [];
    last.value = null;
    result.value = undefined;
    endedEarly.value = false;
    finishing.value = false;
    upcoming = prefetch = undefined;
    token = "";
    gameOver = busy = ending = false;
    chain = Promise.resolve();
    phase.value = "loading";
    try {
      const run = await startRun();
      if (g !== gen) return;
      if (run.cards.length === 0) throw new Error("empty stack");
      token = run.token;
      tag.value = run.tag;
      cards = run.cards;
      stack.value = 1;
      showCard(1);
      trackEvent("Game", "Game Started", LABEL);
    } catch {
      if (g === gen) fail(start);
    }
  }

  async function answer(real: boolean) {
    if (phase.value !== "play" || busy || !card.value) return;
    busy = true;
    const g = gen;
    const entry = card.value;
    try {
      const reply = await queued(() => answerCard(token, entry.id, real));
      if (g !== gen) return;
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
        word: entry.word,
      };
      history.value.push(last.value);
      if (!ending) phase.value = "feedback";
    } catch {
      // Once the run is being finished the answer is moot.
      if (g === gen && !ending) {
        fail(() => {
          phase.value = "play";
          void answer(real);
        });
      }
    } finally {
      if (g === gen) busy = false;
    }
  }

  async function finish() {
    const g = gen;
    // Before the phase: the screen holds the game view while finishing (it morphs into the result).
    finishing.value = true;
    phase.value = "loading";
    const name = $bonStats.get().playerName;
    const res = await queued(() => finishRun(token, name || undefined)).catch(() => undefined);
    if (g !== gen) return;
    result.value = res;
    // Decided after the queue settled: an in-flight answer may have been the third mistake.
    endedEarly.value = !gameOver;
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
    const g = gen;
    if (cardInStack.value < cards.length) return showCard(cardInStack.value + 1);
    if (!upcoming) {
      phase.value = "loading";
      try {
        await loadNext();
      } catch {
        if (g !== gen) return;
        return fail(() => {
          phase.value = "feedback";
          void advance();
        });
      }
    }
    if (g !== gen) return;
    cards = upcoming!;
    upcoming = prefetch = undefined;
    stack.value++;
    showCard(1);
  }

  function retry() {
    if (phase.value !== "error") return;
    const run = retryFn;
    retryFn = () => {};
    run();
  }

  async function end() {
    if (!token || ["intro", "over", "loading"].includes(phase.value)) return;
    ending = true;
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
    finishing,
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
    tag,
  };
}
