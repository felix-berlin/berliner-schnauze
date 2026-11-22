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

beforeEach(() => {
  find.mockReset().mockImplementation(async ({ collection, where }) => {
    if (collection === "words") return { docs: [{ id: 5 }] };
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
    expect(await res.json()).toEqual({ reactions: { "11": 1, "12": -1 } });
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("does not return another visitor's vote", async () => {
    expect(await (await get("?word=icke", "nobody")).json()).toEqual({ reactions: {} });
  });

  it("is empty without a cookie and asks only published top-level comments of the word", async () => {
    expect(await (await get("?word=icke")).json()).toEqual({ reactions: {} });
    await get("?word=icke", "me");
    const q = find.mock.calls.map((c) => c[0]).find((a) => a.collection === "comments");
    expect(q.where).toMatchObject({
      parent: { exists: false },
      status: { equals: "published" },
      word: { equals: 5 },
    });
    const v = find.mock.calls.map((c) => c[0]).find((a) => a.collection === "comment-votes");
    expect(v.where.comment).toEqual({ in: [11, 12] });
  });
});
