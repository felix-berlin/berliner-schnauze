import { describe, expect, it, vi } from "vitest";

vi.mock("astro:env/client", () => ({
  SITE_NAME: "Berliner Schnauze",
  SITE_URL: "https://berliner-schnauze.wtf",
}));

import { seoData } from "@utils/helpers";

describe("seoData", () => {
  it("returns the title from data", () => {
    const result = seoData({ title: "Mein Titel" });
    expect(result.title).toBe("Mein Titel");
  });

  it("sets opengraphSiteName to SITE_NAME", () => {
    const result = seoData({ title: "Test" });
    expect(result.seo.opengraphSiteName).toBe("Berliner Schnauze");
  });

  it("sets opengraphUrl to SITE_URL by default", () => {
    const result = seoData({ title: "Test" });
    expect(result.seo.opengraphUrl).toBe("https://berliner-schnauze.wtf");
  });

  it("uses custom baseUrl when provided", () => {
    const result = seoData({ title: "Test" }, "https://custom.example.com");
    expect(result.seo.opengraphUrl).toBe("https://custom.example.com");
  });

  it("spreads existing seo fields from data", () => {
    const result = seoData({
      title: "Test",
      seo: { description: "Eine Beschreibung" },
    });
    expect((result.seo as Record<string, unknown>).description).toBe("Eine Beschreibung");
  });
});
