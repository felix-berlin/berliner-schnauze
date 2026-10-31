import type { Payload } from "payload";

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { getTestPayload } from "./helpers/payload";

const slugs = ["comments-test-wort", "comments-test-andere"];
let payload: Payload;
let wordId: number;
let otherWordId: number;

const editor = { id: 1, collection: "users", email: "editor@test.local" } as never;
const mails = () => (process.env.SUGGEST_MAIL_TO = "redaktion@example.com") && vi.spyOn(payload, "sendEmail").mockResolvedValue(undefined);
const make = (data: Record<string, unknown> = {}, wId = wordId) =>
  payload.create({ collection: "comments", data: { word: wId, text: "kiek ma", authorName: "Icke", ...data } as never });

beforeAll(async () => {
  payload = await getTestPayload();
  const old = await payload.find({ collection: "words", where: { slug: { in: slugs } }, pagination: false, depth: 0, draft: true });
  await payload.delete({ collection: "comments", where: { word: { in: old.docs.map((d) => d.id) } } });
  await payload.delete({ collection: "words", where: { slug: { in: ["comments-test-wort", "comments-test-andere"] } } });
  const w = await payload.create({ collection: "words", data: { berlinerisch: "Kommentartest", slug: "comments-test-wort", _status: "published" } });
  const o = await payload.create({ collection: "words", data: { berlinerisch: "Kommentartest2", slug: "comments-test-andere", _status: "published" } });
  wordId = w.id;
  otherWordId = o.id;
}, 60_000);

afterEach(async () => {
  vi.restoreAllMocks();
  delete process.env.SUGGEST_MAIL_TO;
  await payload.delete({ collection: "comments", where: { word: { in: [wordId, otherWordId] } } });
});

afterAll(async () => {
  await payload.delete({ collection: "words", where: { id: { in: [wordId, otherWordId] } } });
});

describe("comments", () => {
  it("creates published comment and mails", async () => {
    const send = mails();
    const c = await make();
    expect(c.status).toBe("published");
    expect(send).toHaveBeenCalledOnce();
    const mail = send.mock.calls[0]![0] as { text: string };
    expect(mail.text).toContain(`/admin/collections/comments/${c.id}`);
  });

  it("holds a comment with a link", async () => {
    const send = mails();
    const c = await make({ text: "kiek ma www.spam.de" });
    expect(c.status).toBe("pending");
    expect((send.mock.calls[0]![0] as { subject: string }).subject).toContain("wartet auf Freigabe");
  });

  it("re-parents a reply to a reply", async () => {
    mails();
    const a = await make();
    const b = await make({ parent: a.id });
    const c = await make({ parent: b.id });
    expect(typeof c.parent === "object" ? c.parent?.id : c.parent).toBe(a.id);
  });

  it("rejects a parent from another word", async () => {
    mails();
    const a = await make({}, otherWordId);
    await expect(make({ parent: a.id })).rejects.toThrow();
  });

  it("counts votes", async () => {
    mails();
    const c = await make();
    for (const [visitor, value] of [["v1", 1], ["v2", 1], ["v3", -1]] as const) {
      await payload.create({ collection: "comment-votes", data: { comment: c.id, visitor, value } });
    }
    const r = await payload.findByID({ collection: "comments", id: c.id });
    expect([r.upvotes, r.downvotes, r.score]).toEqual([2, 1, 1]);
  });

  it("unique vote per visitor", async () => {
    mails();
    const c = await make();
    await payload.create({ collection: "comment-votes", data: { comment: c.id, visitor: "v1", value: 1 } });
    await expect(payload.create({ collection: "comment-votes", data: { comment: c.id, visitor: "v1", value: -1 } })).rejects.toThrow();
  });

  it("auto-hides at threshold", async () => {
    const send = mails();
    const c = await make();
    for (const v of ["r1", "r2", "r3"]) await payload.create({ collection: "comment-reports", data: { comment: c.id, visitor: v } });
    const r = await payload.findByID({ collection: "comments", id: c.id });
    expect(r.status).toBe("hidden");
    expect(r.reportCount).toBe(3);
    const subjects = send.mock.calls.map((x) => (x[0] as { subject: string }).subject);
    expect(subjects.some((s) => s.includes("automatisch ausgeblendet"))).toBe(true);
    expect(subjects.some((s) => s.includes("gemeldet"))).toBe(true);
  });

  it("release marks reviewed and stays visible", async () => {
    mails();
    const c = await make();
    for (const v of ["r1", "r2", "r3"]) await payload.create({ collection: "comment-reports", data: { comment: c.id, visitor: v } });
    const rel = await payload.update({ collection: "comments", id: c.id, data: { status: "published" }, user: editor });
    expect(rel.reviewed).toBe(true);
    await payload.create({ collection: "comment-reports", data: { comment: c.id, visitor: "r4" } });
    const r = await payload.findByID({ collection: "comments", id: c.id });
    expect(r.status).toBe("published");
    expect(r.reportCount).toBe(4);
  });

  it("editor update does not apply link hold", async () => {
    mails();
    const c = await make();
    const u = await payload.update({ collection: "comments", id: c.id, data: { text: "siehe www.spam.de" }, user: editor });
    expect(u.status).toBe("published");
  });

  it("deletes votes, reports and replies with the comment", async () => {
    mails();
    const c = await make();
    const reply = await make({ parent: c.id });
    await payload.create({ collection: "comment-votes", data: { comment: c.id, visitor: "v1", value: 1 } });
    await payload.create({ collection: "comment-reports", data: { comment: c.id, visitor: "r1" } });
    await payload.delete({ collection: "comments", id: c.id });
    expect((await payload.count({ collection: "comments", where: { id: { in: [c.id, reply.id] } } })).totalDocs).toBe(0);
    for (const collection of ["comment-votes", "comment-reports"] as const) {
      expect((await payload.count({ collection, where: { comment: { equals: c.id } } })).totalDocs).toBe(0);
    }
  });
});
