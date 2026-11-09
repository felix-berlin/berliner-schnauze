import { describe, expect, it } from "vitest";

import { buildTrends, formatChange, percentChange } from "@utils/wordTrend.ts";

const TODAY = "2026-11-08";
const ranked = (n: number) => Array.from({ length: n }, (_, i) => ({ views: 100 - i, word: i + 1 }));

describe("buildTrends", () => {
  it("gives rank 3 its value", () => {
    const trend = buildTrends(ranked(11), [], TODAY).get(3);
    expect(trend).toMatchObject({ rank: 3, views: 98 });
  });

  it("gives nothing for rank 11", () => {
    expect(buildTrends(ranked(11), [], TODAY).get(11)).toBeUndefined();
  });

  it("pads missing days with 0 to 7 bars, oldest first", () => {
    const rows = [
      { day: "2026-11-08", views: 5, word: 1 },
      { day: "2026-11-07", views: 2, word: 1 },
    ];
    expect(buildTrends(ranked(1), rows, TODAY).get(1)?.bars).toEqual([0, 0, 0, 0, 0, 2, 5]);
  });

  it("compares with the 7 days before the window", () => {
    const rows = [
      { day: "2026-11-02", views: 40, word: 1 }, // first day of the window: not previous
      { day: "2026-11-01", views: 60, word: 1 },
      { day: "2026-10-26", views: 40, word: 1 },
      { day: "2026-10-25", views: 99, word: 1 }, // older than 14 days: ignored
    ];
    // views 100 vs previous 100 -> ±0 %
    expect(buildTrends(ranked(1), rows, TODAY).get(1)?.change).toBe(0);
  });
});

describe("percentChange / formatChange", () => {
  it.each([
    [112, 100, 12, "+12 %"],
    [50, 100, -50, "−50 %"],
    [100, 100, 0, "±0 %"],
    [10, 0, null, ""],
  ])("%i vs %i gives %s", (views, previous, pct, text) => {
    expect(percentChange(views, previous)).toBe(pct);
    expect(formatChange(pct)).toBe(text);
  });
});
