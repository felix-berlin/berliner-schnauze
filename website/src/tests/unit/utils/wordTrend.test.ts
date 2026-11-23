import { buildTrends } from "@utils/wordTrend.ts";
import { describe, expect, it } from "vitest";

const TODAY = "2026-11-08";
const ranked = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ views: 100 - i, word: i + 1 }));

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
});
