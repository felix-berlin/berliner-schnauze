// @vitest-environment node
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { beforeAll, describe, expect, it } from "vitest";

describe("SectionCard.astro", () => {
  let render: (
    props: Record<string, unknown>,
    slots?: Record<string, string>,
  ) => Promise<string>;

  beforeAll(async () => {
    const { default: SectionCard } = await import("@components/word/SectionCard.astro");
    const container = await AstroContainer.create();
    render = (props, slots) => container.renderToString(SectionCard, { props, slots });
  }, 30_000);

  const props = { id: "demo", title: "Demo" };

  it("renders an h2 by default and an h3 for level 3", async () => {
    expect(await render(props, { default: "x" })).toMatch(/<h2 [^>]*>Demo<\/h2>/);
    expect(await render({ ...props, level: 3 }, { default: "x" })).toMatch(/<h3 [^>]*>Demo<\/h3>/);
  });

  it("wires the section id, aria-labelledby and the heading id", async () => {
    const html = await render(props, { default: "x" });
    expect(html).toContain('id="demo"');
    expect(html).toContain('aria-labelledby="heading-demo"');
    expect(html).toContain('id="heading-demo"');
  });

  it("renders body and footer slots", async () => {
    const html = await render(props, { default: "<p>Body</p>", footer: "Quelle" });
    expect(html).toContain('<div class="c-section-card__body"><p>Body</p></div>');
    expect(html).toContain("c-section-card__footer");
  });

  it("omits an empty or whitespace-only body and footer", async () => {
    const html = await render(props, { default: "  \n ", footer: "   " });
    expect(html).not.toContain("c-section-card__body");
    expect(html).not.toContain("c-section-card__footer");
    expect(await render(props)).not.toContain("c-section-card__body");
  });
});
