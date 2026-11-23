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

// A small in-memory comments table: 45 published stories, newest first (ids 45..1), `featuredId` flagged.
describe("fetchStories against a fake table", () => {
  const fake = (featuredId?: number) => {
    const rows = Array.from({ length: 45 }, (_, i) => ({
      ...doc(45 - i),
      featured: 45 - i === featuredId,
    }));
    find.mockImplementation(async ({ limit, page = 1, where }) => {
      const hit = rows.filter(
        (r) => (!where.featured || r.featured) && (!where.id || r.id !== where.id.not_equals),
      );
      const docs = hit.slice((page - 1) * limit, page * limit);
      return { docs, hasNextPage: page * limit < hit.length, totalDocs: hit.length };
    });
  };
  const ids = (b: { items: { id: string }[] }) => b.items.map((i) => i.id);

  it("without a featured story: the 20 newest, 45 in total", async () => {
    fake();
    const { fetchStories } = await load();
    const body = await fetchStories(1, 1);
    expect(body).toMatchObject({ featured: null, hasMore: true, page: 1, total: 45 });
    expect(ids(body)).toEqual(Array.from({ length: 20 }, (_, i) => String(45 - i)));
  });

  it("with a featured story on the first page: it leaves the list, the page stays full", async () => {
    fake(44);
    const { fetchStories } = await load();
    const body = await fetchStories(1, 1);
    expect(body).toMatchObject({ hasMore: true, page: 1, total: 45 });
    expect(body.featured?.id).toBe("44");
    expect(ids(body)).toEqual(["45", ...Array.from({ length: 19 }, (_, i) => String(43 - i))]);
  });

  it("with a featured story deeper in the list: page 1 is the 20 newest, page 2 skips it", async () => {
    fake(10);
    const { fetchStories } = await load();
    const first = await fetchStories(1, 1);
    expect(first.featured?.id).toBe("10");
    expect(ids(first)).toEqual(Array.from({ length: 20 }, (_, i) => String(45 - i)));
    const third = await fetchStories(1, 3);
    expect(third).toMatchObject({ featured: null, hasMore: false, page: 3, total: 45 });
    expect(ids(third)).toEqual(["4", "3", "2", "1"]);
  });

  it("no hasMore when the featured one is the only row over a page", async () => {
    find.mockReset();
    const rows = Array.from({ length: 21 }, (_, i) => ({ ...doc(21 - i), featured: i === 5 }));
    find.mockImplementation(async ({ limit, where }) => {
      const hit = rows.filter((r) => !where.featured || r.featured);
      return { docs: hit.slice(0, limit), hasNextPage: false, totalDocs: hit.length };
    });
    const { fetchStories } = await load();
    const body = await fetchStories(1, 1);
    expect(body).toMatchObject({ hasMore: false, total: 21 });
    expect(body.items).toHaveLength(20);
  });
});
