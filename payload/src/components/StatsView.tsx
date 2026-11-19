import type { AdminViewServerProps } from "payload";

import { DefaultTemplate } from "@payloadcms/next/templates";
import { Gutter } from "@payloadcms/ui";
import { redirect } from "next/navigation";

import type { StatsParams } from "../lib/statsParams";
import type { StatsData, TopWord, VotedWord } from "../lib/statsTypes";

import { berlinDay } from "../lib/berlinTime";
import { METRICS, METRIC_LABELS, type Metric } from "../lib/statsMetrics";
import { statsParams } from "../lib/statsParams";
import { loadStats } from "../lib/statsQueries";
import { pctChange, previousRange } from "../lib/statsRange";
import { RangeForm } from "./stats/RangeForm";
import { StatsCharts } from "./stats/StatsCharts";

const fmt = (n: number) => n.toLocaleString("de-DE");

const percent = (value: ReturnType<typeof pctChange>) =>
  typeof value === "number" ? `${value > 0 ? "+" : ""}${value} %` : value;

function Tile({
  metric,
  data,
  previous,
}: {
  metric: Metric;
  data: StatsData;
  previous: StatsData | null;
}) {
  const change = previous ? pctChange(data.totals[metric], previous.totals[metric]) : "–";
  const tone = typeof change === "number" ? (change > 0 ? "up" : change < 0 ? "down" : "") : "";
  return (
    <div className="stats__card stats__tile">
      <span className="stats__tile-label">{METRIC_LABELS[metric]}</span>
      <strong className="stats__tile-value">{fmt(data.totals[metric])}</strong>
      <span className={`stats__delta${tone ? ` stats__delta--${tone}` : ""}`}>
        {percent(change)}
      </span>
    </div>
  );
}

function TopList({
  title,
  rows,
  unit,
}: {
  title: string;
  rows: (TopWord | VotedWord)[];
  unit: string;
}) {
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
                  {fmt(r.value)}
                  {unit}
                  {"votes" in r ? ` · ${r.votes} Stimmen` : ""}
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
  previous: StatsData | null;
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
        previous={previous?.totals ?? null}
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

/**
 * `/admin/stats`: overview of the site's numbers for a chosen range. Any logged-in user (`Users` has no roles). Raw SQL
 * bypasses access, so the login check here is the only gate: without one the visitor is sent to the login.
 */
export default async function StatsView({
  initPageResult,
  params,
  searchParams,
}: AdminViewServerProps) {
  const { req, locale, permissions, visibleEntities } = initPageResult;
  if (!req.user) redirect("/admin/login?redirect=/admin/stats");
  const today = berlinDay();
  const p = statsParams(
    (searchParams ?? {}) as Record<string, string | string[] | undefined>,
    today,
  );

  const before = previousRange(p.range);
  const [current, previous] = await Promise.allSettled([
    loadStats(req.payload, p.range),
    // Only the totals are compared, so the three top lists are skipped.
    loadStats(req.payload, before, { tops: false }),
  ]);
  const ranges = [p.range, before];
  for (const [i, result] of [current, previous].entries())
    if (result.status === "rejected")
      req.payload.logger.error({
        err: result.reason,
        msg: "[stats] admin stats failed",
        range: ranges[i],
      });
  const body =
    current.status === "fulfilled" ? (
      <Body
        current={current.value}
        params={p}
        previous={previous.status === "fulfilled" ? previous.value : null}
      />
    ) : (
      <p className="stats__empty">
        Die Statistik ist gerade nicht verfügbar (Datenbankabfrage fehlgeschlagen, Details im
        Server-Log). Anderen Zeitraum wählen oder neu laden.
      </p>
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
          {p.notice ? <p className="stats__notice">{p.notice}</p> : null}
          <RangeForm params={p} today={today} />
          {body}
        </div>
      </Gutter>
    </DefaultTemplate>
  );
}
