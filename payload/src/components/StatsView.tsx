import type { AdminViewServerProps } from "payload";

import { DefaultTemplate } from "@payloadcms/next/templates";
import { Gutter } from "@payloadcms/ui";

import type { StatsData, TopWord } from "../lib/statsQueries";

import { berlinDay } from "../lib/berlinTime";
import { METRICS, METRIC_LABELS, type Metric } from "../lib/statsMetrics";
import { statsParams } from "../lib/statsParams";
import { loadStats } from "../lib/statsQueries";
import { pctChange, previousRange } from "../lib/statsRange";
import { RangeForm, type StatsParams } from "./stats/RangeForm";
import { StatsCharts } from "./stats/StatsCharts";

const percent = (value: ReturnType<typeof pctChange>) =>
  typeof value === "number" ? `${value > 0 ? "+" : ""}${value} %` : value;

function Tile({
  metric,
  data,
  previous,
}: {
  metric: Metric;
  data: StatsData;
  previous: StatsData;
}) {
  return (
    <div
      style={{
        border: "1px solid var(--theme-elevation-150)",
        borderRadius: 4,
        padding: "0.75rem",
      }}
    >
      <div style={{ color: "var(--theme-elevation-600)" }}>{METRIC_LABELS[metric]}</div>
      <strong style={{ fontSize: "1.5rem" }}>{data.totals[metric].toLocaleString("de-DE")}</strong>
      <div>{percent(pctChange(data.totals[metric], previous.totals[metric]))}</div>
    </div>
  );
}

function TopList({ title, rows, unit }: { title: string; rows: TopWord[]; unit: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <section>
      <h3>{title}</h3>
      {rows.length === 0 ? (
        <p>Noch keine Daten.</p>
      ) : (
        <ol style={{ paddingLeft: "1.25rem" }}>
          {rows.map((r) => (
            <li key={r.id}>
              <a href={`/admin/collections/words/${r.id}`}>{r.berlinerisch}</a>{" "}
              {r.value.toLocaleString("de-DE")}
              {unit}
              {r.votes ? ` (${r.votes} Stimmen)` : ""}
              <div
                style={{
                  background: "var(--theme-success-500)",
                  height: 4,
                  width: `${(r.value / max) * 100}%`,
                }}
              />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function Body({
  current: data,
  previous,
  params: p,
}: {
  current: StatsData;
  previous: StatsData;
  params: StatsParams;
}) {
  return (
    <>
      <div
        style={{
          display: "grid",
          gap: "0.75rem",
          gridTemplateColumns: "repeat(auto-fill, minmax(10rem, 1fr))",
          marginBottom: "1.5rem",
        }}
      >
        {METRICS.map((m) => (
          <Tile data={data} key={m} metric={m} previous={previous} />
        ))}
      </div>
      <StatsCharts
        data={data}
        previous={previous.totals}
        range={p.range}
        series={p.series}
        split={p.split}
        view={p.view}
      />
      <div
        style={{
          display: "grid",
          gap: "1.5rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(16rem, 1fr))",
          marginTop: "1.5rem",
        }}
      >
        <TopList rows={data.topViewed} title="Top-Wörter nach Aufrufen" unit="" />
        <TopList rows={data.topLiked} title="Beliebt" unit=" %" />
        <TopList rows={data.topSay} title="Typisch berlinerisch" unit=" %" />
      </div>
    </>
  );
}

/** `/admin/stats`: overview of the site's numbers for a chosen range. Admin only (any logged-in user). */
export default async function StatsView({
  initPageResult,
  params,
  searchParams,
}: AdminViewServerProps) {
  const { req, locale, permissions, visibleEntities } = initPageResult;
  if (!req.user) return null;
  const today = berlinDay();
  const p = statsParams(
    (searchParams ?? {}) as Record<string, string | string[] | undefined>,
    today,
  );

  const loaded = await Promise.all([
    loadStats(req.payload, p.range),
    loadStats(req.payload, previousRange(p.range)),
  ]).catch((error: unknown) => {
    req.payload.logger.error({ err: error, msg: "[stats] admin stats failed" });
    return null;
  });
  const body = loaded ? (
    <Body current={loaded[0]} params={p} previous={loaded[1]} />
  ) : (
    <p>Die Statistik ist gerade nicht verfügbar.</p>
  );

  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={locale}
      params={params}
      payload={req.payload}
      permissions={permissions}
      searchParams={searchParams}
      user={req.user}
      visibleEntities={visibleEntities}
    >
      <Gutter>
        <h1>Statistik</h1>
        <RangeForm params={p} today={today} />
        {body}
      </Gutter>
    </DefaultTemplate>
  );
}
