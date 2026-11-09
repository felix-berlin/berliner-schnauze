// @vitest-environment node
import { beforeAll, describe, expect, it, vi } from "vitest";

import { createAstroRender } from "../../helpers";

vi.mock("@styles/components/_word-trend.scss", () => ({}));

const props = { bars: [1, 2, 3, 4, 5, 6, 10], change: 12, rank: 2, views: 1234 };

describe("WordTrendBox.astro", () => {
  let render: (props: Record<string, unknown>) => Promise<string>;

  beforeAll(async () => {
    const { default: WordTrendBox } = await import("@components/word/WordTrendBox.astro");
    render = await createAstroRender(WordTrendBox);
  }, 30_000);

  it("shows the rank, the views in de-DE and the signed change to last week", async () => {
    const result = await render(props);
    expect(result).toContain("Platz 2");
    expect(result).toContain("1.234 Aufrufe in 7 Tagen · +12 % zur Vorwoche");
    expect(result).toContain('href="/wort"');
  });

  it("omits the change part when there is no comparison week", async () => {
    const result = await render({ ...props, change: null });
    expect(result).toContain("1.234 Aufrufe in 7 Tagen");
    expect(result).not.toContain("zur Vorwoche");
  });

  it("formats a drop with a minus sign and no change as ±0", async () => {
    expect(await render({ ...props, change: -5 })).toContain("−5 % zur Vorwoche");
    expect(await render({ ...props, change: 0 })).toContain("±0 % zur Vorwoche");
  });

  it("draws one bar per day scaled to the highest, with a 10% floor", async () => {
    const result = await render(props);
    const heights = [...result.matchAll(/height: (\d+)%/g)].map((m) => Number(m[1]));
    expect(heights).toEqual([10, 20, 30, 40, 50, 60, 100]);
    expect(await render({ ...props, bars: [0, 0, 0, 0, 0, 0, 0] })).not.toMatch(
      /height: (?!10%)\d+%/,
    );
  });
});
