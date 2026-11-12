// @vitest-environment node
import { describe, expect, it, beforeAll } from "vitest";

import { createAstroRender } from "../../helpers";

describe("NextLinks.astro", () => {
  let render: (props: Record<string, unknown>) => Promise<string>;
  const words = [{ berlinerisch: "Kiez", id: 1, slug: "kiez" }];

  beforeAll(async () => {
    const { default: NextLinks } = await import("@components/word/NextLinks.astro");
    render = await createAstroRender(NextLinks);
  }, 30_000);

  it("always shows random, index and suggest tiles", async () => {
    const result = await render({ words });
    for (const label of ["Zufälliges Wort", "Wort-Index", "Wort vorschlagen"])
      expect(result).toContain(label);
    expect(result).not.toContain("Ooch im Trend");
  });

  it("adds the trend tile, without a subtitle, only for a trending word", async () => {
    const result = await render({ trending: true, words });
    expect(result).toContain("<b>Ooch im Trend</b></span>");
    expect(result.match(/class="c-next-link"/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
  });
});
