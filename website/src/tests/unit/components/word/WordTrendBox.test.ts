// @vitest-environment node
import { beforeAll, describe, expect, it, vi } from "vitest";

import { createAstroRender } from "../../helpers";

vi.mock("@styles/components/_word-trend.scss", () => ({}));

describe("WordTrendBox.astro", () => {
  let render: (props: Record<string, unknown>) => Promise<string>;

  beforeAll(async () => {
    const { default: WordTrendBox } = await import("@components/word/WordTrendBox.astro");
    render = await createAstroRender(WordTrendBox);
  }, 30_000);

  it("shows rank, views and the signed change to the week before", async () => {
    const html = await render({ bars: [0, 2, 4, 1, 0, 3, 10], change: 12, rank: 3, views: 1234 });
    expect(html).toContain("Platz 3");
    expect(html).toContain("1.234 Aufrufe in 7 Tagen · +12 % zur Vorwoche");
    expect(html.match(/<span style="height: /g)).toHaveLength(7);
    expect(html).toContain("height: 100%"); // the peak
    expect(html).toContain("height: 10%"); // zero days keep a visible stub
  });

  it("leaves out the comparison when there is no change value", async () => {
    const html = await render({ bars: [1, 1, 1, 1, 1, 1, 1], change: null, rank: 1, views: 7 });
    expect(html).toContain("7 Aufrufe in 7 Tagen");
    expect(html).not.toContain("zur Vorwoche");
  });
});
