import type { Payload } from "payload";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getTestPayload } from "./helpers/payload";

let payload: Payload;
const slug = "trash-test-wort";

const cleanup = async () => {
  await payload.delete({
    collection: "words",
    trash: true,
    where: { slug: { equals: slug } },
  });
};

beforeAll(async () => {
  payload = await getTestPayload();
  await cleanup();
}, 60_000);

afterAll(cleanup);

describe("words trash", () => {
  it("hides a trashed word, keeps its comments and stats, and a permanent delete removes them", async () => {
    const word = await payload.create({
      collection: "words",
      data: { berlinerisch: "Mülleimer", slug, _status: "published" },
    });
    await payload.create({
      collection: "comments",
      data: { word: word.id, text: "kiek ma", authorName: "Icke" } as never,
    });
    await payload.create({
      collection: "word-stats",
      data: { word: word.id, day: "2026-01-01", views: 3, audio: 0, shares: 0, clicks: 0 },
    });

    const report = await payload.create({
      collection: "reports",
      data: { word: word.id, kind: "other", text: "stimmt nich" },
    });
    await payload.update({
      collection: "words",
      id: word.id,
      data: { deletedAt: new Date().toISOString() },
    });

    const visible = await payload.find({ collection: "words", where: { slug: { equals: slug } } });
    expect(visible.totalDocs).toBe(0);
    const trashed = await payload.find({
      collection: "words",
      trash: true,
      where: { slug: { equals: slug }, deletedAt: { exists: true } },
    });
    expect(trashed.totalDocs).toBe(1);
    const count = (collection: "comments" | "word-stats") =>
      payload.count({ collection, where: { word: { equals: word.id } } });
    expect((await count("comments")).totalDocs).toBe(1);
    expect((await count("word-stats")).totalDocs).toBe(1);

    await payload.delete({ collection: "words", id: word.id, trash: true });
    expect((await count("comments")).totalDocs).toBe(0);
    expect((await count("word-stats")).totalDocs).toBe(0);
    expect(
      (await payload.count({ collection: "reports", where: { id: { equals: report.id } } }))
        .totalDocs,
    ).toBe(0);
  });
});
