import { beforeEach, describe, expect, it, vi } from "vitest";

const { count, find } = vi.hoisted(() => ({ count: vi.fn(), find: vi.fn() }));
vi.mock("@services/payload.ts", () => ({ getPayloadClient: async () => ({ count, find }) }));

const load = () => import("@services/payload/stories.ts");

beforeEach(() => {
  vi.resetModules(); // a fresh ttl cache per test
  vi.resetAllMocks();
  find.mockResolvedValue({ docs: [] });
  count.mockResolvedValue({ totalDocs: 0 });
});

describe("fetchStories", () => {
  it("reads once per word within the TTL, again for another word", async () => {
    const { fetchStories } = await load();
    await fetchStories(1, 3);
    await fetchStories(1, 3);
    expect(count).toHaveBeenCalledTimes(1);
    await fetchStories(2, 3);
    expect(count).toHaveBeenCalledTimes(2);
  });

  it("skips the featured query when the word has no Jeschichten", async () => {
    const { fetchStories } = await load();
    expect(await fetchStories(1, 3)).toEqual({ featured: null, items: [], total: 0 });
    expect(find).toHaveBeenCalledTimes(1);
  });
});
