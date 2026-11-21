import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { loadDailyStats, loadHourlyStats, reportError } = vi.hoisted(() => ({
  loadDailyStats: vi.fn(),
  loadHourlyStats: vi.fn(),
  reportError: vi.fn(),
}));
vi.mock("@services/payload.ts", () => ({ getPayloadClient: async () => ({}) }));
vi.mock("payload-app/home-stats-load", () => ({ loadDailyStats, loadHourlyStats }));
vi.mock("@utils/reportError.ts", () => ({ reportError }));

import { fetchHomeStatsOrNull } from "@services/homeStats.ts";

beforeEach(() => {
  vi.useFakeTimers();
  loadDailyStats.mockReset().mockRejectedValueOnce(new Error("db down"));
  loadHourlyStats.mockReset().mockResolvedValue({ bon: null, popular: [], rising: [] });
});
afterEach(() => vi.useRealTimers());

describe("fetchHomeStatsOrNull", () => {
  it("degrades to null with a tagged report, pauses retries, then recovers", async () => {
    expect(await fetchHomeStatsOrNull()).toBeNull();
    expect(reportError).toHaveBeenCalledTimes(1);
    expect(reportError.mock.calls[0][0].message).toBe("[home] stats unavailable");

    // within the pause the failing queries do not run again
    expect(await fetchHomeStatsOrNull()).toBeNull();
    expect(loadDailyStats).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(60_001);
    loadDailyStats.mockResolvedValue({ ageLists: { dying: [], growing: [] }, districts: [] });
    expect(await fetchHomeStatsOrNull()).toMatchObject({ districts: [] });
    expect(loadDailyStats).toHaveBeenCalledTimes(2);
  });
});
