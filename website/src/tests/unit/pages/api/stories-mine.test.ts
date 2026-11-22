import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { find } = vi.hoisted(() => ({ find: vi.fn() }));
vi.mock("@services/payload.ts", () => ({
  getPayloadClient: async () => ({ find }),
  siteRead: () => ({ context: { siteRead: "published" }, overrideAccess: false }),
}));

import type { APIContext } from "astro";

import { voterKey } from "@services/payload/comments.ts";

import { GET } from "@/pages/api/stories/mine.ts";

const get = (qs: string, visitor?: string) =>
  GET({
    cookies: { get: () => (visitor ? { value: visitor } : undefined) },
    url: new URL(`https://berliner-schnauze.wtf/api/stories/mine${qs}`),
  } as unknown as APIContext);

// Invented rows: visitor "me" voted on story 11 (+1) and 12 (-1); "other" voted on 11 (-1).
const votes = [
  { comment: 11, value: 1, visitor: voterKey("me") },
  { comment: 12, value: -1, visitor: voterKey("me") },
  { comment: 11, value: -1, visitor: voterKey("other") },
];

// Invented comment rows of word 5: visitor "me" has an open one (21) and a published one; "other" has an open one.
const tagOf = (visitor: string) =>
  createHash("sha256").update(`${visitor}:5`).digest("hex").slice(0, 16);
const own = { createdAt: "2026-11-20T10:00:00.000Z", id: 21, text: "Meine offene Jeschichte" };
const pendingRows = [
  { ...own, authorTag: tagOf("me") },
  { authorTag: tagOf("other"), createdAt: "2026-11-21T10:00:00.000Z", id: 22, text: "Fremde" },
];

beforeEach(() => {
  find.mockReset().mockImplementation(async ({ collection, where }) => {
    if (collection === "words") return { docs: [{ id: 5 }] };
    if (collection === "comments" && where.status.equals === "pending")
      return { docs: pendingRows.filter((r) => r.authorTag === where.authorTag.equals) };
    if (collection === "comments") return { docs: [{ id: 11 }, { id: 12 }] };
    const wanted = where.visitor.equals;
    return { docs: votes.filter((v) => v.visitor === wanted) };
  });
});

describe("GET /api/stories/mine", () => {
  it("400 without a word", async () => {
    expect((await get("")).status).toBe(400);
  });

  it("404 for an unknown word", async () => {
    find.mockResolvedValue({ docs: [] });
    expect((await get("?word=nix", "me")).status).toBe(404);
  });

  it("returns only the own reactions, uncached", async () => {
    const res = await get("?word=icke", "me");
    expect(await res.json()).toEqual({ pending: [own], reactions: { "11": 1, "12": -1 } });
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("does not return another visitor's vote", async () => {
    expect(await (await get("?word=icke", "nobody")).json()).toEqual({
      pending: [],
      reactions: {},
    });
  });

  it("is empty without a cookie and asks only published top-level comments of the word", async () => {
    expect(await (await get("?word=icke")).json()).toEqual({ pending: [], reactions: {} });
    expect(find.mock.calls.filter((c) => c[0].collection === "comments")).toHaveLength(0);
    await get("?word=icke", "me");
    const q = find.mock.calls
      .map((c) => c[0])
      .find((a) => a.collection === "comments" && a.where.status.equals === "published");
    expect(q.where).toMatchObject({
      parent: { exists: false },
      status: { equals: "published" },
      word: { equals: 5 },
    });
    const v = find.mock.calls.map((c) => c[0]).find((a) => a.collection === "comment-votes");
    expect(v.where.comment).toEqual({ in: [11, 12] });
  });

  it("returns the own open Jeschichten of the word, uncached, without identity fields", async () => {
    const res = await get("?word=icke", "me");
    const body = await res.json();
    expect(body.pending).toEqual([own]);
    expect(Object.keys(body.pending[0]).sort()).toEqual(["createdAt", "id", "text"]);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("does not return another visitor's open Jeschichte", async () => {
    expect(
      (await (await get("?word=icke", "other")).json()).pending.map((p: { id: number }) => p.id),
    ).toEqual([22]);
    expect((await (await get("?word=icke", "nobody")).json()).pending).toEqual([]);
  });

  it("asks only pending top-level comments of this word with the per-word tag", async () => {
    await get("?word=icke", "me");
    const q = find.mock.calls
      .map((c) => c[0])
      .find((a) => a.collection === "comments" && a.where.status.equals === "pending");
    expect(q.where).toMatchObject({
      authorTag: { equals: tagOf("me") },
      parent: { exists: false },
      word: { equals: 5 },
    });
    expect(q.sort).toBe("-createdAt");
  });

  it("still returns the open ones when the word has no published Jeschichten", async () => {
    find.mockImplementation(async ({ collection, where }) =>
      collection === "words"
        ? { docs: [{ id: 5 }] }
        : { docs: where.status?.equals === "pending" ? [own] : [] },
    );
    expect(await (await get("?word=icke", "me")).json()).toEqual({ pending: [own], reactions: {} });
  });

  it("502 and a log line without the error message when the read fails", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    find.mockRejectedValue(new Error("select ... 'secret-value'"));
    const res = await get("?word=icke", "me");
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "Deine Reaktionen konnten nicht geladen werden." });
    expect(log).toHaveBeenCalledWith("[stories] failed: Error");
    expect(JSON.stringify(log.mock.calls)).not.toContain("secret-value");
  });
});
