// @vitest-environment node
import { readFileSync } from "node:fs";

// Startseite v20 palette (docs/design/startseite-v20/SPEC.md §4.1-4.3) as built into the tokens layer.
const css = readFileSync(
  new URL("../../../styles/tokens/_tokens.generated.scss", import.meta.url),
  "utf8",
);
const pair = (name: string) =>
  css.match(new RegExp(`^\\s*--${name}: light-dark\\((#\\w+), (#\\w+)\\);`, "m"))?.slice(1);

describe("home palette tokens", () => {
  it.each([
    ["page", "#efe6db", "#1b2127"],
    ["card", "#ffffff", "#2e363f"],
    ["card2", "#fbf1e6", "#38424c"],
    ["card3", "#f5dfca", "#46525e"],
    ["t3", "#535e69", "#a8b2bc"],
    ["d-bl", "#3d6f9c", "#8fb4d6"],
    ["d-ye", "#8a6d00", "#f0d722"],
    ["d-gr", "#7d8994", "#9aa5b1"],
    ["ok", "#2e7d4f", "#6cc08b"],
  ])("--%s is %s in light and %s in dark", (name, light, dark) => {
    expect(pair(name)).toEqual([light, dark]);
  });

  it("keeps the result band dark in both themes", () => {
    expect(css).toMatch(/^\s*--band-dark-bg: #14191e;/m);
  });

  it("--line follows the card border", () => {
    expect(css).toMatch(/^\s*--line: var\(--color-border-card\);/m);
  });
});
