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

/** Relative change in views against the previous period, damped by `m` so small words do not jump. */
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

/** Interactions per view, pulled towards the overall rate (all words, also those without views) by `m` views. */
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
    [...cur]
      .filter(([, c]) => c.views > 0) // a word with interactions but no views would be scored as if it had views
      .map(([word, c]) => ({
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
    insert into word_stats (word_id, day, views, audio, shares, clicks)
    values (${wordId}, ${day}, ${n("view")}, ${n("audio")}, ${n("share")}, ${n("click")})
    on conflict (word_id, day) do update set ${col} = word_stats.${col} + 1
  `);
};

export const TREND_TYPES = ["viewed", "rising", "engaged"] as const;
export type TrendType = (typeof TREND_TYPES)[number];

const W_COMMENT = 3;
const W_OTHER = 1; // audio, share, click and reaction each

const addDays = (day: string, n: number): string =>
  new Date(Date.parse(`${day}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);

/** The instant Berlin's `day` starts; tries both UTC offsets, so it survives DST changes. */
export const dayStart = (day: string): Date => {
  for (const h of [1, 2]) {
    const t = new Date(Date.parse(`${day}T00:00:00Z`) - h * 36e5);
    if (berlinDay(t) === day && berlinDay(new Date(+t - 1)) !== day) return t;
  }
  throw new Error(`no Berlin midnight for ${day}`);
};

/** Counts per word for the Berlin days `first..last` (inclusive). Words without activity get no entry. */
const collect = async (payload: Payload, first: string, last: string) => {
  const map = new Map<number, Counts>();
  const bump = (word: unknown, views: number, interactions: number) => {
    if (typeof word !== "number") return;
    const c = map.get(word) ?? { views: 0, interactions: 0 };
    c.views += views;
    c.interactions += interactions;
    map.set(word, c);
  };
  const created = {
    createdAt: {
      greater_than_equal: dayStart(first).toISOString(),
      less_than: dayStart(addDays(last, 1)).toISOString(),
    },
  };
  const opts = { pagination: false, depth: 0 } as const;
  const [stats, feedback, comments] = await Promise.all([
    payload.find({
      collection: "word-stats",
      where: { day: { greater_than_equal: first, less_than_equal: last } },
      select: { word: true, views: true, audio: true, shares: true, clicks: true },
      ...opts,
    }),
    payload.find({
      collection: "word-feedback",
      where: { ...created, reaction: { exists: true } },
      select: { word: true },
      ...opts,
    }),
    payload.find({
      collection: "comments",
      where: { ...created, status: { equals: "published" } },
      select: { word: true },
      ...opts,
    }),
  ]);
  for (const s of stats.docs) {
    bump(s.word, s.views, (s.audio + s.shares + s.clicks) * W_OTHER);
  }
  // A reaction counts on the Berlin day the visitor FIRST answered anything (one row per visitor and word, createdAt
  // is the first-answer time); a later change is not moved.
  for (const f of feedback.docs) bump(f.word, 0, W_OTHER);
  for (const c of comments.docs) bump(c.word, 0, W_COMMENT);
  return map;
};

/** Top words of a trending list over the `days` Berlin days ending at `today`; published words only. */
export const trending = async (
  payload: Payload,
  opts: { type: TrendType; days: number; limit: number; today?: string },
): Promise<Ranked[]> => {
  const { type, days, limit, today = berlinDay() } = opts;
  const cur = await collect(payload, addDays(today, 1 - days), today);
  const prev =
    type === "rising"
      ? await collect(payload, addDays(today, 1 - 2 * days), addDays(today, -days))
      : new Map<number, Counts>();
  // Drop unpublished words before ranking so they never take a slot from a live one.
  const ids = [...new Set([...cur.keys(), ...prev.keys()])];
  if (!ids.length) return [];
  const live = new Set(
    (
      await payload.find({
        collection: "words",
        draft: false,
        where: { id: { in: ids }, _status: { equals: "published" } },
        select: {},
        pagination: false,
        depth: 0,
      })
    ).docs.map((w) => w.id),
  );
  for (const m of [cur, prev]) for (const id of m.keys()) if (!live.has(id)) m.delete(id);
  const ranked =
    type === "viewed"
      ? rankViewed(cur, limit)
      : type === "engaged"
        ? rankEngaged(cur, limit)
        : rankRising(cur, prev, Infinity).filter((r) => r.value > 0);
  return ranked.slice(0, limit);
};
