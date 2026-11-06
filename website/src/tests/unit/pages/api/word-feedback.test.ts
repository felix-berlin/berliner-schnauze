import { beforeEach, describe, expect, it, vi } from "vitest";

const { count, create, del, find, findByID, update } = vi.hoisted(() => ({
  count: vi.fn(),
  create: vi.fn(),
  del: vi.fn(),
  find: vi.fn(),
  findByID: vi.fn(),
  update: vi.fn(),
}));
vi.mock("@services/payload.ts", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getPayloadClient: async () => ({ count, create, delete: del, find, findByID, update }),
}));

import type { APIContext } from "astro";

import { siteRead } from "@services/payload.ts";

import { DELETE, GET, PATCH } from "@/pages/api/word-feedback.ts";

const set = vi.fn();
const ctx = (init: {
  body?: unknown;
  cookie?: string;
  ip?: string;
  url?: string;
  method?: string;
}) =>
  ({
    clientAddress: init.ip,
    cookies: { get: () => (init.cookie ? { value: init.cookie } : undefined), set },
    request: new Request(init.url ?? "https://berliner-schnauze.wtf/api/word-feedback", {
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      method: init.method ?? "PATCH",
    }),
    url: new URL(init.url ?? "https://berliner-schnauze.wtf/api/word-feedback"),
  }) as unknown as APIContext;
const patch = (body: unknown, cookie?: string, ip?: string) => PATCH(ctx({ body, cookie, ip }));
const uniqueViolation = Object.assign(new Error("The following field is invalid"), {
  data: { errors: [{ message: "Value must be unique", path: "word_id, visitor" }] },
  name: "ValidationError",
  status: 400,
});

beforeEach(() => {
  set.mockReset();
  count.mockReset().mockResolvedValue({ totalDocs: 0 });
  create.mockReset().mockImplementation(async ({ data }) => ({ id: 1, ...data }));
  update.mockReset().mockImplementation(async ({ data }) => ({ id: 1, ...data }));
  find.mockReset().mockResolvedValue({ docs: [] });
  del.mockReset();
  findByID.mockReset().mockResolvedValue({ id: 7 });
});

describe("PATCH /api/word-feedback", () => {
  it("creates the row and the cookie on first vote", async () => {
    const res = await patch({ usage: "say", word: 7 });
    expect(res.status).toBe(200);
    expect(set).toHaveBeenCalledOnce();
    const data = create.mock.calls[0][0].data;
    expect(data).toMatchObject({ usage: "say", word: 7 });
    expect(typeof data.visitor).toBe("string");
    expect((await res.json()).mine.usage).toBe("say");
  });

  it("updates an existing row with only the sent keys", async () => {
    find.mockResolvedValue({ docs: [{ id: 3, reaction: "like" }] });
    await patch({ usage: "know", word: 7 }, "v-1");
    expect(update.mock.calls[0][0]).toMatchObject({ data: { usage: "know" }, id: 3 });
    expect(create).not.toHaveBeenCalled();
  });

  it("origin other than grewUp clears half", async () => {
    find.mockResolvedValue({ docs: [{ id: 3 }] });
    await patch({ origin: "movedOver10", word: 7 }, "v-1");
    expect(update.mock.calls[0][0].data).toEqual({ half: null, origin: "movedOver10" });
  });

  it("origin null clears half too", async () => {
    find.mockResolvedValue({ docs: [{ id: 3 }] });
    await patch({ origin: null, word: 7 }, "v-1");
    expect(update.mock.calls[0][0].data).toEqual({ half: null, origin: null });
  });

  it("half needs origin grewUp in the body", async () => {
    expect((await patch({ half: "east", word: 7 }, "v-1")).status).toBe(400);
    expect((await patch({ half: "east", origin: "grewUp", word: 7 }, "v-1")).status).toBe(200);
  });

  it("a locality needs the area of its area in the same body", async () => {
    expect((await patch({ locality: "kreuzberg", word: 7 }, "v-1")).status).toBe(400);
    expect((await patch({ area: "pankow", locality: "kreuzberg", word: 7 }, "v-1")).status).toBe(
      400,
    );
    expect((await patch({ area: null, locality: "kreuzberg", word: 7 }, "v-1")).status).toBe(400);
    expect((await patch({ locality: "atlantis", word: 7 }, "v-1")).status).toBe(400);
    const ok = await patch(
      { area: "friedrichshain-kreuzberg", locality: "kreuzberg", word: 7 },
      "v-1",
    );
    expect(ok.status).toBe(200);
    expect(create.mock.calls[0][0].data).toMatchObject({
      area: "friedrichshain-kreuzberg",
      locality: "kreuzberg",
    });
    expect((await ok.json()).mine.locality).toBe("kreuzberg");
  });

  it("skipping the Locality needs no area", async () => {
    find.mockResolvedValue({ docs: [{ id: 3, locality: "kreuzberg" }] });
    expect((await patch({ locality: null, word: 7 }, "v-1")).status).toBe(200);
    expect(update.mock.calls[0][0].data).toEqual({ locality: null });
  });

  it.each([null, "pankow", "brandenburg", "elsewhere"])(
    "area %s clears a stored locality of another area",
    async (area) => {
      find.mockResolvedValue({
        docs: [{ area: "friedrichshain-kreuzberg", id: 3, locality: "kreuzberg" }],
      });
      await patch({ area, word: 7 }, "v-1");
      expect(update.mock.calls[0][0].data).toEqual({ area, locality: null });
    },
  );

  it("the same area keeps a stored locality", async () => {
    find.mockResolvedValue({
      docs: [{ area: "friedrichshain-kreuzberg", id: 3, locality: "kreuzberg" }],
    });
    await patch({ area: "friedrichshain-kreuzberg", word: 7 }, "v-1");
    expect(update.mock.calls[0][0].data).toEqual({ area: "friedrichshain-kreuzberg" });
  });

  it("null clears a key", async () => {
    find.mockResolvedValue({ docs: [{ id: 3, reaction: "like" }] });
    await patch({ reaction: null, word: 7 }, "v-1");
    expect(update.mock.calls[0][0].data).toEqual({ reaction: null });
  });

  it("a unique-violation race re-finds and updates", async () => {
    find.mockResolvedValueOnce({ docs: [] }).mockResolvedValueOnce({ docs: [{ id: 4 }] });
    create.mockRejectedValue(uniqueViolation);
    const res = await patch({ usage: "say", word: 7 }, "v-1");
    expect(res.status).toBe(200);
    expect(update.mock.calls[0][0]).toMatchObject({ data: { usage: "say" }, id: 4 });
  });

  it("the unique-violation retry keeps a matching locality and clears another area's one", async () => {
    create.mockRejectedValue(uniqueViolation);
    const raced = { area: "friedrichshain-kreuzberg", id: 4, locality: "kreuzberg" };
    find.mockResolvedValueOnce({ docs: [] }).mockResolvedValueOnce({ docs: [raced] });
    await patch({ area: "friedrichshain-kreuzberg", word: 7 }, "v-1");
    expect(update.mock.calls[0][0]).toMatchObject({
      data: { area: "friedrichshain-kreuzberg" },
      id: 4,
    });
    expect(update.mock.calls[0][0].data).not.toHaveProperty("locality");
    update.mockClear();
    find.mockResolvedValueOnce({ docs: [] }).mockResolvedValueOnce({ docs: [raced] });
    await patch({ area: "pankow", word: 7 }, "v-2");
    expect(update.mock.calls[0][0]).toMatchObject({
      data: { area: "pankow", locality: null },
      id: 4,
    });
  });

  it("400 on unknown key or area", async () => {
    expect((await patch({ foo: 1, word: 7 })).status).toBe(400);
    expect((await patch({ area: "atlantis", word: 7 })).status).toBe(400);
  });

  it("404 on draft/unknown word, nothing written", async () => {
    findByID.mockRejectedValue(Object.assign(new Error("nf"), { status: 404 }));
    expect((await patch({ usage: "say", word: 7 })).status).toBe(404);
    expect(create).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(findByID.mock.calls[0][0]).toMatchObject({
      collection: "words",
      ...siteRead(),
    });
  });

  it("502 on other errors", async () => {
    findByID.mockRejectedValue(new Error("db down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await patch({ usage: "say", word: 7 })).status).toBe(502);
  });

  it("429 on the 31st request per word and IP", async () => {
    for (let i = 0; i < 30; i++)
      expect((await patch({ usage: "say", word: 99 }, undefined, "10.0.0.2")).status).toBe(200);
    expect((await patch({ usage: "say", word: 99 }, undefined, "10.0.0.2")).status).toBe(429);
  });

  it("updates of the own row do not count against the per-word cap", async () => {
    find.mockResolvedValue({ docs: [{ id: 3 }] });
    for (let i = 0; i < 40; i++)
      expect((await patch({ usage: "say", word: 98 }, "v-1", "10.0.0.3")).status).toBe(200);
  });

  it("429 on the 501st write per IP across words", async () => {
    for (let i = 0; i < 500; i++)
      expect(
        (await patch({ usage: "say", word: 100 + (i % 20) }, undefined, "10.0.0.4")).status,
      ).toBe(200);
    expect((await patch({ usage: "say", word: 130 }, undefined, "10.0.0.4")).status).toBe(429);
  });

  it("stores a hash of cookie and word, never the cookie, and a different one per word", async () => {
    await patch({ usage: "say", word: 7 }, "v-1");
    await patch({ usage: "say", word: 8 }, "v-1");
    const [a, b] = create.mock.calls.map((c) => c[0].data.visitor);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toContain("v-1");
    expect(a).not.toBe(b);
    expect(find.mock.calls[0][0].where.visitor.in).toContain(a);
  });

  it("moves a row with the old cross-word hash to the per-word hash on the next write", async () => {
    await patch({ usage: "say", word: 7 }, "v-1");
    const [fresh, legacy] = find.mock.calls[0][0].where.visitor.in;
    find.mockResolvedValue({ docs: [{ id: 5, visitor: legacy }] });
    await patch({ usage: "know", word: 7 }, "v-1");
    expect(update.mock.calls[0][0].data).toMatchObject({ usage: "know", visitor: fresh });
  });

  it("400 on a body that is not JSON", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect((await PATCH(ctx({}))).status).toBe(400);
  });

  it("says the vote is stored when only the count afterwards fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    count.mockRejectedValue(new Error("count down"));
    const res = await patch({ usage: "say", word: 7 }, "v-1");
    expect(res.status).toBe(502);
    expect((await res.json()).error).toContain("jespeichert");
    expect(create).toHaveBeenCalledOnce();
  });

  it("computes the comparison only once there is an own vote", async () => {
    await patch({ reaction: "like", word: 7 }, "v-1");
    expect(count).toHaveBeenCalledTimes(5); // totals only
    count.mockClear();
    await patch({ usage: "say", word: 7 }, "v-1");
    expect(count.mock.calls.length).toBeGreaterThan(5);
  });
});

describe("GET /api/word-feedback", () => {
  it("without cookie: mine null, totals counted, no cookie set", async () => {
    count.mockResolvedValue({ totalDocs: 2 });
    const res = await GET(
      ctx({ method: "GET", url: "https://berliner-schnauze.wtf/api/word-feedback?word=7" }),
    );
    const body = await res.json();
    expect(body.mine).toBeNull();
    expect(body.totals).toEqual({ dislike: 2, know: 2, like: 2, never: 2, say: 2 });
    expect(set).not.toHaveBeenCalled();
  });

  it("with a cookie: mine from the stored row, comparison only with a vote", async () => {
    const url = "https://berliner-schnauze.wtf/api/word-feedback?word=7";
    find.mockResolvedValue({ docs: [{ id: 3, reaction: "like" }] });
    const noVote = await (await GET(ctx({ cookie: "v-1", method: "GET", url }))).json();
    expect(noVote.mine).toMatchObject({ reaction: "like", usage: null });
    expect(count).toHaveBeenCalledTimes(5);
    count.mockClear();
    find.mockResolvedValue({ docs: [{ id: 3, usage: "say" }] });
    const voted = await (await GET(ctx({ cookie: "v-1", method: "GET", url }))).json();
    expect(voted.mine.usage).toBe("say");
    expect(count.mock.calls.length).toBeGreaterThan(5);
  });

  it("502 with a read message on a failing read", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    find.mockRejectedValue(new Error("db down"));
    const res = await GET(
      ctx({
        cookie: "v-1",
        method: "GET",
        url: "https://berliner-schnauze.wtf/api/word-feedback?word=7",
      }),
    );
    expect(res.status).toBe(502);
    expect((await res.json()).error).toContain("Zahlen");
  });

  it("400 on a bad word", async () => {
    expect(
      (
        await GET(
          ctx({ method: "GET", url: "https://berliner-schnauze.wtf/api/word-feedback?word=x" }),
        )
      ).status,
    ).toBe(400);
  });
});

describe("DELETE /api/word-feedback", () => {
  const del_ = (cookie?: string, ip = "10.0.0.9") => DELETE(ctx({ cookie, ip, method: "DELETE" }));

  it("deletes the rows of every word and the old hash, in chunks, by the cookie's hashes", async () => {
    find.mockResolvedValue({ docs: Array.from({ length: 2500 }, (_, i) => ({ id: i + 1 })) });
    del.mockResolvedValue({ docs: [], errors: [] });
    expect((await del_("v-1")).status).toBe(200);
    expect(del).toHaveBeenCalledTimes(3);
    const hashes = del.mock.calls.flatMap((c) => c[0].where.visitor.in);
    expect(hashes).toHaveLength(2501);
    expect(new Set(hashes).size).toBe(2501);
    expect(JSON.stringify(hashes)).not.toContain("v-1");
  });

  it("does nothing without a cookie", async () => {
    expect((await del_(undefined)).status).toBe(200);
    expect(del).not.toHaveBeenCalled();
  });

  it("502 when the delete fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    find.mockResolvedValue({ docs: [{ id: 1 }] });
    del.mockRejectedValue(new Error("down"));
    expect((await del_("v-1", "10.0.0.10")).status).toBe(502);
  });
});
