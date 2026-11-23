// @vitest-environment node
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { beforeAll, describe, expect, it } from "vitest";

describe("SectionCard.astro", () => {
  let render: (props: Record<string, unknown>, slots?: Record<string, string>) => Promise<string>;

  beforeAll(async () => {
    const { default: SectionCard } = await import("@components/word/SectionCard.astro");
    const container = await AstroContainer.create();
    render = (props, slots) => container.renderToString(SectionCard, { props, slots });
  }, 30_000);

  const props = { id: "demo", title: "Demo" };

  it("renders an h3 and the v18 sheet variant", async () => {
    const html = await render(props, { default: "x" });
    expect(html).toMatch(/<h3 [^>]*>Demo<\/h3>/);
    expect(html).toContain('data-variant="sheet v18"');
  });

  it("wires aria-labelledby and the heading id; the section itself has no id (the wrapper owns the anchor)", async () => {
    const html = await render(props, { default: "x" });
    expect(html).not.toMatch(/<section[^>]* id=/);
    expect(html).toContain('aria-labelledby="heading-demo"');
    expect(html).toContain('id="heading-demo"');
  });

  it("renders body and footer slots", async () => {
    const html = await render(props, { default: "<p>Body</p>", footer: "Quelle" });
    expect(html).toContain('<div class="body" data-slot><p>Body</p></div>');
    expect(html).toMatch(/<footer[^>]*>Quelle<\/footer>/);
  });

  it("omits an empty or whitespace-only body and footer", async () => {
    const html = await render(props, { default: "  \n ", footer: "   " });
    expect(html).not.toContain('class="body"');
    expect(html).not.toContain("<footer");
    expect(await render(props)).not.toContain('class="body"');
  });

  it("renders the pill as a real button, and with a gap the gap box instead of the pill", async () => {
    const card = { ...props, contribute: "example" };
    const html = await render(card, { default: "<p>Nachbar</p>" });
    expect(html).not.toMatch(/<section[^>]* id=/);
    expect(html).toContain('id="heading-demo"');
    expect(html).toMatch(
      /<button[^>]*type="button"[^>]*data-contribute="example"[^>]*>[\s\S]*Ergänzen/,
    );
    const gap = await render(
      { ...card, gap: { cta: "Los", text: "Nüscht da." } },
      { default: "<p>Nachbar</p>" },
    );
    expect(gap).toContain("Nüscht da.");
    expect(gap).toContain("Los");
    expect(gap).toContain("<p>Nachbar</p>");
    expect(gap).not.toContain("Ergänzen");
  });

  it("shows no pill while the gap is shown, only the gap button", async () => {
    const html = await render({
      ...props,
      contribute: "fact",
      gap: { cta: "Los", text: "Nüscht." },
    });
    expect(html).not.toContain('class="add"');
    expect(html.match(/data-contribute="fact"/g)).toHaveLength(1);
  });
});
