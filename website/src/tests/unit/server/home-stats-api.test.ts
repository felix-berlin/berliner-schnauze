import { beforeEach, describe, expect, it, vi } from "vitest";

const { loadDailyStats, loadHourlyStats } = vi.hoisted(() => ({
  loadDailyStats: vi.fn(),
  loadHourlyStats: vi.fn(),
}));
const payload = {};
vi.mock("@services/payload.ts", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getPayloadClient: async () => payload,
}));
vi.mock("payload-app/home-stats-load", () => ({ loadDailyStats, loadHourlyStats }));

import type { APIContext } from "astro";

import { GET } from "@/pages/api/home-stats.ts";

const get = () =>
  GET({
    request: new Request("https://berliner-schnauze.wtf/api/home-stats"),
    url: new URL("https://berliner-schnauze.wtf/api/home-stats"),
  } as unknown as APIContext);

const daily = {
  ageLists: { dying: [], growing: [] },
  bon: { card: null, roundsToday: 2, steps: [{ from: 0, mult: 1 }] },
  districts: [{ area: "mitte", name: "Mitte", typical: null, value: null }],
};
const hourly = { popular: [], rising: [] };

beforeEach(() => {
  loadDailyStats.mockReset().mockResolvedValue({ ...daily, extra: "x" });
  loadHourlyStats.mockReset().mockResolvedValue(hourly);
});

describe("GET /api/home-stats", () => {
  // memos live per module: the failure case runs first, before a value is cached
  it("502, logged, when the loader throws", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    loadDailyStats.mockRejectedValueOnce(new Error("db down"));
    const res = await get();
    expect(res.status).toBe(502);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(error.mock.calls[0][0]).toContain("[home-stats]");
    error.mockRestore();
  });

  it("returns exactly the HomeStats keys with a page cache header", async () => {
    const res = await get();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Object.keys(body).sort()).toEqual(["ageLists", "bon", "districts", "popular", "rising"]);
    expect(body.bon.roundsToday).toBe(2);
    expect(res.headers.get("Cache-Control")).toMatch(/s-maxage=3600/);
    expect(loadDailyStats).toHaveBeenCalledWith(payload);
    await get();
    // the failed daily load was not kept and is retried; the hourly part stays memoised from the first test
    expect(loadDailyStats).toHaveBeenCalledTimes(1);
    expect(loadHourlyStats).not.toHaveBeenCalled();
  });
});
