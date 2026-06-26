// @vitest-environment node
import { describe, expect, it, beforeAll } from "vitest";
import { createAstroRender } from "../helpers";

describe("GameCtaCard.astro", () => {
  let render: (props: Record<string, unknown>) => Promise<string>;

  beforeAll(async () => {
    const { default: GameCtaCard } = await import("@components/GameCtaCard.astro");
    render = await createAstroRender(GameCtaCard);
  }, 30_000);

  it("renders .c-fact-card--hightlighted container", async () => {
    const result = await render({});
    expect(result).toContain("c-fact-card--hightlighted");
  });

  it("renders the headline text", async () => {
    const result = await render({});
    expect(result).toContain("Bist du'n echta Berliner?");
  });

  it("renders the description text", async () => {
    const result = await render({});
    expect(result).toContain("Erkennst du echtet Berlinerisch");
  });

  it("renders a link to /games/berliner-oder-nicht", async () => {
    const result = await render({});
    expect(result).toContain('href="/games/berliner-oder-nicht"');
  });

  it("renders the link with class c-fact-card__link", async () => {
    const result = await render({});
    expect(result).toContain("c-fact-card__link");
  });

  it("renders the CTA link text", async () => {
    const result = await render({});
    expect(result).toContain("Jetzt zocken");
  });

  it("renders headline as h3", async () => {
    const result = await render({});
    expect(result).toContain("c-fact-card__headline");
    expect(result).toMatch(/<h3/);
  });
});
