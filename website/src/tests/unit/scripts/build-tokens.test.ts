// @vitest-environment node
import { readFileSync } from "node:fs";

import buildTokens, { readSources } from "../../../../scripts/build-tokens.mjs";

const generated = new URL("../../../styles/tokens/_tokens.generated.scss", import.meta.url);

const rgb = (hex: string, alpha = 1) => ({
  alpha,
  colorSpace: "srgb",
  components: [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255),
  hex,
});

// Small fixture: the real token files only have to round-trip ("the committed file is current").
const primitive = {
  color: {
    $type: "color",
    orange: {
      300: { $value: rgb("#f0ac85") },
      500: { $value: rgb("#cf5736") },
      600: { $value: rgb("#b23b27") },
    },
  },
  duration: { $type: "duration", base: { $value: { unit: "ms", value: 300 } } },
  ease: { $type: "cubicBezier", standard: { $value: [0.42, 0, 0.58, 1] } },
  space: { $type: "dimension", 4: { $value: { unit: "rem", value: 1 } } },
  z: { $type: "number", header: { $value: 100 } },
};
const glow = (color: unknown, blur = 12) => ({
  $value: {
    blur: { unit: "px", value: blur },
    color,
    offsetX: { unit: "px", value: 0 },
    offsetY: { unit: "px", value: 0 },
    spread: { unit: "px", value: 0 },
  },
});
const theme = (dark: boolean) => ({
  color: {
    $type: "color",
    accent: { solid: { $value: "{color.orange.600}" } },
    surface: { wash: { $value: dark ? rgb("#f0ac85", 0.3) : rgb("#cf5736", 0.15) } },
    text: {
      accent: { $value: dark ? "{color.orange.300}" : "{color.orange.600}" },
      body: { $value: "{color.orange.600}" },
    },
  },
  shadow: { $type: "shadow", "hover-glow": glow(dark ? "{color.orange.500}" : rgb("#e29a86")) },
});
const input = () => ({
  dark: theme(true),
  light: theme(false),
  primitive: structuredClone(primitive),
});
const css = buildTokens(input());

describe("buildTokens", () => {
  it("emits a primitive", () => expect(css).toContain("--color-orange-600: #b23b27;"));
  it("pairs light and dark", () =>
    expect(css).toContain(
      "--color-text-accent: light-dark(var(--color-orange-600), var(--color-orange-300));",
    ));
  it("emits one value when both themes agree", () =>
    expect(css).toContain("--color-accent-solid: var(--color-orange-600);"));
  it("writes alpha colours as rgb()", () =>
    expect(css).toContain("--color-surface-wash: light-dark(rgb(207 87 54 / 15%), "));
  it("writes colours that are not 8-bit exact as color(srgb)", () => {
    const i = input();
    i.primitive.color.orange[300].$value = {
      ...rgb("#000000"),
      components: [0.235137, 0.264, 0.292863],
    };
    expect(buildTokens(i)).toContain("--color-orange-300: color(srgb 0.235137 0.264 0.292863);");
  });
  it("writes dimension, duration, number, cubicBezier", () => {
    expect(css).toContain("--space-4: 1rem;");
    expect(css).toContain("--duration-base: 300ms;");
    expect(css).toContain("--z-header: 100;");
    expect(css).toContain("--ease-standard: cubic-bezier(0.42, 0, 0.58, 1);");
  });
  it("keeps the unit of a zero duration and drops it for a zero dimension", () => {
    const i = input();
    i.primitive.duration.base.$value.value = 0;
    i.primitive.space[4].$value.value = 0;
    const out = buildTokens(i);
    expect(out).toContain("--duration-base: 0ms;");
    expect(out).toContain("--space-4: 0;");
  });
  it("puts light-dark() around each colour of a themed shadow", () =>
    expect(css).toMatch(/--shadow-hover-glow: 0 0 12px 0 light-dark\(.+, .+\);/));
  it("throws when a themed shadow differs in geometry", () => {
    const i = input();
    i.dark.shadow["hover-glow"] = glow("{color.orange.500}", 8);
    expect(() => buildTokens(i)).toThrow("shadow.hover-glow: geometry differs between themes");
  });
  it("throws on a path missing in one theme", () => {
    const i = input();
    delete (i.dark.color.text as Partial<typeof i.dark.color.text>).body;
    expect(() => buildTokens(i)).toThrow("color.text.body: missing in dark");
  });
  it("throws on an unknown alias, a cycle, and a token without $type", () => {
    const unknown = input();
    unknown.light.color.text.body.$value = "{color.orange.999}";
    expect(() => buildTokens(unknown)).toThrow("color.text.body: unknown alias {color.orange.999}");

    const cycle = input();
    for (const t of [cycle.light, cycle.dark]) {
      t.color.text.body.$value = "{color.accent.solid}";
      t.color.accent.solid.$value = "{color.text.body}";
    }
    expect(() => buildTokens(cycle)).toThrow("alias cycle");

    const untyped = input();
    (untyped.primitive as Record<string, unknown>).misc = { a: { $value: 1 } };
    expect(() => buildTokens(untyped)).toThrow("misc.a: no $type");
  });
  it("throws on a path defined in both tiers", () => {
    const i = input();
    (i.primitive.color as Record<string, unknown>).text = { body: { $value: rgb("#000000") } };
    expect(() => buildTokens(i)).toThrow("color.text.body: defined in primitive and semantic");
  });
  it("wraps everything in @layer tokens", () => {
    const body = css.replace(/^\/\/.*\n/, "");
    expect(css.startsWith("// GENERATED by scripts/build-tokens.mjs — do not edit\n")).toBe(true);
    expect(body.trimStart().startsWith("@layer tokens {")).toBe(true);
  });
  it("the committed file is current", () =>
    expect(readFileSync(generated, "utf8")).toBe(buildTokens(readSources())));
});
