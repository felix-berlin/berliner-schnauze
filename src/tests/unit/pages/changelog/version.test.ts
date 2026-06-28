// @vitest-environment node
import { describe, expect, it, beforeAll, vi } from "vitest";
import { createAstroRender } from "../../helpers";

const { mockEntry } = vi.hoisted(() => ({
  mockEntry: {
    id: "v3.35.0",
    data: {
      version: "3.35.0",
      releaseDate: "2026-06-27",
      title: "Was ist neu in Version 3.35.0?",
      description: "Berliner oder Nicht-Spiel und Redesign.",
    },
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

describe("changelog/[version].astro — getStaticPaths", () => {
  it("returns one path per changelog entry", async () => {
    const { getStaticPaths } = await import("@/pages/changelog/[version].astro");
    const paths = await getStaticPaths();
    expect(paths).toHaveLength(1);
    expect(paths[0].params.version).toBe("3.35.0");
    expect(paths[0].props.entry).toBe(mockEntry);
  });
});

describe("changelog/[version].astro — rendering", () => {
  let render: (props: Record<string, unknown>) => Promise<string>;

  beforeAll(async () => {
    const { default: Page } = await import("@/pages/changelog/[version].astro");
    render = await createAstroRender(Page);
  }, 30_000);

  it("renders the .c-user-changelog article", async () => {
    const result = await render({ entry: mockEntry });
    expect(result).toContain("c-user-changelog");
  });

  it("renders the entry title in an h1", async () => {
    const result = await render({ entry: mockEntry });
    expect(result).toContain("Was ist neu in Version 3.35.0?");
    expect(result).toMatch(/<h1/);
  });

  it("renders a time element with the releaseDate as datetime", async () => {
    const result = await render({ entry: mockEntry });
    expect(result).toContain('datetime="2026-06-27"');
  });

  it("renders the date formatted in German locale", async () => {
    const result = await render({ entry: mockEntry });
    expect(result).toContain("27.");
    expect(result).toContain("Juni");
    expect(result).toContain("2026");
  });

  it("renders the content wrapper .c-user-changelog__content", async () => {
    const result = await render({ entry: mockEntry });
    expect(result).toContain("c-user-changelog__content");
  });

  it("renders the mocked entry content", async () => {
    const result = await render({ entry: mockEntry });
    expect(result).toContain("mock-content");
  });
});
