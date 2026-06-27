// @vitest-environment node
import { describe, expect, it, beforeAll } from "vitest";
import { createAstroRender } from "../../helpers";

describe("WordLearnMore.astro", () => {
  let render: (props: Record<string, unknown>) => Promise<string>;

  beforeAll(async () => {
    const { default: WordLearnMore } = await import(
      "@components/word/WordLearnMore.astro"
    );
    render = await createAstroRender(WordLearnMore);
  }, 30_000);

  it("renders the learn more link", async () => {
    const result = await render({ learnMore: "https://de.wikipedia.org/wiki/Schnauze" });
    expect(result).toContain("c-single-word__learn-more-link");
    expect(result).toContain("Erfahre mehr über dieses Wort");
  });

  it("renders the correct href", async () => {
    const result = await render({ learnMore: "https://de.wikipedia.org/wiki/Schnauze" });
    expect(result).toContain('href="https://de.wikipedia.org/wiki/Schnauze"');
  });

  it("opens in a new tab with noopener noreferrer", async () => {
    const result = await render({ learnMore: "https://de.wikipedia.org/wiki/Schnauze" });
    expect(result).toContain('target="_blank"');
    expect(result).toContain('rel="noopener noreferrer"');
  });

  it("renders the icon wrapper", async () => {
    const result = await render({ learnMore: "https://de.wikipedia.org/wiki/Schnauze" });
    expect(result).toContain("c-single-word__learn-more-link-icon");
  });
});
