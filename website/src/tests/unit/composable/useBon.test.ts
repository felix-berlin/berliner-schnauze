// @vitest-environment jsdom
import { useBon, computeMultiplier } from "@composables/useBon";
import * as api from "@services/bonGameApi";
import { $bonStats } from "@stores/bonStats";
import { trackEvent } from "@utils/analytics";
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

  it("keeps the tag the start call returned", async () => {
    vi.mocked(api.startRun).mockResolvedValue({ cards: stack(0), tag: "K7QX", token: "tok" });
    const bon = useBon();
    expect(bon.tag.value).toBe("");
    await bon.start();
    expect(bon.tag.value).toBe("K7QX");
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

  it("end() while an answer is in flight finishes after it and stays over", async () => {
    const bon = await started();
    let release!: (r: api.AnswerReply) => void;
    vi.mocked(api.answerCard).mockReturnValue(new Promise((r) => (release = r)));
    const answering = bon.answer(true);
    const ending = bon.end();
    await Promise.resolve();
    expect(api.finishRun).not.toHaveBeenCalled();
    release(reply(true));
    await Promise.all([answering, ending]);
    expect(api.finishRun).toHaveBeenCalledTimes(1);
    expect(bon.phase.value).toBe("over");
    expect(bon.history.value).toHaveLength(1);
  });

  it("a late failing answer does not pull an ended game back to error", async () => {
    const bon = await started();
    let fail!: (e: Error) => void;
    vi.mocked(api.answerCard).mockReturnValue(new Promise((_, rej) => (fail = rej)));
    const answering = bon.answer(true);
    const ending = bon.end();
    fail(new Error("x"));
    await Promise.all([answering, ending]);
    expect(bon.phase.value).toBe("over");
  });

  it("end() while the prefetch is in flight waits for it", async () => {
    const bon = await started();
    await play(bon, 13);
    let releaseNext!: (c: api.PublicCard[]) => void;
    vi.mocked(api.nextCards).mockReturnValue(new Promise((r) => (releaseNext = r)));
    await play(bon, 1);
    const ending = bon.end();
    await Promise.resolve();
    expect(api.finishRun).not.toHaveBeenCalled();
    releaseNext(stack(20));
    await ending;
    expect(api.finishRun).toHaveBeenCalledTimes(1);
    expect(bon.phase.value).toBe("over");
  });

  it("end() after the third mistake is no early end; end() without a game counts nothing", async () => {
    const idle = useBon();
    await idle.end();
    expect($bonStats.get().totalGamesPlayed).toBe(0);
    vi.mocked(api.answerCard).mockResolvedValue(reply(false, 0, true));
    const bon = await started();
    await bon.answer(true);
    await bon.end();
    expect(bon.endedEarly.value).toBe(false);
    expect(bon.phase.value).toBe("over");
  });

  it("an empty next reply is an error and retry asks again", async () => {
    // the silent card-15 prefetch and the blocking request both get an empty stack
    vi.mocked(api.nextCards).mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const bon = await started();
    await play(bon, 19);
    await bon.answer(true);
    await bon.advance();
    expect(bon.phase.value).toBe("error");
    bon.retry();
    await vi.waitFor(() => expect(bon.phase.value).toBe("play"));
    expect(api.nextCards).toHaveBeenCalledTimes(3);
    expect(bon.stack.value).toBe(2);
  });

  it("a failed restart cannot finish the previous game", async () => {
    const bon = await started();
    vi.mocked(api.startRun).mockRejectedValueOnce(new Error("down"));
    await bon.start();
    await bon.end();
    expect(api.finishRun).not.toHaveBeenCalled();
  });

  it("end() during an answer that is the third mistake is no early end", async () => {
    const bon = await started();
    let release!: (r: api.AnswerReply) => void;
    vi.mocked(api.answerCard).mockReturnValue(new Promise((r) => (release = r)));
    const answering = bon.answer(true);
    const ending = bon.end();
    release(reply(false, 0, true));
    await Promise.all([answering, ending]);
    expect(bon.endedEarly.value).toBe(false);
    expect(bon.phase.value).toBe("over");
  });

  it("a rejecting finishRun still ends the game, and a retry can store it", async () => {
    vi.mocked(api.finishRun).mockRejectedValueOnce(
      Object.assign(new Error("weg"), { status: 502 }),
    );
    const bon = await started();
    await bon.end();
    expect(bon.phase.value).toBe("over");
    expect(bon.result.value).toBeUndefined();
    expect(bon.finishError.value).toEqual({ message: "weg", retryable: true });
    expect(trackEvent).toHaveBeenCalledWith("Game", "Finish Failed", "berliner-oder-nicht", 502);
    await bon.retryFinish();
    expect(bon.result.value).toEqual(FINISH);
    expect(bon.finishError.value).toBeUndefined();
  });

  it("a refused finish (4xx) cannot be retried", async () => {
    vi.mocked(api.finishRun).mockRejectedValue(
      Object.assign(new Error("Ohne Cookie jibt's keen Ranking."), { status: 400 }),
    );
    const bon = await started();
    await bon.end();
    expect(bon.finishError.value).toEqual({
      message: "Ohne Cookie jibt's keen Ranking.",
      retryable: false,
    });
    await bon.retryFinish();
    expect(api.finishRun).toHaveBeenCalledTimes(1);
  });

  it("a game the server no longer knows offers a new game, not the same call", async () => {
    const bon = await started();
    vi.mocked(api.answerCard).mockRejectedValueOnce(
      Object.assign(new Error("Spiel nich jefunden."), { status: 404 }),
    );
    await bon.answer(true);
    expect(bon.phase.value).toBe("error");
    expect(bon.error.value).toEqual({ message: "Spiel nich jefunden.", retryable: false });
    bon.retry();
    await vi.waitFor(() => expect(bon.phase.value).toBe("play"));
    expect(api.startRun).toHaveBeenCalledTimes(2);
    expect(api.answerCard).toHaveBeenCalledTimes(1);
    expect(bon.error.value).toBeUndefined();
  });

  it("an empty card reply is an error", async () => {
    vi.mocked(api.startRun).mockResolvedValue({ cards: [], token: "tok" });
    const bon = await started();
    expect(bon.phase.value).toBe("error");
  });

  it("a stale reply of a previous game does not leak into a new one", async () => {
    const bon = await started();
    let release!: (r: api.AnswerReply) => void;
    vi.mocked(api.answerCard).mockReturnValue(new Promise((r) => (release = r)));
    const stale = bon.answer(true);
    await bon.start();
    release(reply(true));
    await stale;
    expect(bon.phase.value).toBe("play");
    expect(bon.score.value).toBe(0);
    expect(bon.history.value).toHaveLength(0);
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
