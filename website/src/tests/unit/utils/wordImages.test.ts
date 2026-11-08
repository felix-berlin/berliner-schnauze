import { describe, expect, it } from "vitest";

import { toWordImages } from "@utils/wordImages.ts";

const media = (overrides: Record<string, unknown> = {}) => ({
  alt: "Alt",
  caption: null,
  descriptionHtml: null,
  height: 600,
  id: 1,
  mimeType: "image/png",
  url: "https://cms.example.com/1.png",
  width: 800,
  ...overrides,
});

describe("toWordImages", () => {
  it("takes the credit from the description html, unwrapping a single paragraph", () => {
    const [image] = toWordImages([media({ descriptionHtml: "<p>Foto A, CC BY 4.0</p>" })], "Wort");
    expect(image?.credit).toBe("Foto A, CC BY 4.0");
  });

  it("keeps links of the description", () => {
    const html = '<p>A, <a href="https://example.org">CC BY</a></p>';
    expect(toWordImages([media({ descriptionHtml: html })], "Wort")[0]?.credit).toContain("<a href=");
  });

  it("falls back to the caption as escaped text, without a leading Credit:", () => {
    const [image] = toWordImages([media({ caption: "Credit: A <b>" })], "Wort");
    expect(image?.credit).toBe("A &lt;b&gt;");
  });

  it("has no credit when neither description nor caption exist", () => {
    expect(toWordImages([media()], "Wort")[0]?.credit).toBeNull();
  });

  it("falls back to the word for a missing alt", () => {
    expect(toWordImages([media({ alt: null })], "Wort")[0]?.alt).toBe("Wort");
  });
});
