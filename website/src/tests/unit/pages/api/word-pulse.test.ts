import { beforeEach, describe, expect, it, vi } from "vitest";

const { bumpWordStat, findByID } = vi.hoisted(() => ({ bumpWordStat: vi.fn(), findByID: vi.fn() }));
const payload = { findByID };
vi.mock("@services/payload.ts", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getPayloadClient: async () => payload,
}));
vi.mock("payload-app/word-stats", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  bumpWordStat,
}));

import type { APIContext } from "astro";

import { siteRead } from "@services/payload.ts";

import { POST } from "@/pages/api/word-pulse.ts";

let testIp = "";
const post = (body: unknown, ip = testIp) =>
  POST({
    clientAddress: ip,
    request: new Request("https://berliner-schnauze.wtf/api/word-pulse", {
      body: typeof body === "string" ? body : JSON.stringify(body),
      method: "POST",
    }),
  } as unknown as APIContext);

let n = 0;
beforeEach(() => {
  testIp = `10.1.${++n}.1`; // a fresh visitor per test: the dedupe is per IP
  bumpWordStat.mockReset().mockResolvedValue(undefined);
  findByID.mockReset().mockResolvedValue({ id: 7 });
});

describe("POST /api/word-pulse", () => {
  it("counts a valid report", async () => {
    const res = await post({ kind: "view", word: 7 });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(bumpWordStat).toHaveBeenCalledWith(payload, 7, "view");
  });

  it.each([
    "not json",
    {},
    { kind: "x", word: 7 },
    { kind: "view", word: -1 },
    { kind: "view", word: 1.5 },
    { extra: 1, kind: "view", word: 7 },
    { kind: "view", word: 2147483648 },
  ])("400 on %j, nothing counted", async (body) => {
    expect((await post(body)).status).toBe(400);
    expect(bumpWordStat).not.toHaveBeenCalled();
  });

  it("404 on a draft or unknown word, nothing counted", async () => {
    findByID.mockRejectedValue(Object.assign(new Error("nf"), { status: 404 }));
    expect((await post({ kind: "view", word: 7 })).status).toBe(404);
    expect(bumpWordStat).not.toHaveBeenCalled();
    expect(findByID.mock.calls[0][0]).toMatchObject({ collection: "words", id: 7, ...siteRead() });
  });

  it("502 and a log line on a database error", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    bumpWordStat.mockRejectedValue(new Error("db down"));
    expect((await post({ kind: "view", word: 7 })).status).toBe(502);
    expect(error).toHaveBeenCalled();
  });

  it("counts the same word and kind once a day per visitor, answering 200 both times", async () => {
    expect((await post({ kind: "view", word: 7 })).status).toBe(200);
    expect((await post({ kind: "view", word: 7 })).status).toBe(200);
    expect(bumpWordStat).toHaveBeenCalledTimes(1);
    await post({ kind: "audio", word: 7 });
    await post({ kind: "view", word: 8 });
    expect(bumpWordStat).toHaveBeenCalledTimes(3);
    await post({ kind: "view", word: 7 }, "10.99.0.1");
    expect(bumpWordStat).toHaveBeenCalledTimes(4);
  });

  it("429 after 2000 reports per IP and day", async () => {
    for (let i = 0; i < 2000; i++)
      expect((await post({ kind: "view", word: 7 }, "10.1.0.9")).status).toBe(200);
    expect((await post({ kind: "view", word: 7 }, "10.1.0.9")).status).toBe(429);
  });
});
