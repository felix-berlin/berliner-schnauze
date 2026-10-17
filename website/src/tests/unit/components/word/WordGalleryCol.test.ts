// @vitest-environment node
import { describe, expect, it, beforeAll } from "vitest";

import { createAstroRender } from "../../helpers";

const image = (id: number) => ({
  alt: `Bild ${id}`,
  caption: null,
  descriptionHtml: null,
  height: 600,
  id,
  url: `https://cms.example.com/${id}.jpg`,
  width: 800,
});

describe("WordGalleryCol.astro", () => {
  let render: (props: Record<string, unknown>) => Promise<string>;

  beforeAll(async () => {
    const { default: WordGalleryCol } = await import("@components/word/WordGalleryCol.astro");
    render = await createAstroRender(WordGalleryCol);
  }, 30_000);

  it("renders the gallery aside without learn-more by default", async () => {
    const result = await render({ images: [image(1)] });
    expect(result).toContain('aria-label="Bildergalerie"');
    expect(result).toContain("658px");
    expect(result).not.toContain("c-learn-more");
  });

  it("uses the two-column sizes for multiple images", async () => {
    const result = await render({ images: [image(1), image(2)] });
    expect(result).toContain("435px");
  });

  it("renders the learn-more block when given", async () => {
    const result = await render({ images: [], learnMore: "<p>Mehr dazu</p>" });
    expect(result).toContain("Mehr dazu");
  });
});
