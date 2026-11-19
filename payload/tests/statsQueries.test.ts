import type { Payload } from "payload";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { METRICS, loadStats, type StatsData } from "../src/lib/statsQueries";
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
  await payload.delete({ collection: "bon-games", where: { visitor: { like: prefix } } });
};

beforeAll(async () => {
  payload = await getTestPayload();
  await cleanup();
  const a = await word("a");
  const b = await word("b");
  const draft = await word("draft", { _status: "draft" });
  const trashed = await word("trashed");
  await payload.update({
    collection: "words",
    id: trashed.id,
    data: { deletedAt: new Date().toISOString() },
  });
  Object.assign(ids, { a: a.id, b: b.id, draft: draft.id, trashed: trashed.id });

  for (const [w, day, views] of [
    [a.id, "2020-03-01", 5],
    [a.id, "2020-03-02", 7],
    [b.id, "2020-03-02", 2],
    [draft.id, "2020-03-02", 100],
    [trashed.id, "2020-03-02", 50],
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
    expect(data.daily.views).toEqual({ "2020-03-01": 5, "2020-03-02": 159 });
    expect(data.totals.views).toBe(164);
    expect(data.totals.audio).toBe(5);
  });

  it("counts only published comments, all suggestions and finished BON games", () => {
    expect(data.totals.comments).toBe(1);
    expect(data.totals.suggestions).toBe(1);
    expect(data.totals.bonGames).toBe(1);
  });

  it("buckets feedback by Berlin day, in winter and summer", () => {
    expect(data.daily.reactions["2020-01-16"]).toBe(1);
    expect(data.daily.reactions["2020-07-16"]).toBe(1);
    expect(data.daily.reactions["2020-01-15"]).toBeUndefined();
  });

  it("splits reactions and usage", () => {
    expect(data.reactionSplit).toEqual({ like: 12, dislike: 9, say: 19, know: 0, never: 0 });
  });

  it("ranks only live words: no draft, no trashed", () => {
    expect(data.topViewed.map((w) => w.slug)).toEqual([`${prefix}a`, `${prefix}b`]);
    expect(data.topViewed[0]).toMatchObject({ value: 12 });
  });

  it("lists a word in Beliebt and Typisch berlinerisch only from MIN_GROUP votes", () => {
    expect(data.topLiked.map((w) => w.slug)).toEqual([`${prefix}a`]);
    expect(data.topLiked[0]).toMatchObject({ value: 100, votes: MIN_GROUP });
    expect(data.topSay.map((w) => w.slug)).toEqual([`${prefix}a`]);
  });

  it("gives zeros and empty lists for a range without data", async () => {
    const none = await loadStats(payload, empty);
    for (const m of METRICS) expect(none.totals[m]).toBe(0);
    expect(none.daily.views).toEqual({});
    expect([none.topViewed, none.topLiked, none.topSay]).toEqual([[], [], []]);
    expect(Object.values(none.reactionSplit).every((n) => n === 0)).toBe(true);
  });
});
