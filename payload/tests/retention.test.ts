import type { Payload } from "payload";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { retentionTask, runRetention } from "../src/jobs/retention";
import { getTestPayload } from "./helpers/payload";

let payload: Payload;
let wordId: number;
const later = new Date(Date.now() + 200 * 86_400_000);

beforeAll(async () => {
  payload = await getTestPayload();
  // A crashed earlier run may have left its word behind (unique slug).
  await payload.delete({ collection: "words", where: { slug: { equals: "retention-test-wort" } } });
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

describe("runRetention edge cases", () => {
  const make = (data: Record<string, unknown>) =>
    payload.create({
      collection: "comments",
      data: { word: wordId, text: "kiek ma", authorName: "Icke", ...data } as never,
    });
  const days = (n: number) => new Date(Date.now() + n * 86_400_000);

  it("separates the 90 and 365 day periods and clears accepted suggestions too", async () => {
    // Accepting through the API would adopt the word (hook); set the status behind its back.
    const accepted = await suggest("rejected");
    await payload.db.updateOne({
      collection: "suggestions",
      id: accepted.id,
      data: { status: "accepted" },
    });
    const open = await suggest("new");
    await runRetention(payload, days(100));
    const a = await payload.findByID({ collection: "suggestions", id: accepted.id });
    const o = await payload.findByID({ collection: "suggestions", id: open.id });
    expect(a.userMail ?? null).toBeNull();
    expect(o.userMail).toBe("a@b.de");
    await runRetention(payload, days(80));
    const fresh = await suggest("rejected");
    await runRetention(payload, days(80));
    expect((await payload.findByID({ collection: "suggestions", id: fresh.id })).userMail).toBe(
      "a@b.de",
    );
  });

  it("keeps an old published comment", async () => {
    const live = await make({});
    await runRetention(payload, days(400));
    expect((await payload.findByID({ collection: "comments", id: live.id })).text).toBe("kiek ma");
  });

  it("blanks a parent with replies completely and drops its votes and reports", async () => {
    const parent = await make({ pseudonym: "Hans", editKeyHash: "k", authorTag: "t" });
    await make({ parent: parent.id });
    await payload.update({
      collection: "comments",
      id: parent.id,
      data: { status: "removed", removalReason: "spam" },
    });
    await payload.create({
      collection: "comment-votes",
      data: { comment: parent.id, visitor: "v", value: 1 } as never,
    });
    await payload.create({
      collection: "comment-reports",
      data: { comment: parent.id, visitor: "v" } as never,
    });
    const result = await runRetention(payload, days(200));
    expect(result.commentsScrubbed).toBeGreaterThanOrEqual(1);
    const p = await payload.findByID({ collection: "comments", id: parent.id });
    for (const f of [
      "authorName",
      "pseudonym",
      "editKeyHash",
      "authorTag",
      "removalReason",
    ] as const)
      expect(p[f] ?? null).toBeNull();
    for (const collection of ["comment-votes", "comment-reports"] as const)
      expect(
        (await payload.find({ collection, where: { comment: { equals: parent.id } } })).totalDocs,
      ).toBe(0);
  });

  it("deletes a lone comment with its votes and counts the work", async () => {
    const lone = await make({});
    await payload.update({ collection: "comments", id: lone.id, data: { status: "hidden" } });
    await payload.create({
      collection: "comment-votes",
      data: { comment: lone.id, visitor: "v", value: 1 } as never,
    });
    const result = await runRetention(payload, days(200));
    expect(result.commentsDeleted).toBeGreaterThanOrEqual(1);
    expect(
      (await payload.find({ collection: "comment-votes", where: { comment: { equals: lone.id } } }))
        .totalDocs,
    ).toBe(0);
  });

  it("logs a failing comment, keeps going and fails the task at the end", async () => {
    const bad = await make({});
    const good = await make({});
    for (const c of [bad, good])
      await payload.update({ collection: "comments", id: c.id, data: { status: "removed" } });
    const del = payload.delete.bind(payload);
    const spy = vi
      .spyOn(payload, "delete")
      .mockImplementation(((args: { id?: number }) =>
        args.id === bad.id ? Promise.reject(new Error("boom")) : del(args as never)) as never);
    const logged = vi.spyOn(payload.logger, "error").mockImplementation(() => undefined);
    try {
      const result = await runRetention(payload, days(200));
      expect(result.commentsFailed).toBeGreaterThanOrEqual(1);
      expect(logged).toHaveBeenCalledWith(expect.objectContaining({ commentId: bad.id }));
      const handler = retentionTask.handler as (args: never) => Promise<unknown>;
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(days(200));
      try {
        await expect(handler({ req: { payload } } as never)).rejects.toThrow(/not purged/);
      } finally {
        vi.useRealTimers();
      }
    } finally {
      spy.mockRestore();
      logged.mockRestore();
    }
    expect(
      (await payload.find({ collection: "comments", where: { id: { equals: good.id } } }))
        .totalDocs,
    ).toBe(0);
  });
});
