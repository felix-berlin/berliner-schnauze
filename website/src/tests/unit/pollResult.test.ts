import { buildPollResult, dotsFor, type FeedbackRow } from "@lib/pollResult";
import { AGES, MIN_GROUP, type Usage } from "payload-app/word-feedback";
import { describe, expect, it } from "vitest";

const rows = (n: number, row: FeedbackRow): FeedbackRow[] => Array.from({ length: n }, () => row);
const mix = (say: number, know: number, never: number): FeedbackRow[] => [
  ...rows(say, { usage: "say" }),
  ...rows(know, { usage: "know" }),
  ...rows(never, { usage: "never" }),
];
const count = (m: Usage[], u: Usage) => m.filter((x) => x === u).length;

describe("dotsFor", () => {
  it("rounds to 5 % per dot", () => {
    expect(dotsFor(12)).toBe(2);
    expect(dotsFor(13)).toBe(3);
    expect(dotsFor(100)).toBe(20);
  });
});

describe("buildPollResult matrix", () => {
  it.each([
    [33, 33, 34],
    [1, 1, 98],
    [1, 1, 1],
  ])("has 100 entries ordered say, know, never for %i/%i/%i", (s, k, n) => {
    const r = buildPollResult(mix(s, k, n));
    expect(r.matrix).toHaveLength(100);
    const order = r.matrix.join(",");
    const sorted = [...r.matrix].sort(
      (a, b) => ["say", "know", "never"].indexOf(a) - ["say", "know", "never"].indexOf(b),
    );
    expect(order).toBe(sorted.join(","));
    expect(r.shares.selbst + r.shares.kenn + r.shares.nie).toBe(100);
    expect(count(r.matrix, "say")).toBe(r.shares.selbst);
    expect(r.total).toBe(s + k + n);
  });

  it("assigns the largest remainders (1/1/1 gives 34/33/33)", () => {
    const r = buildPollResult(mix(1, 1, 1));
    expect([count(r.matrix, "say"), count(r.matrix, "know"), count(r.matrix, "never")]).toEqual([
      34, 33, 33,
    ]);
  });

  it("returns an empty result for 0 votes, ignoring rows without usage", () => {
    const r = buildPollResult([{ half: "east" }, { usage: null }]);
    expect(r).toMatchObject({ byAge: [], byRegion: [], matrix: [], total: 0 });
    expect(r.shares).toEqual({ kenn: 0, nie: 0, selbst: 0 });
  });

  it("echoes the own usage", () => {
    expect(buildPollResult(mix(1, 0, 0), "know").own).toBe("know");
    expect(buildPollResult(mix(1, 0, 0)).own).toBeUndefined();
  });
});

describe("buildPollResult groups", () => {
  it("omits a region group below the threshold and keeps one at it", () => {
    expect(MIN_GROUP).toBe(10);
    const nine = buildPollResult(rows(9, { half: "east", usage: "say" }));
    expect(nine.byRegion).toEqual([]);
    const ten = buildPollResult([
      ...rows(5, { half: "east", usage: "say" }),
      ...rows(5, { half: "east", usage: "know" }),
    ]);
    expect(ten.byRegion).toEqual([{ key: "ost", n: 10, selbst: 50 }]);
  });

  it("derives ost, west and umland only; both counts in none", () => {
    const r = buildPollResult([
      ...rows(10, { half: "east", usage: "say" }),
      ...rows(10, { half: "west", usage: "never" }),
      ...rows(10, { half: "both", usage: "say" }),
      ...rows(10, { area: "brandenburg", usage: "know" }),
      ...rows(10, { area: "elsewhere", usage: "say" }),
    ]);
    expect(r.byRegion).toEqual([
      { key: "ost", n: 10, selbst: 100 },
      { key: "west", n: 10, selbst: 0 },
      { key: "umland", n: 10, selbst: 0 },
    ]);
  });

  it("counts only rows with a usage in n", () => {
    const r = buildPollResult([
      ...rows(10, { half: "east", usage: "say" }),
      ...rows(5, { half: "east" }),
    ]);
    expect(r.byRegion[0]).toEqual({ key: "ost", n: 10, selbst: 100 });
  });

  it("lists age buckets in AGES order and drops those under the threshold", () => {
    const r = buildPollResult([
      ...rows(10, { age: "60-69", usage: "say" }),
      ...rows(9, { age: "u20", usage: "say" }),
      ...rows(10, { age: "20-29", usage: "know" }),
    ]);
    expect(r.byAge.map((g) => g.key)).toEqual(["20-29", "60-69"]);
    expect(AGES.indexOf("20-29")).toBeLessThan(AGES.indexOf("60-69"));
  });
});
