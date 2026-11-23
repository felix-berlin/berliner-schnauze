import { dotsFromShares, largestRemainder } from "@lib/largestRemainder.ts";
import { buildPollResult } from "@lib/pollResult.ts";
import { describe, expect, it } from "vitest";

describe("largestRemainder", () => {
  it("sums to exactly 100", () => {
    expect(largestRemainder([1, 1, 1])).toEqual([34, 33, 33]);
    expect(largestRemainder([5, 3, 2])).toEqual([50, 30, 20]);
    expect(largestRemainder([2, 1, 0])).toEqual([67, 33, 0]);
  });
  it("gives ties to the earlier entry", () => {
    expect(largestRemainder([1, 1])).toEqual([50, 50]);
    expect(largestRemainder([1, 1, 1, 1, 1, 1, 1])).toEqual([15, 15, 14, 14, 14, 14, 14]);
    expect(largestRemainder([0, 1, 1])).toEqual([0, 50, 50]);
  });
  it("is all 0 without votes", () => {
    expect(largestRemainder([0, 0, 0])).toEqual([0, 0, 0]);
    expect(largestRemainder([])).toEqual([]);
  });
  it("honours another total", () => {
    expect(largestRemainder([1, 1, 1], 10)).toEqual([4, 3, 3]);
  });
});

describe("dotsFromShares", () => {
  it("repeats each entry by its share, in order", () => {
    expect(dotsFromShares(["a", "b", "c"], [2, 0, 1])).toEqual(["a", "a", "c"]);
    expect(dotsFromShares(["a"], [0])).toEqual([]);
  });
});

describe("buildPollResult matrix", () => {
  it("has 100 dots with votes and none without", () => {
    const rows = [
      { usage: "say" as const },
      { usage: "know" as const },
      { usage: "never" as const },
    ];
    const r = buildPollResult(rows);
    expect(r.matrix).toHaveLength(100);
    expect(r.shares).toEqual({ kenn: 33, nie: 33, selbst: 34 });
    expect(r.matrix.filter((u) => u === "say")).toHaveLength(34);
    const empty = buildPollResult([]);
    expect(empty.matrix).toEqual([]);
    expect(empty.shares).toEqual({ kenn: 0, nie: 0, selbst: 0 });
  });
});
