// @vitest-environment node
import { describe, expect, it, beforeAll } from "vitest";

import { createAstroRender } from "../../helpers";

const ref = (slug: string) => ({ berlinerisch: slug, id: slug.length, slug });

describe("WordNeighborhood.astro", () => {
  let render: (props: Record<string, unknown>) => Promise<string>;

  beforeAll(async () => {
    const { default: WordNeighborhood } = await import("@components/word/WordNeighborhood.astro");
    render = await createAstroRender(WordNeighborhood);
  }, 30_000);

  const base = { after: [ref("c")], before: [ref("a")], exclude: [], related: [], word: "b" };

  it("marks the current word with aria-current", async () => {
    const result = await render(base);
    expect(result).toMatch(/aria-current="page"[^>]*>\s*<span aria-hidden="true">●<\/span>b/);
    expect(result).toContain('id="navigation"');
    expect(result).not.toContain('id="verwandte"');
  });

  it("drops excluded related words", async () => {
    const result = await render({
      ...base,
      exclude: ["kiez"],
      related: [ref("kiez"), ref("molle")],
    });
    expect(result).toContain('id="verwandte"');
    expect(result).toContain(">molle<");
    expect(result).not.toContain(">kiez<");
  });

  it("renders nothing when nothing is left", async () => {
    const result = await render({
      ...base,
      after: [],
      before: [],
      exclude: ["kiez"],
      related: [ref("kiez")],
    });
    expect(result).not.toContain("verwandte-worte");
  });
});
