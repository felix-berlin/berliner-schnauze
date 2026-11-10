// @vitest-environment node
import { describe, expect, it, beforeAll } from "vitest";

import { createAstroRender } from "../../helpers";

describe("WordSectionBeispiele.astro", () => {
  let render: (props: Record<string, unknown>) => Promise<string>;

  beforeAll(async () => {
    const { default: WordSectionBeispiele } =
      await import("@components/word/WordSectionBeispiele.astro");
    render = await createAstroRender(WordSectionBeispiele);
  }, 30_000);

  it("renders nothing when examples are empty", async () => {
    const result = await render({ examples: [] });
    expect(result).not.toContain("Beispiele");
  });

  it("renders the section when examples are present", async () => {
    const result = await render({
      examples: [{ example: "Det is keen Zufall.", exampleAudio: [] }],
    });
    expect(result).toContain("Beispiele");
    expect(result).toContain('id="beispiele"');
    expect(result).toContain("c-section-card");
  });

  it("renders the example text", async () => {
    const result = await render({
      examples: [{ example: "Det is keen Zufall.", exampleAudio: [] }],
    });
    expect(result).toContain("Det is keen Zufall.");
  });

  it("renders each example with its explanation and no audio group without audio", async () => {
    const result = await render({
      examples: [
        { example: "Zweet Satz.", exampleAudio: [], exampleExplanation: "Und noch eene." },
        { example: "Dritter Satz.", exampleAudio: [] },
      ],
    });
    expect(result).toContain("Zweet Satz.");
    expect(result).toContain("– Und noch eene.");
    expect(result.match(/<li/g)).toHaveLength(2);
    expect(result).not.toContain("c-voice-buttons");
    expect(result).not.toContain("anhören");
  });

  it("renders aria-labelledby heading-beispiele", async () => {
    const result = await render({
      examples: [{ example: "Det is keen Zufall.", exampleAudio: [] }],
    });
    expect(result).toContain("heading-beispiele");
  });
});
