// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// SPEC §22: no "wir", "uns", "unser", "wa" (Berlin tag question), no "Quellen belegt", no emoji in the word page
// components. The set is every component the v18 page pulls in from components/word and components/footer
// (found through the imports, starting at WordPage), so a new card cannot slip past.
const ROOT = "src/components";
const IMPORT = /['"]@components\/((?:word|footer)\/\w+\.(?:astro|vue))['"]/g;

const collect = (entry: string, seen = new Set<string>()): Set<string> => {
  if (seen.has(entry)) return seen;
  seen.add(entry);
  for (const [, next] of readFileSync(`${ROOT}/${entry}`, "utf8").matchAll(IMPORT))
    collect(next!, seen);
  return seen;
};

const files = [...collect("word/WordPage.astro"), "footer/FooterCalloutBook.astro"];

describe("copy rules in the v18 components", () => {
  it("scans the whole v18 set", () => {
    for (const name of [
      "WordHead",
      "WordToc",
      "WordNumbers",
      "WordLinks",
      "WordReportLine",
      "WordFactsCard",
      "WordNetworkCard",
      "WordExamplesCard",
      "SectionCard",
    ]) {
      expect(files.some((f) => f.endsWith(`/${name}.astro`) || f.endsWith(`/${name}.vue`))).toBe(
        true,
      );
    }
    for (const f of files) expect(existsSync(`${ROOT}/${f}`)).toBe(true);
  });

  it.each(files)("%s has no forbidden word and no emoji", (f) => {
    const src = readFileSync(`${ROOT}/${f}`, "utf8");
    expect(src).not.toMatch(/\b(?:wir|uns|unser\w*|wa)\b/i);
    expect(src).not.toMatch(/Quellen belegt/);
    expect(src).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(src).not.toContain("set:html={visitor");
  });
});
