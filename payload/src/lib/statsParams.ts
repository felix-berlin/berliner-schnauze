// Pure URL parameters of the admin stats page (no payload/next imports).
import { METRICS, type Metric } from "./statsMetrics";
import { parseRange, type Range } from "./statsRange";

const VIEWS = ["linie", "flaeche"] as const;
const SPLITS = ["reaktion", "nutzung"] as const;
export type View = (typeof VIEWS)[number];
export type Split = (typeof SPLITS)[number];

export type StatsParams = {
  range: Range;
  /** Metrics visible at the start; never empty. */
  series: Metric[];
  view: View;
  split: Split;
  /** What was changed about the asked range (German), or null. */
  notice: string | null;
};

/** The URL keys of the page, in one place. */
export type StatsQuery = Partial<{
  von: string;
  bis: string;
  reihen: string;
  ansicht: View;
  verteilung: Split;
}>;

type SearchParams = Record<string, string | string[] | undefined>;

/** The URL parameters of the page, every invalid value replaced by its default. */
export const statsParams = (searchParams: SearchParams, today: string): StatsParams => {
  const list = typeof searchParams.reihen === "string" ? searchParams.reihen.split(",") : [];
  const series = METRICS.filter((m) => list.includes(m));
  const { range, notice } = parseRange(searchParams, today);
  return {
    range,
    notice,
    series: series.length ? series : ["views"],
    view: VIEWS.find((v) => v === searchParams.ansicht) ?? VIEWS[0],
    split: SPLITS.find((v) => v === searchParams.verteilung) ?? SPLITS[0],
  };
};

/** The inverse of `statsParams`: a link to the page with `change` applied to `params`. */
export const statsHref = (params: StatsParams, change: StatsQuery = {}): string => {
  const query = new URLSearchParams({
    von: params.range.from,
    bis: params.range.to,
    reihen: params.series.join(","),
    ansicht: params.view,
    verteilung: params.split,
    ...change,
  });
  return `/admin/stats?${query}`;
};
