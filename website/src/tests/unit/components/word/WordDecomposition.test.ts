// @vitest-environment node
import { beforeAll, describe, expect, it, vi } from "vitest";

import { createAstroRender } from "../../helpers";

vi.mock("@utils/helpers", () => ({
  routeToWord: vi.fn((slug?: string) => (slug ? `/wort/${slug}` : "/wort/")),
}));

describe("WordDecomposition.astro", () => {
  let render: (props: Record<string, unknown>) => Promise<string>;

  beforeAll(async () => {
    const { default: WordDecomposition } = await import("@components/word/WordDecomposition.astro");
    render = await createAstroRender(WordDecomposition);
  }, 30_000);

  const word = (slug: string, berlinerisch = slug) => ({ berlinerisch, slug });

  it("renders nothing when the word is not a compound", async () => {
    expect(await render({ allWords: [], parts: [] })).not.toContain("Wortzerlegung");
  });

  it("renders nothing for a single part", async () => {
    expect(await render({ allWords: [], parts: ["bahn"] })).not.toContain("Wortzerlegung");
  });

  it("links parts that are words and shows the rest as plain text", async () => {
    const result = await render({ allWords: [word("bahn", "Bahn")], parts: ["bahn", "hof"] });
    expect(result).toContain("Wortzerlegung");
    expect(result).toContain('href="/wort/bahn"');
    expect(result).toMatch(/<a [^>]*>\s*Bahn\s*<\/a>/);
    expect(result).toContain(">Hof</span>");
    expect(result).toContain("c-single-word__word-parts-plus");
  });

  it("prefers the last word when duplicates match a part", async () => {
    const result = await render({
      allWords: [word("bahn-alt", "bahn"), word("bahn-neu", "Bahn")],
      parts: ["bahn", "hof"],
    });
    expect(result).toContain('href="/wort/bahn-neu"');
    expect(result).not.toContain("bahn-alt");
  });
});
