// Pure URL parameters of the admin stats page (no payload/next imports).
import type { StatsParams } from "../components/stats/RangeForm";

import { METRICS } from "./statsMetrics";
import { parseRange } from "./statsRange";

type SearchParams = Record<string, string | string[] | undefined>;

/** The URL parameters of the page, every invalid value replaced by its default. */
export const statsParams = (searchParams: SearchParams, today: string): StatsParams => {
  const list = typeof searchParams.reihen === "string" ? searchParams.reihen.split(",") : [];
  const series = METRICS.filter((m) => list.includes(m));
  return {
    range: parseRange(searchParams, today),
    series: series.length ? series : ["views"],
    view: searchParams.ansicht === "flaeche" ? "flaeche" : "linie",
    split: searchParams.verteilung === "nutzung" ? "nutzung" : "reaktion",
  };
};
