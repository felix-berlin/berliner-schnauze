import { describe, expect, it } from "vitest";
import { canonicalUrl } from "@utils/helpers";

describe("canonicalUrl", () => {
  const site = new URL("https://berliner-schnauze.wtf");

  it("returns full URL for a path", () => {
    expect(canonicalUrl("/wort/schnauze", site)).toBe(
      "https://berliner-schnauze.wtf/wort/schnauze",
    );
  });

  it("strips trailing slash from root", () => {
    expect(canonicalUrl("/", site)).toBe("https://berliner-schnauze.wtf");
  });

  it("strips trailing slash from non-root paths", () => {
    expect(canonicalUrl("/wort/", site)).toBe("https://berliner-schnauze.wtf/wort");
  });

  it("preserves query strings and hash fragments", () => {
    expect(canonicalUrl("/wort/schnauze?q=1", site)).toBe(
      "https://berliner-schnauze.wtf/wort/schnauze?q=1",
    );
  });
});
