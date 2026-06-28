// @vitest-environment node
import { describe, expect, it, beforeAll, vi } from "vitest";
import { createAstroRender } from "../../helpers";

vi.mock("@layouts/Layout.astro", async () => {
  const { default: MockLayout } = await import("../../helpers/MockLayout.astro");
  return { default: MockLayout };
});

vi.mock("astro:content", () => ({
  getCollection: vi.fn(async () => [
    {
      id: "v3.36.0",
      data: {
        version: "3.36.0",
        releaseDate: "2026-07-01",
        title: "Was ist neu in Version 3.36.0?",
        description: "Neueste Version.",
      },
    },
    {
      id: "v3.35.0",
      data: {
        version: "3.35.0",
        releaseDate: "2026-06-27",
        title: "Was ist neu in Version 3.35.0?",
        description: "Berliner oder Nicht-Spiel und Redesign.",
      },
    },
  ]),
  render: vi.fn(),
}));

describe("changelog/index.astro", () => {
  let render: (props: Record<string, unknown>) => Promise<string>;

  beforeAll(async () => {
    const { default: Page } = await import("@/pages/changelog/index.astro");
    render = await createAstroRender(Page);
  }, 30_000);

  it("renders the .c-changelog-overview container", async () => {
    const result = await render({});
    expect(result).toContain("c-changelog-overview");
  });

  it("renders the page heading", async () => {
    const result = await render({});
    expect(result).toContain("Was ist neu?");
  });

  it("renders links to each changelog version", async () => {
    const result = await render({});
    expect(result).toContain('href="/changelog/3.35.0"');
    expect(result).toContain('href="/changelog/3.36.0"');
  });

  it("renders each entry title as link text", async () => {
    const result = await render({});
    expect(result).toContain("Was ist neu in Version 3.35.0?");
    expect(result).toContain("Was ist neu in Version 3.36.0?");
  });

  it("renders time elements with correct datetime attributes", async () => {
    const result = await render({});
    expect(result).toContain('datetime="2026-06-27"');
    expect(result).toContain('datetime="2026-07-01"');
  });

  it("sorts entries newest-first (3.36.0 before 3.35.0)", async () => {
    const result = await render({});
    const idx36 = result.indexOf("/changelog/3.36.0");
    const idx35 = result.indexOf("/changelog/3.35.0");
    expect(idx36).toBeLessThan(idx35);
  });

  it("renders entry descriptions", async () => {
    const result = await render({});
    expect(result).toContain("Berliner oder Nicht-Spiel und Redesign.");
  });

  it("renders list items with class .c-changelog-overview__item", async () => {
    const result = await render({});
    expect(result).toContain("c-changelog-overview__item");
  });
});
