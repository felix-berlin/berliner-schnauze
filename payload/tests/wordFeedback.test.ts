import type { Payload } from "payload";

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { Words } from "../src/collections/Words";
import {
  AREAS,
  AREA_LOCALITIES,
  feedbackCompare,
  feedbackTotals,
  LOCALITIES,
  LOCALITY_AREA,
} from "../src/lib/wordFeedback";
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
    expect(await feedbackTotals(payload, wordId)).toEqual({
      like: 2,
      dislike: 2,
      say: 3,
      know: 1,
      never: 0,
    });
  });

  it("compares groups, hides small ones", async () => {
    await rows(7, { half: "east", usage: "say" });
    await rows(3, { half: "east", usage: "know" });
    await rows(9, { half: "west", usage: "say" });
    await rows(5, { half: "both" });
    expect(await feedbackCompare(payload, wordId, null)).toEqual({
      east: 70,
      west: null,
      moved: null,
      area: null,
      locality: null,
    });
  });

  it("ignores rows without usage and groups moved and area", async () => {
    await rows(10, { half: "east" });
    await rows(4, { origin: "movedOver10", area: "pankow", usage: "say" });
    await rows(6, { origin: "movedUnder10", area: "pankow", usage: "never" });
    const c = await feedbackCompare(payload, wordId, "pankow");
    expect(c).toEqual({ east: null, west: null, moved: 40, area: 40, locality: null });
  });

  it("compares the visitor's own Locality, hidden below the minimum", async () => {
    await rows(8, { area: "pankow", locality: "prenzlauer-berg", usage: "say" });
    await rows(2, { area: "pankow", locality: "prenzlauer-berg", usage: "never" });
    await rows(9, { area: "pankow", locality: "weissensee", usage: "say" });
    expect((await feedbackCompare(payload, wordId, "pankow", "prenzlauer-berg")).locality).toBe(80);
    const small = await feedbackCompare(payload, wordId, "pankow", "weissensee");
    expect(small).toMatchObject({ area: 89, locality: null });
    expect((await feedbackCompare(payload, wordId, "pankow")).locality).toBeNull();
  });

  it("stores the Locality and rejects an unknown one", async () => {
    const doc = await row({ area: "mitte", locality: "moabit" });
    expect(doc.locality).toBe("moabit");
    await expect(row({ locality: "wedding-tiergarten" })).rejects.toThrow();
  });

  it("rejects a second row per word and visitor", async () => {
    await row({ visitor: "same" });
    // Payload turns Postgres 23505 into a ValidationError naming the index columns.
    const err = (await row({ visitor: "same" }).catch((e: unknown) => e)) as {
      data: { errors: { path: string }[] };
      name: string;
    };
    expect(err.name).toBe("ValidationError");
    // The site's isUniqueViolation reads this path.
    expect(err.data.errors[0].path).toBe("word_id, visitor");
  });

  it("deleting a word takes its feedback along", async () => {
    const w = await payload.create({
      collection: "words",
      data: { berlinerisch: "Loeschtest", slug: "feedback-delete-wort", _status: "published" },
    });
    await payload.create({
      collection: "word-feedback",
      data: { word: w.id, visitor: "del", usage: "say" },
    });
    await payload.delete({ collection: "words", id: w.id });
    const left = await payload.count({
      collection: "word-feedback",
      where: { visitor: { equals: "del" } },
    });
    expect(left.totalDocs).toBe(0);
  });
});

describe("boroughs and localities data", () => {
  it("maps every locality to a known area, with unique keys", () => {
    // Boroughs plus the two answers that have no localities (brandenburg, elsewhere).
    expect(AREAS).toHaveLength(Object.keys(AREA_LOCALITIES).length + 2);
    for (const area of Object.keys(AREA_LOCALITIES)) expect(AREAS).toContain(area);
    expect(new Set(LOCALITIES).size).toBe(LOCALITIES.length);
    for (const k of LOCALITIES) {
      expect(k).toMatch(/^[a-z]+(-[a-z]+)*$/);
      expect(AREAS).toContain(LOCALITY_AREA[k]);
    }
    expect(AREAS).not.toContain("kreuzberg");
    expect(LOCALITY_AREA["maerkisches-viertel"]).toBe("reinickendorf");
    expect(LOCALITY_AREA["stadtrandsiedlung-malchow"]).toBe("pankow");
    expect(LOCALITY_AREA.malchow).toBe("lichtenberg");
  });
});

describe("word sidebar counts", () => {
  it("is a ui field and stores nothing on the word", async () => {
    const f = Words.fields.find((x) => "name" in x && x.name === "feedbackCounts");
    expect(f?.type).toBe("ui");
    const versions = () =>
      payload.countVersions({ collection: "words", where: { parent: { equals: wordId } } });
    const before = (await versions()).totalDocs;
    await row({ reaction: "like", usage: "say" });
    expect((await versions()).totalDocs).toBe(before);
    const word = await payload.findByID({ collection: "words", id: wordId });
    expect(word).not.toHaveProperty("feedbackCounts");
  });
});
