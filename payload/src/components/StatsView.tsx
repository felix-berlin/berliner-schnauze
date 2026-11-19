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
  const change = pctChange(data.totals[metric], previous.totals[metric]);
  const tone = typeof change === "number" ? (change > 0 ? "up" : change < 0 ? "down" : "") : "";
  return (
    <div className="stats__card stats__tile">
      <span className="stats__tile-label">{METRIC_LABELS[metric]}</span>
      <strong className="stats__tile-value">{data.totals[metric].toLocaleString("de-DE")}</strong>
      <span className={`stats__delta${tone ? ` stats__delta--${tone}` : ""}`}>
        {percent(change)}
      </span>
    </div>
  );
}

function TopList({ title, rows, unit }: { title: string; rows: TopWord[]; unit: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <section className="stats__card">
      <h3>{title}</h3>
      {rows.length === 0 ? (
        <p className="stats__empty">Noch keine Daten.</p>
      ) : (
        <ol className="stats__top">
          {rows.map((r) => (
            <li className="stats__top-row" key={r.id}>
              <div className="stats__top-head">
                <a href={`/admin/collections/words/${r.id}`}>{r.berlinerisch}</a>
                <span className="stats__top-value">
                  {r.value.toLocaleString("de-DE")}
                  {unit}
                  {r.votes ? ` · ${r.votes} Stimmen` : ""}
                </span>
              </div>
              <div className="stats__bar">
                <span style={{ width: `${(r.value / max) * 100}%` }} />
              </div>
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
      <div className="stats__tiles">
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
      <div className="stats__lists">
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
    <p className="stats__empty">Die Statistik ist gerade nicht verfügbar.</p>
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
        <div className="stats">
          <h1>Statistik</h1>
          <RangeForm params={p} today={today} />
          {body}
        </div>
      </Gutter>
    </DefaultTemplate>
  );
}
