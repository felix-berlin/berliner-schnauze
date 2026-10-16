import { describe, expect, it, beforeAll, vi } from "vitest";

import { createAstroRender } from "../../helpers";

const { mockEntry } = vi.hoisted(() => ({
  mockEntry: {
    data: {
      description: "Berliner oder Nicht-Spiel und Redesign.",
      releaseDate: "2026-06-27",
      title: "Was ist neu in Version 3.35.0?",
      version: "3.35.0",
    },
    id: "v3.35.0",
  },
}));

vi.mock("@layouts/Layout.astro", async () => {
  const { default: MockLayout } = await import("../../helpers/MockLayout.astro");
  return { default: MockLayout };
});

vi.mock("astro:content", async () => {
  const { default: MockContent } = await import("../../helpers/MockContent.astro");
  return {
    getCollection: vi.fn(async () => [mockEntry]),
    render: vi.fn(async () => ({ Content: MockContent, headings: [] })),
  };
});

describe("changelog/[version].astro — rendering", () => {
  let render: (props?: Record<string, unknown>, params?: Record<string, string>) => Promise<string>;

  beforeAll(async () => {
    const { default: Page } = await import("@/pages/changelog/[version].astro");
    render = await createAstroRender(Page);
  }, 30_000);

  it("does not render an entry for an unknown version", async () => {
    const result = await render({}, { version: "9.9.9" }).catch(() => "");
    expect(result).not.toContain("c-user-changelog__content");
  });

  it("renders the .c-user-changelog article", async () => {
    const result = await render({}, { version: "3.35.0" });
    expect(result).toContain("c-user-changelog");
  });

  it("renders the entry title in an h1", async () => {
    const result = await render({}, { version: "3.35.0" });
    expect(result).toContain("Was ist neu in Version 3.35.0?");
    expect(result).toMatch(/<h1/);
  });

  it("renders a time element with the releaseDate as datetime", async () => {
    const result = await render({}, { version: "3.35.0" });
    expect(result).toContain('datetime="2026-06-27"');
  });

  it("renders the date formatted in German locale", async () => {
    const result = await render({}, { version: "3.35.0" });
    expect(result).toContain("27.");
    expect(result).toContain("Juni");
    expect(result).toContain("2026");
  });

  it("renders the content wrapper .c-user-changelog__content", async () => {
    const result = await render({}, { version: "3.35.0" });
    expect(result).toContain("c-user-changelog__content");
  });

  it("renders the mocked entry content", async () => {
    const result = await render({}, { version: "3.35.0" });
    expect(result).toContain("mock-content");
  });
});
