import { beforeEach, describe, expect, it, vi } from "vitest";

const { count, create, find, verifyTurnstile } = vi.hoisted(() => ({
  count: vi.fn(),
  create: vi.fn(),
  find: vi.fn(),
  verifyTurnstile: vi.fn(),
}));
vi.mock("@services/turnstile.ts", () => ({ verifyTurnstile }));
vi.mock("@services/cache.ts", () => ({ ttlBy: (_ms: number, _max: number, fn: unknown) => fn }));
vi.mock("@services/payload.ts", () => ({
  getPayloadClient: async () => ({ count, create, find }),
  siteRead: () => ({ context: { siteRead: "published" }, overrideAccess: false }),
}));

import type { APIContext } from "astro";

import { GET, POST } from "@/pages/api/stories/index.ts";

const cookies = { get: () => undefined, set: vi.fn() };
const url = "https://berliner-schnauze.wtf/api/stories";
const valid = { text: "Ditt hab ick jestern jehört", turnstileToken: "tok", word: "icke" };
const post = (body: unknown) =>
  POST({
    clientAddress: "1.2.3.4",
    cookies,
    request: new Request(url, { body: JSON.stringify(body), method: "POST" }),
  } as unknown as APIContext);
const get = (qs: string) => GET({ url: new URL(`${url}${qs}`) } as unknown as APIContext);
const row = (extra: Record<string, unknown> = {}) => ({
  authorName: "Icke",
  authorTag: "secret-tag",
  createdAt: "2026-01-01T00:00:00.000Z",
  downvotes: 1,
  editKeyHash: "secret-hash",
  id: 9,
  pseudonym: "Pseudo",
  text: "Ditt hab ick jestern jehört",
  upvotes: 4,
  ...extra,
});

beforeEach(() => {
  verifyTurnstile.mockReset().mockResolvedValue("pass");
  create.mockReset().mockResolvedValue(row({ status: "pending" }));
  count.mockReset().mockResolvedValue({ totalDocs: 0 });
  find
    .mockReset()
    .mockImplementation(async ({ collection }) =>
      collection === "words" ? { docs: [{ id: 5 }] } : { docs: [] },
    );
});

const commentFinds = () =>
  find.mock.calls.map((c) => c[0]).filter((a) => a.collection === "comments");

describe("POST /api/stories", () => {
  it("201 with editKey and creates a review-held comment", async () => {
    const res = await post({ ...valid, bezirk: "mitte", name: "Icke" });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.editKey.length).toBeGreaterThanOrEqual(32);
    expect(JSON.stringify(body)).not.toContain("secret-hash");
    const args = create.mock.calls[0][0];
    expect(args.context).toEqual({ review: true });
    expect(args.data).toMatchObject({ authorName: "Icke", bezirk: "mitte", word: 5 });
    expect(args.data.editKeyHash).toMatch(/^[0-9a-f]{64}$/);
    expect(args.data.authorTag).toMatch(/^[0-9a-f]{16}$/);
    expect(args.data).not.toHaveProperty("status");
    expect(args.data).not.toHaveProperty("turnstileToken");
  });

  it("stores HTML in name as text", async () => {
    await post({ ...valid, name: "<b>Icke</b>" });
    expect(create.mock.calls[0][0].data.authorName).toBe("<b>Icke</b>");
  });

  it("400 with field for 501 characters", async () => {
    const res = await post({ ...valid, text: "a".repeat(501) });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ field: "text", message: expect.any(String) });
    expect(create).not.toHaveBeenCalled();
  });

  it("accepts exactly 500 and 5 characters after trim", async () => {
    expect((await post({ ...valid, text: ` ${"a".repeat(500)} ` })).status).toBe(201);
    expect((await post({ ...valid, text: "  abcd  " })).status).toBe(400);
    expect((await post({ ...valid, text: "  abcde  " })).status).toBe(201);
  });

  it("400 for an unknown bezirk", async () => {
    const res = await post({ ...valid, bezirk: "gotham" });
    expect(res.status).toBe(400);
    expect((await res.json()).field).toBe("bezirk");
  });

  it("400 for a name over 40 characters", async () => {
    const res = await post({ ...valid, name: "n".repeat(41) });
    expect(res.status).toBe(400);
    expect((await res.json()).field).toBe("name");
  });

  it("403 without a passed captcha", async () => {
    verifyTurnstile.mockResolvedValue("fail");
    expect((await post(valid)).status).toBe(403);
    expect(create).not.toHaveBeenCalled();
  });

  it("404 for an unknown word", async () => {
    find.mockResolvedValue({ docs: [] });
    expect((await post(valid)).status).toBe(404);
    expect(create).not.toHaveBeenCalled();
  });
});

describe("GET /api/stories", () => {
  it("400 without a word", async () => {
    expect((await get("")).status).toBe(400);
  });

  it("404 for an unknown word", async () => {
    find.mockResolvedValue({ docs: [] });
    expect((await get("?word=nix")).status).toBe(404);
  });

  it("maps rows to stories without private fields", async () => {
    count.mockResolvedValue({ totalDocs: 7 });
    find.mockImplementation(async ({ collection, where }) => {
      if (collection === "words") return { docs: [{ id: 5 }] };
      return { docs: [where.featured ? row({ id: 2 }) : row({ bezirk: "mitte", id: 3 })] };
    });
    const res = await get("?word=icke");
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=60");
    const body = await res.json();
    expect(body.total).toBe(7);
    expect(body.featured).toEqual({
      anders: 1,
      createdAt: "2026-01-01T00:00:00.000Z",
      id: "2",
      jenau: 4,
      name: "Icke",
      text: "Ditt hab ick jestern jehört",
    });
    expect(body.items[0]).toMatchObject({ bezirk: "mitte", id: "3" });
    expect(JSON.stringify(body)).not.toMatch(/secret|Pseudo/);
  });

  it("returns name unchanged and omits it when empty", async () => {
    find.mockImplementation(async ({ collection }) =>
      collection === "words"
        ? { docs: [{ id: 5 }] }
        : { docs: [row({ authorName: "<b>x</b>" }), row({ authorName: "", id: 10 })] },
    );
    const { items } = await (await get("?word=icke")).json();
    expect(items[0].name).toBe("<b>x</b>");
    expect(items[1]).not.toHaveProperty("name");
  });

  it("featured is null when no published featured row exists", async () => {
    expect((await (await get("?word=icke")).json()).featured).toBeNull();
  });

  it("queries only published top-level rows, newest first", async () => {
    count.mockResolvedValue({ totalDocs: 2 }); // the featured query is skipped for 0
    await get("?word=icke");
    const [items, featured] = commentFinds();
    for (const q of [items, featured])
      expect(q.where).toMatchObject({
        parent: { exists: false },
        status: { equals: "published" },
        word: { equals: 5 },
      });
    expect(items.sort).toBe("-createdAt");
    expect(featured.where.featured).toEqual({ equals: true });
    expect(count.mock.calls[0][0].where).toMatchObject({
      parent: { exists: false },
      status: { equals: "published" },
    });
  });

  it.each([
    ["", 3],
    ["&limit=10", 10],
    ["&limit=500", 100],
  ])("limit %s -> %i", async (qs, limit) => {
    await get(`?word=icke${qs}`);
    expect(commentFinds()[0].limit).toBe(limit);
  });
});
