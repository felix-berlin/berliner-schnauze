import type { Payload } from "payload";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { dayStart, trending, type Ranked } from "../src/lib/wordStats";
import { getTestPayload } from "./helpers/payload";

const slugs = [
  "trend-test-a",
  "trend-test-b",
  "trend-test-draft",
  "trend-test-held",
  "trend-test-plain",
  "trend-test-zero",
  "trend-test-edge",
  "trend-test-win",
  "trend-test-cin",
  "trend-test-cout",
  "trend-test-none",
  "trend-test-null",
];
const today = "2026-11-30";
let payload: Payload;
let a: number;
let b: number;
let draft: number;
let held: number;
let plain: number;
let zero: number;

const stat = (word: number, day: string, data: Record<string, number>) =>
  payload.create({ collection: "word-stats", data: { word, day, ...data } as never });

const cleanup = async () => {
  const old = await payload.find({
    collection: "words",
    where: { slug: { in: slugs } },
    pagination: false,
    depth: 0,
    draft: true,
  });
  const ids = old.docs.map((d) => d.id);
  await payload.delete({ collection: "word-stats", where: { word: { in: ids } } });
  await payload.delete({ collection: "comments", where: { word: { in: ids } } });
  await payload.delete({ collection: "word-feedback", where: { word: { in: ids } } });
  await payload.delete({ collection: "words", where: { slug: { in: slugs } } });
};

const ids = (rows: Ranked[]) => rows.filter((r) => [a, b, draft].includes(r.word));

beforeAll(async () => {
  payload = await getTestPayload();
  await cleanup();
  const mk = async (n: string, s: string, _status: "published" | "draft") =>
    (await payload.create({ collection: "words", data: { berlinerisch: n, slug: s, _status } })).id;
  a = await mk("Trendeins", slugs[0], "published");
  b = await mk("Trendzwei", slugs[1], "published");
  draft = await mk("Trendentwurf", slugs[2], "draft");
  await stat(a, "2026-11-10", { views: 10 });
  held = await mk("Trendheld", slugs[3], "published");
  plain = await mk("Trendplain", slugs[4], "published");
  zero = await mk("Trendnull", slugs[5], "published");
  await stat(held, "2026-11-12", { views: 5 });
  await stat(plain, "2026-11-12", { views: 5 });
  await stat(a, "2026-10-05", { views: 4 }); // previous period
  await stat(a, "2026-09-01", { views: 99 }); // outside both
  await stat(b, "2026-11-12", { views: 5, audio: 1 });
  await stat(draft, "2026-11-12", { views: 500 });
  const at = "2026-11-15T12:00:00.000Z";
  const c = (authorName: string, word = b) =>
    payload.create({
      collection: "comments",
      data: { word, text: "kiek ma", authorName, createdAt: at } as never,
    });
  await c("Icke");
  await c("Nullviews", zero);
  expect((await c("casino-bonus.com", held)).status).toBe("pending");
  await payload.create({
    collection: "word-feedback",
    data: { word: b, visitor: "v-trend", reaction: "like", createdAt: at } as never,
  });
}, 60_000);

afterAll(cleanup);

const opts = { days: 30, limit: 10, today };

describe("dayStart", () => {
  it("is the Berlin midnight, DST-safe", () => {
    expect(dayStart("2026-01-15").toISOString()).toBe("2026-01-14T23:00:00.000Z");
    expect(dayStart("2026-07-15").toISOString()).toBe("2026-07-14T22:00:00.000Z");
    expect(dayStart("2026-03-29").toISOString()).toBe("2026-03-28T23:00:00.000Z");
    expect(dayStart("2026-03-30").toISOString()).toBe("2026-03-29T22:00:00.000Z");
    expect(dayStart("2026-10-25").toISOString()).toBe("2026-10-24T22:00:00.000Z");
    expect(dayStart("2026-10-26").toISOString()).toBe("2026-10-25T23:00:00.000Z");
  });
});

describe("trending", () => {
  it("viewed: orders by views, ignores other periods and drafts", async () => {
    const r = ids(await trending(payload, { ...opts, type: "viewed" }));
    expect(r.map((x) => x.word)).toEqual([a, b]);
    expect(r[0].views).toBe(10);
  });

  it("rising: compares with the previous period", async () => {
    const r = ids(await trending(payload, { ...opts, type: "rising" }));
    expect(r.map((x) => x.word)).toEqual([b, a]); // 5/(0+7.5) beats 6/(4+7.5)
    expect(r[1]).toMatchObject({ views: 10, previous: 4 });
  });

  it("engaged: published comment counts 3, pending 0", async () => {
    const r = ids(await trending(payload, { ...opts, type: "engaged" }));
    expect(r.map((x) => x.word)).toEqual([b, a]);
  });

  it("engaged: a pending comment weighs 0 (same value as a word without one)", async () => {
    const r = await trending(payload, { ...opts, type: "engaged", limit: 1000 });
    const value = (w: number) => r.find((x) => x.word === w)?.value;
    expect(value(held)).toBeDefined();
    expect(value(held)).toBe(value(plain)); // identical views; any comment weight would lift `held`
  });

  it("engaged: a word with a comment but no views is not listed", async () => {
    const r = await trending(payload, { ...opts, type: "engaged", limit: 1000 });
    expect(r.map((x) => x.word)).not.toContain(zero);
  });

  it("never lists a draft word", async () => {
    for (const type of ["viewed", "rising", "engaged"] as const) {
      const r = await trending(payload, { ...opts, type });
      expect(r.map((x) => x.word)).not.toContain(draft);
    }
  });

  it("returns [] without data", async () => {
    for (const type of ["viewed", "rising", "engaged"] as const) {
      expect(await trending(payload, { ...opts, type, today: "2020-01-31" })).toEqual([]);
    }
  });
});

describe("trending: window edges", () => {
  let edge: number;
  let win: number;
  let cin: number;
  let cout: number;
  let none: number;
  let nul: number;
  const word = async (n: string, s: string) =>
    (
      await payload.create({
        collection: "words",
        data: { berlinerisch: n, slug: s, _status: "published" },
      })
    ).id;
  const comment = (w: number, createdAt: string) =>
    payload.create({
      collection: "comments",
      data: { word: w, text: "kiek ma", authorName: "Icke", createdAt } as never,
    });

  beforeAll(async () => {
    edge = await word("Trendkante", "trend-test-edge");
    win = await word("Trendfenster", "trend-test-win");
    cin = await word("Trendrein", "trend-test-cin");
    cout = await word("Trendraus", "trend-test-cout");
    none = await word("Trendkein", "trend-test-none");
    nul = await word("Trendnix", "trend-test-null");
    // first and last day count, the day before and after do not; one word over several days is summed
    await stat(edge, "2026-11-01", { views: 1, audio: 1 });
    await stat(edge, "2026-11-30", { views: 2, shares: 1, clicks: 1 });
    await stat(edge, "2026-10-31", { views: 100 });
    await stat(edge, "2026-12-01", { views: 100 });
    // previous period is 2026-10-02..2026-10-31
    await stat(win, "2026-11-01", { views: 8 });
    await stat(win, "2026-10-31", { views: 2 });
    await stat(win, "2026-10-02", { views: 4 });
    await stat(win, "2026-10-01", { views: 100 });
    for (const w of [cin, cout, none, nul]) await stat(w, "2026-11-12", { views: 1 });
    // Berlin is UTC+1 in November: the Berlin day starts at 23:00 UTC of the day before
    await comment(cin, "2026-11-29T23:30:00.000Z"); // 30 Nov 00:30 Berlin: last day, counts
    await comment(cin, "2026-10-31T23:30:00.000Z"); // 1 Nov 00:30 Berlin: first day, counts
    await comment(cout, "2026-11-30T23:30:00.000Z"); // 1 Dec 00:30 Berlin: outside
    await comment(cout, "2026-10-31T22:30:00.000Z"); // 31 Oct 23:30 Berlin: outside
    // answers without a reaction (usage only, explicit null) are not reactions
    const at = "2026-11-12T12:00:00.000Z";
    await payload.create({
      collection: "word-feedback",
      data: { word: nul, visitor: "v-null-1", usage: "say", createdAt: at } as never,
    });
    await payload.create({
      collection: "word-feedback",
      data: { word: nul, visitor: "v-null-2", reaction: null, createdAt: at } as never,
    });
  }, 60_000);

  it("viewed: sums the days inside the window, first and last day included", async () => {
    const r = (await trending(payload, { ...opts, type: "viewed", limit: 1000 })).find(
      (x) => x.word === edge,
    );
    expect(r?.views).toBe(3);
    expect(typeof r?.views).toBe("number");
  });

  it("rising: previous period spans the 30 days before the window", async () => {
    const r = (await trending(payload, { ...opts, type: "rising", limit: 1000 })).find(
      (x) => x.word === win,
    );
    expect(r).toMatchObject({ views: 8, previous: 6 });
  });

  it("engaged: comments count by Berlin day, empty answers do not count", async () => {
    const r = await trending(payload, { ...opts, type: "engaged", limit: 1000 });
    const value = (w: number) => r.find((x) => x.word === w)?.value as number;
    expect(value(cout)).toBe(value(none));
    expect(value(nul)).toBe(value(none));
    expect(value(cin)).toBeGreaterThan(value(none));
  });
});
