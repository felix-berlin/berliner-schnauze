// @vitest-environment node
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

// The palette values live in tokens/*.json (docs/design/startseite-v20/SPEC.md §4.1-4.3); this only guards the wiring.
const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const css = read("../../../styles/tokens/_tokens.generated.scss");

describe("home palette tokens", () => {
  it("the generated tokens layer matches the token JSON", () => {
    const root = new URL("../../../../", import.meta.url);
    expect(() =>
      execFileSync("node", ["scripts/build-tokens.mjs", "--check"], { cwd: root, stdio: "pipe" }),
    ).not.toThrow();
  });

  it("defines the home tokens as light/dark pairs or band values", () => {
    for (const name of ["page", "card", "card2", "card3", "t3", "ok"]) {
      expect(css).toMatch(new RegExp(`^\\s*--${name}: light-dark\\(`, "m"));
    }
    for (const name of ["band-text", "band-card2", "band-line", "band-dark-bg"]) {
      expect(css).toMatch(new RegExp(`^\\s*--${name}: `, "m"));
    }
  });

  it("uses the band tokens in the results band without colour exceptions", () => {
    const scss = read("../../../styles/components/_home-results.scss");
    for (const name of ["band-text", "band-card2", "band-line"]) {
      expect(scss).toContain(`var(--${name})`);
    }
    expect(scss).not.toMatch(/colour inventory: "(#|--card2|rgb\()/);
  });

  it("--line follows the card border", () => {
    expect(css).toMatch(/^\s*--line: var\(--color-border-card\);/m);
  });
});
