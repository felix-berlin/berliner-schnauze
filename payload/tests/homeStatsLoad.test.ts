import type { Payload } from "payload";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { loadHomeStats, type HomeStats } from "../src/lib/homeStatsLoad";
import { getTestPayload } from "./helpers/payload";

// All data invented: test words "hs-…", visitors "hs-v…".
let payload: Payload;
let stats: HomeStats;
let n = 0;
const wordIds: number[] = [];

const word = async (slug: string, published = true) => {
  const doc = await payload.create({
    collection: "words",
    data: { berlinerisch: slug.toUpperCase(), slug, _status: published ? "published" : "draft" },
  });
  wordIds.push(doc.id);
  return doc.id;
};

const votes = (wordId: number, count: number, data: Record<string, unknown>) =>
  Promise.all(
    Array.from({ length: count }, () =>
      payload.create({
        collection: "word-feedback",
        data: { word: wordId, visitor: `hs-v${n++}`, ...data } as never,
      }),
    ),
  );

const wipe = async () => {
  await payload.db.deleteMany({ collection: "word-feedback", where: {} });
  await payload.db.deleteMany({ collection: "bon-games", where: {} });
};

beforeAll(async () => {
  payload = await getTestPayload();
  await wipe();
  const a = await word(`hs-a-${Date.now()}`);
  const b = await word(`hs-b-${Date.now()}`);
  const c = await word(`hs-c-${Date.now()}`);
  const draft = await word(`hs-d-${Date.now()}`, false);

  // Districts: spandau 9 votes (too few), mitte exactly MIN_GROUP.
  await votes(a, 9, { usage: "say", area: "spandau" });
  await votes(a, 7, { usage: "say", area: "mitte" });
  await votes(a, 3, { usage: "never", area: "mitte" });
  // Rows without usage never count.
  await votes(a, 5, { reaction: "like", area: "pankow" });

  // Age: b has 30 votes; u20 + 20-29 only reach MIN_GROUP together.
  await votes(b, 5, { usage: "say", age: "u20" });
  await votes(b, 5, { usage: "say", age: "20-29" });
  await votes(b, 10, { usage: "never", age: "70-79" });
  await votes(b, 10, { usage: "know", age: "80plus" });
  // c has one vote too few for the age lists.
  await votes(c, 10, { usage: "say", age: "u20" });
  await votes(c, 19, { usage: "never", age: "80plus" });
  // A draft word never shows.
  await votes(draft, 15, { usage: "say", age: "u20" });
  await votes(draft, 15, { usage: "never", age: "80plus" });

  const now = new Date().toISOString();
  const cards = [
    ...Array.from({ length: 9 }, (_, i) => ({
      id: i,
      word: "Quatschwort",
      isReal: false,
      answer: true,
    })),
    ...Array.from({ length: 3 }, (_, i) => ({
      id: 9 + i,
      word: "Quatschwort",
      isReal: false,
      answer: false,
    })),
    { id: 12, word: "Selten", isReal: true, answer: false },
  ];
  await payload.create({
    collection: "bon-games",
    data: {
      visitor: "hs-g1",
      token: "hs-t1",
      status: "finished",
      finishedAt: now,
      cards,
      batches: [],
    } as never,
  });
  await payload.create({
    collection: "bon-games",
    data: { visitor: "hs-g2", token: "hs-t2", cards: [], batches: [] } as never,
  });

  stats = await loadHomeStats(payload);
}, 120_000);

afterAll(async () => {
  await wipe();
  await payload.delete({ collection: "words", where: { id: { in: wordIds } } });
});

const district = (area: string) => stats.districts.find((d) => d.area === area);

describe("loadHomeStats", () => {
  it("lists the 12 Berlin districts with German names, null below MIN_GROUP", () => {
    expect(stats.districts.map((d) => d.area)).toHaveLength(12);
    expect(district("brandenburg")).toBeUndefined();
    expect(district("elsewhere")).toBeUndefined();
    expect(district("spandau")).toMatchObject({ name: "Spandau", value: null, typical: null });
    expect(district("mitte")).toMatchObject({ name: "Mitte", value: 70 });
    expect(district("mitte")?.typical?.slug).toMatch(/^hs-a-/);
    expect(district("neukoelln")?.name).toBe("Neukölln");
    expect(district("pankow")?.value).toBeNull();
  });

  it("merges u20 and 20-29 into u30 and keeps words below MIN_WORD_VOTES out", () => {
    const all = [...stats.ageLists.dying, ...stats.ageLists.growing];
    const b = all.find((w) => w.word.slug.startsWith("hs-b-"));
    expect(b?.byGroup).toEqual({ u30: 100, "30-49": null, "50-69": null, "70plus": 0 });
    expect(stats.ageLists.growing[0]?.word.slug).toMatch(/^hs-b-/);
    expect(all.some((w) => w.word.slug.startsWith("hs-c-"))).toBe(false);
    expect(all.some((w) => w.word.slug.startsWith("hs-d-"))).toBe(false);
    expect(stats.ageLists.dying.length).toBeLessThanOrEqual(4);
  });

  it("counts today's finished BON rounds and the most wrongly answered card", () => {
    expect(stats.bon.roundsToday).toBe(1);
    expect(stats.bon.steps[0]).toEqual({ from: 0, mult: 1 });
    expect(stats.bon.card).toEqual({ word: "Quatschwort", wrongShare: 75 });
  });

  it("returns only aggregates: no ids, visitors or timestamps", () => {
    expect(Object.keys(stats).sort()).toEqual([
      "ageLists",
      "bon",
      "districts",
      "popular",
      "rising",
    ]);
    const keys: string[] = [];
    const walk = (v: unknown) => {
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === "object")
        for (const [k, x] of Object.entries(v)) {
          keys.push(k);
          walk(x);
        }
    };
    walk(stats);
    const banned = keys.filter((k) => /^(id|visitor|createdAt|updatedAt|finishedAt)$|Id$/.test(k));
    expect(banned).toEqual([]);
  });
});
