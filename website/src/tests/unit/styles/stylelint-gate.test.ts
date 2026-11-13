// @vitest-environment node
import { readFileSync } from "node:fs";
import stylelint from "stylelint";
import { describe, expect, it } from "vitest";

// Design system spec §11: the strict rules refuse every value that bypasses the tokens.
const STRICT = new Set([
  "color-no-hex",
  "color-named",
  "function-disallowed-list",
  "declaration-property-value-disallowed-list",
  "property-disallowed-list",
  "at-rule-disallowed-list",
  "selector-class-pattern",
  "selector-disallowed-list",
]);
const website = new URL("../../../../", import.meta.url).pathname;

// Lint a fixture under a path that is not ignored and not listed as legacy, so the strict rules apply.
const lintFixture = async (name: string) => {
  const code = readFileSync(new URL(`./fixtures/${name}.scss`, import.meta.url), "utf8");
  const { results } = await stylelint.lint({
    code,
    codeFilename: `${website}src/styles/components/_fixture-${name}.scss`,
    configFile: `${website}stylelint.config.mjs`,
  });
  return { code, warnings: results[0].warnings };
};

describe("stylelint design-token gate", () => {
  it("flags every line of bad.scss marked as a violation", async () => {
    const { code, warnings } = await lintFixture("bad");
    const flagged = new Set(warnings.filter((w) => STRICT.has(w.rule)).map((w) => w.line));
    const missed = code
      .split("\n")
      .flatMap((text, i) =>
        text.includes("// bad") && !flagged.has(i + 1) ? [`${i + 1}: ${text.trim()}`] : [],
      );
    expect(missed).toEqual([]);
  });

  it("accepts good.scss", async () => {
    const { warnings } = await lintFixture("good");
    expect(warnings.map((w) => `${w.line}: ${w.text}`)).toEqual([]);
  });
});
