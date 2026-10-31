import { beforeEach, describe, expect, it, vi } from "vitest";

const { find, findByID } = vi.hoisted(() => ({ find: vi.fn(), findByID: vi.fn() }));
vi.mock("@services/payload.ts", () => ({
  getPayloadClient: async () => ({ find, findByID }),
  siteRead: () => ({ context: { siteRead: "published" }, overrideAccess: false }),
}));

import type { APIContext } from "astro";

import { GET } from "@/pages/api/comments/[id].ts";

const cookies = { get: () => undefined, set: vi.fn() };
const get = (id: string) => GET({ cookies, params: { id } } as unknown as APIContext);
const stored = (extra: Record<string, unknown> = {}) => ({
  createdAt: "2026-01-01T00:00:00.000Z",
  editKeyHash: "secret-hash",
  id: 9,
  parent: null,
  status: "published",
  text: "Ditt stimmt",
  word: 5,
  ...extra,
});
const missing = Object.assign(new Error("Not Found"), { status: 404 });

beforeEach(() => {
  const docs: Record<string, Record<number, unknown>> = {
    comments: { 10: stored({ id: 10, parent: 9, text: "Antwort" }), 9: stored() },
    words: { 5: { id: 5 } },
  };
  findByID.mockReset().mockImplementation(async ({ collection, id }) => {
    const doc = docs[collection]?.[id];
    if (!doc) throw missing;
    return doc;
  });
  find.mockReset().mockResolvedValue({ docs: [] });
});

describe("GET /api/comments/[id]", () => {
  it("returns the thread with its replies, without the edit key hash", async () => {
    find.mockResolvedValueOnce({ docs: [stored({ id: 10, parent: 9, text: "Antwort" })] });
    const res = await get("9");
    expect(res.status).toBe(200);
    const { comment } = await res.json();
    expect(comment).toMatchObject({ id: 9, state: "visible", text: "Ditt stimmt" });
    expect(comment.replies.map((r: { id: number }) => r.id)).toEqual([10]);
    expect(JSON.stringify(comment)).not.toContain("secret-hash");
  });

  it("resolves a reply id to its parent's thread", async () => {
    find.mockResolvedValueOnce({ docs: [stored({ id: 10, parent: 9 })] });
    expect((await (await get("10")).json()).comment.id).toBe(9);
  });

  it("404 for a pending comment, a pending reply and an unknown id", async () => {
    findByID.mockImplementation(async ({ collection, id }) => {
      if (collection === "words") return { id: 5 };
      if (id === 11) return stored({ id: 11, status: "pending" });
      if (id === 12) return stored({ id: 12, parent: 9, status: "pending" });
      if (id === 9) return stored();
      throw missing;
    });
    for (const id of ["11", "12", "99"]) expect((await get(id)).status).toBe(404);
  });

  it("404 for a placeholder without visible replies, 200 with one", async () => {
    findByID.mockImplementation(async ({ collection }) =>
      collection === "words" ? { id: 5 } : stored({ status: "removed" }),
    );
    expect((await get("9")).status).toBe(404);
    find.mockResolvedValueOnce({ docs: [stored({ id: 10, parent: 9 })] });
    const { comment } = await (await get("9")).json();
    expect(comment).toMatchObject({ state: "removed", text: null });
    expect(comment.replies).toHaveLength(1);
  });

  it("404 when the word is a draft", async () => {
    findByID.mockImplementation(async ({ collection }) => {
      if (collection === "words") throw missing;
      return stored();
    });
    expect((await get("9")).status).toBe(404);
  });

  it("400 for a malformed id", async () => {
    expect((await get("abc")).status).toBe(400);
    expect((await get("0")).status).toBe(400);
  });

  it("502 when the database fails", async () => {
    findByID.mockRejectedValue(new Error("connection refused"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await get("9")).status).toBe(502);
  });
});

describe("GET /api/comments/:id without id", () => {
  it("400", async () => expect((await get(undefined as unknown as string)).status).toBe(400));
});

