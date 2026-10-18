import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Static guards: these settings only show up in a browser or under load, where e2e does not look.
const config = readFileSync(new URL("../../../../astro.config.mjs", import.meta.url), "utf8");

describe("astro.config.mjs", () => {
  it("never makes the service worker answer a page load with the precached homepage", () => {
    expect(config).not.toMatch(/navigateFallback\s*:/);
  });

  it("caps request bodies: the suggest-word POST is anonymous and parsed before validation", () => {
    expect(config).toMatch(/bodySizeLimit\s*:\s*\d/);
  });
});
