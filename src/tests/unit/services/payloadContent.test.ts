import { beforeEach, describe, expect, it, vi } from "vitest";

const { getPayload, find, count } = vi.hoisted(() => ({ getPayload: vi.fn(), find: vi.fn(), count: vi.fn() }));
vi.mock("payload-app", () => ({ config: Promise.resolve({}), getPayload }));
vi.mock("astro:env/server", () => ({ PAYLOAD_SERVER_URL: "https://cms.example" }));
vi.mock("astro:env/client", () => ({ SHOW_TEST_DATA: false }));

const text = (value: string, format = 0) => ({ type: "text", text: value, format, detail: 0, mode: "normal", style: "", version: 1 });
const para = (...children: unknown[]) => ({ type: "paragraph", children, direction: "ltr", format: "", indent: 0, version: 1, textFormat: 0 });
const quote = (...children: unknown[]) => ({ type: "quote", children, direction: "ltr", format: "", indent: 0, version: 1 });
const upload = (value: unknown) => ({ type: "upload", relationTo: "media", value, fields: null, version: 3, format: "" });
const state = (...children: unknown[]) => ({ root: { type: "root", children, direction: "ltr", format: "", indent: 0, version: 1 } });
const img = { id: 3, url: "/api/media/file/bild.png", alt: "Ein Bild", width: 1600, height: 900, mimeType: "image/png" };

beforeEach(() => {
  vi.resetModules();
  find.mockReset();
  count.mockReset();
  getPayload.mockReset().mockResolvedValue({ find, count });
});

describe("toPostBlocks", () => {
  it("splits rich text into html, image and quote blocks with ascending order", async () => {
    const { toPostBlocks } = await import("@services/payload/posts.ts");
    const blocks = toPostBlocks(state(para(text("eins")), upload(img), para(text("zwei")), quote(text("Zitat", 1))));
    expect(blocks.map((b) => [b.name, b.order])).toEqual([["core/html", 0], ["core/image", 1], ["core/html", 2], ["core/quote", 3]]);
    expect(blocks[0].saveContent).toBe("<p>eins</p>");
    expect(blocks[1]).toMatchObject({ attributes: { url: "https://cms.example/api/media/file/bild.png", alt: "Ein Bild", width: "1600", height: "900" } });
    expect(blocks[3]).toMatchObject({ attributes: { value: "<p><strong>Zitat</strong></p>" } });
  });

  it("keeps consecutive non-image nodes in one html block", async () => {
    const { toPostBlocks } = await import("@services/payload/posts.ts");
    const blocks = toPostBlocks(state(para(text("a")), para(text("b"))));
    expect(blocks).toHaveLength(1);
    expect(blocks[0].saveContent).toBe("<p>a</p><p>b</p>");
  });

  it("drops uploads that are not populated images", async () => {
    const { toPostBlocks } = await import("@services/payload/posts.ts");
    expect(toPostBlocks(state(upload(7), upload({ ...img, mimeType: "audio/mpeg" })))).toEqual([]);
  });

  it.each([[null], [undefined]])("returns no blocks for %s", async (value) => {
    const { toPostBlocks } = await import("@services/payload/posts.ts");
    expect(toPostBlocks(value)).toEqual([]);
  });
});

describe("fetchAllPosts", () => {
  const post = {
    id: 5,
    slug: "kiezdeutsch",
    title: "Kiezdeutsch",
    excerpt: "Kurz & gut",
    publishedAt: "2025-05-01T08:00:00.000Z",
    featuredImage: { id: 9, url: "/api/media/file/titel.png", alt: "Titel" },
    content: state(para(text("Wort ".repeat(450)))),
    seo: { title: "SEO Titel", description: "Meta", noindex: false, nofollow: false },
  };

  it("maps a post to the shape the magazine pages read", async () => {
    find.mockResolvedValue({ docs: [post] });
    const { fetchAllPosts } = await import("@services/payload/posts.ts");
    const [node] = await fetchAllPosts();
    expect(node).toMatchObject({
      slug: "kiezdeutsch",
      title: "Kiezdeutsch",
      date: "2025-05-01T08:00:00",
      excerpt: "Kurz & gut",
      featuredImage: { node: { sourceUrl: "https://cms.example/api/media/file/titel.png", altText: "Titel" } },
      seo: { title: "SEO Titel", metaDesc: "Meta", readingTime: 3 },
    });
    expect(node.blocks).toHaveLength(1);
  });

  it("asks for published posts, newest first, and does not cache a failure", async () => {
    find.mockRejectedValueOnce(new Error("db down")).mockResolvedValue({ docs: [post] });
    const { fetchAllPosts } = await import("@services/payload/posts.ts");
    await expect(fetchAllPosts()).rejects.toThrow("db down");
    await fetchAllPosts();
    expect(find).toHaveBeenLastCalledWith(expect.objectContaining({ collection: "posts", sort: "-publishedAt", where: { _status: { equals: "published" } } }));
  });

  it("drops posts without a slug", async () => {
    find.mockResolvedValue({ docs: [post, { ...post, id: 6, slug: null }] });
    const { fetchAllPosts } = await import("@services/payload/posts.ts");
    expect((await fetchAllPosts()).map((p) => p.slug)).toEqual(["kiezdeutsch"]);
  });
});

describe("fetchAllThemen", () => {
  it("maps themen with their public word count and seo", async () => {
    find.mockResolvedValue({
      docs: [{ id: 2, name: "Essen & Trinken", slug: "essen", description: "Kulinarisches", seo: { title: "Essen", ogImage: { id: 1, url: "/api/media/file/e.png" } } }],
    });
    count.mockResolvedValue({ totalDocs: 42 });
    const { fetchAllThemen } = await import("@services/payload/themen.ts");
    expect(await fetchAllThemen()).toMatchObject([
      { name: "Essen & Trinken", slug: "essen", description: "Kulinarisches", count: 42, seo: { title: "Essen", opengraphImage: { sourceUrl: "https://cms.example/api/media/file/e.png" } } },
    ]);
    expect(count).toHaveBeenCalledWith(expect.objectContaining({ collection: "words", where: { and: [{ themen: { contains: 2 } }, { _status: { equals: "published" } }] } }));
  });
});

describe("fetchPagesBySlugs", () => {
  it("renders the content as html and keeps the seo", async () => {
    find.mockResolvedValue({ docs: [{ id: 1, slug: "impressum", title: "Impressum", content: state(para(text("Anschrift"))), seo: { title: "Impressum", noindex: true } }] });
    const { fetchPagesBySlugs } = await import("@services/payload/pages.ts");
    expect(await fetchPagesBySlugs(["impressum"])).toMatchObject([{ slug: "impressum", title: "Impressum", content: "<p>Anschrift</p>", seo: { title: "Impressum", metaRobotsNoindex: "noindex" } }]);
    expect(find).toHaveBeenCalledWith(expect.objectContaining({ collection: "pages", where: { slug: { in: ["impressum"] } } }));
  });
});
