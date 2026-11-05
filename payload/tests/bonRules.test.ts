import { describe, expect, it } from "vitest";

import { computeMultiplier, plausibleTiming, verifyRun } from "../src/lib/bonRules";

describe("computeMultiplier", () => {
  it("steps at 3, 6 and 10", () => {
    const streaks = [0, 2, 3, 5, 6, 9, 10, 40];
    expect(streaks.map(computeMultiplier)).toEqual([1, 1, 2, 2, 3, 3, 5, 5]);
  });
});

describe("verifyRun", () => {
  it("scores a run that ends at the third wrong guess", () => {
    expect(verifyRun([true, true, false, true, true], [true, true, true, false, false])).toEqual({
      score: 20,
      bestStreak: 2,
      totalAnswered: 5,
      correctAnswers: 2,
    });
  });

  it("pins the multiplier steps over 12 correct answers", () => {
    const solutions = Array(15).fill(true);
    const guesses = [...Array(12).fill(true), false, false, false];
    // streak 1-2: x1 (2*10), 3-5: x2 (3*20), 6-9: x3 (4*30), 10-12: x5 (3*50)
    expect(verifyRun(solutions, guesses)).toEqual({
      score: 20 + 60 + 120 + 150,
      bestStreak: 12,
      totalAnswered: 15,
      correctAnswers: 12,
    });
  });

  it("resets the streak after a wrong answer and keeps the best streak", () => {
    const T = true;
    const F = false;
    expect(verifyRun(Array(10).fill(T), [T, T, T, F, T, T, T, F, T, F])).toEqual({
      score: 10 + 10 + 20 + 10 + 10 + 20 + 10,
      bestStreak: 3,
      totalAnswered: 10,
      correctAnswers: 7,
    });
  });

  it("rejects runs that do not end exactly at the third wrong guess", () => {
    expect(verifyRun([true], [])).toBeNull();
    expect(verifyRun([true, true, true], [false, false, true])).toBeNull();
    expect(verifyRun([true, true, true, true], [false, false, false, false])).toBeNull();
    expect(verifyRun([true, true], [false, false, false])).toBeNull();
  });
});

describe("plausibleTiming", () => {
  it("needs 700 ms per answer since the batch was issued", () => {
    const batches = [{ issuedAt: 0, start: 0 }];
    expect(plausibleTiming(batches, 20, 14_000)).toBe(true);
    expect(plausibleTiming(batches, 20, 13_999)).toBe(false);
  });

  it("bounds answers in a later batch by that batch's issue time", () => {
    const batches = [
      { issuedAt: 0, start: 0 },
      { issuedAt: 20_000, start: 20 },
    ];
    expect(plausibleTiming(batches, 30, 27_000)).toBe(true);
    expect(plausibleTiming(batches, 30, 26_999)).toBe(false);
    // batch 2 holds no answered card yet, so only batch 1 counts
    expect(plausibleTiming(batches, 20, 14_000)).toBe(true);
  });

  it("fails when only one of the batches is too fast", () => {
    const fastSecond = [
      { issuedAt: 0, start: 0 },
      { issuedAt: 25_000, start: 20 },
    ];
    // batch 1 is fine at 30_000, batch 2 needs 25_000 + 10 * 700
    expect(plausibleTiming(fastSecond, 30, 30_000)).toBe(false);
    const fastFirst = [
      { issuedAt: 20_000, start: 0 },
      { issuedAt: 0, start: 20 },
    ];
    expect(plausibleTiming(fastFirst, 30, 30_000)).toBe(false);
  });
});
