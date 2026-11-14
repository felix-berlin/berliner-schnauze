// @vitest-environment node
import { compileString } from "sass";

import { sassAliasImporter } from "../../../../sass-aliases.mjs";

const compile = (body: string) =>
  compileString(`@use "@styles/mixins" as mx;\n${body}`, {
    importers: [sassAliasImporter],
    logger: { debug() {}, warn() {} },
    quietDeps: true,
  })
    .css.replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .trim();

describe("mx.component", () => {
  it("emits one @scope block in the components layer (spec §7.1)", () => {
    expect(
      compile('@include mx.component("demo") { :scope { color: red; } .title { margin: 0; } }'),
    ).toBe(
      '@layer components { @scope (.c-demo) to (:scope [class^="c-"], :scope [class*=" c-"], :scope [data-slot] > *) { :scope { color: red; } .title { margin: 0; } } }',
    );
  });
});
