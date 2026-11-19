import { describe, expect, it } from "vitest";

import { bucketSeries } from "../src/components/stats/chartData";
import { pickColors } from "../src/components/stats/themeColors";
import { METRICS, type Metric } from "../src/lib/statsMetrics";

const emptyDaily = () =>
  Object.fromEntries(METRICS.map((m) => [m, {} as Record<string, number>])) as Record<
    Metric,
    Record<string, number>
  >;

describe("bucketSeries", () => {
  it("returns one zero-filled value per day for a short range", () => {
    const daily = emptyDaily();
    daily.views = { "2026-11-02": 4 };
    const { labels, values } = bucketSeries(daily, { from: "2026-11-01", to: "2026-11-03" });
    expect(labels).toEqual(["2026-11-01", "2026-11-02", "2026-11-03"]);
    expect(values.views).toEqual([0, 4, 0]);
    expect(values.bonGames).toEqual([0, 0, 0]);
  });

  it("sums ISO weeks above 90 days and starts the first bucket at the range start", () => {
    const daily = emptyDaily();
    daily.views = { "2026-08-21": 1, "2026-08-23": 2, "2026-08-24": 5 }; // Fri, Sun, Mon
    const { labels, values } = bucketSeries(daily, { from: "2026-08-21", to: "2026-11-19" });
    expect(labels.slice(0, 3)).toEqual(["2026-08-21", "2026-08-24", "2026-08-31"]);
    expect(values.views.slice(0, 3)).toEqual([3, 5, 0]);
  });

  it("never yields NaN for an empty range of data", () => {
    const { values } = bucketSeries(emptyDaily(), { from: "2026-11-01", to: "2026-11-07" });
    for (const m of METRICS) expect(values[m].every((n) => n === 0)).toBe(true);
  });
});

describe("pickColors", () => {
  it("falls back to fixed colors when the admin variables are missing", () => {
    const c = pickColors(() => "");
    expect(c.text).toMatch(/^#/);
    expect(c.grid).toMatch(/^#/);
    expect(c.series.length).toBeGreaterThanOrEqual(8);
  });

  it("uses an admin variable when it has a value", () => {
    const c = pickColors((name) => (name === "--theme-success-500" ? " #00aa00 " : ""));
    expect(c.series[0]).toBe("#00aa00");
  });
});
