import { beforeEach, describe, expect, it, vi } from "vitest";

const { create, find, verifyTurnstile } = vi.hoisted(() => ({
  create: vi.fn(),
  find: vi.fn(),
  verifyTurnstile: vi.fn(),
}));
vi.mock("@services/turnstile.ts", () => ({ verifyTurnstile }));
vi.mock("@services/cache.ts", () => ({ ttlBy: (_ms: number, _max: number, fn: unknown) => fn }));
vi.mock("@services/payload.ts", () => ({
  getPayloadClient: async () => ({ create, find }),
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
  find
    .mockReset()
    .mockImplementation(async ({ collection }) =>
      collection === "words" ? { docs: [{ id: 5 }] } : { docs: [] },
    );
});

const commentFinds = () =>
  find.mock.calls.map((c) => c[0]).filter((a) => a.collection === "comments");

describe("POST /api/stories", () => {
  it("201 and creates a review-held comment without an edit key", async () => {
    const res = await post({ ...valid, bezirk: "mitte", name: "Icke" });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.id).toBe(9);
    expect(Object.keys(body).toSorted()).toEqual(["id", "ok"]);
    expect(JSON.stringify(body)).not.toContain("secret-hash");
    const args = create.mock.calls[0][0];
    expect(args.context).toEqual({ review: true });
    expect(args.data).toMatchObject({ authorName: "Icke", bezirk: "mitte", word: 5 });
    expect(args.data).not.toHaveProperty("editKeyHash");
    expect(args.data.authorTag).toMatch(/^[0-9a-f]{16}$/);
    expect(args.data).not.toHaveProperty("status");
    expect(args.data).not.toHaveProperty("turnstileToken");
  });

  it("stores HTML in name as text", async () => {
    await post({ ...valid, name: "<b>Icke</b>" });
    expect(create.mock.calls[0][0].data.authorName).toBe("<b>Icke</b>");
  });

  it("collapses line breaks in the name (no forged mail lines)", async () => {
    await post({ ...valid, name: "Icke\r\nBcc: x@example.org" });
    expect(create.mock.calls[0][0].data.authorName).toBe("Icke Bcc: x@example.org");
  });

  it("ignores a featured flag in the body", async () => {
    await post({ ...valid, featured: true });
    expect(create.mock.calls[0][0].data).not.toHaveProperty("featured");
  });

  it("gives the same visitor a different authorTag on two words", async () => {
    find.mockImplementation(async ({ collection, where }) =>
      collection === "words"
        ? { docs: [{ id: where.slug.equals === "icke" ? 5 : 6 }] }
        : { docs: [] },
    );
    const same = { get: () => ({ value: "v-1" }), set: vi.fn() };
    const send = (word: string) =>
      POST({
        clientAddress: "1.2.3.4",
        cookies: same,
        request: new Request(url, { body: JSON.stringify({ ...valid, word }), method: "POST" }),
      } as unknown as APIContext);
    await send("icke");
    await send("keule");
    const [a, b] = create.mock.calls.map((c) => c[0].data.authorTag);
    expect(a).not.toBe(b);
  });

  it("400 for a Payload 4xx (validation / hook refusal), 502 stays for 5xx", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    create.mockRejectedValueOnce(Object.assign(new Error("hook"), { status: 400 }));
    expect((await post(valid)).status).toBe(400);
    create.mockRejectedValueOnce(Object.assign(new Error("boom"), { status: 500 }));
    expect((await post(valid)).status).toBe(502);
  });

  it("503 when the captcha check is unavailable", async () => {
    verifyTurnstile.mockResolvedValue("unavailable");
    expect((await post(valid)).status).toBe(503);
    expect(create).not.toHaveBeenCalled();
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

  it("502 and a log line without the error message when the create fails", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    create.mockRejectedValue(new Error("insert ... 'secret-value'"));
    const res = await post(valid);
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({
      error: "Deine Jeschichte konnte leider nicht gesendet werden.",
    });
    expect(log).toHaveBeenCalledWith("[stories] failed: Error");
    expect(JSON.stringify(log.mock.calls)).not.toContain("secret-value");
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
    find.mockImplementation(async ({ collection, where }) => {
      if (collection === "words") return { docs: [{ id: 5 }] };
      return where.featured
        ? { docs: [row({ id: 2 })] }
        : { docs: [row({ bezirk: "mitte", id: 3 })], hasNextPage: false, totalDocs: 6 };
    });
    const res = await get("?word=icke");
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=60");
    const body = await res.json();
    expect(body).toMatchObject({ hasMore: false, page: 1, total: 7 });
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

  it("queries only published top-level rows, newest first, without the featured one", async () => {
    find.mockImplementation(async ({ collection, where }) =>
      collection === "words"
        ? { docs: [{ id: 5 }] }
        : { docs: where.featured ? [row({ id: 2 })] : [] },
    );
    await get("?word=icke");
    const [featured, items] = commentFinds();
    for (const q of [items, featured])
      expect(q.where).toMatchObject({
        parent: { exists: false },
        status: { equals: "published" },
        word: { equals: 5 },
      });
    expect(items.sort).toBe("-createdAt");
    expect(items.where.id).toEqual({ not_equals: 2 });
    expect(featured.where.featured).toEqual({ equals: true });
  });

  it("502 and a log line without the error message when the read fails", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    find.mockRejectedValue(
      Object.assign(new Error("select ... 'secret-value'"), { code: "ECONN" }),
    );
    const res = await get("?word=icke");
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "Die Jeschichten konnten nicht geladen werden." });
    expect(log).toHaveBeenCalledWith("[stories] failed: Error", "code=ECONN");
    expect(JSON.stringify(log.mock.calls)).not.toContain("secret-value");
  });

  describe("paging", () => {
    // 45 published stories, ids 45..1 newest first, id 40 is featured: 44 in the lists.
    const all = Array.from({ length: 45 }, (_, i) => row({ id: 45 - i }));
    beforeEach(() => {
      find.mockImplementation(async ({ collection, limit, page, where }) => {
        if (collection === "words") return { docs: [{ id: 5 }] };
        if (where.featured) return { docs: [row({ id: 40 })] };
        const rest = all.filter((r) => r.id !== where.id.not_equals);
        const docs = rest.slice((page - 1) * limit, page * limit);
        return { docs, hasNextPage: page * limit < rest.length, totalDocs: rest.length };
      });
    });

    it("page 1 carries the featured story, 20 items without it and hasMore", async () => {
      const body = await (await get("?word=icke")).json();
      expect(body).toMatchObject({ hasMore: true, page: 1, total: 45 });
      expect(body.items).toHaveLength(20);
      expect(body.featured.id).toBe("40");
      expect(body.items.map((i: { id: string }) => i.id)).not.toContain("40");
    });

    it("page 2 returns the next 20, no featured, still hasMore", async () => {
      const body = await (await get("?word=icke&page=2")).json();
      expect(body).toMatchObject({ featured: null, hasMore: true, page: 2, total: 45 });
      expect(body.items).toHaveLength(20);
      expect(body.items[0].id).toBe("24"); // 45..41 and 39..25 were on page 1
      expect(commentFinds().at(-1)).toMatchObject({ limit: 20, page: 2 });
    });

    it("the last page has hasMore false", async () => {
      const body = await (await get("?word=icke&page=3")).json();
      expect(body.items).toHaveLength(4);
      expect(body.hasMore).toBe(false);
    });

    it("a page beyond the end is empty and does not query (or cache) that page", async () => {
      const body = await (await get("?word=icke&page=9")).json();
      expect(body).toMatchObject({ featured: null, hasMore: false, items: [], page: 9, total: 45 });
      expect(commentFinds().some((q) => q.page === 9)).toBe(false);
    });

    it.each(["0", "-3", "abc", "1.5", ""])("page=%s falls back to page 1", async (page) => {
      const body = await (await get(`?word=icke&page=${page}`)).json();
      expect(body.page).toBe(1);
      expect(body.featured.id).toBe("40");
    });
  });
});
