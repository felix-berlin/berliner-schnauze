import { beforeEach, describe, expect, it, vi } from "vitest";

const { find, trending } = vi.hoisted(() => ({ find: vi.fn(), trending: vi.fn() }));
vi.mock("@services/cache.ts", () => ({ ttl: (_ms: number, fn: unknown) => fn }));
vi.mock("@services/payload.ts", () => ({ getPayloadClient: async () => ({ find }) }));
vi.mock("payload-app/word-stats", () => ({ berlinDay: () => "2026-11-08", trending }));
vi.mock("@utils/reportError.ts", () => ({ reportError: vi.fn() }));

import { getWordTrend } from "@services/payload/wordTrend.ts";
import { reportError } from "@utils/reportError.ts";

describe("getWordTrend", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns undefined and reports when the stats fail", async () => {
    const boom = new Error("db down");
    trending.mockRejectedValue(boom);
    expect(await getWordTrend(1)).toBeUndefined();
    expect(reportError).toHaveBeenCalledWith(boom);
  });

  it("an empty ranking gives no trend and no second query", async () => {
    trending.mockResolvedValue([]);
    expect(await getWordTrend(1)).toBeUndefined();
    expect(find).not.toHaveBeenCalled();
  });

  it("asks for 14 days ending today and only the ranked words", async () => {
    trending.mockResolvedValue([{ views: 10, word: 5 }]);
    find.mockResolvedValue({ docs: [] });
    await getWordTrend(5);
    expect(trending).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ days: 7, limit: 10, today: "2026-11-08", type: "viewed" }),
    );
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          day: { greater_than_equal: "2026-10-26", less_than_equal: "2026-11-08" },
          word: { in: [5] },
        },
      }),
    );
  });

  it("drops stat rows whose word is not a plain id and builds the trend", async () => {
    trending.mockResolvedValue([{ views: 4, word: 5 }]);
    find.mockResolvedValue({
      docs: [
        { day: "2026-11-08", views: 4, word: 5 },
        { day: "2026-11-07", views: 99, word: { id: 5 } }, // populated relation: skipped
      ],
    });
    expect(await getWordTrend(5)).toEqual({
      bars: [0, 0, 0, 0, 0, 0, 4],
      change: null,
      rank: 1,
      views: 4,
    });
    expect(await getWordTrend(6)).toBeUndefined();
  });
});
