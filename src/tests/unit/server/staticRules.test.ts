// @vitest-environment node
import { describe, expect, it } from "vitest";

import { matchHeaders, parseHeaders, parseRedirects } from "../../../../server/staticRules.mjs";

const HEADERS = `/*
  X-Frame-Options: DENY
  Content-Security-Policy: default-src 'self'; img-src 'self' data: https://a.example

/_astro/*
  Cache-Control: public, max-age=31536000, immutable
  X-Test: astro
`;

describe("parseHeaders + matchHeaders", () => {
  const rules = parseHeaders(HEADERS);

  it("applies the /* block to every path, keeping colons in values", () => {
    expect(matchHeaders(rules, "/wort/aasen")).toEqual([
      ["X-Frame-Options", "DENY"],
      ["Content-Security-Policy", "default-src 'self'; img-src 'self' data: https://a.example"],
    ]);
  });

  it("adds prefix blocks but leaves Cache-Control to the adapter", () => {
    expect(matchHeaders(rules, "/_astro/app.js")).toContainEqual(["X-Test", "astro"]);
    expect(matchHeaders(rules, "/_astro/app.js").map(([k]) => k)).not.toContain("Cache-Control");
  });
});

describe("parseRedirects", () => {
  it("reads from, to and status, defaulting to 302", () => {
    const redirects = parseRedirects("/suggest-word /wort-vorschlagen 301\n\n# note\n/a /b\n");
    expect(redirects.get("/suggest-word")).toEqual({ status: 301, to: "/wort-vorschlagen" });
    expect(redirects.get("/a")).toEqual({ status: 302, to: "/b" });
    expect(redirects.size).toBe(2);
  });
});
