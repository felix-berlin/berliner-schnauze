import type { Payload } from "payload";

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { bumpWordStat } from "../src/lib/wordStats";
import { getTestPayload } from "./helpers/payload";

const slug = "word-stats-test";
let payload: Payload;
let wordId: number;

const rows = async (day: string) =>
  (
    await payload.find({
      collection: "word-stats",
      where: { word: { equals: wordId }, day: { equals: day } },
      pagination: false,
      depth: 0,
    })
  ).docs;

const cleanup = async () => {
  const old = await payload.find({
    collection: "words",
    where: { slug: { equals: slug } },
    pagination: false,
    depth: 0,
    draft: true,
  });
  const ids = old.docs.map((d) => d.id);
  await payload.delete({ collection: "word-stats", where: { word: { in: ids } } });
  await payload.delete({ collection: "words", where: { slug: { equals: slug } } });
};

beforeAll(async () => {
  payload = await getTestPayload();
  await cleanup();
  wordId = (
    await payload.create({
      collection: "words",
      data: { berlinerisch: "Statstest", slug, _status: "published" },
    })
  ).id;
}, 60_000);

beforeEach(async () => {
  await payload.delete({ collection: "word-stats", where: { word: { equals: wordId } } });
});

afterAll(cleanup);

describe("bumpWordStat", () => {
  it("counts two views into one row", async () => {
    await bumpWordStat(payload, wordId, "view", "2026-11-05");
    await bumpWordStat(payload, wordId, "view", "2026-11-05");
    const r = await rows("2026-11-05");
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ views: 2, audio: 0, shares: 0, clicks: 0 });
  });

  it("is atomic under 20 parallel bumps", async () => {
    await Promise.all(
      Array.from({ length: 20 }, () => bumpWordStat(payload, wordId, "click", "2026-11-06")),
    );
    const r = await rows("2026-11-06");
    expect(r).toHaveLength(1);
    expect(r[0].clicks).toBe(20);
  });

  it("maps each kind to its column", async () => {
    for (const kind of ["view", "audio", "share", "click"] as const) {
      await bumpWordStat(payload, wordId, kind, "2026-11-07");
    }
    expect((await rows("2026-11-07"))[0]).toMatchObject({
      views: 1,
      audio: 1,
      shares: 1,
      clicks: 1,
    });
  });

  it("rejects a second row for the same word and day", async () => {
    await bumpWordStat(payload, wordId, "view", "2026-11-08");
    await expect(
      payload.create({
        collection: "word-stats",
        data: { word: wordId, day: "2026-11-08" } as never,
      }),
    ).rejects.toThrow();
  });
});
