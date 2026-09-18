// @vitest-environment node
import { describe, expect, it, beforeAll } from "vitest";

import { createAstroRender } from "../../helpers";

const makeWordRef = (berlinerisch: string, slug = "test-slug") => ({
  id: "test-id",
  slug,
  wordProperties: { berlinerisch },
});

describe("WordSectionNachbarn.astro", () => {
  let render: (props: Record<string, unknown>) => Promise<string>;

  beforeAll(async () => {
    const { default: WordSectionNachbarn } =
      await import("@components/word/WordSectionNachbarn.astro");
    render = await createAstroRender(WordSectionNachbarn);
  }, 30_000);

  it("renders nothing when neighbors are empty", async () => {
    const result = await render({ neighbors: { after: [], before: [] } });
    expect(result).not.toContain("Alphabetische Nachbarn");
  });

  it("renders the section when before neighbors are present", async () => {
    const result = await render({
      neighbors: { after: [], before: [makeWordRef("Affe", "affe")] },
    });
    expect(result).toContain("Alphabetische Nachbarn");
    expect(result).toContain('id="navigation"');
    expect(result).toContain("c-section-card");
  });

  it("renders the section when after neighbors are present", async () => {
    const result = await render({
      neighbors: { after: [makeWordRef("Zille", "zille")], before: [] },
    });
    expect(result).toContain("Alphabetische Nachbarn");
  });

  it("renders the section number element", async () => {
    const result = await render({
      neighbors: { after: [], before: [makeWordRef("Affe", "affe")] },
    });
    expect(result).toContain("c-section-card__num");
  });

  it("renders aria-labelledby heading-navigation", async () => {
    const result = await render({
      neighbors: { after: [], before: [makeWordRef("Affe", "affe")] },
    });
    expect(result).toContain("heading-navigation");
  });
});
