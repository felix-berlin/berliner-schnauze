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
  it("splits rich text at images into html strings and absolute media", async () => {
    const { toPostBlocks } = await import("@services/payload/posts.ts");
    const blocks = toPostBlocks(
      state(para(text("eins")), upload(img), para(text("zwei")), quote(text("Zitat", 1))),
    );
    expect(blocks).toEqual([
      "<p>eins</p>",
      { ...img, descriptionHtml: null, url: "https://cms.example/api/media/file/bild.png" },
      '<p>zwei</p><blockquote class="c-magazin-article__quote"><p><strong>Zitat</strong></p></blockquote>',
    ]);
  });

  it("keeps consecutive non-image nodes in one html block", async () => {
    const { toPostBlocks } = await import("@services/payload/posts.ts");
    expect(toPostBlocks(state(para(text("a")), para(text("b"))))).toEqual(["<p>a</p><p>b</p>"]);
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
    meta: { description: "Meta", nofollow: false, noindex: false, title: "SEO Titel" },
    publishedAt: "2025-05-01T08:00:00.000Z",
    slug: "kiezdeutsch",
    title: "Kiezdeutsch",
  };

  it("maps a post to the Payload fields the magazine pages read", async () => {
    find.mockResolvedValue({ docs: [post] });
    const { fetchAllPosts } = await import("@services/payload/posts.ts");
    const [node] = await fetchAllPosts();
    expect(node).toMatchObject({
      contentModifiedAt: "2026-02-03T04:05:06.000Z",
      excerpt: "Kurz & gut",
      featuredImage: { alt: "Titel", url: "https://cms.example/api/media/file/titel.png" },
      meta: { description: "Meta", title: "SEO Titel" },
      publishedAt: "2025-05-01T08:00:00.000Z",
      readingTime: 3,
      slug: "kiezdeutsch",
      title: "Kiezdeutsch",
    });
    expect(node.blocks).toHaveLength(1);
  });

  it("has no featured image when the media is not populated", async () => {
    find.mockResolvedValue({ docs: [{ ...post, featuredImage: 9 }] });
    const { fetchAllPosts } = await import("@services/payload/posts.ts");
    expect((await fetchAllPosts())[0].featuredImage).toBeNull();
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
    meta: null,
    name,
    slug,
  });

  it("maps themen with their public word count and meta, sorted by name (de)", async () => {
    find.mockImplementation(({ collection }: { collection: string }) =>
      Promise.resolve(
        collection === "themen"
          ? {
              docs: [
                thema(3, "Zoo", "zoo"),
                {
                  ...thema(2, "Essen & Trinken", "essen"),
                  description: "Kulinarisches",
                  meta: { image: { id: 1, url: "/api/media/file/e.png" }, title: "Essen" },
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
        // the plugin meta group as stored: the page maps it with metaToSeo
        meta: { image: { id: 1, url: "/api/media/file/e.png" }, title: "Essen" },
        name: "Essen & Trinken",
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
  it("renders the content as html and keeps the meta group", async () => {
    find.mockResolvedValue({
      docs: [
        {
          content: state(para(text("Anschrift"))),
          id: 1,
          meta: { noindex: true, title: "Impressum" },
          slug: "impressum",
          title: "Impressum",
        },
      ],
    });
    const { fetchPagesBySlugs } = await import("@services/payload/pages.ts");
    expect(await fetchPagesBySlugs(["impressum"])).toMatchObject([
      {
        contentHtml: "<p>Anschrift</p>",
        meta: { noindex: true, title: "Impressum" },
        slug: "impressum",
        title: "Impressum",
      },
    ]);
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({ collection: "pages", where: { slug: { in: ["impressum"] } } }),
    );
  });
});
