import type { PostgresAdapter } from "@payloadcms/db-postgres";
import type { Payload } from "payload";

import { sql } from "@payloadcms/db-postgres/drizzle";

// Word stats helpers (`payload-app/word-stats`): the Berlin day, the trending ranks and the atomic counter.

export const STAT_KINDS = ["view", "audio", "share", "click"] as const;
export type StatKind = (typeof STAT_KINDS)[number];

const dayFormat = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" });

/** `YYYY-MM-DD` of the given moment in Berlin time. */
export const berlinDay = (date: Date = new Date()): string => dayFormat.format(date);

export type Counts = { views: number; interactions: number };
export type Ranked = { word: number; value: number; views: number; previous?: number };

/** Mean views per word with views; at least 1, so a quiet period does not divide by zero. */
const prior = (cur: Map<number, Counts>) => {
  let sum = 0;
  let n = 0;
  for (const { views } of cur.values()) {
    if (views > 0) {
      sum += views;
      n++;
    }
  }
  return Math.max(1, n ? sum / n : 0);
};

/** Highest value first, then most views, then lowest word id. */
const top = (rows: Ranked[], limit: number) =>
  rows.sort((a, b) => b.value - a.value || b.views - a.views || a.word - b.word).slice(0, limit);

export const rankViewed = (cur: Map<number, Counts>, limit: number): Ranked[] =>
  top(
    [...cur]
      .filter(([, c]) => c.views > 0)
      .map(([word, c]) => ({ word, value: c.views, views: c.views })),
    limit,
  );

/** Change in views, damped by `m` so small words do not jump. */
export const rankRising = (
  cur: Map<number, Counts>,
  prev: Map<number, Counts>,
  limit: number,
): Ranked[] => {
  const m = prior(cur);
  const words = new Set([...cur.keys(), ...prev.keys()]);
  return top(
    [...words].map((word) => {
      const views = cur.get(word)?.views ?? 0;
      const previous = prev.get(word)?.views ?? 0;
      return { word, value: (views - previous) / (previous + m), views, previous };
    }),
    limit,
  );
};

/** Interactions per view, pulled towards the overall rate by `m` views. */
export const rankEngaged = (cur: Map<number, Counts>, limit: number): Ranked[] => {
  const m = prior(cur);
  let views = 0;
  let interactions = 0;
  for (const c of cur.values()) {
    views += c.views;
    interactions += c.interactions;
  }
  const rate = views ? interactions / views : 0;
  return top(
    [...cur].map(([word, c]) => ({
      word,
      value: (c.interactions + m * rate) / (c.views + m),
      views: c.views,
    })),
    limit,
  );
};

const COLUMN = { view: "views", audio: "audio", share: "shares", click: "clicks" } as const;

/** Atomic upsert of one daily counter: concurrent bumps never lose an increment. */
export const bumpWordStat = async (
  payload: Payload,
  wordId: number,
  kind: StatKind,
  day: string = berlinDay(),
): Promise<void> => {
  const n = (k: StatKind) => (k === kind ? 1 : 0); // the first bump of a day starts its column at 1
  const col = sql.identifier(COLUMN[kind]);
  const { drizzle } = payload.db as unknown as PostgresAdapter;
  await drizzle.execute(sql`
    insert into word_stats (word_id, day, views, audio, shares, clicks, updated_at, created_at)
    values (${wordId}, ${day}, ${n("view")}, ${n("audio")}, ${n("share")}, ${n("click")}, now(), now())
    on conflict (word_id, day) do update set ${col} = word_stats.${col} + 1, updated_at = now()
  `);
};
