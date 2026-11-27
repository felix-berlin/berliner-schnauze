import { beforeEach, describe, expect, it, vi } from "vitest";

const { load, report } = vi.hoisted(() => ({ load: vi.fn(), report: vi.fn() }));
vi.mock("payload-app/search-stats-load", () => ({ loadSearchStats: load }));
vi.mock("@services/payload.ts", () => ({ getPayloadClient: async () => ({}) }));
vi.mock("@utils/reportError.ts", () => ({ reportError: report }));

import { searchStatsOrEmpty } from "@services/searchStats.ts";

describe("searchStatsOrEmpty", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reports a failed load, returns an empty map and does not cache the failure", async () => {
    load.mockRejectedValueOnce(new Error("db down"));
    expect((await searchStatsOrEmpty()).size).toBe(0);
    expect(report).toHaveBeenCalledOnce();

    load.mockResolvedValueOnce(new Map([[1, { stories: 2 }]]));
    expect((await searchStatsOrEmpty()).get(1)).toEqual({ stories: 2 });
  });
});
