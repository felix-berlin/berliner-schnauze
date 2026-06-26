// @vitest-environment node
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import FactCard from "@components/FactCard.astro";

describe("FactCard.astro", () => {
  it("renders the headline inside .c-fact-card__headline", async () => {
    const container = await AstroContainer.create();
    const result = await container.renderToString(FactCard, {
      props: { headline: "Test Headline", text: "Test Text" },
    });
    expect(result).toContain("c-fact-card__headline");
    expect(result).toContain("Test Headline");
  });

  it("renders the text inside .c-fact-card__text", async () => {
    const container = await AstroContainer.create();
    const result = await container.renderToString(FactCard, {
      props: { headline: "Some Headline", text: "Some fact text" },
    });
    expect(result).toContain("c-fact-card__text");
    expect(result).toContain("Some fact text");
  });

  it("wraps content in .c-fact-card", async () => {
    const container = await AstroContainer.create();
    const result = await container.renderToString(FactCard, {
      props: { headline: "H", text: "T" },
    });
    expect(result).toContain("c-fact-card");
  });

  it("renders headline as h3", async () => {
    const container = await AstroContainer.create();
    const result = await container.renderToString(FactCard, {
      props: { headline: "My Headline", text: "My text" },
    });
    expect(result).toMatch(/<h3[^>]*>.*My Headline.*<\/h3>/s);
  });

  it("renders text as p", async () => {
    const container = await AstroContainer.create();
    const result = await container.renderToString(FactCard, {
      props: { headline: "H", text: "My paragraph text" },
    });
    expect(result).toMatch(/<p[^>]*>.*My paragraph text.*<\/p>/s);
  });

  it("renders HTML in headline via set:html", async () => {
    const container = await AstroContainer.create();
    const result = await container.renderToString(FactCard, {
      props: { headline: "<strong>Bold</strong>", text: "plain" },
    });
    expect(result).toContain("<strong>Bold</strong>");
  });

  it("renders HTML in text via set:html", async () => {
    const container = await AstroContainer.create();
    const result = await container.renderToString(FactCard, {
      props: { headline: "H", text: "<em>Italic</em>" },
    });
    expect(result).toContain("<em>Italic</em>");
  });
});
