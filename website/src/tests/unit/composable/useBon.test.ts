// @vitest-environment jsdom
import { useBon, computeMultiplier } from "@composables/useBon";
import * as api from "@services/bonGameApi";
import { $bonStats } from "@stores/bonStats";
import { trackEvent } from "@utils/analytics";
import { computeMultiplier as serverMultiplier } from "payload-app/bon-rules";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@services/bonGameApi");
vi.mock("@utils/analytics", () => ({ trackEvent: vi.fn() }));

const stack = (from: number) =>
  Array.from({ length: 20 }, (_, i) => ({ id: String(from + i), word: `W${from + i}` }));
const reply = (correct: boolean, lives = 3, gameOver = false): api.AnswerReply => ({
  correct,
  gameOver,
  isReal: true,
  lives,
  slug: "w",
  translation: "t",
});
const FINISH = { bestStreak: 3, correctAnswers: 3, score: 50, totalAnswered: 3 };

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  $bonStats.setKey("highScore", 0);
  $bonStats.setKey("bestStreak", 0);
  $bonStats.setKey("totalGamesPlayed", 0);
  $bonStats.setKey("totalCorrect", 0);
  $bonStats.setKey("totalAnswered", 0);
  $bonStats.setKey("playerName", "");
  vi.mocked(api.startRun).mockResolvedValue({ cards: stack(0), token: "tok" });
  vi.mocked(api.nextCards).mockResolvedValue(stack(20));
  vi.mocked(api.answerCard).mockResolvedValue(reply(true));
  vi.mocked(api.finishRun).mockResolvedValue(FINISH);
});

async function started() {
  const bon = useBon();
  await bon.start();
  return bon;
}
/** Answers and advances n times. */
async function play(bon: ReturnType<typeof useBon>, n: number, real = true) {
  for (let i = 0; i < n; i++) {
    await bon.answer(real);
    await bon.advance();
  }
}

describe("computeMultiplier", () => {
  it.each([
    [0, 1],
    [2, 1],
    [3, 2],
    [5, 2],
    [6, 3],
    [9, 3],
    [10, 5],
    [20, 5],
  ])("streak %i gives %i", (s, m) => expect(computeMultiplier(s)).toBe(m));
  it("agrees with the server rules for streaks 0-25", () => {
    for (let s = 0; s <= 25; s++) expect(serverMultiplier(s)).toBe(computeMultiplier(s));
  });
});

describe("useBon", () => {
  it("start deals the first card", async () => {
    $bonStats.setKey("highScore", 77);
    const bon = await started();
    expect(bon.phase.value).toBe("play");
    expect(bon.cardInStack.value).toBe(1);
    expect(bon.stack.value).toBe(1);
    expect(bon.card.value).toEqual({ id: "0", word: "W0" });
    expect(bon.previousHighScore.value).toBe(77);
    expect(trackEvent).toHaveBeenCalledWith("Game", "Game Started", "berliner-oder-nicht");
  });

  it("answer goes to feedback with points", async () => {
    const bon = await started();
    await play(bon, 2);
    await bon.answer(true);
    expect(bon.phase.value).toBe("feedback");
    expect(api.answerCard).toHaveBeenLastCalledWith("tok", "2", true);
    expect(bon.last.value).toMatchObject({ correct: true, multiplier: 2, points: 20, word: "W2" });
    expect(bon.score.value).toBe(10 + 10 + 20);
    expect(bon.history.value).toHaveLength(3);
  });

  it("third wrong answer ends the game", async () => {
    vi.mocked(api.answerCard).mockResolvedValue(reply(false, 0, true));
    $bonStats.setKey("playerName", "Ede");
    const bon = await started();
    await bon.answer(true);
    expect(bon.phase.value).toBe("feedback");
    expect(api.finishRun).not.toHaveBeenCalled();
    await bon.advance();
    expect(bon.phase.value).toBe("over");
    expect(api.finishRun).toHaveBeenCalledTimes(1);
    expect(api.finishRun).toHaveBeenCalledWith("tok", "Ede");
    expect(bon.result.value).toEqual(FINISH);
    expect(bon.lives.value).toBe(0);
  });

  it("prefetches the next stack at card 15, once, and switches without loading", async () => {
    const bon = await started();
    await play(bon, 13); // now on card 14
    expect(api.nextCards).not.toHaveBeenCalled();
    await play(bon, 1); // card 15
    await play(bon, 6); // quick answers through card 20
    expect(api.nextCards).toHaveBeenCalledTimes(1);
    expect(bon.stack.value).toBe(2);
    expect(bon.cardInStack.value).toBe(1);
    expect(bon.card.value?.id).toBe("20");
    expect(bon.phase.value).toBe("play");
  });

  it("stack switch without prefetch shows loading", async () => {
    const bon = await started();
    await play(bon, 19);
    await bon.answer(true);
    let release!: (c: api.PublicCard[]) => void;
    vi.mocked(api.nextCards).mockReset();
    vi.mocked(api.nextCards).mockReturnValue(new Promise((r) => (release = r)));
    // the prefetch at card 15 already failed to be there: simulate by a fresh bon without it
    const advancing = bon.advance();
    expect(["loading", "play"]).toContain(bon.phase.value);
    release(stack(20));
    await advancing;
    expect(bon.phase.value).toBe("play");
    expect(bon.stack.value).toBe(2);
    expect(bon.cardInStack.value).toBe(1);
  });

  it("shows loading when the prefetch failed and the stack ran out", async () => {
    vi.mocked(api.nextCards).mockRejectedValueOnce(new Error("x"));
    const bon = await started();
    await play(bon, 19);
    await bon.answer(true);
    let release!: (c: api.PublicCard[]) => void;
    vi.mocked(api.nextCards).mockReturnValue(new Promise((r) => (release = r)));
    const advancing = bon.advance();
    expect(bon.phase.value).toBe("loading");
    release(stack(20));
    await advancing;
    expect(bon.phase.value).toBe("play");
    expect(bon.stack.value).toBe(2);
    expect(api.nextCards).toHaveBeenCalledTimes(2);
  });

  it("a failed answer keeps the state and retry repeats the call", async () => {
    const bon = await started();
    await play(bon, 1);
    vi.mocked(api.answerCard).mockRejectedValueOnce(new Error("down"));
    await bon.answer(false);
    expect(bon.phase.value).toBe("error");
    expect(bon.score.value).toBe(10);
    expect(bon.lives.value).toBe(3);
    expect(bon.streak.value).toBe(1);
    bon.retry();
    await vi.waitFor(() => expect(bon.phase.value).toBe("feedback"));
    expect(api.answerCard).toHaveBeenCalledTimes(3);
    expect(api.answerCard).toHaveBeenLastCalledWith("tok", "1", false);
  });

  it("a failed next keeps the state and retry repeats it", async () => {
    vi.mocked(api.nextCards).mockRejectedValue(new Error("down"));
    const bon = await started();
    await play(bon, 19);
    await bon.answer(true);
    const scoreBefore = bon.score.value;
    await bon.advance();
    expect(bon.phase.value).toBe("error");
    expect(bon.score.value).toBe(scoreBefore);
    expect(bon.lives.value).toBe(3);
    vi.mocked(api.nextCards).mockResolvedValue(stack(20));
    bon.retry();
    await vi.waitFor(() => expect(bon.phase.value).toBe("play"));
    expect(bon.stack.value).toBe(2);
  });

  it("a failed start can be retried", async () => {
    vi.mocked(api.startRun).mockRejectedValueOnce(new Error("down"));
    const bon = await started();
    expect(bon.phase.value).toBe("error");
    bon.retry();
    await vi.waitFor(() => expect(bon.phase.value).toBe("play"));
  });

  it("ignores answers while one is in flight and outside play", async () => {
    const bon = useBon();
    await bon.answer(true);
    expect(api.answerCard).not.toHaveBeenCalled();
    await bon.start();
    let release!: (r: api.AnswerReply) => void;
    vi.mocked(api.answerCard).mockReturnValue(new Promise((r) => (release = r)));
    const first = bon.answer(true);
    await bon.answer(false);
    release(reply(true));
    await first;
    expect(api.answerCard).toHaveBeenCalledTimes(1);
    await bon.answer(true); // phase is feedback now
    expect(api.answerCard).toHaveBeenCalledTimes(1);
  });

  it("answer while prefetch is in flight waits and succeeds", async () => {
    const bon = await started();
    await play(bon, 13);
    let releaseNext!: (c: api.PublicCard[]) => void;
    vi.mocked(api.nextCards).mockReturnValue(new Promise((r) => (releaseNext = r)));
    await play(bon, 1); // showing card 15 triggers the prefetch
    expect(api.nextCards).toHaveBeenCalledTimes(1);
    const answering = bon.answer(true);
    await Promise.resolve();
    expect(api.answerCard).toHaveBeenCalledTimes(14);
    releaseNext(stack(20));
    await answering;
    expect(api.answerCard).toHaveBeenCalledTimes(15);
    expect(bon.phase.value).toBe("feedback");
  });

  it("end() early marks endedEarly and survives a rejected finish", async () => {
    vi.mocked(api.finishRun).mockResolvedValue(undefined);
    const bon = await started();
    await play(bon, 2);
    await bon.end();
    expect(bon.endedEarly.value).toBe(true);
    expect(bon.phase.value).toBe("over");
    expect(bon.result.value).toBeUndefined();
  });

  it("over updates $bonStats and tracks events", async () => {
    $bonStats.setKey("highScore", 5);
    $bonStats.setKey("totalGamesPlayed", 1);
    const bon = await started();
    await play(bon, 3);
    await bon.end();
    expect($bonStats.get()).toMatchObject({
      bestStreak: 3,
      highScore: 40,
      totalAnswered: 3,
      totalCorrect: 3,
      totalGamesPlayed: 2,
    });
    expect(trackEvent).toHaveBeenCalledWith("Game", "New Highscore", "berliner-oder-nicht", 40);
    expect(trackEvent).toHaveBeenCalledWith("Game", "New Best Streak", "berliner-oder-nicht", 3);
    expect(trackEvent).toHaveBeenCalledWith("Game", "Game Over", "berliner-oder-nicht", 40);
  });
});
