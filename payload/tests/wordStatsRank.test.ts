import { describe, expect, it } from "vitest";

import { berlinDay, rankEngaged, rankRising, rankViewed, type Counts } from "../src/lib/wordStats";

const views = (o: Record<number, number>) =>
  new Map<number, Counts>(
    Object.entries(o).map(([k, v]) => [Number(k), { views: v, interactions: 0 }]),
  );

describe("berlinDay", () => {
  it("uses Berlin time in summer and winter", () => {
    expect(berlinDay(new Date("2026-07-01T22:30:00Z"))).toBe("2026-07-02");
    expect(berlinDay(new Date("2026-12-01T22:30:00Z"))).toBe("2026-12-01");
  });
});

describe("ranks", () => {
  it("rankViewed sorts by views and cuts at limit", () => {
    expect(rankViewed(views({ 1: 5, 2: 9, 3: 7 }), 2).map((r) => r.word)).toEqual([2, 3]);
  });

  it("rankRising damps small words", () => {
    const r = rankRising(views({ 1: 3, 2: 80 }), views({ 1: 1, 2: 50 }), 10);
    expect(r.map((x) => x.word)).toEqual([2, 1]);
    expect(r[1].value).toBeCloseTo(2 / 42.5);
    expect(r[0].value).toBeCloseTo(30 / 91.5);
    expect(r[0].previous).toBe(50);
  });

  it("rankEngaged pulls tiny samples towards the average", () => {
    const cur = new Map<number, Counts>([
      [1, { views: 1, interactions: 1 }],
      [2, { views: 100, interactions: 30 }],
      [3, { views: 100, interactions: 10 }],
    ]);
    const r = rankEngaged(cur, 10);
    expect(r.map((x) => x.word)).toEqual([2, 1, 3]);
    expect(r.map((x) => x.value)).toEqual([
      expect.closeTo(0.261, 3),
      expect.closeTo(0.216, 3),
      expect.closeTo(0.142, 3),
    ]);
  });

  it("rankEngaged ignores words without views", () => {
    const cur = new Map<number, Counts>([
      [1, { views: 0, interactions: 3 }],
      [2, { views: 10, interactions: 1 }],
      [3, { views: 10, interactions: 0 }],
    ]);
    expect(rankEngaged(cur, 10).map((x) => x.word)).toEqual([2, 3]);
  });

  it("rankRising keeps falling words for the caller to drop; empty current period uses m = 1", () => {
    const r = rankRising(new Map(), views({ 1: 4 }), 10);
    expect(r).toEqual([{ word: 1, value: -4 / 5, views: 0, previous: 4 }]);
  });

  it("breaks ties by views, then lowest id", () => {
    expect(rankViewed(views({ 3: 5, 1: 5, 2: 5 }), 3).map((r) => r.word)).toEqual([1, 2, 3]);
  });

  it("returns [] for empty maps", () => {
    expect(rankViewed(new Map(), 5)).toEqual([]);
    expect(rankRising(new Map(), new Map(), 5)).toEqual([]);
    expect(rankEngaged(new Map(), 5)).toEqual([]);
  });
});
