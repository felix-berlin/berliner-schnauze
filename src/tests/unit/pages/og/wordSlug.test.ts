import { beforeEach, describe, expect, it, vi } from "vitest";

const { OGImageRoute, fetchAllWords } = vi.hoisted(() => ({
  OGImageRoute: vi.fn(async () => ({ GET: vi.fn(), getStaticPaths: vi.fn() })),
  fetchAllWords: vi.fn(),
}));
const env = vi.hoisted(() => ({ E2E_WORD_LIMIT: undefined as number | undefined }));

vi.mock("astro-og-canvas", () => ({ OGImageRoute }));
vi.mock("@services/api.ts", () => ({ fetchAllWords }));
vi.mock("astro:env/server", () => env);

type Page = { berlinerisch: string; translation: string };
type Options = {
  getImageOptions: (slug: string, page: Page) => { title: string; description?: string };
  pages: Record<string, Page>;
};

const load = async (): Promise<Options> => {
  vi.resetModules();
  await import("@/pages/og/[wordSlug].ts");
  return (OGImageRoute.mock.calls[0] as unknown as [Options])[0];
};

describe("og/[wordSlug] route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    env.E2E_WORD_LIMIT = undefined;
    fetchAllWords.mockResolvedValue([
      { slug: "wat", translations: ["was", "etwas"], wordProperties: { berlinerisch: "Wat" } },
      { slug: "nischt", translations: [], wordProperties: { berlinerisch: "" } },
    ]);
  });

  it("builds one page per word, falling back to the slug without a headword", async () => {
    const { pages } = await load();
    expect(pages).toEqual({
      nischt: { berlinerisch: "nischt", translation: "" },
      wat: { berlinerisch: "Wat", translation: "was, etwas" },
    });
  });

  it("uses headword as title and translations as description", async () => {
    const { getImageOptions } = await load();
    expect(getImageOptions("wat", { berlinerisch: "Wat", translation: "was" })).toMatchObject({
      description: "was",
      title: "Wat",
    });
  });

  it("omits the description when there is no translation", async () => {
    const { getImageOptions } = await load();
    expect(
      getImageOptions("x", { berlinerisch: "X", translation: "" }).description,
    ).toBeUndefined();
  });

  it("skips fetching words in the E2E build", async () => {
    env.E2E_WORD_LIMIT = 500;
    const { pages } = await load();
    expect(pages).toEqual({});
    expect(fetchAllWords).not.toHaveBeenCalled();
  });
});
