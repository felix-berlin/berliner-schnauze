// @vitest-environment node
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";

import { sassAliases } from "../../../../sass-aliases.mjs";
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
const walk = (dir: string) =>
  readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => join(d.parentPath, d.name));
const rel = (path: string) => relative(website, path);
const cache = new Map<string, string>();
const read = (path: string) => {
  if (!cache.has(path)) cache.set(path, readFileSync(path, "utf8"));
  return cache.get(path)!;
};
/** Sources outside src/tests, walked once. */
const srcFiles = walk(src).filter((p) => !p.includes("/src/tests/"));

/** Offset after the `}` that closes the `{` at `open`. */
const closeOf = (code: string, open: number) => {
  let depth = 0;
  for (let i = open; i < code.length; i++) {
    if (code[i] === "{") depth++;
    if (code[i] === "}" && --depth === 0) return i + 1;
  }
  return -1;
};

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
    const end = m[0].endsWith("{") ? closeOf(rest, m[0].length - 1) : m[0].length;
    rest = rest.slice(end).trim();
  }
};

/** Layer name when the whole body is exactly one `@layer name { … }` block, else null. */
const singleBlockLayer = (rest: string) => {
  const m = rest.match(/^@layer\s+([a-z]+)\s*\{/);
  if (!m) return null;
  const end = closeOf(rest, m[0].length - 1);
  return end > 0 && rest.slice(end).trim() === "" ? m[1] : null;
};

/** `@use`/`@forward` targets that cannot be resolved to a local partial, Sass built-in or project alias. */
const foreignUses = (code: string, dir: string) =>
  [...stripComments(code).matchAll(/@(?:use|forward)\s+["']([^"']+)["']/g)]
    .map((m) => m[1])
    .filter((target) => {
      if (
        ["sass:", "@felix_berlin/sass-butler", ...Object.keys(sassAliases)].some((p) =>
          target.startsWith(p),
        )
      )
        return false;
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

/** The first `@include mx.component("name") { … }` of a body: its name, inner source and end offset. */
const componentBlock = (rest: string) => {
  const m = rest.match(/^@include\s+mx\.component\(\s*"([^"]+)"\s*\)\s*\{/);
  if (!m) return null;
  const end = closeOf(rest, m[0].length - 1);
  return { end, inner: rest.slice(m[0].length, end - 1), name: m[1] };
};

/** Preludes of the style rules with no enclosing style rule (top level, or only inside at-rules). */
const topLevelPreludes = (inner: string) => {
  const out: string[] = [];
  const stack: boolean[] = []; // per open block: true = style rule, false = at-rule
  let prelude = "";
  for (const ch of inner) {
    if (ch === "{") {
      const atRule = prelude.trim().startsWith("@");
      if (!atRule && !stack.includes(true)) out.push(prelude.trim());
      stack.push(!atRule);
      prelude = "";
    } else if (ch === "}") {
      stack.pop();
      prelude = "";
    } else prelude = ch === ";" ? "" : prelude + ch;
  }
  return out;
};

/** Violations of the §7.1 component rules in a migrated components/_<name>.scss. */
const componentProblems = (code: string, name: string) => {
  const rest = body(code);
  if (rest === "") return []; // barrel or mixin-only partial: no CSS
  const block = componentBlock(rest);
  if (!block || block.end === -1 || rest.slice(block.end).trim() !== "")
    return ["want exactly one @include mx.component(...) block"];
  const { inner } = block;
  const problems: string[] = [];
  if (block.name !== name) problems.push(`component name "${block.name}", want "${name}"`);
  // A `&` in a selector with no enclosing style rule (top level, or only inside at-rules such as
  // @container) reaches the browser as CSS nesting inside @scope; below a part Sass resolves it.
  for (const prelude of topLevelPreludes(inner))
    if (prelude.includes("&")) problems.push(`unresolved & in "${prelude}"`);
  if (/\.c-[a-z]/.test(inner)) problems.push("a .c- selector inside the scope");
  if (/\.[a-z][\w-]*__/.test(inner)) problems.push("a __element class");
  if (/\.[a-z][\w-]*--/.test(inner)) problems.push("a --modifier class");
  if (/@include\s+(?:mx|butler-mx)\.breakpoint/.test(inner))
    problems.push("mx.breakpoint (objects only, use container queries)");
  return problems;
};

/** Splits a selector list into compounds (whitespace and combinators at paren depth 0). */
const compounds = (selector: string) => {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of selector) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (depth === 0 && /[\s>+~,]/.test(ch)) {
      if (cur) out.push(cur);
      cur = "";
    } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
};

/**
 * Part classes of a component file: classes in its top-level selectors (directly in the
 * mx.component block or in at-rules there), minus those compounded with :scope (root states).
 */
const partClasses = (code: string) => {
  const block = componentBlock(body(code));
  if (!block) return [];
  const parts = new Set<string>();
  for (const prelude of topLevelPreludes(block.inner))
    for (const c of compounds(prelude))
      if (!c.includes(":scope"))
        for (const [, name] of c.matchAll(/\.([a-z][\w-]*)/g)) parts.add(name);
  return [...parts];
};

/** Class tokens per opening tag: static class/className, plus string literals in :class, class:list, class={…}. */
const tagClasses = (source: string) =>
  [...source.matchAll(/<[a-zA-Z][\w.-]*\b((?:[^>"']|"[^"]*"|'[^']*')*)>/g)].map((tag) => {
    const tokens: string[] = [];
    const add = (text: string) => tokens.push(...text.split(/\s+/));
    for (const [, , value] of tag[1].matchAll(/(?:^|\s)(?:class|className)=(["'])(.*?)\1/g))
      add(value);
    for (const [, quoted, braced] of tag[1].matchAll(
      /(?:^|\s)(?:(?::class|v-bind:class)="([^"]*)"|(?:class|class:list)=\{([^}]*)\})/g,
    ))
      for (const [, , lit] of (quoted ?? braced).matchAll(/(["'`])([\w\s-]+)\1/g)) add(lit);
    return tokens.filter(Boolean);
  });

/** Part classes set from script (className = "...", classList.add("...")). */
const scriptClasses = (source: string) =>
  [
    ...source.matchAll(/(?:className\s*=\s*|classList\.(?:add|toggle)\()\s*["'`]([\w\s-]+)["'`]/g),
  ].flatMap((m) => m[1].split(/\s+/));

/** Dark-mode class hooks outside legacy; each exception names its reason. */
const DARK_ALLOWED = [
  {
    file: "src/styles/base/_colors.scss",
    text: '&[class~="dark"]',
    why: "the color-scheme switch",
  },
  {
    file: "src/styles/base/_inputs.scss",
    text: 'html[class~="dark"] .c-select',
    why: "R9: a blend mode is no colour, light-dark() cannot do it",
  },
];
const hasDarkHook = (code: string, file: string) => {
  let rest = stripComments(code);
  // Whole selector only: `.c-select` must not also excuse `.c-select-other`.
  const escape = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  for (const a of DARK_ALLOWED)
    if (a.file === file) rest = rest.replace(new RegExp(`${escape(a.text)}(?![\\w-])`, "g"), "");
  return /dark-mode-class|dark-mode-override|\.dark(?![\w-])|\[class~=["']?dark/.test(rest);
};

const styleFiles = srcFiles.filter(
  (p) =>
    p.includes("/src/styles/") &&
    p.endsWith(".scss") &&
    !/\/styles\/(mixins|variables|tokens)\//.test(p) &&
    !p.endsWith("/app.scss"),
);
const migratedComponents = styleFiles
  .filter((p) => p.includes("/styles/components/") && !legacyFiles.includes(rel(p)))
  .map((path) => ({ name: basename(path, ".scss").slice(1), path }));

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
      const rest = body(read(path));
      if (rest === "") return []; // barrel: only @use/@forward
      const want = expectedLayer(path);
      // mx.component emits @layer components; its shape is checked by the §7.1 test below.
      const found = /^@include\s+mx\.component\(/.test(rest)
        ? "components"
        : singleBlockLayer(rest);
      return found === want ? [] : [`${rel(path)}: want @layer ${want}, found ${found ?? "none"}`];
    });
    expect(wrong).toEqual([]);
  });

  it("lets partials @use only local files, Sass built-ins and project aliases", () => {
    const bad = [...styleFiles, join(src, "styles/app.scss")].flatMap((path) =>
      foreignUses(read(path), dirname(path)).map((t) => `${rel(path)}: @use "${t}"`),
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
    const files = srcFiles.filter((p) => /\.(scss|css|vue|astro)$/.test(p));
    const bad = files.flatMap((path) =>
      [...stripComments(read(path)).matchAll(/@layer\s+([^{;]+)/g)]
        .flatMap((m) => m[1].split(",").map((n) => n.trim()))
        .filter((name) => !LAYERS.includes(name))
        .map((name) => `${rel(path)}: ${name}`),
    );
    expect(bad).toEqual([]);
  });

  it("keeps rules out of .vue and .astro style blocks", () => {
    const bad = srcFiles
      .filter((p) => /\.(vue|astro)$/.test(p))
      .filter((path) => rulesInStyleBlocks(read(path)).length > 0)
      .map(rel);
    expect(bad).toEqual([]);
    // Only the exact layer-order statement is exempt; any other inline style counts.
    expect(rulesInStyleBlocks("<style is:inline>.a { color: red }</style>")).toHaveLength(1);
    expect(
      rulesInStyleBlocks("<style is:inline>@layer base { a { color: red } }</style>"),
    ).toHaveLength(1);
    expect(rulesInStyleBlocks(`<style is:inline>${STATEMENT}</style>`)).toHaveLength(0);
  });

  it("keeps migrated component files to one mx.component block of the §7.1 rules", () => {
    const bad = migratedComponents.flatMap(({ name, path }) =>
      componentProblems(read(path), name).map((e) => `${rel(path)}: ${e}`),
    );
    expect(bad).toEqual([]);

    const ok =
      '@use "@styles/mixins" as mx;\n@include mx.component("demo") { :scope { color: red; } .title { &:hover { color: blue; } } }';
    expect(componentProblems(ok, "demo")).toEqual([]);
    const wrap = (inner: string) => `@include mx.component("demo") { ${inner} }`;
    expect(componentProblems(wrap("& { color: red; }"), "demo")).toHaveLength(1);
    expect(componentProblems(wrap(".a { color: red; } &.b { color: red; }"), "demo")).toHaveLength(
      1,
    );
    expect(componentProblems(wrap(".parent & { color: red; }"), "demo")).toHaveLength(1);
    expect(componentProblems(wrap(".a:not(&) { color: red; }"), "demo")).toHaveLength(1);
    expect(
      componentProblems(wrap("@container demo (inline-size > 1px) { & { color: red; } }"), "demo"),
    ).toHaveLength(1);
    expect(
      componentProblems(
        wrap("@container demo (inline-size > 1px) { .a { &:hover { color: red; } } }"),
        "demo",
      ),
    ).toEqual([]);
    expect(componentProblems(wrap(".c-other { color: red; }"), "demo")).toHaveLength(1);
    expect(componentProblems(wrap(".card__title { color: red; }"), "demo")).toHaveLength(1);
    expect(componentProblems(wrap(".card--big { color: red; }"), "demo")).toHaveLength(1);
    expect(
      componentProblems(wrap("@include mx.breakpoint(md) { .a { color: red; } }"), "demo"),
    ).toHaveLength(1);
    expect(componentProblems(ok, "other")).toHaveLength(1);
    expect(componentProblems(`${ok} .rogue { color: red }`, "demo")).toHaveLength(1);
    expect(componentProblems(`${ok} @include mx.component("demo") { }`, "demo")).toHaveLength(1);
  });

  it("puts every part class of a component on markup, never on the component's own root", () => {
    const sources = srcFiles.filter((p) => /\.(vue|astro|ts)$/.test(p));
    const tags = sources.flatMap((p) => (p.endsWith(".ts") ? [] : tagClasses(read(p))));
    const used = new Set([...tags.flat(), ...sources.flatMap((p) => scriptClasses(read(p)))]);
    const bad = migratedComponents.flatMap(({ name, path }) => {
      const parts = partClasses(read(path));
      const dead = parts.filter((c) => !used.has(c)).map((c) => `.${c} is on no element`);
      const onRoot = parts
        .filter((c) => tags.some((t) => t.includes(`c-${name}`) && t.includes(c)))
        .map((c) => `.${c} sits on the c-${name} root itself`);
      return dead.concat(onRoot).map((problem) => `${rel(path)}: ${problem}`);
    });
    expect(bad).toEqual([]);

    const demo =
      '@include mx.component("demo") { :scope.on { a: b } .a > .b, :scope:is(.x) .c { a: b } .d { .e { a: b } } @media (x) { .f { a: b } } }';
    expect(partClasses(demo).sort()).toEqual(["a", "b", "c", "d", "f"]);
    expect(
      tagClasses(`<div class="c-demo a" :class="{ 'b': x }"><i :class="on ? 'c' : 'd'">`),
    ).toEqual([
      ["c-demo", "a", "b"],
      ["c", "d"],
    ]);
  });

  it("allows dark-mode hooks only in legacy files, bar the two named exceptions", () => {
    const bad = styleFiles
      .filter((p) => !legacyFiles.includes(rel(p)))
      .filter((p) => hasDarkHook(read(p), rel(p)))
      .map(rel);
    expect(bad).toEqual([]);
    expect(hasDarkHook("@include butler-mx.dark-mode-class { a: b }", "x.scss")).toBe(true);
    expect(hasDarkHook("@include mx.dark-mode-override { a: b }", "x.scss")).toBe(true);
    expect(hasDarkHook(".dark .a { a: b }", "x.scss")).toBe(true);
    expect(hasDarkHook("html.dark .a { a: b }", "x.scss")).toBe(true);
    expect(hasDarkHook('html[class~="dark"] .c-card { a: b }', "src/styles/base/_x.scss")).toBe(
      true,
    );
    // The exception covers exactly the named selector in its file.
    expect(
      hasDarkHook('html[class~="dark"] .c-select { a: b }', "src/styles/base/_inputs.scss"),
    ).toBe(false);
    expect(
      hasDarkHook('html[class~="dark"] .c-select { a: b }', "src/styles/base/_other.scss"),
    ).toBe(true);
    expect(
      hasDarkHook('html[class~="dark"] .c-other { a: b }', "src/styles/base/_inputs.scss"),
    ).toBe(true);
    expect(
      hasDarkHook('html[class~="dark"] .c-select-other { a: b }', "src/styles/base/_inputs.scss"),
    ).toBe(true);
    expect(hasDarkHook(".dark-grey { a: b }", "x.scss")).toBe(false);
  });

  it("lists only legacy files that exist", () => {
    expect(legacyFiles.filter((p) => !existsSync(join(website, p)))).toEqual([]);
  });
});

// Modern web guidance alignment (plan 2026-11-21): document-level colour scheme.
describe("colour scheme contract", () => {
  it("declares meta color-scheme 'light dark' in the head", () => {
    expect(read(join(src, "components/BaseHead.astro"))).toMatch(
      /<meta[^>]*name=['"]color-scheme['"][^>]*content=['"]light dark['"]|<meta[^>]*content=['"]light dark['"][^>]*name=['"]color-scheme['"]/,
    );
  });

  it("keeps 'light dark' as the root default so the system scheme applies without JS", () => {
    const colors = read(join(src, "styles/base/_colors.scss"));
    expect(colors).toMatch(/color-scheme:\s*light dark/);
    expect(colors).not.toMatch(/color-scheme:\s*light;/);
  });

  it("tints native controls with the accent token", () => {
    expect(read(join(src, "styles/base/_inputs.scss"))).toMatch(
      /html\s*\{\s*accent-color:\s*var\(--color-accent-solid\);/,
    );
  });

  it("keeps hover and selected states visible in forced colors", () => {
    const forced = read(join(src, "styles/base/_forced-colors.scss"));
    expect(forced).toContain('feature("forced-colors")');
    expect(forced).toMatch(/:hover[\s\S]*outline:\s*2px dashed Highlight/);
    expect(forced).toMatch(/\[aria-pressed="true"\][\s\S]*outline:\s*2px solid Highlight/);
    expect(read(join(src, "styles/base/index.scss"))).toContain('@forward "forced-colors"');
  });
});
