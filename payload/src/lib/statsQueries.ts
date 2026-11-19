import type { PostgresAdapter } from "@payloadcms/db-postgres";
import type { Payload } from "payload";

import { sql } from "@payloadcms/db-postgres/drizzle";

import type { Range } from "./statsRange";

import { addDays, dayStart } from "./berlinTime";
import { METRICS, type Metric } from "./statsMetrics";
import { type StatsData, type TopWord, type VotedWord } from "./statsTypes";
import { MIN_GROUP } from "./wordFeedback";

/** A database number as a number; anything else is a bug that must show in the log, not as "NaN" on the page. */
export const num = (value: unknown, what: string): number => {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error(`stats: ${what} is not a number: ${String(value)}`);
  return n;
};

const TOP = 10;
const BERLIN_DAY = (column: string) =>
  sql`to_char(${sql.identifier(column)} at time zone 'Europe/Berlin', 'YYYY-MM-DD')`;

/**
 * Admin stats of the Berlin days `range.from..range.to` (both included), summed in SQL. Raw SQL bypasses Payload access
 * and hooks (the page checks the login itself) and its table and column names (word_stats, word_feedback, comments,
 * suggestions, bon_games, words) must follow any collection or migration rename (`statsQueries.test.ts` checks the
 * columns exist). Only counts, never a visitor. Totals and the reaction split count every word, also trashed and draft
 * ones; the top lists show published, untrashed words only. `tops: false` skips the three top lists (the comparison range
 * only needs totals).
 */
export const loadStats = async (
  payload: Payload,
  range: Range,
  { tops = true }: { tops?: boolean } = {},
): Promise<StatsData> => {
  const { drizzle } = payload.db as unknown as PostgresAdapter;
  const from = dayStart(range.from).toISOString();
  const to = dayStart(addDays(range.to, 1)).toISOString();
  // A failing query names itself, so the page log says which of the nine broke.
  const run = async <T>(label: string, query: ReturnType<typeof sql>) => {
    try {
      return (await drizzle.execute(query)).rows as T[];
    } catch (cause) {
      throw new Error(`stats query ${label} failed`, { cause });
    }
  };
  type DayRow = { day: string; n: string };
  type TopRow = {
    id: number;
    berlinerisch: string;
    slug: string | null;
    value: string;
    votes?: string;
  };

  const perDay = (table: string, column: string, where: ReturnType<typeof sql>) =>
    run<DayRow>(
      table,
      sql`
      select ${BERLIN_DAY(column)} as day, count(*) as n from ${sql.identifier(table)}
      where ${sql.identifier(column)} >= ${from}::timestamptz and ${sql.identifier(column)} < ${to}::timestamptz
        and ${where}
      group by 1
    `,
    );
  const topWords = (label: string, query: ReturnType<typeof sql>) =>
    tops ? run<TopRow>(label, query) : Promise.resolve([] as TopRow[]);
  const published = sql`w._status = 'published' and w.deleted_at is null`;
  const feedbackWindow = sql`f.created_at >= ${from}::timestamptz and f.created_at < ${to}::timestamptz`;
  const share = (column: string, value: string) => sql`
    select w.id, w.berlinerisch, w.slug,
      round(100.0 * count(*) filter (where f.${sql.identifier(column)} = ${value}) / count(*)) as value,
      count(*) as votes
    from word_feedback f join words w on w.id = f.word_id
    where ${feedbackWindow} and f.${sql.identifier(column)} is not null and ${published}
    group by w.id having count(*) >= ${MIN_GROUP}
    order by value desc, votes desc, w.id limit ${TOP}`;

  const [stats, reactions, comments, suggestions, bon, split, topViewed, topLiked, topSay] =
    await Promise.all([
      run<{ day: string; views: string; audio: string; shares: string; clicks: string }>(
        "word_stats",
        sql`
        select day, sum(views) as views, sum(audio) as audio, sum(shares) as shares, sum(clicks) as clicks
        from word_stats where day >= ${range.from} and day <= ${range.to} group by day
      `,
      ),
      perDay("word_feedback", "created_at", sql`reaction is not null`),
      perDay("comments", "created_at", sql`status = 'published'`),
      perDay("suggestions", "created_at", sql`true`),
      perDay("bon_games", "finished_at", sql`true`),
      run<Record<string, string>>(
        "reaction split",
        sql`
        select count(*) filter (where reaction = 'like') as "like",
          count(*) filter (where reaction = 'dislike') as dislike,
          count(*) filter (where usage = 'say') as say,
          count(*) filter (where usage = 'know') as know,
          count(*) filter (where usage = 'never') as never
        from word_feedback f where ${feedbackWindow}
      `,
      ),
      topWords(
        "topViewed",
        sql`
        select w.id, w.berlinerisch, w.slug, sum(s.views) as value
        from word_stats s join words w on w.id = s.word_id
        where s.day >= ${range.from} and s.day <= ${range.to} and ${published}
        group by w.id having sum(s.views) > 0
        order by value desc, w.id limit ${TOP}
      `,
      ),
      topWords("topLiked", share("reaction", "like")),
      topWords("topSay", share("usage", "say")),
    ]);

  const daily = Object.fromEntries(
    METRICS.map((m) => [m, {} as Record<string, number>]),
  ) as StatsData["daily"];
  for (const r of stats)
    for (const m of ["views", "audio", "shares", "clicks"] as const) {
      const n = num(r[m], `${m} on ${r.day}`);
      if (n) daily[m][r.day] = n;
    }
  const fill = (metric: Metric, rows: DayRow[]) => {
    for (const r of rows) daily[metric][r.day] = num(r.n, `${metric} on ${r.day}`);
  };
  fill("reactions", reactions);
  fill("comments", comments);
  fill("suggestions", suggestions);
  fill("bonGames", bon);

  const totals = Object.fromEntries(
    METRICS.map((m) => [m, Object.values(daily[m]).reduce((a, b) => a + b, 0)]),
  ) as StatsData["totals"];
  if (split.length !== 1) throw new Error(`stats: reaction split returned ${split.length} rows`);
  const [s] = split;
  const toTop = (rows: TopRow[]): TopWord[] =>
    rows.map((r) => ({
      id: r.id,
      berlinerisch: r.berlinerisch,
      slug: r.slug,
      value: num(r.value, `value of word ${r.id}`),
    }));
  const toVoted = (rows: TopRow[]): VotedWord[] =>
    rows.map((r) => ({
      id: r.id,
      berlinerisch: r.berlinerisch,
      slug: r.slug,
      value: num(r.value, `value of word ${r.id}`),
      votes: num(r.votes, `votes of word ${r.id}`),
    }));
  return {
    daily,
    totals,
    reactionSplit: {
      like: num(s.like, "likes"),
      dislike: num(s.dislike, "dislikes"),
      say: num(s.say, "say"),
      know: num(s.know, "know"),
      never: num(s.never, "never"),
    },
    topViewed: toTop(topViewed),
    topLiked: toVoted(topLiked),
    topSay: toVoted(topSay),
  };
};
