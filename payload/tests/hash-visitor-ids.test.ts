import type { Payload } from "payload";

import { createHash } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { up } from "../src/migrations/20261106_150000_hash_visitor_ids";
import { getTestPayload } from "./helpers/payload";

let payload: Payload;
let wordId: number;
let commentId: number;
const hash = (v: string) => createHash("sha256").update(`votes:${v}`).digest("hex");

beforeAll(async () => {
  payload = await getTestPayload();
  await payload.delete({ collection: "words", where: { slug: { equals: "hash-visitor-wort" } } });
  wordId = (
    await payload.create({
      collection: "words",
      data: { berlinerisch: "Hashtest", slug: "hash-visitor-wort", _status: "published" },
    })
  ).id;
  commentId = (
    await payload.create({
      collection: "comments",
      data: { word: wordId, text: "kiek ma", authorName: "Icke" } as never,
    })
  ).id;
}, 60_000);

afterAll(async () => {
  await payload.delete({ collection: "comments", where: { word: { equals: wordId } } });
  await payload.delete({ collection: "words", where: { id: { equals: wordId } } });
});

describe("hash_visitor_ids migration", () => {
  it("hashes raw ids exactly like voterKey and leaves hashes alone on a second run", async () => {
    const raw = "11111111-2222-3333-4444-555555555555";
    await payload.create({
      collection: "comment-votes",
      data: { comment: commentId, visitor: raw, value: 1 } as never,
    });
    await payload.create({
      collection: "comment-reports",
      data: { comment: commentId, visitor: raw } as never,
    });
    const args = { db: payload.db.drizzle, payload } as never;
    await up(args);
    await up(args);
    for (const collection of ["comment-votes", "comment-reports"] as const) {
      const { docs } = await payload.find({
        collection,
        where: { comment: { equals: commentId } },
      });
      expect(docs.map((d) => d.visitor)).toEqual([hash(raw)]);
    }
  });
});
