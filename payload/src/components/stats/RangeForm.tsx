import type { Metric } from "../../lib/statsMetrics";
import type { Range } from "../../lib/statsRange";

import { addDays } from "../../lib/berlinTime";
import { METRICS, METRIC_LABELS } from "../../lib/statsMetrics";

export type StatsParams = {
  range: Range;
  series: Metric[];
  view: "linie" | "flaeche";
  split: "reaktion" | "nutzung";
};

const BASE = "/admin/stats";

/** A link to the stats page with the given params (the others are kept). */
export const statsHref = (p: StatsParams, change: Partial<Record<string, string>> = {}): string => {
  const query = new URLSearchParams({
    von: p.range.from,
    bis: p.range.to,
    reihen: p.series.join(","),
    ansicht: p.view,
    verteilung: p.split,
    ...change,
  });
  return `${BASE}?${query}`;
};

const QUICK = [
  ["7 Tage", 7],
  ["30 Tage", 30],
  ["1 Jahr", 365],
] as const;

/** Range picker (quick links and a GET form), the series choice and the two chart switches. No state: it is all in the URL. */
export function RangeForm({ params, today }: { params: StatsParams; today: string }) {
  const pill = (label: string, change: Partial<Record<string, string>>, active: boolean) => (
    <a
      aria-current={active ? "true" : undefined}
      className="stats-pill"
      href={statsHref(params, change)}
      key={label}
    >
      {label}
    </a>
  );
  return (
    <div className="stats__card stats__controls">
      <div className="stats__row">
        <span className="stats__label">Zeitraum</span>
        {QUICK.map(([label, days]) =>
          pill(
            label,
            { von: addDays(today, 1 - days), bis: today },
            params.range.to === today && params.range.from === addDays(today, 1 - days),
          ),
        )}
        <form action={BASE} className="stats__range" method="get">
          <input
            aria-label="Von"
            defaultValue={params.range.from}
            max={today}
            name="von"
            type="date"
          />
          <span>bis</span>
          <input
            aria-label="Bis"
            defaultValue={params.range.to}
            max={today}
            name="bis"
            type="date"
          />
          <input name="reihen" type="hidden" value={params.series.join(",")} />
          <input name="ansicht" type="hidden" value={params.view} />
          <input name="verteilung" type="hidden" value={params.split} />
          <button className="btn btn--style-primary btn--size-small" type="submit">
            <span className="btn__content">
              <span className="btn__label">Anzeigen</span>
            </span>
          </button>
        </form>
      </div>
      <div className="stats__row">
        <span className="stats__label">Reihen</span>
        {METRICS.map((m) => {
          const on = params.series.includes(m);
          const next = on ? params.series.filter((s) => s !== m) : [...params.series, m];
          return pill(METRIC_LABELS[m], { reihen: next.join(",") }, on);
        })}
      </div>
      <div className="stats__row">
        <span className="stats__label">Ansicht</span>
        {pill("Linie", { ansicht: "linie" }, params.view === "linie")}
        {pill("Fläche", { ansicht: "flaeche" }, params.view === "flaeche")}
      </div>
      <div className="stats__row">
        <span className="stats__label">Verteilung</span>
        {pill("Reaktion", { verteilung: "reaktion" }, params.split === "reaktion")}
        {pill("Nutzung", { verteilung: "nutzung" }, params.split === "nutzung")}
      </div>
    </div>
  );
}
