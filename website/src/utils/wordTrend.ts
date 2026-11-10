export type WordTrend = { rank: number; views: number; change: number | null; bars: number[] };

/** The word page shows the trend box for these top places of the week (Spec §16.1: views in 7 days). */
export const TREND_TOP = 10;
export const TREND_DAYS = 7;

export type TrendRow = { word: number; day: string; views: number };

const shiftDay = (day: string, n: number): string =>
  new Date(Date.parse(`${day}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);

/** Rounded percent change against the previous week; null without a previous week (nothing to compare). */
export const percentChange = (views: number, previous: number): number | null =>
  previous <= 0 ? null : Math.round(((views - previous) / previous) * 100);

/** Signed percent for display (`+12 %`); empty for null. */
export const formatChange = (pct: number | null): string =>
  pct === null ? "" : `${pct > 0 ? "+" : pct < 0 ? "−" : "±"}${Math.abs(pct)} %`;

/**
 * Trend data per word for the top places of `ranked` (highest views first, as `trending` returns it).
 * `rows` are the daily stats of the last 14 Berlin days ending at `today`; days without a row count as 0,
 * so `bars` always has 7 values, oldest first.
 */
export const buildTrends = (
  ranked: { word: number; views: number }[],
  rows: TrendRow[],
  today: string,
): Map<number, WordTrend> => {
  const last7 = Array.from({ length: TREND_DAYS }, (_, i) => shiftDay(today, i + 1 - TREND_DAYS));
  const first = last7[0] as string;
  const prevFirst = shiftDay(first, -TREND_DAYS);
  const result = new Map<number, WordTrend>();
  ranked.slice(0, TREND_TOP).forEach(({ word, views }, i) => {
    const own = rows.filter((r) => r.word === word);
    const bars = last7.map((d) => own.find((r) => r.day === d)?.views ?? 0);
    const previous = own.filter((r) => r.day < first && r.day >= prevFirst).reduce((sum, r) => sum + r.views, 0);
    result.set(word, { bars, change: percentChange(views, previous), rank: i + 1, views });
  });
  return result;
};
