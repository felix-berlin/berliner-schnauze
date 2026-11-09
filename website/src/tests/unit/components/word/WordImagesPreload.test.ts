// @vitest-environment node
import { beforeAll, describe, expect, it, vi } from "vitest";

import { createAstroRender } from "../../helpers";

vi.mock("@styles/components/_word-images.scss", () => ({}));

// The container has no Imagor service, so getImage yields no srcset; this file fakes one to cover the preload link.
const { getImage } = vi.hoisted(() => ({ getImage: vi.fn() }));
vi.mock("astro:assets", async (importOriginal) => ({
  ...(await importOriginal<typeof import("astro:assets")>()),
  getImage,
}));

const image = (i: number) => ({
  alt: `Bild ${i}`,
  credit: null,
  height: 600,
  src: `https://cms.example.com/${i}.jpg`,
  width: 800,
});

describe("WordImages.astro preload", () => {
  let render: (props: Record<string, unknown>) => Promise<string>;

  beforeAll(async () => {
    const { default: WordImages } = await import("@components/word/WordImages.astro");
    render = await createAstroRender(WordImages);
  }, 30_000);

  it("preloads only the first image, scoped to the viewport where its copy is visible", async () => {
    getImage.mockResolvedValue({ srcSet: { attribute: "/a.webp 220w, /b.webp 330w" } });
    const hero = await render({ images: [image(1), image(2)], placement: "hero" });
    expect(hero.match(/rel="preload"/g)).toHaveLength(1);
    expect(hero).toContain('imagesrcset="/a.webp 220w, /b.webp 330w"');
    expect(hero).toContain('media="(min-width: 808px)"');
    expect(hero).toContain('imagesizes="(max-width: 999px) 70vw, 380px"');
    expect(getImage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        src: "https://cms.example.com/1.jpg",
        widths: [220, 330, 440, 660],
      }),
    );

    const strip = await render({ images: [image(1)], placement: "strip" });
    expect(strip).toContain('media="(max-width: 807.98px)"');
    expect(strip).toContain('imagesizes="82vw"');
  });

  it("emits no preload link when the image service returns no srcset", async () => {
    getImage.mockResolvedValue({ srcSet: { attribute: "" } });
    expect(await render({ images: [image(1)], placement: "strip" })).not.toContain('rel="preload"');
  });
});
