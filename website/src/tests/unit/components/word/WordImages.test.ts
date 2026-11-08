// @vitest-environment node
import { beforeAll, describe, expect, it, vi } from "vitest";

import { createAstroRender } from "../../helpers";

vi.mock("@styles/components/_word-images.scss", () => ({}));

const image = (i: number, credit: string | null = null) => ({
  alt: `Bild ${i}`,
  credit,
  height: 600,
  src: `https://cms.example.com/${i}.jpg`,
  width: 800,
});

describe("WordImages.astro", () => {
  let render: (props: Record<string, unknown>) => Promise<string>;

  beforeAll(async () => {
    const { default: WordImages } = await import("@components/word/WordImages.astro");
    render = await createAstroRender(WordImages);
  }, 30_000);

  it("renders one full-width figure and no thumbs for a single image", async () => {
    const result = await render({ images: [image(1)], placement: "strip" });
    expect(result.match(/<figure/g)).toHaveLength(1);
    expect(result).toContain("c-image-strip--single");
  });

  it("renders a labelled section with an opener button per image", async () => {
    const result = await render({ images: [image(1), image(2)], placement: "strip" });
    expect(result).toContain('aria-label="Bilder"');
    expect(result).toContain('aria-label="Bild 2 von 2 vergrößern: Bild 2"');
    expect(result).toContain('data-lightbox-index="1"');
    expect(result).toMatch(/<img[^>]*\salt(=""|\s)/);
    expect(result).not.toContain("c-image-strip--single");
  });

  it("shows the credit as Foto caption, and no caption without credit", async () => {
    const result = await render({ images: [image(1, "A, CC BY"), image(2)], placement: "strip" });
    expect(result).toContain("Foto: A, CC BY");
    expect(result.match(/<figcaption/g)).toHaveLength(1);
  });

  it("renders the learn-more link", async () => {
    const result = await render({ images: [image(1)], learnMore: "https://de.wikipedia.org/x", placement: "strip" });
    expect(result).toContain('href="https://de.wikipedia.org/x"');
    expect(result).toContain("Erfahre mehr über dieses Wort");
  });

  it("loads lazily except the first hero image", async () => {
    const hero = await render({ images: [image(1), image(2)], placement: "hero" });
    const strip = await render({ images: [image(1), image(2)], placement: "strip" });
    expect(hero.match(/loading="eager"/g)).toHaveLength(1);
    expect(strip).not.toContain('loading="eager"');
  });
});
