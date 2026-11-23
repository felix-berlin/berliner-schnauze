import type { Payload } from "payload";

import { sql } from "@payloadcms/db-postgres/drizzle";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { StatsData } from "../src/lib/statsTypes";

import { METRICS } from "../src/lib/statsMetrics";
import { loadStats, num } from "../src/lib/statsQueries";
import { MIN_GROUP } from "../src/lib/wordFeedback";
import { getTestPayload } from "./helpers/payload";

// A year nobody else writes to, so the totals are exactly what this file seeds.
const range = { from: "2020-01-01", to: "2020-12-31" };
const empty = { from: "2019-01-01", to: "2019-01-31" };
const prefix = "stats-test-";

let payload: Payload;
let data: StatsData;
const ids: Record<string, number> = {};

const word = (name: string, extra: Record<string, unknown> = {}) =>
  payload.create({
    collection: "words",
    data: { berlinerisch: name, slug: `${prefix}${name}`, _status: "published", ...extra },
  });

const feedback = (
  wordId: number,
  visitor: string,
  fields: Record<string, unknown>,
  createdAt: string,
) =>
  payload.create({
    collection: "word-feedback",
    data: { word: wordId, visitor, createdAt, ...fields } as never,
  });

const cleanup = async () => {
  const where = { slug: { like: prefix } };
  await payload.delete({ collection: "words", trash: true, where });
  await payload.delete({ collection: "suggestions", where: { berlinerWord: { like: prefix } } });
  await payload.delete({ collection: "suggestions", where: { text: { like: prefix } } });
  await payload.delete({ collection: "bon-games", where: { visitor: { like: prefix } } });
};

beforeAll(async () => {
  payload = await getTestPayload();
  await cleanup();
  const a = await word("a");
  const b = await word("b");
  const draft = await word("draft", { _status: "draft" });
  const trashed = await word("trashed");
  const c = await word("c");
  const d = await word("d");
  Object.assign(ids, { a: a.id, b: b.id, draft: draft.id, trashed: trashed.id });

  for (const [w, day, views] of [
    [a.id, "2020-03-01", 5],
    [a.id, "2020-03-02", 7],
    [b.id, "2020-03-02", 2],
    [draft.id, "2020-03-02", 100],
    [trashed.id, "2020-03-02", 50],
    // The window is by Berlin day text: the first and the last day count, their neighbours do not.
    [c.id, "2019-12-31", 1000],
    [c.id, "2020-01-01", 1],
    [c.id, "2020-12-31", 1],
    [c.id, "2021-01-01", 1000],
  ] as const)
    await payload.create({
      collection: "word-stats",
      data: { word: w, day, views, audio: 1, shares: 0, clicks: 0 },
    });

  // 10 reactions for a (all like), 9 for b: b stays below MIN_GROUP.
  for (let i = 0; i < MIN_GROUP; i++)
    await feedback(
      a.id,
      `${prefix}a${i}`,
      { reaction: "like", usage: "say" },
      "2020-04-10T10:00:00Z",
    );
  for (let i = 0; i < MIN_GROUP - 1; i++)
    await feedback(
      b.id,
      `${prefix}b${i}`,
      { reaction: "dislike", usage: "say" },
      "2020-04-10T10:00:00Z",
    );
  // Draft and trashed words with enough votes must still stay out of the vote lists.
  for (let i = 0; i < MIN_GROUP - 2; i++)
    await feedback(
      draft.id,
      `${prefix}d${i}`,
      { reaction: "like", usage: "say" },
      "2020-04-10T10:00:00Z",
    );
  for (let i = 0; i < MIN_GROUP; i++)
    await feedback(
      trashed.id,
      `${prefix}t${i}`,
      { reaction: "like", usage: "say" },
      "2020-04-10T10:00:00Z",
    );
  await payload.update({
    collection: "words",
    id: trashed.id,
    data: { deletedAt: new Date().toISOString() },
  });
  // A second qualifying word: 80 % likes, nobody says it (usage "know"), so the lists have an order to check.
  for (let i = 0; i < MIN_GROUP; i++)
    await feedback(
      d.id,
      `${prefix}k${i}`,
      { reaction: i < 8 ? "like" : "dislike", usage: "know" },
      "2020-04-11T10:00:00Z",
    );
  // 22:59:59 UTC on 2020-12-31 is still the last Berlin day of the range, 23:00:00 UTC already 2021.
  await feedback(c.id, `${prefix}in`, { reaction: "dislike" }, "2020-12-31T22:59:59Z");
  await feedback(c.id, `${prefix}out`, { reaction: "dislike" }, "2020-12-31T23:00:00Z");
  // Berlin midnight: 23:30 UTC in winter and 22:30 UTC in summer already belong to the next Berlin day.
  await feedback(draft.id, `${prefix}w`, { reaction: "like" }, "2020-01-15T23:30:00Z");
  await feedback(draft.id, `${prefix}s`, { reaction: "like" }, "2020-07-15T22:30:00Z");

  // The create hook decides the status: a link in the text holds a comment back as pending.
  const comment = (text: string) =>
    payload.create({
      collection: "comments",
      data: { word: a.id, text, authorName: "Icke", createdAt: "2020-05-05T10:00:00Z" } as never,
    });
  await comment("kiek ma");
  await comment("kiek ma https://example.com");
  await payload.create({
    collection: "suggestions",
    data: {
      berlinerWord: `${prefix}x`,
      translation: "x",
      createdAt: "2020-06-06T10:00:00Z",
    } as never,
  });
  // Only a word suggestion counts as a suggestion in the stats.
  await payload.create({
    collection: "suggestions",
    data: {
      type: "example",
      text: `${prefix}e`,
      targetWord: a.id,
      createdAt: "2020-06-06T10:00:00Z",
    } as never,
  });
  await payload.create({
    collection: "bon-games",
    data: {
      visitor: `${prefix}1`,
      token: `${prefix}t1`,
      cards: [],
      batches: [],
      status: "finished",
      finishedAt: "2020-08-08T10:00:00Z",
    } as never,
  });
  await payload.create({
    collection: "bon-games",
    data: {
      visitor: `${prefix}2`,
      token: `${prefix}t2`,
      cards: [],
      batches: [],
      status: "playing",
    } as never,
  });

  data = await loadStats(payload, range);
}, 120_000);

afterAll(async () => {
  await payload.delete({ collection: "comments", where: { word: { equals: ids.a } } });
  await cleanup();
});

describe("loadStats", () => {
  it("sums the word counters per day and in total", () => {
    expect(data.daily.views).toEqual({
      "2020-01-01": 1,
      "2020-03-01": 5,
      "2020-03-02": 159,
      "2020-12-31": 1,
    });
    expect(data.totals.views).toBe(166);
    expect(data.totals.audio).toBe(7); // the two in-range rows of c add 2
  });

  it("counts only published comments, word suggestions and finished BON games", () => {
    expect(data.totals.comments).toBe(1);
    expect(data.totals.suggestions).toBe(1);
    expect(data.totals.bonGames).toBe(1);
  });

  it("buckets feedback by Berlin day, in winter and summer", () => {
    expect(data.daily.reactions["2020-01-16"]).toBe(1);
    expect(data.daily.reactions["2020-07-16"]).toBe(1);
    expect(data.daily.reactions["2020-01-15"]).toBeUndefined();
    expect(data.daily.reactions["2020-12-31"]).toBe(1);
  });

  it("splits reactions and usage", () => {
    // The 2021 row (Berlin midnight) is outside the range.
    expect(data.reactionSplit).toEqual({ like: 38, dislike: 12, say: 37, know: 10, never: 0 });
  });

  it("ranks only live words: no draft, no trashed", () => {
    expect(data.topViewed.map((w) => w.slug)).toEqual([`${prefix}a`, `${prefix}b`, `${prefix}c`]);
    expect(data.topViewed[0]).toMatchObject({ value: 12 });
  });

  it("lists a word in Beliebt and Typisch berlinerisch only from MIN_GROUP votes, best first", () => {
    expect(data.topLiked.map((w) => w.slug)).toEqual([`${prefix}a`, `${prefix}d`]);
    expect(data.topLiked[0]).toMatchObject({ value: 100, votes: MIN_GROUP });
    expect(data.topLiked[1]).toMatchObject({ value: 80, votes: MIN_GROUP });
    expect(data.topSay.map((w) => w.slug)).toEqual([`${prefix}a`, `${prefix}d`]);
  });

  it("keeps draft and trashed words out of the vote lists, however many votes they have", () => {
    for (const list of [data.topLiked, data.topSay])
      for (const slug of [`${prefix}draft`, `${prefix}trashed`])
        expect(list.map((w) => w.slug)).not.toContain(slug);
  });

  it("has only counts and words in it, never a visitor", () => {
    expect(Object.keys(data).sort()).toEqual(
      ["daily", "reactionSplit", "topLiked", "topSay", "topViewed", "totals"].sort(),
    );
    for (const w of [...data.topViewed, ...data.topLiked, ...data.topSay])
      expect(Object.keys(w).sort()).toEqual(
        "votes" in w
          ? ["berlinerisch", "id", "slug", "value", "votes"]
          : ["berlinerisch", "id", "slug", "value"],
      );
  });

  it("skips the top lists but not the totals with tops: false", async () => {
    const totalsOnly = await loadStats(payload, range, { tops: false });
    expect(totalsOnly.totals).toEqual(data.totals);
    expect([totalsOnly.topViewed, totalsOnly.topLiked, totalsOnly.topSay]).toEqual([[], [], []]);
  });

  it("gives zeros and empty lists for a range without data", async () => {
    const none = await loadStats(payload, empty);
    for (const m of METRICS) expect(none.totals[m]).toBe(0);
    expect(none.daily.views).toEqual({});
    expect([none.topViewed, none.topLiked, none.topSay]).toEqual([[], [], []]);
    expect(Object.values(none.reactionSplit).every((n) => n === 0)).toBe(true);
  });
});

describe("raw SQL names", () => {
  it("still match the schema (a rename must fail here, not on the page)", async () => {
    const { rows } = await (
      payload.db as never as {
        drizzle: { execute: (q: unknown) => Promise<{ rows: { t: string; c: string }[] }> };
      }
    ).drizzle.execute(
      sql`select table_name as t, column_name as c from information_schema.columns where table_schema = current_schema()`,
    );
    const have = new Set(rows.map((r) => `${r.t}.${r.c}`));
    const used = {
      word_stats: ["word_id", "day", "views", "audio", "shares", "clicks"],
      word_feedback: ["word_id", "created_at", "reaction", "usage"],
      comments: ["created_at", "status"],
      suggestions: ["created_at"],
      bon_games: ["finished_at"],
      words: ["id", "berlinerisch", "slug", "_status", "deleted_at"],
    };
    const missing = Object.entries(used).flatMap(([t, cols]) =>
      cols.filter((c) => !have.has(`${t}.${c}`)).map((c) => `${t}.${c}`),
    );
    expect(missing).toEqual([]);
  });
});

describe("num", () => {
  it("reads database numbers and refuses anything else", () => {
    expect(num("12", "x")).toBe(12);
    expect(num(7, "x")).toBe(7);
    expect(() => num(undefined, "views")).toThrow(/views is not a number/);
    expect(() => num("abc", "views")).toThrow(/not a number: abc/);
  });
});
