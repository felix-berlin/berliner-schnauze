// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";

import { createAstroRender } from "../../helpers";

const topic = (i: number, saying?: string) => ({
  count: 100 + i,
  examples: ["Quark", "Wolke"],
  name: `Thema ${i}`,
  slug: `thema-${i}`,
  ...(saying ? { saying } : {}),
});

describe("TopicRegister.astro", () => {
  let render: (props: Record<string, unknown>) => Promise<string>;

  beforeAll(async () => {
    render = await createAstroRender(
      (await import("@components/home/TopicRegister.astro")).default,
    );
  }, 30_000);

  it("renders six numbered rows linking to the topic route", async () => {
    const html = await render({ topics: [1, 2, 3, 4, 5, 6].map((i) => topic(i)) });
    expect(html.match(/<li>/g)).toHaveLength(6);
    for (const no of ["01", "02", "03", "04", "05", "06"]) expect(html).toContain(`>${no}</span>`);
    expect(html).toContain('href="/themen/thema-1"');
    expect(html).toContain("Quark, Wolke");
    expect(html).toMatch(/101\s*<small>Wörter<\/small>/);
    expect(html).toContain('<a href="/themen" class="all">Alle Themen</a>');
  });

  it("renders the speech bubble only for a topic with a saying", async () => {
    const html = await render({ topics: [topic(1, "Erfundener Satz"), topic(2), topic(3)] });
    expect(html.match(/class="say"/g)).toHaveLength(1);
    expect(html).toMatch(/<span class="say" aria-hidden="true">\s*„Erfundener Satz“\s*<\/span>/);
  });

  it("renders nothing without topics or with fewer than three (SPEC §19)", async () => {
    expect(await render({ topics: [] })).not.toContain("c-home-topics");
    expect(await render({ topics: [topic(1), topic(2)] })).not.toContain("c-home-topics");
    expect(await render({ topics: [1, 2, 3].map((i) => topic(i)) })).toContain("c-home-topics");
  });
});
