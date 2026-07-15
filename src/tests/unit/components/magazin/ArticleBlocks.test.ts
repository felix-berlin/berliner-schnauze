// @vitest-environment node
import { describe, expect, it, beforeAll } from "vitest";
import { createAstroRender } from "../../helpers";

describe("ArticleBlocks.astro", () => {
  let render: (props: Record<string, unknown>) => Promise<string>;

  beforeAll(async () => {
    const { default: ArticleBlocks } = await import("@components/magazin/ArticleBlocks.astro");
    render = await createAstroRender(ArticleBlocks);
  }, 30_000);

  it("passes a paragraph block through via the saveContent fallback", async () => {
    const result = await render({
      blocks: [{ name: "core/paragraph", order: 0, saveContent: "<p>Icke bin Berliner.</p>" }],
    });
    expect(result).toContain("<p>Icke bin Berliner.</p>");
  });

  it("passes an unknown/future block type through via the saveContent fallback", async () => {
    const result = await render({
      blocks: [
        { name: "core/some-future-block", order: 0, saveContent: "<div>Future content</div>" },
      ],
    });
    expect(result).toContain("<div>Future content</div>");
  });

  it("renders blocks in ascending order regardless of input order", async () => {
    const result = await render({
      blocks: [
        { name: "core/paragraph", order: 1, saveContent: "<p>Zweiter</p>" },
        { name: "core/paragraph", order: 0, saveContent: "<p>Erster</p>" },
      ],
    });
    expect(result.indexOf("Erster")).toBeLessThan(result.indexOf("Zweiter"));
  });

  it("renders a core/quote block using the typed quote value", async () => {
    const result = await render({
      blocks: [
        {
          name: "core/quote",
          order: 0,
          saveContent: "<blockquote><p>Icke, icke, icke!</p></blockquote>",
          attributes: { value: "<p>Icke, icke, icke!</p>" },
        },
      ],
    });
    expect(result).toContain("c-magazin-article__quote");
    expect(result).toContain("Icke, icke, icke!");
  });

  it("renders nothing for a core/image block without a url", async () => {
    const result = await render({
      blocks: [{ name: "core/image", order: 0, saveContent: "", attributes: {} }],
    });
    expect(result).not.toContain("c-magazin-article__image");
  });
});
