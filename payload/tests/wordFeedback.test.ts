import type { Payload } from "payload";

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { Words } from "../src/collections/Words";
import { feedbackCompare, feedbackTotals } from "../src/lib/wordFeedback";
import { getTestPayload } from "./helpers/payload";

let payload: Payload;
let wordId: number;
let n = 0;
const row = (data: Record<string, unknown>) =>
  payload.create({
    collection: "word-feedback",
    data: { word: wordId, visitor: `v${n++}`, ...data } as never,
  });
const rows = (count: number, data: Record<string, unknown>) =>
  Promise.all(Array.from({ length: count }, () => row(data)));

beforeAll(async () => {
  payload = await getTestPayload();
  await payload.delete({ collection: "words", where: { slug: { equals: "feedback-test-wort" } } });
  const w = await payload.create({
    collection: "words",
    data: { berlinerisch: "Feedbacktest", slug: "feedback-test-wort", _status: "published" },
  });
  wordId = w.id;
}, 60_000);

afterEach(async () => {
  await payload.delete({ collection: "word-feedback", where: { word: { equals: wordId } } });
});

afterAll(async () => {
  await payload.delete({ collection: "words", where: { id: { equals: wordId } } });
});

describe("word-feedback", () => {
  it("counts totals", async () => {
    await row({ reaction: "like", usage: "say" });
    await row({ reaction: "like", usage: "say" });
    await row({ reaction: "dislike", usage: "say" });
    await row({ usage: "know" });
    await row({ reaction: "dislike" });
    expect(await feedbackTotals(payload, wordId)).toEqual({ like: 2, dislike: 2, say: 3, know: 1, never: 0 });
  });

  it("compares groups, hides small ones", async () => {
    await rows(7, { half: "east", usage: "say" });
    await rows(3, { half: "east", usage: "know" });
    await rows(9, { half: "west", usage: "say" });
    await rows(5, { half: "both" });
    expect(await feedbackCompare(payload, wordId, null)).toEqual({ east: 70, west: null, moved: null, area: null });
  });

  it("ignores rows without usage and groups moved and area", async () => {
    await rows(10, { half: "east" });
    await rows(4, { origin: "movedOver10", area: "pankow", usage: "say" });
    await rows(6, { origin: "movedUnder10", area: "pankow", usage: "never" });
    const c = await feedbackCompare(payload, wordId, "pankow");
    expect(c).toEqual({ east: null, west: null, moved: 40, area: 40 });
  });

  it("rejects a second row per word and visitor", async () => {
    await row({ visitor: "same" });
    // Payload turns Postgres 23505 into a ValidationError naming the index columns.
    const err = (await row({ visitor: "same" }).catch((e: unknown) => e)) as Error;
    expect(err.name).toBe("ValidationError");
    expect(err.message).toMatch(/word_id, visitor/);
  });
});

describe("word sidebar counts", () => {
  it("is a ui field and stores nothing on the word", async () => {
    const f = Words.fields.find((x) => "name" in x && x.name === "feedbackCounts");
    expect(f?.type).toBe("ui");
    const versions = () => payload.countVersions({ collection: "words", where: { parent: { equals: wordId } } });
    const before = (await versions()).totalDocs;
    await row({ reaction: "like", usage: "say" });
    expect((await versions()).totalDocs).toBe(before);
    const word = await payload.findByID({ collection: "words", id: wordId });
    expect(word).not.toHaveProperty("feedbackCounts");
  });
});
