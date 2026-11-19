import { Button } from "@payloadcms/ui";

import { addDays } from "../../lib/berlinTime";
import { METRICS, METRIC_LABELS } from "../../lib/statsMetrics";
import { statsHref, statsQuery, type StatsParams, type StatsQuery } from "../../lib/statsParams";

const QUICK = [
  ["7 Tage", 7],
  ["30 Tage", 30],
  ["1 Jahr", 365],
] as const;

/** The two chart switches: label, URL key, and the options as [text, value]. */
const SWITCHES = [
  [
    "Ansicht",
    "ansicht",
    [
      ["Linie", "linie"],
      ["Fläche", "flaeche"],
    ],
  ],
  [
    "Feedback-Diagramm",
    "verteilung",
    [
      ["Reaktion", "reaktion"],
      ["Nutzung", "nutzung"],
    ],
  ],
] as const;
const SWITCH_STATE = { ansicht: "view", verteilung: "split" } as const;

/** Range picker (quick links and a GET form), the series choice and the two chart switches. No state: it is all in the URL. */
export function RangeForm({ params, today }: { params: StatsParams; today: string }) {
  const pill = (label: string, change: StatsQuery, active: boolean) => (
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
        {QUICK.map(([label, days]) => {
          const von = addDays(today, 1 - days);
          return pill(
            label,
            { von, bis: today },
            params.range.to === today && params.range.from === von,
          );
        })}
        <form action="/admin/stats" className="stats__range" method="get">
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
          {Object.entries(statsQuery(params))
            .filter(([key]) => key !== "von" && key !== "bis")
            .map(([key, value]) => (
              <input key={key} name={key} type="hidden" value={value} />
            ))}
          <Button buttonStyle="primary" size="small" type="submit">
            Anzeigen
          </Button>
        </form>
      </div>
      <div className="stats__row">
        <span className="stats__label">Reihen</span>
        {METRICS.map((m) => {
          const on = params.series.includes(m);
          // The last visible series cannot be switched off (the page would fall back to "views" anyway).
          const next = on ? params.series.filter((s) => s !== m) : [...params.series, m];
          return pill(
            METRIC_LABELS[m],
            { reihen: (next.length ? next : params.series).join(",") },
            on,
          );
        })}
      </div>
      {SWITCHES.map(([label, key, options]) => (
        <div className="stats__row" key={key}>
          <span className="stats__label">{label}</span>
          {options.map(([text, value]) =>
            pill(text, { [key]: value }, params[SWITCH_STATE[key]] === value),
          )}
        </div>
      ))}
    </div>
  );
}
