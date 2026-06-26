// @vitest-environment node
import { describe, expect, it, beforeAll } from "vitest";
import { createAstroRender } from "../helpers";

describe("SetColorMode.astro", () => {
  let render: (props: Record<string, unknown>) => Promise<string>;

  beforeAll(async () => {
    const { default: SetColorMode } = await import("@components/SetColorMode.astro");
    render = await createAstroRender(SetColorMode);
  }, 30_000);

  it("renders a script tag", async () => {
    const result = await render({});
    expect(result).toContain("<script");
  });

  it("script references the darkMode storage key", async () => {
    const result = await render({});
    expect(result).toContain("darkMode");
  });

  it("script references the dark CSS class", async () => {
    const result = await render({});
    expect(result).toContain("dark");
  });

  it("script listens for astro:before-swap", async () => {
    const result = await render({});
    expect(result).toContain("astro:before-swap");
  });

  it("script listens for astro:after-swap", async () => {
    const result = await render({});
    expect(result).toContain("astro:after-swap");
  });

  it("script checks prefers-color-scheme media query", async () => {
    const result = await render({});
    expect(result).toContain("prefers-color-scheme");
  });

  it("script sets colorScheme on documentElement", async () => {
    const result = await render({});
    expect(result).toContain("colorScheme");
  });
});
