export type WordTrend = { rank: number; views: number; bars: number[] };

/** The word page shows the trend box for these top places of the week (Spec §16.1: views in 7 days). */
export const TREND_TOP = 10;
export const TREND_DAYS = 7;

export type TrendRow = { word: number; day: string; views: number };

const shiftDay = (day: string, n: number): string =>
  new Date(Date.parse(`${day}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);

/**
 * Trend data per word for the top places of `ranked` (highest views first, as `trending` returns it).
 * `rows` are the daily stats of the last 7 Berlin days ending at `today`; days without a row count as 0,
 * so `bars` always has 7 values, oldest first.
 */
export const buildTrends = (
  ranked: { word: number; views: number }[],
  rows: TrendRow[],
  today: string,
): Map<number, WordTrend> => {
  const last7 = Array.from({ length: TREND_DAYS }, (_, i) => shiftDay(today, i + 1 - TREND_DAYS));
  const result = new Map<number, WordTrend>();
  ranked.slice(0, TREND_TOP).forEach(({ word, views }, i) => {
    const own = rows.filter((r) => r.word === word);
    const bars = last7.map((d) => own.find((r) => r.day === d)?.views ?? 0);
    result.set(word, { bars, rank: i + 1, views });
  });
  return result;
};
