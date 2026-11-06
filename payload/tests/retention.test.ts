import type { Payload } from "payload";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { runRetention } from "../src/jobs/retention";
import { getTestPayload } from "./helpers/payload";

let payload: Payload;
let wordId: number;
const later = new Date(Date.now() + 200 * 86_400_000);

beforeAll(async () => {
  payload = await getTestPayload();
  const w = await payload.create({
    collection: "words",
    data: { berlinerisch: "Aufbewahrungstest", slug: "retention-test-wort", _status: "published" },
  });
  wordId = w.id;
}, 60_000);

afterAll(async () => {
  await payload.delete({ collection: "comments", where: { word: { equals: wordId } } });
  await payload.delete({
    collection: "suggestions",
    where: { berlinerWord: { equals: "Aufbewahrungstest" } },
  });
  await payload.delete({ collection: "words", where: { id: { equals: wordId } } });
});

const suggest = (status: string, extra = {}) =>
  payload.create({
    collection: "suggestions",
    data: {
      berlinerWord: "Aufbewahrungstest",
      translation: "x",
      userName: "Icke",
      userMail: "a@b.de",
      status,
      ...extra,
    } as never,
  });

describe("runRetention", () => {
  it("clears name and mail of finished suggestions, even when locked, and keeps open ones", async () => {
    const done = await suggest("rejected");
    const open = await suggest("new");
    await runRetention(payload, later);
    const d = await payload.findByID({
      collection: "suggestions",
      id: done.id,
      overrideAccess: true,
    });
    const o = await payload.findByID({
      collection: "suggestions",
      id: open.id,
      overrideAccess: true,
    });
    expect(d.userMail ?? null).toBeNull();
    expect(d.userName ?? null).toBeNull();
    expect(d.translation).toBe("x");
    expect(o.userMail).toBe("a@b.de");
  });

  it("clears never-handled suggestions only after a year", async () => {
    const open = await suggest("new");
    await runRetention(payload, later);
    expect((await payload.findByID({ collection: "suggestions", id: open.id })).userMail).toBe(
      "a@b.de",
    );
    await runRetention(payload, new Date(Date.now() + 400 * 86_400_000));
    expect(
      (await payload.findByID({ collection: "suggestions", id: open.id })).userMail ?? null,
    ).toBeNull();
  });

  it("deletes held comments and drops votes of a self-deleted comment that has replies", async () => {
    const make = (data: Record<string, unknown>) =>
      payload.create({
        collection: "comments",
        data: { word: wordId, text: "kiek ma", authorName: "Icke", ...data } as never,
      });
    const held = await make({});
    const gone = await make({});
    await make({ parent: gone.id });
    await payload.update({ collection: "comments", id: held.id, data: { status: "pending" } });
    await payload.update({
      collection: "comments",
      id: gone.id,
      data: { status: "deleted", text: "[gelöscht]" },
    });
    await payload.create({
      collection: "comment-votes",
      data: { comment: gone.id, visitor: "v", value: 1 } as never,
    });
    await runRetention(payload, later);
    expect(
      (await payload.find({ collection: "comments", where: { id: { equals: held.id } } }))
        .totalDocs,
    ).toBe(0);
    expect(
      (await payload.find({ collection: "comment-votes", where: { comment: { equals: gone.id } } }))
        .totalDocs,
    ).toBe(0);
    expect((await payload.findByID({ collection: "comments", id: gone.id })).status).toBe(
      "deleted",
    );
  });

  it("keeps recent finished suggestions", async () => {
    const done = await suggest("rejected");
    await runRetention(payload);
    expect((await payload.findByID({ collection: "suggestions", id: done.id })).userMail).toBe(
      "a@b.de",
    );
  });

  it("deletes a removed comment, but only blanks one that has replies", async () => {
    const make = (data: Record<string, unknown>) =>
      payload.create({
        collection: "comments",
        data: { word: wordId, text: "kiek ma", authorName: "Icke", ...data } as never,
      });
    const lone = await make({});
    const parent = await make({});
    const reply = await make({ parent: parent.id });
    const live = await make({});
    for (const c of [lone, parent])
      await payload.update({ collection: "comments", id: c.id, data: { status: "removed" } });
    await runRetention(payload, later);
    expect(
      (await payload.find({ collection: "comments", where: { id: { equals: lone.id } } }))
        .totalDocs,
    ).toBe(0);
    const p = await payload.findByID({ collection: "comments", id: parent.id });
    expect(p).toMatchObject({ status: "deleted", text: "[gelöscht]" });
    expect(p.authorName ?? null).toBeNull();
    expect((await payload.findByID({ collection: "comments", id: reply.id })).text).toBe("kiek ma");
    expect((await payload.findByID({ collection: "comments", id: live.id })).text).toBe("kiek ma");
  });
});
