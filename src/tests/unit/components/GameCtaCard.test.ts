// @vitest-environment node
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import GameCtaCard from "@components/GameCtaCard.astro";

describe("GameCtaCard.astro", () => {
  it("renders .c-fact-card--hightlighted container", async () => {
    const container = await AstroContainer.create();
    const result = await container.renderToString(GameCtaCard, {});
    expect(result).toContain("c-fact-card--hightlighted");
  });

  it("renders the headline text", async () => {
    const container = await AstroContainer.create();
    const result = await container.renderToString(GameCtaCard, {});
    expect(result).toContain("Bist du'n echta Berliner?");
  });

  it("renders the description text", async () => {
    const container = await AstroContainer.create();
    const result = await container.renderToString(GameCtaCard, {});
    expect(result).toContain("Erkennst du echtet Berlinerisch");
  });

  it("renders a link to /games/berliner-oder-nicht", async () => {
    const container = await AstroContainer.create();
    const result = await container.renderToString(GameCtaCard, {});
    expect(result).toContain('href="/games/berliner-oder-nicht"');
  });

  it("renders the link with class c-fact-card__link", async () => {
    const container = await AstroContainer.create();
    const result = await container.renderToString(GameCtaCard, {});
    expect(result).toContain("c-fact-card__link");
  });

  it("renders the CTA link text", async () => {
    const container = await AstroContainer.create();
    const result = await container.renderToString(GameCtaCard, {});
    expect(result).toContain("Jetzt zocken");
  });

  it("renders headline as h3", async () => {
    const container = await AstroContainer.create();
    const result = await container.renderToString(GameCtaCard, {});
    expect(result).toContain("c-fact-card__headline");
    expect(result).toMatch(/<h3/);
  });
});
