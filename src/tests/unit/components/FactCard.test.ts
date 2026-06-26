// @vitest-environment node
import { describe, expect, it, beforeAll } from "vitest";
import { createAstroRender } from "../helpers";

describe("FactCard.astro", () => {
  let render: (props: Record<string, unknown>) => Promise<string>;

  beforeAll(async () => {
    const { default: FactCard } = await import("@components/FactCard.astro");
    render = await createAstroRender(FactCard);
  }, 30_000);

  it("renders the headline inside .c-fact-card__headline", async () => {
    const result = await render({ headline: "Test Headline", text: "Test Text" });
    expect(result).toContain("c-fact-card__headline");
    expect(result).toContain("Test Headline");
  });

  it("renders the text inside .c-fact-card__text", async () => {
    const result = await render({ headline: "Some Headline", text: "Some fact text" });
    expect(result).toContain("c-fact-card__text");
    expect(result).toContain("Some fact text");
  });

  it("wraps content in .c-fact-card", async () => {
    const result = await render({ headline: "H", text: "T" });
    expect(result).toContain("c-fact-card");
  });

  it("renders headline as h3", async () => {
    const result = await render({ headline: "My Headline", text: "My text" });
    expect(result).toMatch(/<h3[^>]*>.*My Headline.*<\/h3>/s);
  });

  it("renders text as p", async () => {
    const result = await render({ headline: "H", text: "My paragraph text" });
    expect(result).toMatch(/<p[^>]*>.*My paragraph text.*<\/p>/s);
  });

  it("renders HTML in headline via set:html", async () => {
    const result = await render({ headline: "<strong>Bold</strong>", text: "plain" });
    expect(result).toContain("<strong>Bold</strong>");
  });

  it("renders HTML in text via set:html", async () => {
    const result = await render({ headline: "H", text: "<em>Italic</em>" });
    expect(result).toContain("<em>Italic</em>");
  });
});
