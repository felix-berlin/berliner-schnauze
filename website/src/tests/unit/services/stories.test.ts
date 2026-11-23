import { beforeEach, describe, expect, it, vi } from "vitest";

const { find } = vi.hoisted(() => ({ find: vi.fn() }));
vi.mock("@services/payload.ts", () => ({ getPayloadClient: async () => ({ find }) }));

const load = () => import("@services/payload/stories.ts");

beforeEach(() => {
  vi.resetModules(); // a fresh ttl cache per test
  vi.resetAllMocks();
  find.mockResolvedValue({ docs: [], hasNextPage: false, totalDocs: 0 });
});

const doc = (id: number) => ({ createdAt: "2026-01-01T00:00:00.000Z", id, text: `Story ${id}` });
const comment = (collection: string) =>
  find.mock.calls.map((c) => c[0]).filter((a) => a.collection === collection);

describe("fetchStories", () => {
  it("reads once per word and page within the TTL, again for another word or page", async () => {
    const { fetchStories } = await load();
    await fetchStories(1, 1);
    await fetchStories(1, 1);
    expect(find).toHaveBeenCalledTimes(2); // featured + page
    await fetchStories(2, 1);
    expect(find).toHaveBeenCalledTimes(4);
    await fetchStories(1, 2); // beyond the last page: answered empty, no read, no cache slot
    expect(find).toHaveBeenCalledTimes(4);
  });

  it("reads a page within the range once, again only for a new page", async () => {
    find.mockResolvedValue({ docs: [], hasNextPage: true, totalDocs: 45 });
    const { fetchStories } = await load();
    await fetchStories(1, 3);
    await fetchStories(1, 3);
    expect(find).toHaveBeenCalledTimes(4); // page 1 (featured + list), page 3 (featured + list)
    const far = await fetchStories(1, 99_999);
    expect(far).toEqual({ featured: null, hasMore: false, items: [], page: 99_999, total: 45 });
    expect(find).toHaveBeenCalledTimes(4);
  });

  it("returns an empty page for a word without Jeschichten", async () => {
    const { fetchStories } = await load();
    expect(await fetchStories(1, 1)).toEqual({
      featured: null,
      hasMore: false,
      items: [],
      page: 1,
      total: 0,
    });
  });

  it("pages 20 at a time, excludes the featured one and counts it in the total", async () => {
    find.mockImplementation(async ({ where }) =>
      where.featured
        ? { docs: [doc(7)] }
        : { docs: [doc(9), doc(8)], hasNextPage: true, totalDocs: 40 },
    );
    const { fetchStories } = await load();
    const body = await fetchStories(1, 2);
    const [featuredQuery] = comment("comments");
    const pageQuery = comment("comments").at(-1);
    expect(pageQuery).toMatchObject({ limit: 20, page: 2, sort: "-createdAt" });
    expect(pageQuery.where.id).toEqual({ not_equals: 7 });
    expect(body).toMatchObject({ hasMore: true, page: 2, total: 41 });
    expect(body.items.map((i) => i.id)).toEqual(["9", "8"]);
    expect(body.featured).toBeNull(); // only page 1 carries it
    expect(featuredQuery.where.featured).toEqual({ equals: true });
    expect((await (await load()).fetchStories(1, 1)).featured?.id).toBe("7");
  });
});
