// @vitest-environment node
import { describe, expect, it, beforeAll } from "vitest";

import { createAstroRender } from "../../helpers";

describe("ArticleBlocks.astro", () => {
  let render: (props: Record<string, unknown>) => Promise<string>;

  beforeAll(async () => {
    const { default: ArticleBlocks } = await import("@components/magazin/ArticleBlocks.astro");
    render = await createAstroRender(ArticleBlocks);
  }, 30_000);

  const media = {
    createdAt: "",
    id: 1,
    updatedAt: "",
    url: "https://cms.berliner-schnauze.wtf/wp-content/uploads/baer.jpg",
  };

  it("renders html blocks as they are", async () => {
    const result = await render({ blocks: ["<p>Icke bin Berliner.</p>"] });
    expect(result).toContain("<p>Icke bin Berliner.</p>");
  });

  it("renders the blocks in the order given", async () => {
    const result = await render({ blocks: ["<p>Erster</p>", media, "<p>Zweiter</p>"] });
    expect(result.indexOf("Erster")).toBeLessThan(result.indexOf("c-magazin-article__image"));
    expect(result.indexOf("c-magazin-article__image")).toBeLessThan(result.indexOf("Zweiter"));
  });

  it("renders nothing for an image without a url", async () => {
    const result = await render({ blocks: [{ ...media, url: null }] });
    expect(result).not.toContain("c-magazin-article__image");
  });

  it("renders a Picture for an image with its alt text and dimensions", async () => {
    const result = await render({
      blocks: [{ ...media, alt: "Ein Berliner Bär", height: 300, width: 600 }],
    });
    expect(result).toContain("c-magazin-article__image");
    expect(result).toContain("Ein Berliner Bär");
  });

  it("falls back to default dimensions and empty alt when the media omits them", async () => {
    const result = await render({ blocks: [media] });
    expect(result).toContain("c-magazin-article__image");
    expect(result).not.toMatch(/alt="[^"]+"/);
  });
});
