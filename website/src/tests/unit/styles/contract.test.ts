// @vitest-environment node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import legacyFiles from "../../../../stylelint.legacy-files.mjs";

// Design system spec §6/§11: what stylelint cannot see about the cascade layers.
const LAYERS = [
  "reset",
  "tokens",
  "vendor",
  "base",
  "legacy",
  "objects",
  "components",
  "utilities",
];
const STATEMENT = `@layer ${LAYERS.join(", ")};`;

const website = new URL("../../../../", import.meta.url).pathname;
const src = join(website, "src");
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
const rel = (path: string) => relative(website, path);

const stripComments = (code: string) =>
  code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "$1");

/** Source below the leading @use/@forward, $variable and @mixin/@function definitions (none emit CSS). */
const body = (code: string) => {
  let rest = stripComments(code).trim();
  for (;;) {
    const m = rest.match(
      /^(?:@(?:use|forward)\b[^;]*;|\$[\w-]+\s*:[^;]*;|@(?:mixin|function)\b[^{]*\{)/,
    );
    if (!m) return rest;
    let end = m[0].length;
    if (m[0].endsWith("{")) {
      for (let depth = 1; depth > 0; end++)
        depth += rest[end] === "{" ? 1 : rest[end] === "}" ? -1 : 0;
    }
    rest = rest.slice(end).trim();
  }
};

/** Layer name when the whole body is exactly one `@layer name { … }` block, else null. */
const singleBlockLayer = (rest: string) => {
  const m = rest.match(/^@layer\s+([a-z]+)\s*\{/);
  if (!m) return null;
  let depth = 0;
  for (let i = m[0].length - 1; i < rest.length; i++) {
    if (rest[i] === "{") depth++;
    if (rest[i] === "}" && --depth === 0) return rest.slice(i + 1).trim() === "" ? m[1] : null;
  }
  return null;
};

const styleFiles = walk(join(src, "styles")).filter(
  (p) =>
    p.endsWith(".scss") &&
    !/\/styles\/(mixins|variables|tokens)\//.test(p) &&
    !p.endsWith("/app.scss"),
);

const expectedLayer = (path: string) => {
  const r = relative(join(src, "styles"), path);
  if (legacyFiles.includes(rel(path))) return "legacy";
  if (r === "base/_reset.scss") return "reset";
  if (r.startsWith("base/")) return "base";
  if (r.startsWith("utilities/")) return "utilities";
  if (r.startsWith("components/")) return "components";
  return "objects"; // objects, layouts, pages
};

describe("style layer contract", () => {
  it("declares the layer order inline before any other style or stylesheet", () => {
    const head = readFileSync(join(src, "components/BaseHead.astro"), "utf8");
    const markup = head.slice(head.lastIndexOf("---") + 3);
    const statement = markup.indexOf(`<style is:inline>${STATEMENT}</style>`);
    expect(statement).toBeGreaterThanOrEqual(0);
    const other = markup.search(/<style(?![^>]*is:inline>@layer)|<link[^>]*stylesheet/);
    expect(other === -1 || other > statement).toBe(true);
  });

  it("wraps every style partial in exactly one block of its layer", () => {
    const wrong = styleFiles.flatMap((path) => {
      const rest = body(readFileSync(path, "utf8"));
      if (rest === "") return []; // barrel: only @use/@forward
      const found = singleBlockLayer(rest);
      const want = expectedLayer(path);
      return found === want ? [] : [`${rel(path)}: want @layer ${want}, found ${found ?? "none"}`];
    });
    expect(wrong).toEqual([]);
  });

  it("uses only the layer names of the spec", () => {
    const files = walk(src).filter(
      (p) => /\.(scss|css|vue|astro)$/.test(p) && !p.includes("/src/tests/"),
    );
    const bad = files.flatMap((path) =>
      [...stripComments(readFileSync(path, "utf8")).matchAll(/@layer\s+([^{;]+)/g)]
        .flatMap((m) => m[1].split(",").map((n) => n.trim()))
        .filter((name) => !LAYERS.includes(name))
        .map((name) => `${rel(path)}: ${name}`),
    );
    expect(bad).toEqual([]);
  });

  it("keeps rules out of .vue and .astro style blocks", () => {
    const bad = walk(src)
      .filter((p) => /\.(vue|astro)$/.test(p))
      .flatMap((path) =>
        [...readFileSync(path, "utf8").matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)]
          .filter((m) => !/is:inline/.test(m[0]) && body(m[1]) !== "")
          .map(() => rel(path)),
      );
    expect(bad).toEqual([]);
  });

  it("lists only legacy files that exist", () => {
    const missing = legacyFiles.filter((p) => {
      try {
        return !statSync(join(website, p)).isFile();
      } catch {
        return true;
      }
    });
    expect(missing).toEqual([]);
  });
});
