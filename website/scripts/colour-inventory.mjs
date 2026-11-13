// Colour inventory for the design system migration (spec §5.5, §10 wave 1b): lists every colour in the
// files of plan Tasks 8 to 11 that has no semantic token, as computed light/dark pairs.
// Usage: node scripts/colour-inventory.mjs [--self-test]  → writes ../docs/design/design-system/colour-inventory.md
// (then `pnpm exec oxfmt` on it: the table is in the format:check scope)
// shortcut: SCSS is read by a brace/semicolon scan, not a Sass compiler: no @mixin argument evaluation, no
// @each/@for expansion, Sass maps and functions stay unexpanded; upgrade to a sass AST if a colour hides there.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const web = new URL("../", import.meta.url);
const styles = new URL("src/styles/", web);
const OUT = new URL("../docs/design/design-system/colour-inventory.md", web);
const read = (url) => readFileSync(url, "utf8");

// ---------- files (plan "Tasks 8 to 11: migrate components") ----------
const TASK8 = [
  ...["paper-card", "surfaces", "typo", "badge-wash", "skeleton-loader"].map(
    (n) => `mixins/_${n}.scss`,
  ),
  ...[
    "button",
    "choice",
    "link",
    "icon-button",
    "reaction",
    "band",
    "state",
    "skeleton",
    "badge",
    "section-card",
    "tooltip",
    "modal",
    "toast-container",
    "toast-notify",
    "dropdown-popover",
    "dropdown-popover-themes",
    "options-dropdown",
    "main-menu",
    "menu-nav",
    "scroll-to-top",
    "floating-label",
  ].map((n) => `components/_${n}.scss`),
  "layouts/_header.scss",
  "layouts/_footer.scss",
];
const components = readdirSync(new URL("components/", styles)).sort();
const glob = (re) => components.filter((f) => re.test(f)).map((f) => `components/${f}`);
const FILES = [
  ...TASK8,
  ...glob(/^_(word-.*|comment.*|book-shelf|berlin-area-map|next-links|letter-.*|lightbox)\.scss$/),
  "objects/_word.scss",
  ...glob(/^_(bon-.*|confetti)\.scss$/),
  "pages/_anki.scss",
  "pages/_anki-danke.scss",
  ...glob(/^_anki-(coverage|dev-hours|flashcard)\.scss$/),
];

// ---------- value tokenizer ----------
/** Splits at depth 0 on the given separators; keeps function calls whole. */
const split = (text, seps) => {
  const out = [];
  let depth = 0;
  let cur = "";
  for (const ch of text) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (depth === 0 && seps.includes(ch)) {
      if (cur.trim()) out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
};
const fn = (t) => t.match(/^([a-z-]+)\(([\s\S]*)\)$/i);
const parseVar = (args) => {
  const [name, ...rest] = split(args, ",");
  const i = args.indexOf(",");
  return { name: name.trim(), fallback: rest.length ? args.slice(i + 1).trim() : undefined };
};

// ---------- colours ----------
// shortcut: only the named colours that occur or are likely; extend if a keyword is missed.
const NAMED = {
  white: [255, 255, 255],
  black: [0, 0, 0],
  red: [255, 0, 0],
  orange: [255, 165, 0],
  gold: [255, 215, 0],
  yellow: [255, 255, 0],
  blue: [0, 0, 255],
  green: [0, 128, 0],
  grey: [128, 128, 128],
  gray: [128, 128, 128],
  silver: [192, 192, 192],
  pink: [255, 192, 203],
  navy: [0, 0, 128],
  maroon: [128, 0, 0],
};
const MANUAL = "manual";
const num = (s, scale = 1) => (s.endsWith("%") ? (parseFloat(s) / 100) * scale : parseFloat(s));
const hsl = (h, s, l) => {
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  return [0, 8, 4].map((n) => 255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))));
};
export const format = (c) => {
  if (c === MANUAL || c == null) return String(c);
  const [r, g, b] = c.slice(0, 3).map((v) => Math.round(v));
  const a = Math.round(c[3] * 1000) / 10;
  return a >= 100 ? `rgb(${r} ${g} ${b})` : `rgb(${r} ${g} ${b} / ${a}%)`;
};

/**
 * Evaluates one colour term to [r, g, b, a] (0-255, alpha 0-1), MANUAL, or null (not a colour).
 * ctx.global: Map<--name, css text>; ctx.local(name, theme) → css text of a component property or undefined.
 */
export const evalColor = (term, theme, ctx = {}, depth = 0) => {
  if (depth > 20) return MANUAL;
  const t = term.trim();
  const low = t.toLowerCase();
  if (/^#[0-9a-f]{3,8}$/i.test(t)) {
    let h = t.slice(1);
    if (h.length <= 4) h = [...h].map((c) => c + c).join("");
    const v = h.match(/../g).map((x) => parseInt(x, 16));
    return [v[0], v[1], v[2], v.length > 3 ? v[3] / 255 : 1];
  }
  if (low === "transparent") return [0, 0, 0, 0];
  if (NAMED[low]) return [...NAMED[low], 1];
  const m = fn(t);
  if (!m) return null;
  const [, name, args] = m;
  const fname = name.toLowerCase();
  if (fname === "var") {
    const { name: v, fallback } = parseVar(args);
    const text = ctx.global?.get(v) ?? ctx.local?.(v, theme) ?? fallback;
    return text === undefined ? MANUAL : evalColor(text, theme, ctx, depth + 1);
  }
  if (fname === "light-dark") {
    const [l, d] = split(args, ",");
    return evalColor(theme === "dark" ? d : l, theme, ctx, depth + 1);
  }
  if (/^(rgb|rgba|hsl|hsla|color)$/.test(fname)) {
    const parts = split(args.replaceAll("/", " / "), " ,").filter((p) => p !== "/");
    if (parts.some((p) => !/^-?[\d.]+(%|deg)?$|^srgb$/.test(p))) return MANUAL;
    if (fname === "color") {
      if (parts.shift() !== "srgb") return MANUAL;
      return [...parts.slice(0, 3).map((p) => num(p) * 255), parts[3] ? num(parts[3]) : 1];
    }
    const alpha = parts[3] ? num(parts[3]) : 1;
    if (fname.startsWith("rgb")) return [...parts.slice(0, 3).map((p) => num(p, 255)), alpha];
    return [...hsl(parseFloat(parts[0]), num(parts[1]), num(parts[2])), alpha];
  }
  if (fname === "color-mix") {
    const [space, a, b] = split(args, ",");
    if (space.trim() !== "in srgb" || !b) return MANUAL;
    const side = (s) => {
      const p = split(s, " ");
      const pct = p.find((x) => /^[\d.]+%$/.test(x));
      return {
        c: evalColor(p.filter((x) => x !== pct).join(" "), theme, ctx, depth + 1),
        p: pct && parseFloat(pct) / 100,
      };
    };
    const A = side(a);
    const B = side(b);
    if (!Array.isArray(A.c) || !Array.isArray(B.c)) return MANUAL;
    // CSS Color 4 §color-mix: normalise percentages, premultiply alpha, sum < 100% scales alpha.
    let p1 = A.p ?? (B.p !== undefined ? 1 - B.p : 0.5);
    let p2 = B.p ?? 1 - p1;
    const sum = p1 + p2;
    if (sum === 0) return MANUAL;
    const mult = Math.min(sum, 1);
    [p1, p2] = [p1 / sum, p2 / sum];
    const alpha = A.c[3] * p1 + B.c[3] * p2;
    const rgb = [0, 1, 2].map((i) =>
      alpha === 0 ? 0 : (A.c[i] * A.c[3] * p1 + B.c[i] * B.c[3] * p2) / alpha,
    );
    return [...rgb, alpha * mult];
  }
  return null;
};

if (process.argv.includes("--self-test")) {
  const cases = [
    ["color-mix(in srgb, #cf5736 15%, transparent)", "rgb(207 87 54 / 15%)"],
    ["color-mix(in srgb, #fcead7 60%, white)", "rgb(253 242 231)"],
  ];
  let failed = 0;
  for (const [input, want] of cases) {
    const got = format(evalColor(input, "light"));
    const ok = got === want;
    if (!ok) failed++;
    console.log(`${ok ? "ok  " : "FAIL"} ${input} → ${got}${ok ? "" : ` (want ${want})`}`);
  }
  process.exit(failed ? 1 : 0);
}

// ---------- tokens ----------
/** Custom property definitions from a CSS/SCSS file whose `:root` holds one `--name: value;` per line. */
const defs = (url) =>
  new Map([...read(url).matchAll(/^\s*(--[\w-]+):\s*(.+);\s*$/gm)].map((m) => [m[1], m[2]]));
const GLOBAL = new Map([
  ...defs(new URL("tokens/_tokens.generated.scss", styles)),
  ...defs(new URL("tokens/_legacy-aliases.scss", styles)),
]);
const flatten = (tree, prefix = []) =>
  Object.entries(tree).flatMap(([k, v]) =>
    k.startsWith("$") || typeof v !== "object"
      ? []
      : "$value" in v
        ? [[...prefix, k].join(".")]
        : flatten(v, [...prefix, k]),
  );
const SEMANTIC = flatten(JSON.parse(read(new URL("tokens/semantic.light.tokens.json", web))));
const cssName = (path) => `--${path.replaceAll(".", "-")}`;
const pathOf = new Map(SEMANTIC.map((p) => [cssName(p), p]));
// Semantic tokens of spec §5.5; everything else in the semantic files came with Task 4 (base/utilities).
const SPEC_55 = new Set(
  [
    "text.body",
    "text.strong",
    "text.muted",
    "text.accent",
    "text.on-accent",
    "text.on-overlay",
    ...[
      "hero",
      "sheet",
      "paper",
      "chip",
      "callout",
      "badge",
      "wash",
      "tint",
      "floating",
      "overlay",
    ].map((s) => `surface.${s}`),
    "accent.solid",
    "accent.icon",
    "border.card",
    "border.inner",
    "border.control",
    "control.bg",
    "control.text",
    "focus.ring",
    "status.danger",
    "status.success",
    "status.gold",
  ]
    .map((p) => `color.${p}`)
    .concat(["shadow.paper-lift", "shadow.hover-glow"]),
);
/** Semantic token path a `var(--x)` stands for: the token itself or a legacy alias that is exactly `var(--token)`. */
const semanticOf = (name) => {
  if (pathOf.has(name)) return pathOf.get(name);
  const alias = GLOBAL.get(name)?.match(/^var\((--[\w-]+)\)$/);
  return alias && pathOf.get(alias[1]);
};
const tokenCtx = { global: GLOBAL };
const TOKENS = SEMANTIC.filter((p) => p.startsWith("color.")).map((p) => ({
  path: p,
  light: evalColor(`var(${cssName(p)})`, "light", tokenCtx),
  dark: evalColor(`var(${cssName(p)})`, "dark", tokenCtx),
}));

// ---------- Sass variables ----------
const sassDefs = (text) =>
  new Map(
    [...text.matchAll(/^\s*\$([\w-]+)\s*:\s*([^;]+);/gm)].map((m) => [
      m[1],
      m[2].replace(/\s*\/\/.*$/gm, "").trim(),
    ]),
  );
const SASS = new Map([
  ...sassDefs(read(new URL("variables/_colors.scss", styles))),
  ...sassDefs(read(new URL("variables/_base.scss", styles))),
  // Same shadow as the semantic token (spec §5.5 shadow.paper-lift); count it as that token, not as two rgb() literals.
  ["paper-lift", "var(--shadow-paper-lift)"],
]);
const expandSass = (text, local) => {
  let out = text.replace(/#\{([^}]*)\}/g, "$1");
  for (let i = 0; i < 5 && /\$[\w-]/.test(out); i++) {
    out = out.replace(/(?:[\w-]+\.)?\$([\w-]+)/g, (all, n) => local.get(n) ?? SASS.get(n) ?? all);
  }
  return out;
};

// ---------- SCSS scan ----------
const DARK =
  /^@include\s+[\w-]+\.dark-mode-(class|override)\b|^(html\[class~?="?dark"?\]|html\.dark|\.dark|:global\(\.dark\))\s+&$/;
/** Declarations of one file: { stack (selector preludes without dark blocks), dark, prop, value, line }. */
const scan = (text) => {
  const clean = text
    .replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, " "))
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
  const decls = [];
  const stack = [];
  let buf = "";
  let start = 1;
  let line = 1;
  const flush = (end) => {
    const t = buf.trim();
    buf = "";
    if (end === "{") {
      stack.push({ prelude: t.replace(/\s+/g, " "), dark: DARK.test(t.replace(/\s+/g, " ")) });
      return;
    }
    const m = t.match(/^(\$?[\w-]+)\s*:\s*([\s\S]+)$/);
    if (m) {
      decls.push({
        dark: stack.some((s) => s.dark),
        line: start,
        prop: m[1],
        stack: stack.filter((s) => !s.dark).map((s) => s.prelude),
        value: m[2]
          .replace(/\s*!important\s*$/, "")
          .replace(/\s+/g, " ")
          .trim(),
      });
    }
    if (end === "}") stack.pop();
  };
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (!buf.trim() && /\S/.test(ch)) start = line;
    if (ch === "\n") line++;
    if (ch === "#" && clean[i + 1] === "{") {
      const j = clean.indexOf("}", i);
      buf += clean.slice(i, j + 1);
      i = j;
    } else if (ch === "{" || ch === "}" || ch === ";") flush(ch);
    else buf += ch;
  }
  return decls;
};

// ---------- terms ----------
const isLocalVar = (name) => name.startsWith("--") && !GLOBAL.has(name);
/** Colour terms of a value; a component property is followed to its fallback unless set on the selector chain. */
const terms = (value, onChain) => {
  const out = [];
  for (const tok of split(value, " ,/")) {
    const m = fn(tok);
    const name = m?.[1].toLowerCase();
    if (name === "var") {
      const { name: v, fallback } = parseVar(m[2]);
      if (isLocalVar(v)) {
        if (!onChain(v) && fallback) out.push(...terms(fallback, onChain));
      } else if (semanticOf(v) || Array.isArray(evalColor(tok, "light", tokenCtx))) out.push(tok);
    } else if (/^(color-mix|light-dark|rgba?|hsla?|color)$/.test(name ?? "")) out.push(tok);
    else if (m) out.push(...terms(m[2], onChain));
    else if (/^#[0-9a-f]{3,8}$/i.test(tok) || NAMED[tok.toLowerCase()]) out.push(tok);
  }
  return out;
};

// ---------- collect ----------
const rows = new Map(); // key light|dark → row
const mapped = new Map(); // token path → { uses, refs, via }
const addRef = (map, file, line) => map.set(file, [...(map.get(file) ?? []), line]);

for (const file of FILES) {
  const text = read(new URL(file, styles));
  const local = sassDefs(text);
  const decls = scan(text).filter((d) => !d.prop.startsWith("$"));
  for (const d of decls) d.value = expandSass(d.value, local);
  const key = (stack) => stack.join(" » ");
  const slots = new Map();
  for (const d of decls) {
    const k = `${key(d.stack)}|${d.prop}`;
    if (!slots.has(k)) slots.set(k, { dark: [], light: [] });
    slots.get(k)[d.dark ? "dark" : "light"].push(d);
  }
  const chainLookup = (stack, prop, theme) => {
    for (let n = stack.length; n >= 0; n--) {
      const s = slots.get(`${key(stack.slice(0, n))}|${prop}`);
      if (!s) continue;
      const d = theme === "dark" ? (s.dark.at(-1) ?? s.light.at(-1)) : s.light.at(-1);
      if (d) return d.value;
    }
    return undefined;
  };
  const onChainOf = (stack) => (prop) =>
    chainLookup(stack, prop, "light") !== undefined ||
    chainLookup(stack, prop, "dark") !== undefined;
  // The light value of a property set only in dark is the fallback of a `var(--prop, fallback)` read on the
  // same selector, else on an ancestor. shortcut: else the first such read in the file; check by hand if it matters.
  const fallbackIn = (prop, stack) => {
    const re = new RegExp(`var\\(\\s*${prop}\\s*,`);
    const reads = decls.filter((d) => !d.dark && re.test(d.value));
    const depthOf = (d) => {
      const k = key(d.stack);
      for (let n = stack.length; n >= 0; n--)
        if (key(stack.slice(0, n)) === k) return stack.length - n;
      return Infinity;
    };
    const d = reads.sort((a, b) => depthOf(a) - depthOf(b))[0];
    if (!d) return undefined;
    const open = d.value.search(re) + 3;
    let depth = 0;
    for (let i = open; i < d.value.length; i++) {
      if (d.value[i] === "(") depth++;
      if (d.value[i] === ")" && --depth === 0)
        return { line: d.line, value: parseVar(d.value.slice(open + 1, i)).fallback };
    }
    return undefined;
  };

  const record = ({ lightTerm, darkTerm, lightLine, darkLine, stack }) => {
    const ctxOf = { global: GLOBAL, local: (p, theme) => chainLookup(stack, p, theme) };
    const ref = lightTerm ?? darkTerm;
    const vm = ref && fn(ref);
    const sem = vm?.[1] === "var" && semanticOf(parseVar(vm[2]).name);
    if (sem && lightTerm === darkTerm) {
      const e = mapped.get(sem) ?? { refs: new Map(), uses: 0, via: new Set() };
      e.uses++;
      e.via.add(parseVar(vm[2]).name);
      addRef(e.refs, file, lightLine ?? darkLine);
      mapped.set(sem, e);
      return;
    }
    const light = lightTerm ? evalColor(lightTerm, "light", ctxOf) : undefined;
    const dark = evalColor(darkTerm, "dark", ctxOf);
    const fmt = (c, termText) =>
      c === MANUAL ? `${MANUAL}: ${termText}` : c === undefined ? "—" : format(c);
    const L = fmt(light, lightTerm);
    const D = fmt(dark, darkTerm);
    const k = `${L}|${D}`;
    const row = rows.get(k) ?? {
      dark,
      darkSrc: new Set(),
      L,
      D,
      light,
      lightSrc: new Set(),
      refs: new Map(),
      uses: 0,
    };
    row.uses++;
    if (lightTerm) row.lightSrc.add(lightTerm);
    row.darkSrc.add(darkTerm);
    for (const l of new Set([lightLine, darkLine].filter(Boolean))) addRef(row.refs, file, l);
    rows.set(k, row);
  };

  // A dark longhand (`border-color`) pairs with the light shorthand of the same selector (`border`).
  const shorthandOf = (d) => {
    const parts = d.prop.replace(/-color$/, "").split("-");
    for (let n = parts.length; n >= 1; n--) {
      const s = slots.get(`${key(d.stack)}|${parts.slice(0, n).join("-")}`);
      if (s?.light.length && (n < parts.length || d.prop.endsWith("-color"))) return s.light.at(-1);
    }
    return undefined;
  };
  const bases = new Map();
  for (const s of slots.values()) {
    if (s.dark.length) bases.set(s, s.light.at(-1) ?? shorthandOf(s.dark[0]));
  }
  const paired = new Set(bases.values());
  for (const slot of slots.values()) {
    const { dark: darkDecls, light: lightDecls } = slot;
    const base = bases.get(slot);
    for (const d of lightDecls) {
      if (paired.has(d)) continue; // emitted with its dark counterpart below
      for (const t of terms(d.value, onChainOf(d.stack)))
        record({ darkTerm: t, lightLine: d.line, lightTerm: t, stack: d.stack });
    }
    for (const dd of darkDecls) {
      const onChain = onChainOf(dd.stack);
      const fb = !base && dd.prop.startsWith("--") ? fallbackIn(dd.prop, dd.stack) : undefined;
      const lightValue = base?.value ?? fb?.value;
      const lightLine = base?.line ?? fb?.line;
      const D = terms(dd.value, onChain);
      const L = lightValue ? terms(lightValue, onChain) : [];
      if (L.length && L.length !== D.length) {
        record({
          darkLine: dd.line,
          darkTerm: `manual: ${D.join(" ")}`,
          lightLine,
          lightTerm: `manual: ${L.join(" ")}`,
          stack: dd.stack,
        });
        continue;
      }
      D.forEach((t, i) =>
        record({ darkLine: dd.line, darkTerm: t, lightLine, lightTerm: L[i], stack: dd.stack }),
      );
    }
  }
}

// ---------- group, match, merge ----------
const close = (a, b) =>
  Array.isArray(a) &&
  Array.isArray(b) &&
  [0, 1, 2].every((i) => Math.abs(a[i] - b[i]) / 2.55 <= 5) &&
  Math.abs(a[3] - b[3]) <= 0.05;
const same = (a, b) => format(a) === format(b);
const pairClose = (r, l, d) =>
  (r.light === undefined ? false : close(r.light, l)) && close(r.dark, d);
const isManual = (r) => r.L.startsWith(MANUAL) || r.D.startsWith(MANUAL);

const all = [...rows.values()];
for (const r of all) {
  r.exact =
    isManual(r) || r.light === undefined
      ? []
      : TOKENS.filter((t) => same(t.light, r.light) && same(t.dark, r.dark)).map((t) => t.path);
  r.near =
    r.exact.length || isManual(r)
      ? []
      : TOKENS.filter((t) => pairClose(r, t.light, t.dark)).map((t) => t.path);
}
// Greedy merge groups: most used row seeds a group; rows within 5 points (light and dark, rgb and alpha) join it.
const sorted = all
  .filter((r) => !isManual(r))
  .sort((a, b) => b.uses - a.uses || a.L.localeCompare(b.L));
const groups = [];
for (const r of sorted) {
  if (r.group) continue;
  const g = [r];
  r.group = g;
  for (const o of sorted) {
    if (o.group || (o.L === "—") !== (r.L === "—")) continue;
    if ((r.light === undefined || close(r.light, o.light)) && close(r.dark, o.dark)) {
      o.group = g;
      g.push(o);
    }
  }
  groups.push(g);
}
groups.sort((a, b) => b.reduce((s, r) => s + r.uses, 0) - a.reduce((s, r) => s + r.uses, 0));
const ordered = [...groups.flat(), ...all.filter(isManual)];
ordered.forEach((r, i) => (r.id = `R${i + 1}`));
let mergeNo = 0;
for (const g of groups) {
  if (g.length < 2) continue;
  mergeNo++;
  g.forEach(
    (r, i) =>
      (r.merge =
        i === 0
          ? `M${mergeNo}: keep (${g
              .slice(1)
              .map((o) => o.id)
              .join(", ")} → this)`
          : `M${mergeNo}: merge into ${g[0].id}`),
  );
}

// ---------- markdown ----------
const esc = (s) => s.replaceAll("|", "\\|");
const short = (set) => {
  const list = [...set];
  const s = list
    .slice(0, 2)
    .map((x) => `\`${esc(x.length > 60 ? `${x.slice(0, 57)}…` : x)}\``)
    .join(", ");
  return list.length > 2 ? `${s} +${list.length - 2}` : s;
};
const refs = (map) =>
  [...map]
    .map(([f, ls]) => `${f}:${[...new Set(ls)].sort((a, b) => a - b).join(",")}`)
    .join("<br>");
const cell = (val, src) => (val === "—" ? "— (not set)" : `\`${esc(val)}\`<br>${short(src)}`);
const near = (r) =>
  [r.merge, r.near.length ? `≈ ${r.near.map((p) => `\`${p}\``).join(", ")}` : ""]
    .filter(Boolean)
    .join("<br>");
const manualCount = all.filter(isManual).length;
const tokenRow = (t) => `| \`${t.path}\` | \`${format(t.light)}\` | \`${format(t.dark)}\` |`;

const md = `# Colour inventory (design system wave 1b)

Fill in the **decision** column of every row, one of three answers:
1. an existing semantic token (\`color.surface.chip\`); the "nearest existing token" column shows exact matches, "≈" in "merge proposal" shows tokens within 5 points;
2. a new token named by role, not by colour (\`color.surface.selected\`, never \`color.orange-wash\`);
3. \`keep as private one-off\` for pure decoration (confetti, illustration), which then stays a literal in its component.
Merge proposals (\`M<n>\`): confirm with "merge" or reject by giving the row its own decision.

Generated by \`node website/scripts/colour-inventory.mjs\` from ${FILES.length} files (plan Tasks 8 to 11) on the current tokens. Do not edit rows by hand except the decision column; rerun the script after source changes and copy decisions over.
Values are computed as today: light, and dark from the \`dark-mode-class\` block of the same selector and property (no block: the light expression evaluated in dark). "— (not set)": the property only exists in dark. \`color-mix(in srgb, …)\` is evaluated arithmetically (CSS Color 4, premultiplied alpha).

**Counts:** ${ordered.length} decision rows (${manualCount} manual), ${mergeNo} merge proposals, ${mapped.size} tokens already mapped (${[...mapped.values()].reduce((s, e) => s + e.uses, 0)} uses).

## Decisions

| # | light | dark | uses | files:lines | nearest existing token | merge proposal | decision |
| --- | --- | --- | --- | --- | --- | --- | --- |
${ordered
  .map(
    (r) =>
      `| ${r.id} | ${cell(r.L, r.lightSrc)} | ${cell(r.D, r.darkSrc)} | ${r.uses} | ${refs(r.refs)} | ${isManual(r) ? "manual" : r.exact.map((p) => `\`${p}\``).join(", ") || "none"} | ${near(r)} |  |`,
  )
  .join("\n")}

"manual" rows could not be computed by the script (a component property set elsewhere, a different number of colours in light and dark, or another colour space); look them up in the source.

<details>
<summary>Already mapped: references to a semantic token or a legacy alias of one (${mapped.size} tokens, nothing to decide)</summary>

| token | via | uses | files:lines |
| --- | --- | --- | --- |
${[...mapped]
  .sort((a, b) => b[1].uses - a[1].uses)
  .map(
    ([p, e]) =>
      `| \`${p}\` | ${[...e.via].map((v) => `\`${v}\``).join(", ")} | ${e.uses} | ${refs(e.refs)} |`,
  )
  .join("\n")}

</details>

## Tokens added in Task 4 (not in spec §5.5)

They count as existing tokens and may be chosen in the decision column.

| token | light | dark |
| --- | --- | --- |
${TOKENS.filter((t) => !SPEC_55.has(t.path))
  .map(tokenRow)
  .join("\n")}

<details>
<summary>All semantic colour tokens (computed values)</summary>

| token | light | dark |
| --- | --- | --- |
${TOKENS.map(tokenRow).join("\n")}

</details>
`;

mkdirSync(new URL(".", OUT), { recursive: true });
writeFileSync(OUT, md);
console.log(
  `${fileURLToPath(OUT)}: ${ordered.length} rows (${manualCount} manual), ${mergeNo} merge proposals, ${mapped.size} mapped tokens`,
);
