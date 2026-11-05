import type { Payload } from "payload";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { dayStart, trending, type Ranked } from "../src/lib/wordStats";
import { getTestPayload } from "./helpers/payload";

const slugs = ["trend-test-a", "trend-test-b", "trend-test-draft"];
const today = "2026-11-30";
let payload: Payload;
let a: number;
let b: number;
let draft: number;

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
  await stat(a, "2026-10-05", { views: 4 }); // previous period
  await stat(a, "2026-09-01", { views: 99 }); // outside both
  await stat(b, "2026-11-12", { views: 5, audio: 1 });
  await stat(draft, "2026-11-12", { views: 500 });
  const at = "2026-11-15T12:00:00.000Z";
  const c = (authorName: string) =>
    payload.create({
      collection: "comments",
      data: { word: b, text: "kiek ma", authorName, createdAt: at } as never,
    });
  await c("Icke");
  expect((await c("casino-bonus.com")).status).toBe("pending"); // held comments count 0
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

  it("never lists a draft word", async () => {
    for (const type of ["viewed", "rising", "engaged"] as const) {
      const r = await trending(payload, { ...opts, type });
      expect(r.map((x) => x.word)).not.toContain(draft);
    }
  });

  it("returns [] without data", async () => {
    expect(await trending(payload, { ...opts, type: "viewed", today: "2020-01-31" })).toEqual([]);
  });
});
