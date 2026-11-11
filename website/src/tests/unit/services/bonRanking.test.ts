import { beforeEach, describe, expect, it, vi } from "vitest";

const find = vi.hoisted(() => vi.fn());
vi.mock("@services/payload.ts", () => ({ getPayloadClient: async () => ({ find }) }));

import { invalidateRanking, loadRanking } from "@services/bonRanking.ts";

beforeEach(() => {
  find.mockReset().mockResolvedValue({ docs: [] });
  invalidateRanking();
});

describe("loadRanking", () => {
  it("serves the cache until invalidated, then loads fresh", async () => {
    await loadRanking("week");
    await loadRanking("week");
    expect(find).toHaveBeenCalledTimes(1);
    invalidateRanking();
    await loadRanking("week");
    expect(find).toHaveBeenCalledTimes(2);
  });

  it("invalidates every period", async () => {
    await loadRanking("week");
    await loadRanking("all");
    invalidateRanking();
    await loadRanking("week");
    await loadRanking("all");
    expect(find).toHaveBeenCalledTimes(4);
  });
});
