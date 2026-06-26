// @vitest-environment node
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import SetColorMode from "@components/SetColorMode.astro";

describe("SetColorMode.astro", () => {
  it("renders a script tag", async () => {
    const container = await AstroContainer.create();
    const result = await container.renderToString(SetColorMode, {});
    expect(result).toContain("<script");
  });

  it("script references the darkMode storage key", async () => {
    const container = await AstroContainer.create();
    const result = await container.renderToString(SetColorMode, {});
    expect(result).toContain("darkMode");
  });

  it("script references the dark CSS class", async () => {
    const container = await AstroContainer.create();
    const result = await container.renderToString(SetColorMode, {});
    expect(result).toContain("dark");
  });

  it("script listens for astro:before-swap", async () => {
    const container = await AstroContainer.create();
    const result = await container.renderToString(SetColorMode, {});
    expect(result).toContain("astro:before-swap");
  });

  it("script listens for astro:after-swap", async () => {
    const container = await AstroContainer.create();
    const result = await container.renderToString(SetColorMode, {});
    expect(result).toContain("astro:after-swap");
  });

  it("script checks prefers-color-scheme media query", async () => {
    const container = await AstroContainer.create();
    const result = await container.renderToString(SetColorMode, {});
    expect(result).toContain("prefers-color-scheme");
  });

  it("script sets colorScheme on documentElement", async () => {
    const container = await AstroContainer.create();
    const result = await container.renderToString(SetColorMode, {});
    expect(result).toContain("colorScheme");
  });
});
