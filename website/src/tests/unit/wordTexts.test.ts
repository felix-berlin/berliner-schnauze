// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// SPEC §22: the visitor copy of the v18 word page never says "wir", "uns", "unser", "wa" (the site has one
// operator: "ich/ick/mir/mein") and never "Quellen belegt". Scope: every component reachable from WordPage
// (found through the imports, so a new card cannot slip past) plus the lib and store files that hold visitor copy.
// Not scanned: pages/api responses (error codes, not page copy) and the old components nothing imports any more.
const SRC = "src";
const IMPORT = /['"]@components\/((?:word|footer|comments|word-feedback)\/\w+\.(?:astro|vue))['"]/g;

const collect = (entry: string, seen = new Set<string>()): Set<string> => {
  if (seen.has(entry)) return seen;
  seen.add(entry);
  for (const [, next] of readFileSync(`${SRC}/components/${entry}`, "utf8").matchAll(IMPORT))
    collect(next!, seen);
  return seen;
};

// The search page (docs/design/suche-v1/SPEC.md §1 has the same rule) imports its parts relatively: scan the folder.
const searchFiles = readdirSync(`${SRC}/components/search`).map((f) => `search/${f}`);
const files = [...collect("word/WordPage.astro"), "word/WordMobileBar.astro", ...searchFiles].map(
  (f) => `components/${f}`,
);
const copyFiles = [
  "composable/useVoicePlayer.ts",
  "lib/bezirkNames.ts",
  "lib/ownSubmissions.ts",
  "lib/wordSuggest.ts",
  "lib/contribute.ts",
  "lib/pollResult.ts",
  "lib/story.ts",
  "lib/wordAnalysis.ts",
  "lib/wordBook.ts",
  "lib/wordCite.ts",
  "lib/wordNetwork.ts",
  "lib/wordToc.ts",
  "stores/contribute.ts",
  "stores/wordFeedback.ts",
];

// Word boundaries: "Awards", "unserem" in identifiers and "wa" inside "was" never match; case-insensitive so a
// sentence start ("Wir ...") is caught too. "-" counts as part of a word (slugs such as "wa-nich").
const FORBIDDEN = /(?<![\w-])(?:wir|uns|unser\w*|wa)(?![\w-])/i;
const QUELLEN = /Quellen belegt/i;

describe("visitor copy of the v18 word page", () => {
  it("scans the page components and the copy files", () => {
    expect(files.length).toBeGreaterThan(15);
    for (const name of ["WordPoll", "WordStories", "ContributeForm", "WordActions", "WordHead"])
      expect(files.some((f) => f.includes(`/${name}.`))).toBe(true);
  });

  it("forbids what the spec forbids", () => {
    for (const bad of [
      " wir ",
      "Wir sind",
      " uns ",
      "Uns jefällt",
      "unser Wort",
      "Dit kennste wa?",
    ])
      expect(FORBIDDEN.test(bad)).toBe(true);
    for (const ok of ["Awards", "Verunserung", "was", "kuckwa-nich", "Wasser"])
      expect(FORBIDDEN.test(ok)).toBe(false);
    expect(QUELLEN.test("mit Quellen belegt")).toBe(true);
  });

  it.each([...files, ...copyFiles])("%s", (f) => {
    const src = readFileSync(`${SRC}/${f}`, "utf8");
    expect(src.match(FORBIDDEN)?.[0]).toBeUndefined();
    expect(src).not.toMatch(QUELLEN);
  });
});
