import { beforeEach, describe, expect, it, vi } from "vitest";

const { create, find, findByID, verifyTurnstile } = vi.hoisted(() => ({
  create: vi.fn(),
  find: vi.fn(),
  findByID: vi.fn(),
  verifyTurnstile: vi.fn(),
}));
vi.mock("@services/turnstile.ts", () => ({ verifyTurnstile }));
vi.mock("@services/payload.ts", () => ({
  getPayloadClient: async () => ({ count: async () => ({ totalDocs: 0 }), create, find, findByID }),
  siteRead: () => ({ context: { siteRead: "published" }, overrideAccess: false }),
}));

import type { APIContext } from "astro";

import { GET, POST } from "@/pages/api/comments/index.ts";

const cookies = { get: () => undefined, set: vi.fn() };
const url = "https://berliner-schnauze.wtf/api/comments";
const valid = { text: "Ditt stimmt", turnstileToken: "tok", wordId: 5 };
const post = (body: unknown) =>
  POST({
    clientAddress: "1.2.3.4",
    cookies,
    request: new Request(url, { body: JSON.stringify(body), method: "POST" }),
  } as unknown as APIContext);
const get = (qs: string) =>
  GET({ cookies, url: new URL(`${url}${qs}`) } as unknown as APIContext);
const stored = (extra: Record<string, unknown> = {}) => ({
  authorName: "",
  createdAt: "2026-01-01T00:00:00.000Z",
  editKeyHash: "secret-hash",
  id: 9,
  parent: null,
  status: "published",
  text: "Ditt stimmt",
  ...extra,
});

beforeEach(() => {
  verifyTurnstile.mockReset().mockResolvedValue("pass");
  create.mockReset().mockResolvedValue(stored());
  findByID.mockReset().mockResolvedValue({ id: 5 });
  find.mockReset().mockResolvedValue({ docs: [], hasNextPage: false });
});

describe("POST /api/comments", () => {
  it("201 with editKey and comment", async () => {
    const res = await post(valid);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.pending).toBe(false);
    expect(body.comment).toMatchObject({ id: 9, state: "visible", text: "Ditt stimmt" });
    expect(body.editKey.length).toBeGreaterThanOrEqual(32);
    expect(JSON.stringify(body)).not.toContain("secret-hash");
    const data = create.mock.calls[0][0].data;
    expect(data.editKeyHash).toMatch(/^[0-9a-f]{64}$/);
    expect(data).not.toHaveProperty("status");
    expect(data).not.toHaveProperty("turnstileToken");
  });

  it("pending:true without comment when Payload returns pending", async () => {
    create.mockResolvedValue(stored({ status: "pending" }));
    const body = await (await post(valid)).json();
    expect(body.pending).toBe(true);
    expect(body).not.toHaveProperty("comment");
    expect(body.editKey).toBeTruthy();
  });

  it("404 for a draft word", async () => {
    findByID.mockRejectedValue(Object.assign(new Error("Not Found"), { status: 404 }));
    expect((await post(valid)).status).toBe(404);
    expect(create).not.toHaveBeenCalled();
  });

  it("502 when the database fails while looking up the word", async () => {
    findByID.mockRejectedValue(new Error("connection refused"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await post(valid)).status).toBe(502);
    expect(create).not.toHaveBeenCalled();
  });

  it("400 for an unknown parent", async () => {
    findByID.mockImplementation(async ({ collection }) => {
      if (collection === "words") return { id: 5 };
      throw Object.assign(new Error("Not Found"), { status: 404 });
    });
    expect((await post({ ...valid, parentId: 3 })).status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it("400 for a parent of another word", async () => {
    findByID.mockImplementation(async ({ collection }) =>
      collection === "words" ? { id: 5 } : { id: 3, status: "published", word: 6 },
    );
    expect((await post({ ...valid, parentId: 3 })).status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it("400 for a parent that is not published", async () => {
    findByID.mockImplementation(async ({ collection }) =>
      collection === "words" ? { id: 5 } : { id: 3, status: "removed", word: 5 },
    );
    expect((await post({ ...valid, parentId: 3 })).status).toBe(400);
  });

  it("403 on failed captcha", async () => {
    verifyTurnstile.mockResolvedValue("fail");
    const res = await post(valid);
    expect(res.status).toBe(403);
    expect(create).not.toHaveBeenCalled();
  });

  it("503 when the captcha check is unavailable", async () => {
    verifyTurnstile.mockResolvedValue("unavailable");
    expect((await post(valid)).status).toBe(503);
  });

  it("400 on 1001 chars", async () => {
    const res = await post({ ...valid, text: "a".repeat(1001) });
    expect(res.status).toBe(400);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("is no-store on success", async () => {
    expect((await post(valid)).headers.get("Cache-Control")).toBe("no-store");
  });
});

describe("GET /api/comments", () => {
  it("200 with the list, no-store", async () => {
    const res = await get("?word=5&sort=new&page=1");
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(await res.json()).toEqual({ comments: [], hasMore: false, total: 0 });
  });

  it.each(["?word=5&sort=foo", "?sort=best", "?word=x", "?word=5&page=0", "?word=5&page=1.5"])(
    "400 on %s",
    async (qs) => {
      const res = await get(qs);
      expect(res.status).toBe(400);
      expect(res.headers.get("Cache-Control")).toBe("no-store");
    },
  );

  it("404 for a draft or unknown word", async () => {
    findByID.mockRejectedValue(Object.assign(new Error("Not Found"), { status: 404 }));
    expect((await get("?word=5")).status).toBe(404);
    expect(find).not.toHaveBeenCalled();
  });

  it("defaults to best, page 1", async () => {
    await get("?word=5");
    expect(find.mock.calls[0][0]).toMatchObject({ page: 1, sort: ["-score", "-createdAt"] });
  });
});
