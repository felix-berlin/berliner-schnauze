// @vitest-environment node
import { beforeAll, describe, expect, it, vi } from "vitest";

import { createAstroRender } from "../../helpers";

vi.mock("@styles/components/_word-themes.scss", () => ({}));

describe("WordThemes.astro", () => {
  let render: (props: Record<string, unknown>) => Promise<string>;

  beforeAll(async () => {
    const { default: WordThemes } = await import("@components/word/WordThemes.astro");
    render = await createAstroRender(WordThemes);
  }, 30_000);

  it("renders nothing without themes", async () => {
    expect((await render({ themes: [] })).trim()).toBe("");
  });

  it("labels a single theme 'Thema' and links it", async () => {
    const result = await render({ themes: [{ label: "Essen", url: "/themen/essen" }] });
    expect(result).toMatch(/<p class="c-word-themes">/);
    expect(result).toMatch(/<span class="t-label">Thema<\/span>/);
    expect(result).toContain('href="/themen/essen"');
  });

  it("labels several themes 'Themen' and hides the separator from screen readers", async () => {
    const result = await render({
      themes: [
        { label: "Alltag & Wohnen", url: "/themen/alltag" },
        { label: "Berlin & Orte", url: "/themen/orte" },
      ],
    });
    expect(result).toMatch(/<span class="t-label">Themen<\/span>/);
    expect(result.match(/<a /g)).toHaveLength(2);
    expect(result.match(/<span aria-hidden="true">·<\/span>/g)).toHaveLength(1);
  });
});
