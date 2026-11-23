import type { Payload } from "payload";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { up } from "../src/migrations/20261123_191000_remove_comment_replies";
import { getTestPayload } from "./helpers/payload";

let payload: Payload;
let wordId: number;

beforeAll(async () => {
  payload = await getTestPayload();
  await payload.delete({
    collection: "words",
    where: { slug: { equals: "replies-migration-wort" } },
  });
  wordId = (
    await payload.create({
      collection: "words",
      data: { berlinerisch: "Antworttest", slug: "replies-migration-wort", _status: "published" },
    })
  ).id;
}, 60_000);

afterAll(async () => {
  await payload.delete({ collection: "comments", where: { word: { equals: wordId } } });
  await payload.delete({ collection: "words", where: { id: { equals: wordId } } });
});

describe("remove_comment_replies migration", () => {
  it("deletes the replies with their votes and reports and keeps the top-level comments", async () => {
    const make = (data: Record<string, unknown> = {}) =>
      payload.create({
        collection: "comments",
        data: { word: wordId, text: "kiek ma", authorName: "Icke", ...data } as never,
      });
    const top = await make();
    const reply = await make({ parent: top.id });
    await payload.create({
      collection: "comment-votes",
      data: { comment: reply.id, visitor: "v1", value: 1 },
    });
    await payload.create({
      collection: "comment-reports",
      data: { comment: reply.id, visitor: "r1" },
    });

    await up({ payload } as never);

    const left = await payload.find({
      collection: "comments",
      depth: 0,
      overrideAccess: true,
      where: { id: { in: [top.id, reply.id] } },
    });
    expect(left.docs.map((c) => c.id)).toEqual([top.id]);
    for (const collection of ["comment-votes", "comment-reports"] as const) {
      expect(
        (await payload.count({ collection, where: { comment: { equals: reply.id } } })).totalDocs,
      ).toBe(0);
    }
    // A second run finds nothing and does not fail.
    await expect(up({ payload } as never)).resolves.toBeUndefined();
  });
});
