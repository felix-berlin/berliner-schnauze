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
import { useEffect, useMemo, useRef, useState } from "react";
import { Bar, Line } from "react-chartjs-2";

import type { StatsParams } from "../../lib/statsParams";
import type { StatsData } from "../../lib/statsTypes";

import { METRIC_LABELS, METRICS } from "../../lib/statsMetrics";
import { pctChange } from "../../lib/statsRange";
import { bucketSeries } from "./chartData";
import { pickColors, readThemeColors, withAlpha, type ThemeColors } from "./themeColors";

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

type Props = Pick<StatsParams, "range" | "series" | "view" | "split"> & {
  data: StatsData;
  /** Totals of the range before, for the comparison chart; null when that range could not be loaded (no chart then). */
  previous: StatsData["totals"] | null;
};

const formatLabel = (key: string, mode: "day" | "week") =>
  `${mode === "week" ? "ab " : ""}${key.slice(8, 10)}.${key.slice(5, 7)}.`;

/** Colors follow the admin theme, also when the user switches light/dark while the page is open. */
const useColors = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [colors, setColors] = useState(() => pickColors(() => ""));
  useEffect(() => {
    const read = () => {
      if (!ref.current) return;
      const next = readThemeColors(ref.current);
      // Same values: keep the old object, so the charts are not updated for nothing.
      setColors((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    };
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

/** The options of the three charts; they only depend on the theme colors. */
const chartOptions = (colors: ThemeColors) => {
  const axisText = { color: colors.text };
  const grid = { color: colors.grid };
  const axis = (extra: object = {}) => ({ grid, ticks: axisText, ...extra });
  const title = (text: string) => ({ color: colors.text, display: true, text });
  const base = { maintainAspectRatio: false, responsive: true } as const;
  const legend = { labels: { color: colors.text } };

  const line: ChartOptions<"line"> = {
    ...base,
    interaction: { intersect: false, mode: "index" },
    plugins: { legend },
    scales: {
      x: axis(),
      y: axis({ beginAtZero: true, position: "left", title: title("Aufrufe") }),
      y1: axis({
        beginAtZero: true,
        grid: { drawOnChartArea: false },
        position: "right",
        title: title("Übrige"),
      }),
    },
  };
  const change: ChartOptions<"bar"> = {
    ...base,
    plugins: { legend: { display: false } },
    scales: {
      x: axis(),
      y: axis({ ticks: { ...axisText, callback: (v: number | string) => `${v} %` } }),
    },
  };
  const split: ChartOptions<"bar"> = {
    ...base,
    indexAxis: "y",
    plugins: { legend },
    scales: { x: axis({ stacked: true }), y: { stacked: true, ticks: axisText } },
  };
  return { line, change, split };
};

export function StatsCharts({ data, previous, range, series, view, split }: Props) {
  const { ref, colors } = useColors();
  const options = useMemo(() => chartOptions(colors), [colors]);
  const bucketed = useMemo(() => bucketSeries(data.daily, range), [data.daily, range]);

  const lineData = useMemo(
    () => ({
      labels: bucketed.labels.map((l) => formatLabel(l, bucketed.mode)),
      datasets: METRICS.map((m, i) => ({
        label: METRIC_LABELS[m],
        data: bucketed.values[m],
        borderColor: colors.series[i],
        backgroundColor: withAlpha(colors.series[i], 0.2),
        fill: view === "flaeche",
        hidden: !series.includes(m),
        pointRadius: bucketed.labels.length > 60 ? 0 : 3,
        tension: 0.25,
        yAxisID: m === "views" ? "y" : "y1",
      })),
    }),
    [bucketed, colors, series, view],
  );
  const changeData = useMemo(() => {
    const changes = previous ? METRICS.map((m) => pctChange(data.totals[m], previous[m])) : [];
    return {
      labels: METRICS.map((m) => METRIC_LABELS[m]),
      datasets: [
        {
          // "neu" and "–" have no percent: no bar (the tile says which).
          data: changes.map((c) => (typeof c === "number" ? c : null)),
          backgroundColor: changes.map((c) =>
            typeof c === "number" && c < 0 ? colors.series[3] : colors.series[0],
          ),
        },
      ],
    };
  }, [colors, data.totals, previous]);
  const splitData = useMemo(
    () => ({
      labels: [""],
      datasets: SPLIT_LABELS[split].map(([key, label], i) => ({
        label,
        data: [data.reactionSplit[key]],
        backgroundColor: colors.series[i],
      })),
    }),
    [colors, data.reactionSplit, split],
  );

  return (
    <div className="stats__charts" ref={ref}>
      <section className="stats__card">
        <h3>Verlauf</h3>
        <div className="stats__chart">
          <Line data={lineData} options={options.line} />
        </div>
      </section>
      {previous ? (
        <section className="stats__card">
          <h3>Veränderung zum Zeitraum davor</h3>
          <div className="stats__chart stats__chart--short">
            <Bar data={changeData} options={options.change} />
          </div>
        </section>
      ) : null}
      <section className="stats__card">
        <h3>{split === "reaktion" ? "Reaktionen" : "Nutzung"}</h3>
        <div className="stats__chart stats__chart--strip">
          <Bar data={splitData} options={options.split} />
        </div>
      </section>
    </div>
  );
}
