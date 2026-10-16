import { beforeEach, describe, expect, it, vi } from "vitest";

const { getPayload, find } = vi.hoisted(() => ({
  find: vi.fn(),
  getPayload: vi.fn(),
}));
vi.mock("payload-app", () => ({ config: Promise.resolve({}), getPayload }));
vi.mock("astro:env/server", () => ({ PAYLOAD_SERVER_URL: "https://cms.example" }));
vi.mock("astro:env/client", () => ({ SHOW_TEST_DATA: false }));

const text = (value: string, format = 0) => ({
  detail: 0,
  format,
  mode: "normal",
  style: "",
  text: value,
  type: "text",
  version: 1,
});
const para = (...children: unknown[]) => ({
  children,
  direction: "ltr",
  format: "",
  indent: 0,
  textFormat: 0,
  type: "paragraph",
  version: 1,
});
const quote = (...children: unknown[]) => ({
  children,
  direction: "ltr",
  format: "",
  indent: 0,
  type: "quote",
  version: 1,
});
const upload = (value: unknown) => ({
  fields: null,
  format: "",
  relationTo: "media",
  type: "upload",
  value,
  version: 3,
});
const state = (...children: unknown[]) => ({
  root: { children, direction: "ltr", format: "", indent: 0, type: "root", version: 1 },
});
const img = {
  alt: "Ein Bild",
  height: 900,
  id: 3,
  mimeType: "image/png",
  url: "/api/media/file/bild.png",
  width: 1600,
};

beforeEach(() => {
  vi.resetModules();
  find.mockReset();
  getPayload.mockReset().mockResolvedValue({ find });
});

describe("toPostBlocks", () => {
  it("splits rich text into html, image and quote blocks with ascending order", async () => {
    const { toPostBlocks } = await import("@services/payload/posts.ts");
    const blocks = toPostBlocks(
      state(para(text("eins")), upload(img), para(text("zwei")), quote(text("Zitat", 1))),
    );
    expect(blocks.map((b) => [b.name, b.order])).toEqual([
      ["core/html", 0],
      ["core/image", 1],
      ["core/html", 2],
      ["core/quote", 3],
    ]);
    expect(blocks[0].saveContent).toBe("<p>eins</p>");
    expect(blocks[1]).toMatchObject({
      attributes: {
        alt: "Ein Bild",
        height: "900",
        url: "https://cms.example/api/media/file/bild.png",
        width: "1600",
      },
    });
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
    content: state(para(text("Wort ".repeat(450)))),
    contentModifiedAt: "2026-02-03T04:05:06.000Z",
    excerpt: "Kurz & gut",
    featuredImage: { alt: "Titel", id: 9, url: "/api/media/file/titel.png" },
    id: 5,
    publishedAt: "2025-05-01T08:00:00.000Z",
    seo: { description: "Meta", nofollow: false, noindex: false, title: "SEO Titel" },
    slug: "kiezdeutsch",
    title: "Kiezdeutsch",
  };

  it("maps a post to the shape the magazine pages read", async () => {
    find.mockResolvedValue({ docs: [post] });
    const { fetchAllPosts } = await import("@services/payload/posts.ts");
    const [node] = await fetchAllPosts();
    expect(node).toMatchObject({
      // WP `date` is local (Berlin) time: 08:00 UTC is 10:00 in summer
      date: "2025-05-01T10:00:00",
      excerpt: "Kurz & gut",
      featuredImage: {
        node: { altText: "Titel", sourceUrl: "https://cms.example/api/media/file/titel.png" },
      },
      modifiedGmt: "2026-02-03T04:05:06",
      seo: {
        metaDesc: "Meta",
        opengraphSiteName: "Berliner Schnauze",
        opengraphType: "article",
        readingTime: 3,
        title: "SEO Titel",
      },
      slug: "kiezdeutsch",
      title: "Kiezdeutsch",
    });
    expect(node.blocks).toHaveLength(1);
  });

  it("converts the publish date to Berlin local time, also in winter", async () => {
    find.mockResolvedValue({ docs: [{ ...post, publishedAt: "2025-01-15T08:00:00.000Z" }] });
    const { fetchAllPosts } = await import("@services/payload/posts.ts");
    expect((await fetchAllPosts())[0].date).toBe("2025-01-15T09:00:00");
  });

  it("asks for published posts, newest first, and does not cache a failure", async () => {
    find.mockRejectedValueOnce(new Error("db down")).mockResolvedValue({ docs: [post] });
    const { fetchAllPosts } = await import("@services/payload/posts.ts");
    await expect(fetchAllPosts()).rejects.toThrow("db down");
    await fetchAllPosts();
    expect(find).toHaveBeenLastCalledWith(
      expect.objectContaining({
        collection: "posts",
        sort: "-publishedAt",
        where: { _status: { equals: "published" } },
      }),
    );
  });

  it("drops posts without a slug", async () => {
    find.mockResolvedValue({ docs: [post, { ...post, id: 6, slug: null }] });
    const { fetchAllPosts } = await import("@services/payload/posts.ts");
    expect((await fetchAllPosts()).map((p) => p.slug)).toEqual(["kiezdeutsch"]);
  });
});

describe("fetchAllThemen", () => {
  const thema = (id: number, name: string, slug: string | null) => ({
    description: null,
    id,
    name,
    seo: null,
    slug,
  });

  it("maps themen with their public word count and seo, sorted by name (de)", async () => {
    find.mockImplementation(({ collection }: { collection: string }) =>
      Promise.resolve(
        collection === "themen"
          ? {
              docs: [
                thema(3, "Zoo", "zoo"),
                {
                  ...thema(2, "Essen & Trinken", "essen"),
                  description: "Kulinarisches",
                  seo: { ogImage: { id: 1, url: "/api/media/file/e.png" }, title: "Essen" },
                },
                thema(4, "Ohne Slug", null),
              ],
            }
          : { docs: [{ themen: [2, 3] }, { themen: [2] }, { themen: null }] },
      ),
    );
    const { fetchAllThemen } = await import("@services/payload/themen.ts");
    expect(await fetchAllThemen()).toMatchObject([
      {
        count: 2,
        description: "Kulinarisches",
        name: "Essen & Trinken",
        seo: {
          opengraphImage: { sourceUrl: "https://cms.example/api/media/file/e.png" },
          title: "Essen",
        },
        slug: "essen",
      },
      { count: 1, name: "Zoo", slug: "zoo" },
    ]);
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: "words",
        where: { _status: { equals: "published" } },
      }),
    );
  });
});

describe("fetchPagesBySlugs", () => {
  it("renders the content as html and keeps the seo", async () => {
    find.mockResolvedValue({
      docs: [
        {
          content: state(para(text("Anschrift"))),
          id: 1,
          seo: { noindex: true, title: "Impressum" },
          slug: "impressum",
          title: "Impressum",
        },
      ],
    });
    const { fetchPagesBySlugs } = await import("@services/payload/pages.ts");
    expect(await fetchPagesBySlugs(["impressum"])).toMatchObject([
      {
        content: "<p>Anschrift</p>",
        seo: { metaRobotsNoindex: "noindex", title: "Impressum" },
        slug: "impressum",
        title: "Impressum",
      },
    ]);
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({ collection: "pages", where: { slug: { in: ["impressum"] } } }),
    );
  });
});
