"use client";

import {
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  type ChartOptions,
} from "chart.js";
import { useEffect, useRef, useState } from "react";
import { Bar, Line } from "react-chartjs-2";

import type { Metric } from "../../lib/statsMetrics";
import type { StatsData } from "../../lib/statsQueries";
import type { Range } from "../../lib/statsRange";

import { METRIC_LABELS, METRICS } from "../../lib/statsMetrics";
import { pctChange } from "../../lib/statsRange";
import { bucketSeries } from "./chartData";
import { pickColors, readThemeColors, withAlpha } from "./themeColors";

ChartJS.register(
  BarController,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
);

const SPLIT_LABELS = {
  reaktion: [
    ["like", "Jefällt ma"],
    ["dislike", "Nee"],
  ],
  nutzung: [
    ["say", "Sag ick selbst"],
    ["know", "Kenn ick"],
    ["never", "Nie jehört"],
  ],
} as const;

type Props = {
  data: StatsData;
  /** Totals of the range before, for the comparison chart. */
  previous: StatsData["totals"];
  range: Range;
  /** Metrics visible at the start; the legend toggles more. */
  series: Metric[];
  view: "linie" | "flaeche";
  split: "reaktion" | "nutzung";
};

const formatLabel = (key: string, mode: "day" | "week") =>
  `${mode === "week" ? "ab " : ""}${key.slice(8, 10)}.${key.slice(5, 7)}.`;

/** Colors follow the admin theme, also when the user switches light/dark while the page is open. */
const useColors = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [colors, setColors] = useState(() => pickColors(() => ""));
  useEffect(() => {
    const read = () => ref.current && setColors(readThemeColors(ref.current));
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);
  return { ref, colors };
};

export function StatsCharts({ data, previous, range, series, view, split }: Props) {
  const { ref, colors } = useColors();
  const { labels, mode, values } = bucketSeries(data.daily, range);
  const axisText = { color: colors.text };
  const grid = { color: colors.grid };
  const base = { maintainAspectRatio: false, responsive: true } as const;
  const legend = { labels: { color: colors.text } };

  const lineOptions: ChartOptions<"line"> = {
    ...base,
    interaction: { intersect: false, mode: "index" },
    plugins: { legend },
    scales: {
      x: { grid, ticks: axisText },
      y: {
        beginAtZero: true,
        grid,
        position: "left",
        ticks: axisText,
        title: { color: colors.text, display: true, text: "Aufrufe" },
      },
      y1: {
        beginAtZero: true,
        grid: { drawOnChartArea: false },
        position: "right",
        ticks: axisText,
        title: { color: colors.text, display: true, text: "Übrige" },
      },
    },
  };
  const changes = METRICS.map((m) => pctChange(data.totals[m], previous[m]));
  const barOptions: ChartOptions<"bar"> = {
    ...base,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid, ticks: axisText },
      y: { grid, ticks: { ...axisText, callback: (v) => `${v} %` } },
    },
  };
  const splitOptions: ChartOptions<"bar"> = {
    ...base,
    indexAxis: "y",
    plugins: { legend },
    scales: { x: { grid, stacked: true, ticks: axisText }, y: { stacked: true, ticks: axisText } },
  };

  return (
    <div ref={ref} style={{ display: "grid", gap: "1.5rem" }}>
      <section>
        <h3>Verlauf</h3>
        <div style={{ height: 320 }}>
          <Line
            data={{
              labels: labels.map((l) => formatLabel(l, mode)),
              datasets: METRICS.map((m, i) => ({
                label: METRIC_LABELS[m],
                data: values[m],
                borderColor: colors.series[i],
                backgroundColor: withAlpha(colors.series[i], 0.2),
                fill: view === "flaeche",
                hidden: !series.includes(m),
                pointRadius: labels.length > 60 ? 0 : 3,
                tension: 0.25,
                yAxisID: m === "views" ? "y" : "y1",
              })),
            }}
            options={lineOptions}
          />
        </div>
      </section>
      <section>
        <h3>Veränderung zum Zeitraum davor</h3>
        <div style={{ height: 260 }}>
          <Bar
            data={{
              labels: METRICS.map((m) => METRIC_LABELS[m]),
              datasets: [
                {
                  data: changes.map((c) => (typeof c === "number" ? c : 0)),
                  backgroundColor: changes.map((c) =>
                    typeof c === "number" && c < 0 ? colors.series[3] : colors.series[0],
                  ),
                },
              ],
            }}
            options={barOptions}
          />
        </div>
      </section>
      <section>
        <h3>{split === "reaktion" ? "Reaktionen" : "Nutzung"}</h3>
        <div style={{ height: 140 }}>
          <Bar
            data={{
              labels: [""],
              datasets: SPLIT_LABELS[split].map(([key, label], i) => ({
                label,
                data: [data.reactionSplit[key]],
                backgroundColor: colors.series[i],
              })),
            }}
            options={splitOptions}
          />
        </div>
      </section>
    </div>
  );
}
