// @vitest-environment node
import FooterCalloutAnki from "@components/footer/FooterCalloutAnki.astro";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { createAstroRender } from "../../helpers/astro";

vi.mock("@styles/components/_footer-callout.scss", () => ({}));

let render: Awaited<ReturnType<typeof createAstroRender>>;
beforeAll(async () => {
  render = await createAstroRender(FooterCalloutAnki);
}, 30_000);

describe("FooterCalloutAnki", () => {
  it("shows the heading, the live word count and price, and one buy button", async () => {
    const html = await render({
      checkoutUrl: "https://example.test/buy",
      price: "5,99 €",
      wordCount: 5901,
    });
    expect(html).toContain("Na los, ab uff die Karten.");
    expect(html).toContain("5.901 Wörter Berliner Schnauze für 5,99 €");
    expect(html).toContain('href="https://example.test/buy"');
    expect(html).toContain("Full-Deck kaufen ᛫ 5,99 €");
    expect(html).toContain('data-track="Click Buy Full|farewell"');
    expect(html).not.toContain("Lite");
  });

  it("leaves out the price and the button without a checkout link", async () => {
    const html = await render({ wordCount: 1200 });
    expect(html).toContain("1.200 Wörter Berliner Schnauze.");
    expect(html).not.toContain("kaufen");
    expect(html).not.toContain("<a ");
  });

  it("labels the section by its heading", async () => {
    const html = await render({ wordCount: 10 });
    const id = /aria-labelledby="([^"]+)"/.exec(html)?.[1];
    expect(id).toBeTruthy();
    expect(html).toContain(`id="${id}"`);
  });
});
