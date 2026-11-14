// @vitest-environment node
import { describe, expect, it, vi, beforeAll } from "vitest";

import { createAstroRender } from "../../helpers";

vi.mock("@styles/components/_word-sidebar.scss", () => ({}));

const sections = [
  { id: "bedeutung", label: "Bedeutung" },
  { id: "analyse", label: "Analyse" },
  { id: "verwandte-worte", label: "Umfeld" },
];

const defaultProps = {
  posLabel: "Nomen",
  sections,
  word: { berlinerisch: "Schnauze" },
};

describe("WordSidebar.astro", () => {
  let render: (props: Record<string, unknown>) => Promise<string>;

  beforeAll(async () => {
    const { default: WordSidebar } = await import("@components/word/WordSidebar.astro");
    render = await createAstroRender(WordSidebar);
  }, 30_000);

  it("renders the aside with the word title", async () => {
    const result = await render(defaultProps);
    expect(result).toContain("<aside");
    expect(result).toContain('class="title"');
    expect(result).toContain("Schnauze");
  });

  it("shows the part-of-speech label as subtitle", async () => {
    const result = await render(defaultProps);
    expect(result).toContain('class="subtitle"');
    expect(result).toContain("Nomen");
  });

  it("omits the subtitle without a part-of-speech label", async () => {
    const result = await render({ ...defaultProps, posLabel: undefined });
    expect(result).not.toContain('class="subtitle"');
  });

  it("renders one flat link per section in the given order", async () => {
    const result = await render(defaultProps);
    const hrefs = [...result.matchAll(/href="(#[^"]+)"/g)].map((m) => m[1]);
    expect(hrefs).toEqual(["#bedeutung", "#analyse", "#verwandte-worte"]);
    expect(result).toContain("Umfeld");
  });

  it("renders the nav with aria-label Seitennavigation", async () => {
    const result = await render(defaultProps);
    expect(result).toContain("Seitennavigation");
  });
});
