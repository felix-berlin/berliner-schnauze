import { describe, expect, it } from "vitest";

import { liveHref } from "../src/lib/liveLink";

const env = { SITE_URL: "https://example.test", NODE_ENV: "development" };
const doc = { slug: "kiez", _status: "published" };

describe("liveHref", () => {
  it("links a published word, post and thema under their prefix", () => {
    expect(liveHref("words", doc, env)).toBe("https://example.test/wort/kiez");
    expect(liveHref("posts", doc, env)).toBe("https://example.test/magazin/kiez");
    expect(liveHref("themen", doc, env)).toBe("https://example.test/themen/kiez");
  });

  it("links a page without a prefix and without drafts (no _status)", () => {
    expect(liveHref("pages", { slug: "impressum" }, env)).toBe("https://example.test/impressum");
  });

  it.each([
    ["a draft", { slug: "kiez", _status: "draft" }],
    ["a trashed doc", { ...doc, deletedAt: "2026-11-19T10:00:00.000Z" }],
    ["no slug", { _status: "published" }],
    ["an empty slug", { slug: "", _status: "published" }],
    ["a non-string slug", { slug: 5, _status: "published" }],
  ])("has no link for %s", (_name, d) => {
    expect(liveHref("words", d, env)).toBeNull();
  });

  it("has no link without data or for a collection without a public page", () => {
    expect(liveHref("words", undefined, env)).toBeNull();
    expect(liveHref("word-types", doc, env)).toBeNull();
    expect(liveHref(undefined, doc, env)).toBeNull();
  });

  it("does not point a dev server at production when SITE_URL is missing", () => {
    expect(liveHref("words", doc, { NODE_ENV: "development" })).toBeNull();
  });

  it("falls back to the production site only in production", () => {
    expect(liveHref("words", doc, { NODE_ENV: "production" })).toBe(
      "https://berliner-schnauze.wtf/wort/kiez",
    );
  });
});
