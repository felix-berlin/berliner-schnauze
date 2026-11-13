import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { find, trending } = vi.hoisted(() => ({ find: vi.fn(), trending: vi.fn() }));
const payload = { find };
vi.mock("@services/payload.ts", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getPayloadClient: async () => payload,
}));
vi.mock("payload-app/word-stats", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  trending,
}));

import type { APIContext } from "astro";

import { siteRead } from "@services/payload.ts";

import { GET } from "@/pages/api/trending.ts";

const get = (query: string) =>
  GET({
    request: new Request(`https://berliner-schnauze.wtf/api/trending?${query}`),
    url: new URL(`https://berliner-schnauze.wtf/api/trending?${query}`),
  } as unknown as APIContext);

beforeEach(() => {
  vi.useFakeTimers();
  trending.mockReset().mockResolvedValue([
    { previous: 1, value: 0.5, views: 9, word: 7 },
    { value: 0.2, views: 4, word: 8 },
    { value: 0.1, views: 3, word: 99 },
  ]);
  find.mockReset().mockResolvedValue({
    docs: [
      { berlinerisch: "Wa", id: 8, slug: "wa" },
      { berlinerisch: "Aasen", id: 7, slug: "aasen" },
    ],
  });
});
afterEach(() => vi.useRealTimers());

describe("GET /api/trending", () => {
  it("defaults days=30 and limit=10, ranks from 1 in rank order, drops unresolved words", async () => {
    const res = await get("type=viewed");
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=300");
    expect(trending).toHaveBeenCalledWith(payload, { days: 30, limit: 50, type: "viewed" });
    expect(find.mock.calls[0][0]).toMatchObject({
      collection: "words",
      depth: 0,
      pagination: false,
      ...siteRead(),
    });
    expect(await res.json()).toEqual({
      items: [
        {
          previous: 1,
          rank: 1,
          value: 0.5,
          views: 9,
          word: { berlinerisch: "Aasen", id: 7, slug: "aasen" },
        },
        { rank: 2, value: 0.2, views: 4, word: { berlinerisch: "Wa", id: 8, slug: "wa" } },
      ],
    });
  });

  it.each([
    "",
    "type=x",
    "type=viewed&days=0",
    "type=viewed&days=366",
    "type=viewed&days=8",
    "type=viewed&days=365&limit=51",
    "type=viewed&days=abc",
    "type=viewed&limit=0",
    "type=viewed&limit=51",
  ])("400 on %j", async (query) => {
    const res = await get(query);
    expect(res.status).toBe(400);
    expect(await res.json()).toHaveProperty("error");
    expect(trending).not.toHaveBeenCalled();
  });

  it("caches per type and days for 5 minutes, whatever the limit", async () => {
    // memos live per module: every test uses its own type:days key
    await Promise.all([get("type=rising&days=7&limit=5"), get("type=rising&days=7&limit=6")]);
    expect(trending).toHaveBeenCalledTimes(1);
    expect((await (await get("type=rising&days=7&limit=1")).json()).items).toHaveLength(1);
    await get("type=rising&days=365&limit=5");
    expect(trending).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(5 * 60_000 + 1);
    expect((await get("type=rising&days=7&limit=5")).status).toBe(200);
    await vi.waitFor(() => expect(trending).toHaveBeenCalledTimes(3));
  });

  it("502, logged and not cached, when trending throws", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    trending.mockRejectedValueOnce(new Error("db down"));
    expect((await get("type=engaged&days=7")).status).toBe(502);
    expect(error).toHaveBeenCalled();
    expect((await get("type=engaged&days=7")).status).toBe(200);
  });
});
