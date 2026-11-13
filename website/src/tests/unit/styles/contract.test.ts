// @vitest-environment node
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";

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

/** `@use`/`@forward` targets that cannot be resolved to a local partial, Sass built-in or project alias. */
const foreignUses = (code: string, dir: string) =>
  [...stripComments(code).matchAll(/@(?:use|forward)\s+["']([^"']+)["']/g)]
    .map((m) => m[1])
    .filter((target) => {
      if (
        target.startsWith("sass:") ||
        target.startsWith("@styles/") ||
        target.startsWith("@sass-butler/")
      )
        return false;
      if (target.startsWith("@felix_berlin/sass-butler")) return false;
      const base = join(dir, target);
      const parts = [dirname(base), base.slice(dirname(base).length + 1)];
      return ![
        `${base}.scss`,
        join(parts[0], `_${parts[1]}.scss`),
        join(base, "_index.scss"),
        join(base, "index.scss"),
      ].some(existsSync);
    });

/** Style blocks of a .vue/.astro source that hold anything but @use lines; the one layer-order statement is exempt. */
const rulesInStyleBlocks = (source: string) =>
  [...source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].filter(
    (m) => m[0] !== `<style is:inline>${STATEMENT}</style>` && body(m[1]) !== "",
  );

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

  it("lets partials @use only local files, Sass built-ins and project aliases", () => {
    const bad = [...styleFiles, join(src, "styles/app.scss")].flatMap((path) =>
      foreignUses(readFileSync(path, "utf8"), dirname(path)).map(
        (t) => `${rel(path)}: @use "${t}"`,
      ),
    );
    expect(bad).toEqual([]);
    // A third-party @use would emit its CSS unlayered; it has to go through meta.load-css inside a layer.
    expect(foreignUses('@use "astro-breadcrumbs/breadcrumbs.scss" with ($a: 1);', src)).toEqual([
      "astro-breadcrumbs/breadcrumbs.scss",
    ]);
    expect(foreignUses('@use "sass:meta"; @use "@styles/variables" as vars;', src)).toEqual([]);
  });

  it("allows app.scss only @use/@forward lines and the vendor layer block", () => {
    const check = (code: string) => {
      const rest = body(code);
      return rest === "" || singleBlockLayer(rest) === "vendor";
    };
    expect(check(readFileSync(join(src, "styles/app.scss"), "utf8"))).toBe(true);
    expect(check('@use "base"; .rogue { color: red }')).toBe(false);
    expect(check('@use "base"; @layer legacy { .a { color: red } }')).toBe(false);
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
      .filter((path) => rulesInStyleBlocks(readFileSync(path, "utf8")).length > 0)
      .map(rel);
    expect(bad).toEqual([]);
    // Only the exact layer-order statement is exempt; any other inline style counts.
    expect(rulesInStyleBlocks("<style is:inline>.a { color: red }</style>")).toHaveLength(1);
    expect(
      rulesInStyleBlocks("<style is:inline>@layer base { a { color: red } }</style>"),
    ).toHaveLength(1);
    expect(rulesInStyleBlocks(`<style is:inline>${STATEMENT}</style>`)).toHaveLength(0);
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
