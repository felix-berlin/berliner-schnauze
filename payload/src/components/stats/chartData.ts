import { addDays } from "../../lib/berlinTime";
import { METRICS, type Metric } from "../../lib/statsMetrics";
import { bucketKey, bucketMode, type Range } from "../../lib/statsRange";

/** `daily` of `StatsData` as arrays over the chart's x axis (days, or ISO weeks above 90 days); gaps are 0. */
export const bucketSeries = (
  daily: Record<Metric, Record<string, number>>,
  range: Range,
): { labels: string[]; mode: "day" | "week"; values: Record<Metric, number[]> } => {
  const mode = bucketMode(range);
  const labels: string[] = [];
  const index = new Map<string, number>();
  const values = Object.fromEntries(METRICS.map((m) => [m, [] as number[]])) as Record<
    Metric,
    number[]
  >;
  for (let day = range.from; day <= range.to; day = addDays(day, 1)) {
    const key = bucketKey(day, mode, range);
    let i = index.get(key);
    if (i === undefined) {
      i = labels.length;
      index.set(key, i);
      labels.push(key);
      for (const m of METRICS) values[m].push(0);
    }
    for (const m of METRICS) values[m][i] += daily[m][day] ?? 0;
  }
  return { labels, mode, values };
};
