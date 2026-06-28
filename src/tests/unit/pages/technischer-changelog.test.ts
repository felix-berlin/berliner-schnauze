// @vitest-environment node
import { describe, expect, it, beforeAll, vi } from "vitest";
import { createAstroRender } from "../helpers";

vi.mock("@layouts/Layout.astro", async () => {
  const { default: MockLayout } = await import("../helpers/MockLayout.astro");
  return { default: MockLayout };
});

vi.mock("../../../../CHANGELOG.md", async () => {
  const { default: Content } = await import("../helpers/MockContent.astro");
  return { Content };
});

describe("technischer-changelog.astro", () => {
  let render: (props: Record<string, unknown>) => Promise<string>;

  beforeAll(async () => {
    const { default: Page } = await import("@/pages/technischer-changelog.astro");
    render = await createAstroRender(Page);
  }, 30_000);

  it("renders the .c-technical-changelog container", async () => {
    const result = await render({});
    expect(result).toContain("c-technical-changelog");
  });

  it("renders an article element", async () => {
    const result = await render({});
    expect(result).toContain("<article");
  });

  it("renders the mocked changelog content", async () => {
    const result = await render({});
    expect(result).toContain("mock-content");
  });
});
