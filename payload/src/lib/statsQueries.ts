import type { PostgresAdapter } from "@payloadcms/db-postgres";
import type { Payload } from "payload";

import { sql } from "@payloadcms/db-postgres/drizzle";

import type { Range } from "./statsRange";

import { addDays, dayStart } from "./berlinTime";
import { METRICS, type Metric } from "./statsMetrics";
import {
  REACTION_KEYS,
  type ReactionKey,
  type StatsData,
  type TopWord,
  type VotedWord,
} from "./statsTypes";
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
  // A failing query names itself, so the page log says which one broke.
  const run = async <T>(label: string, query: ReturnType<typeof sql>) => {
    try {
      return (await drizzle.execute(query)).rows as T[];
    } catch (cause) {
      throw new Error(`stats query ${label} failed`, { cause });
    }
  };
  type DayRow = { day: string; n: string };
  type FeedbackRow = { day: string } & Record<"reactions" | ReactionKey, string>;
  type TopRow = {
    list?: "liked" | "say";
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
  const published = sql`w._status = 'published' and w.deleted_at is null`;
  const feedbackWindow = sql`f.created_at >= ${from}::timestamptz and f.created_at < ${to}::timestamptz`;

  // One scan of word_feedback gives the daily reaction count and the split (its columns sum to the split).
  const feedbackPerDay = run<FeedbackRow>(
    "word_feedback",
    sql`
      select ${BERLIN_DAY("created_at")} as day,
        count(*) filter (where reaction is not null) as reactions,
        count(*) filter (where reaction = 'like') as "like",
        count(*) filter (where reaction = 'dislike') as dislike,
        count(*) filter (where usage = 'say') as say,
        count(*) filter (where usage = 'know') as know,
        count(*) filter (where usage = 'never') as never
      from word_feedback f where ${feedbackWindow} group by 1
    `,
  );
  // One scan for both vote lists: per word the like share of the reactions and the say share of the usage answers.
  const votedWords = tops
    ? run<TopRow>(
        "votes",
        sql`
      with agg as (
        select w.id, w.berlinerisch, w.slug,
          count(*) filter (where f.reaction is not null) as reaction_votes,
          round(100.0 * count(*) filter (where f.reaction = 'like')
            / nullif(count(*) filter (where f.reaction is not null), 0)) as like_share,
          count(*) filter (where f.usage is not null) as usage_votes,
          round(100.0 * count(*) filter (where f.usage = 'say')
            / nullif(count(*) filter (where f.usage is not null), 0)) as say_share
        from word_feedback f join words w on w.id = f.word_id
        where ${feedbackWindow} and ${published}
        group by w.id
      )
      (select 'liked' as list, id, berlinerisch, slug, like_share as value, reaction_votes as votes
        from agg where reaction_votes >= ${MIN_GROUP}
        order by like_share desc, reaction_votes desc, id limit ${TOP})
      union all
      (select 'say' as list, id, berlinerisch, slug, say_share as value, usage_votes as votes
        from agg where usage_votes >= ${MIN_GROUP}
        order by say_share desc, usage_votes desc, id limit ${TOP})
    `,
      )
    : Promise.resolve([] as TopRow[]);
  const viewedWords = tops
    ? run<TopRow>(
        "topViewed",
        sql`
        select w.id, w.berlinerisch, w.slug, sum(s.views) as value
        from word_stats s join words w on w.id = s.word_id
        where s.day >= ${range.from} and s.day <= ${range.to} and ${published}
        group by w.id having sum(s.views) > 0
        order by value desc, w.id limit ${TOP}
      `,
      )
    : Promise.resolve([] as TopRow[]);

  const [stats, feedback, comments, suggestions, bon, topViewed, voted] = await Promise.all([
    run<{ day: string; views: string; audio: string; shares: string; clicks: string }>(
      "word_stats",
      sql`
        select day, sum(views) as views, sum(audio) as audio, sum(shares) as shares, sum(clicks) as clicks
        from word_stats where day >= ${range.from} and day <= ${range.to} group by day
      `,
    ),
    feedbackPerDay,
    perDay("comments", "created_at", sql`status = 'published'`),
    perDay("suggestions", "created_at", sql`true`),
    perDay("bon_games", "finished_at", sql`true`),
    viewedWords,
    votedWords,
  ]);

  const daily = Object.fromEntries(
    METRICS.map((m) => [m, {} as Record<string, number>]),
  ) as StatsData["daily"];
  const fill = (metric: Metric, rows: { day: string; n: string }[]) => {
    for (const r of rows) {
      const n = num(r.n, `${metric} on ${r.day}`);
      if (n) daily[metric][r.day] = n;
    }
  };
  for (const m of ["views", "audio", "shares", "clicks"] as const)
    fill(
      m,
      stats.map((r) => ({ day: r.day, n: r[m] })),
    );
  fill(
    "reactions",
    feedback.map((r) => ({ day: r.day, n: r.reactions })),
  );
  fill("comments", comments);
  fill("suggestions", suggestions);
  fill("bonGames", bon);

  const totals = Object.fromEntries(
    METRICS.map((m) => [m, Object.values(daily[m]).reduce((a, b) => a + b, 0)]),
  ) as StatsData["totals"];
  const reactionSplit = Object.fromEntries(
    REACTION_KEYS.map((k) => [
      k,
      feedback.reduce((sum, r) => sum + num(r[k], `${k} on ${r.day}`), 0),
    ]),
  ) as StatsData["reactionSplit"];
  const toWord = (r: TopRow): TopWord => ({
    id: r.id,
    berlinerisch: r.berlinerisch,
    slug: r.slug,
    value: num(r.value, `value of word ${r.id}`),
  });
  const toVoted = (list: "liked" | "say"): VotedWord[] =>
    voted
      .filter((r) => r.list === list)
      .map((r) => Object.assign(toWord(r), { votes: num(r.votes, `votes of word ${r.id}`) }));
  return {
    daily,
    totals,
    reactionSplit,
    topViewed: topViewed.map(toWord),
    topLiked: toVoted("liked"),
    topSay: toVoted("say"),
  };
};
