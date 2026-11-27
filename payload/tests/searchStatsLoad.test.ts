import type { Payload } from "payload";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { loadSearchStats } from "../src/lib/searchStatsLoad";
import { getTestPayload } from "./helpers/payload";

// All data invented: test words "ss-…", visitors "ss-v…".
let payload: Payload;
let n = 0;
const wordIds: number[] = [];

const word = async (slug: string) => {
  const doc = await payload.create({
    collection: "words",
    data: { berlinerisch: slug.toUpperCase(), slug, _status: "published" },
  });
  wordIds.push(doc.id);
  return doc.id;
};

const votes = (wordId: number, count: number, data: Record<string, unknown>) =>
  Promise.all(
    Array.from({ length: count }, () =>
      payload.create({
        collection: "word-feedback",
        data: { word: wordId, visitor: `ss-v${n++}`, ...data } as never,
      }),
    ),
  );

const comment = (wordId: number, data: Record<string, unknown> = {}) =>
  // db.create skips the hooks, which would reset the status of a comment without an editor.
  payload.db.create({
    collection: "comments",
    data: { word: wordId, text: "Ick sare ma so.", status: "published", ...data } as never,
  });

let a: number;
let b: number;
let c: number;

beforeAll(async () => {
  payload = await getTestPayload();
  await payload.db.deleteMany({ collection: "word-feedback", where: {} });
  const t = Date.now();
  [a, b, c] = [await word(`ss-a-${t}`), await word(`ss-b-${t}`), await word(`ss-c-${t}`)];

  await votes(a, 9, { usage: "say", half: "east", area: "mitte", age: "u20" });

  // b: exactly 10 answers; the east half has 10 rows only if all of them are east.
  await votes(b, 6, { usage: "say", half: "east", area: "mitte", age: "u20" });
  await votes(b, 4, { usage: "never", half: "east", area: "pankow", age: "20-29" });

  // c: 25 rows; west has 5, both 5, no half 5; ages: u30 = 10 (5 + 5), 70plus = 5; a row without usage is ignored.
  await votes(c, 10, { usage: "say", half: "east", area: "mitte", age: "u20" });
  await votes(c, 5, { usage: "never", half: "west", area: "mitte", age: "20-29" });
  await votes(c, 5, { usage: "know", half: "both", area: "pankow", age: "70-79" });
  await votes(c, 5, { usage: "say", area: "pankow" });
  await votes(c, 4, { reaction: "like", half: "west" });

  await comment(b);
  await comment(b);
  await comment(b, { status: "pending" });
  const parent = await comment(c);
  await comment(c, { parent: parent.id });
});

afterAll(async () => {
  await payload.db.deleteMany({ collection: "word-feedback", where: {} });
  await payload.delete({ collection: "comments", where: { word: { in: wordIds } } });
  await payload.delete({ collection: "words", where: { id: { in: wordIds } } });
});

describe("loadSearchStats", () => {
  it("leaves usage off below 10 answers", async () => {
    expect((await loadSearchStats(payload)).get(a)?.usage).toBeUndefined();
  });

  it("computes the share at exactly 10 answers, halves only with >= 10 rows", async () => {
    const u = (await loadSearchStats(payload)).get(b)?.usage;
    expect(u).toMatchObject({ say: 0.6, votes: 10, east: 0.6 });
    expect(u?.west).toBeUndefined();
    expect(u?.areas).toBeUndefined(); // mitte 6 rows, pankow 4
  });

  it("merges ages into groups and drops groups under 10", async () => {
    const u = (await loadSearchStats(payload)).get(c)?.usage;
    expect(u).toMatchObject({ say: 15 / 25, votes: 25, east: 1 });
    expect(u?.west).toBeUndefined();
    expect(u?.areas?.mitte).toEqual({ say: 10 / 15, votes: 15 });
    expect(u?.areas?.pankow).toEqual({ say: 0.5, votes: 10 });
    expect(u?.ages).toEqual({ u30: { say: 10 / 15, votes: 15 } });
  });

  it("counts published top-level stories only", async () => {
    const stats = await loadSearchStats(payload);
    expect(stats.get(b)?.stories).toBe(2);
    expect(stats.get(c)?.stories).toBe(1);
    expect(stats.get(a)?.stories ?? 0).toBe(0);
  });
});
