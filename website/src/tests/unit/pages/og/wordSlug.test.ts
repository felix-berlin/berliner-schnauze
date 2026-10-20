import { beforeEach, describe, expect, it, vi } from "vitest";

const { renderOgImage, fetchWordBySlug } = vi.hoisted(() => ({
  fetchWordBySlug: vi.fn(),
  renderOgImage: vi.fn(),
}));

vi.mock("@services/ogImage.ts", () => ({ renderOgImage }));
vi.mock("@services/payload/words.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@services/payload/words.ts")>()),
  fetchWordBySlug,
}));
vi.mock("astro:env/server", () => ({ OG_CACHE_DIR: "/data/og" }));

import type { APIContext } from "astro";

import { GET } from "@/pages/og/[wordSlug].ts";

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
const call = (wordSlug: string | undefined) =>
  GET({ params: { wordSlug } } as unknown as APIContext);

beforeEach(() => {
  vi.clearAllMocks();
  renderOgImage.mockResolvedValue(PNG);
  const words = [
    {
      berlinerisch: "Wat",
      slug: "wat",
      translations: [{ translation: "was" }, { translation: "etwas" }],
    },
    { berlinerisch: "Nischt", slug: "nischt", translations: [] },
  ];
  fetchWordBySlug.mockImplementation(async (slug: string) => words.find((w) => w.slug === slug));
});

describe("og/[wordSlug] route", () => {
  it("renders a png with the headword as title and the translations as description", async () => {
    const res = await call("wat.png");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=86400");
    expect(renderOgImage).toHaveBeenCalledWith(
      expect.objectContaining({ cacheDir: "/data/og", description: "was, etwas", title: "Wat" }),
    );
  });

  it("omits an empty description", async () => {
    await call("nischt.png");
    const options = renderOgImage.mock.calls[0][0];
    expect(options.title).toBe("Nischt");
    expect(options.description).toBeUndefined();
  });

  it.each([["doesnotexist.png"], ["wat"], [undefined]])(
    "answers 404 for %s, leaving the cache policy to the middleware (no-store)",
    async (slug) => {
      const res = await call(slug);
      expect(res.status).toBe(404);
      expect(res.headers.has("Cache-Control")).toBe(false);
      expect(renderOgImage).not.toHaveBeenCalled();
    },
  );
});
