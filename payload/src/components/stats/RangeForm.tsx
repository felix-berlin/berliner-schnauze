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
  const link = (label: string, change: Partial<Record<string, string>>, active: boolean) => (
    <a
      aria-current={active ? "true" : undefined}
      href={statsHref(params, change)}
      key={label}
      style={{ fontWeight: active ? 700 : 400, marginRight: "1rem" }}
    >
      {label}
    </a>
  );
  return (
    <div style={{ display: "grid", gap: "0.75rem", marginBottom: "1.5rem" }}>
      <div>
        {QUICK.map(([label, days]) =>
          link(
            label,
            { von: addDays(today, 1 - days), bis: today },
            params.range.to === today && params.range.from === addDays(today, 1 - days),
          ),
        )}
      </div>
      <form
        action={BASE}
        method="get"
        style={{ alignItems: "end", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}
      >
        <label>
          Von <input defaultValue={params.range.from} max={today} name="von" type="date" />
        </label>
        <label>
          Bis <input defaultValue={params.range.to} max={today} name="bis" type="date" />
        </label>
        <input name="reihen" type="hidden" value={params.series.join(",")} />
        <input name="ansicht" type="hidden" value={params.view} />
        <input name="verteilung" type="hidden" value={params.split} />
        <button type="submit">Anzeigen</button>
      </form>
      <div>
        Reihen:{" "}
        {METRICS.map((m) => {
          const on = params.series.includes(m);
          const next = on ? params.series.filter((s) => s !== m) : [...params.series, m];
          return link(`${on ? "✓ " : ""}${METRIC_LABELS[m]}`, { reihen: next.join(",") }, on);
        })}
      </div>
      <div>
        Ansicht: {link("Linie", { ansicht: "linie" }, params.view === "linie")}
        {link("Fläche", { ansicht: "flaeche" }, params.view === "flaeche")}
        {" · "}Verteilung:{" "}
        {link("Reaktion", { verteilung: "reaktion" }, params.split === "reaktion")}
        {link("Nutzung", { verteilung: "nutzung" }, params.split === "nutzung")}
      </div>
    </div>
  );
}
