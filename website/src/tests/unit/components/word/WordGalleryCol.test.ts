// @vitest-environment node
import { describe, expect, it, beforeAll } from "vitest";

import { createAstroRender } from "../../helpers";

const image = (id: string) => ({
  altText: `Bild ${id}`,
  id,
  mediaDetails: { height: 600, width: 800 },
  sourceUrl: `https://cms.example.com/${id}.jpg`,
});

describe("WordGalleryCol.astro", () => {
  let render: (props: Record<string, unknown>) => Promise<string>;

  beforeAll(async () => {
    const { default: WordGalleryCol } = await import("@components/word/WordGalleryCol.astro");
    render = await createAstroRender(WordGalleryCol);
  }, 30_000);

  it("renders the gallery aside without learn-more by default", async () => {
    const result = await render({ images: { nodes: [image("a")] } });
    expect(result).toContain('aria-label="Bildergalerie"');
    expect(result).toContain("658px");
    expect(result).not.toContain("c-learn-more");
  });

  it("uses the two-column sizes for multiple images", async () => {
    const result = await render({ images: { nodes: [image("a"), image("b")] } });
    expect(result).toContain("435px");
  });

  it("renders the learn-more block when given", async () => {
    const result = await render({ images: null, learnMore: "<p>Mehr dazu</p>" });
    expect(result).toContain("Mehr dazu");
  });
});
