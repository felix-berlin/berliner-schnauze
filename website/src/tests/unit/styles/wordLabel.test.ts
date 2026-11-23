// @vitest-environment node
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(p, "utf8");

describe("v18 label class", () => {
  it("is c-word-label, so the global form label of base/_inputs.scss keeps its look", () => {
    const scss = read("src/styles/components/_word-label.scss");
    expect(scss).toContain('mx.component("word-label")');
    expect(scss).not.toMatch(/\.c-label\b/);
    expect(read("src/styles/base/_inputs.scss")).toContain(".c-label");
  });

  it("is the only label class the v18 components use", () => {
    const dir = "src/components/word";
    const files = readdirSync(dir).filter((f) => /\.(astro|vue)$/.test(f));
    expect(files.length).toBeGreaterThan(10);
    for (const f of files) expect(read(`${dir}/${f}`)).not.toMatch(/\bc-label\b/);
  });
});

describe("v18 minimum text size", () => {
  // SPEC §4.2/§22: no text under 13px; --font-size-sm is 12.8px and --font-size-xs 12px.
  const files = [
    "wissen",
    "zahlen",
    "footer-callout",
    "analyse",
    "rows",
    "fehler",
    "links",
    "mobile-bar",
    "netz",
    "beispiele",
    "word-label",
  ].map((n) => (n.startsWith("footer") || n === "word-label" ? n : `word-${n}`));
  it.each(files)("%s uses no font-size-sm or font-size-xs", (name) => {
    expect(read(`src/styles/components/_${name}.scss`)).not.toMatch(/font-size-(sm|xs)\b/);
  });
});
