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

  describe(".html stripping (Astro SSG build appends .html to Astro.url.pathname)", () => {
    it("strips .html suffix from a word slug path", () => {
      expect(canonicalUrl("/wort/aasen.html", site)).toBe(
        "https://berliner-schnauze.wtf/wort/aasen",
      );
    });

    it("strips .html suffix from a top-level path", () => {
      expect(canonicalUrl("/wort.html", site)).toBe("https://berliner-schnauze.wtf/wort");
    });

    it("strips .html suffix from index.html", () => {
      expect(canonicalUrl("/index.html", site)).toBe("https://berliner-schnauze.wtf/index");
    });

    it("does not strip .html appearing in the middle of a path segment", () => {
      expect(canonicalUrl("/wort/schnauze.html.backup", site)).toBe(
        "https://berliner-schnauze.wtf/wort/schnauze.html.backup",
      );
    });

    it("path without .html is unaffected", () => {
      expect(canonicalUrl("/wort/schnauze", site)).toBe(
        "https://berliner-schnauze.wtf/wort/schnauze",
      );
    });
  });
});
