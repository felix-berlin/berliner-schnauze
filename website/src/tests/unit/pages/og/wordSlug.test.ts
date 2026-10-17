import { beforeEach, describe, expect, it, vi } from "vitest";

const { generateOpenGraphImage, fetchAllWords } = vi.hoisted(() => ({
  fetchAllWords: vi.fn(),
  generateOpenGraphImage: vi.fn(),
}));

vi.mock("astro-og-canvas", () => ({ generateOpenGraphImage }));
vi.mock("@services/api.ts", () => ({ fetchAllWords }));
vi.mock("astro:env/server", () => ({ OG_CACHE_DIR: "/data/og" }));

import type { APIContext } from "astro";

import { GET } from "@/pages/og/[wordSlug].ts";

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
const call = (wordSlug: string | undefined) =>
  GET({ params: { wordSlug } } as unknown as APIContext);

beforeEach(() => {
  vi.clearAllMocks();
  generateOpenGraphImage.mockResolvedValue(PNG);
  fetchAllWords.mockResolvedValue([
    {
      berlinerisch: "Wat",
      slug: "wat",
      translations: [{ translation: "was" }, { translation: "etwas" }],
    },
    { berlinerisch: "", slug: "nischt", translations: [] },
  ]);
});

describe("og/[wordSlug] route", () => {
  it("renders a png with the headword as title and the translations as description", async () => {
    const res = await call("wat.png");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=86400");
    expect(generateOpenGraphImage).toHaveBeenCalledWith(
      expect.objectContaining({ cacheDir: "/data/og", description: "was, etwas", title: "Wat" }),
    );
  });

  it("falls back to the slug without a headword and omits an empty description", async () => {
    await call("nischt.png");
    const options = generateOpenGraphImage.mock.calls[0][0];
    expect(options.title).toBe("nischt");
    expect(options.description).toBeUndefined();
  });

  it.each([["doesnotexist.png"], ["wat"], [undefined]])(
    "answers 404 without caching for %s",
    async (slug) => {
      const res = await call(slug);
      expect(res.status).toBe(404);
      expect(res.headers.get("Cache-Control")).toBe("no-store");
      expect(generateOpenGraphImage).not.toHaveBeenCalled();
    },
  );
});
