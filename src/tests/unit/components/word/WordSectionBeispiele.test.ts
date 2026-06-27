// @vitest-environment node
import { describe, expect, it, beforeAll } from "vitest";
import { createAstroRender } from "../../helpers";

describe("WordSectionBeispiele.astro", () => {
  let render: (props: Record<string, unknown>) => Promise<string>;

  beforeAll(async () => {
    const { default: WordSectionBeispiele } = await import(
      "@components/word/WordSectionBeispiele.astro"
    );
    render = await createAstroRender(WordSectionBeispiele);
  }, 30_000);

  it("renders nothing when examples are empty", async () => {
    const result = await render({ examples: [] });
    expect(result).not.toContain("Beispiele");
  });

  it("renders nothing when examples is null", async () => {
    const result = await render({ examples: null });
    expect(result).not.toContain("Beispiele");
  });

  it("renders the section when examples are present", async () => {
    const result = await render({
      examples: [{ example: "Det is keen Zufall." }],
    });
    expect(result).toContain("Beispiele");
    expect(result).toContain('id="beispiele"');
    expect(result).toContain("c-section-card");
  });

  it("renders the example text", async () => {
    const result = await render({
      examples: [{ example: "Det is keen Zufall." }],
    });
    expect(result).toContain("Det is keen Zufall.");
  });

  it("renders the section number element", async () => {
    const result = await render({
      examples: [{ example: "Det is keen Zufall." }],
    });
    expect(result).toContain("c-section-card__num");
  });

  it("renders aria-labelledby heading-beispiele", async () => {
    const result = await render({
      examples: [{ example: "Det is keen Zufall." }],
    });
    expect(result).toContain("heading-beispiele");
  });
});
