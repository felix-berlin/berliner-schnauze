---
paths:
  - "website/**/*.scss"
  - "website/**/*.vue"
  - "website/src/styles/**"
---

# Styles: tokens, layers, scope (website/)

Full design and tables: `docs/superpowers/specs/2026-11-13-design-system-design.md`. Visual language: `DESIGN.md`. Migrated = not listed in `website/stylelint.legacy-files.mjs`; migrated files follow everything below, legacy files only "Legacy files".

## Tiers and token files

- Sources (DTCG): `website/tokens/primitive.tokens.json`, `semantic.light.tokens.json`, `semantic.dark.tokens.json`. The two semantic files have identical paths.
- Generated, never edit: `website/src/styles/tokens/_tokens.generated.scss` (`@layer tokens`; ignored by Stylelint and oxfmt). Name = path joined with `-`: `color.surface.paper` -> `--color-surface-paper`. Themed values are `light-dark()`.
- Tier 1 primitive: raw values (`color.orange.600`, `color.ink.100`-`1000` plus `m` mixes, `color.danger|success|gold`, `space.*`, `font.*`, `radius.*`, `duration.*`, `z.*`). Never used in components.
- Tier 2 semantic: meaning per theme (`color.surface.*`, `color.text.*`, `color.status.*`, `shadow.*`). The only colour tier components may use. Non-colour tokens (space, font, radius, duration, ease, z) are used directly.
- Tier 3 component: custom properties inside a component. Private `--_name`, public `--<component>-name` (a parent may set it).
- `--_` properties may hold raw lengths (one-line comment why: no token step within 0.1rem, `clamp()`, one-off width), never colours.

## Semantic tokens only

- Colour: only `var(--color-<semantic>)` / `var(--shadow-…)`. No hex, named colour, `rgb()`/`hsl()`/`color-mix()`, no primitive, no legacy alias (`--orange-600`, `--blue-*`, `--surface-*` ...).
- Font size, spacing, radius, shadow, z-index, duration, font family: tokens. Value between two steps: nearer step; exactly in the middle: the smaller.
- A colour without a semantic token: stop and report it. No primitive, no invented token, no `--_` property holding a colour.
- No dark-mode code: `light-dark()` tokens follow `color-scheme`. No `dark-mode-class` mixin, no `.dark` selector. Only exceptions: the `color-scheme` switch in `base/_colors.scss` and `html[class~="dark"] .c-select { background-blend-mode }` in `base/_inputs.scss`.
- Logical properties only (`inline-size`, `margin-block`, `inset-inline`); no `@media` (viewport queries only via `mx.breakpoint` in `objects`), no `@import`, `@extend`, no Sass variables or `#{}` in declaration values.
- Per-line Stylelint disables need a reason in the same comment. No `!important` outside the reduced-motion reset in `base`.

## Layers

Order, declared inline in `BaseHead.astro` (do not touch): `reset, tokens, vendor, base, legacy, objects, components, utilities`.

- Folder decides the layer: `base/` -> base, `objects/` -> objects, `utilities/` -> utilities, migrated components -> `components` (via `mx.component`).
- Never write `@layer` for a new style except through `mx.component`; the contract test allows only these layer names.
- Library CSS: load with `meta.load-css` inside a layer block (`@layer vendor { @include meta.load-css(...) }`). A plain `@use` of foreign CSS lands unlayered and beats every layer; the contract test rejects foreign `@use`.
- `legacy` holds every not yet migrated partial (each wraps its rules in `@layer legacy`). A file leaves `legacy` only when fully migrated, and is then removed from `stylelint.legacy-files.mjs`. The list only shrinks, never add to it.
- `.vue` and `.astro` style blocks contain only `@use` (no `scoped`, no rules).

## Components: `mx.component`

One component = one file `src/styles/components/_<name>.scss` = exactly one block; the name matches the file:

```scss
@use "@styles/mixins" as mx;

@include mx.component("section-card") {
  :scope {
    --_bg: var(--color-surface-sheet);
    background: var(--_bg);
    container: section-card / inline-size;
  }
  .title {
    font-size: var(--font-size-xl);
    color: var(--color-text-strong);
  }
  :scope[data-variant="note"] {
    border-inline-start: 3px solid var(--color-border-inner);
  }
}
```

- Root keeps its namespaced class `c-<name>` (`o-` objects, `u-` utilities, `js-` JS hooks, no styling). Write the root only as `:scope`: never the root class, never a top-level `&`.
- Wiring: like every partial: a Vue component loads `@use "@styles/components/<name>";` as the only content of its `<style lang="scss">` block; a global component is `@use`d in `src/styles/app.scss`. Container name = component name.
- Public property: declare it as `--<component>-<name>`, read it on `:scope` with a fallback: `background: var(--button-bg, var(--color-accent-solid));`. The parent sets it; the component never sets it itself.
- Parts: plain lowercase-hyphen classes or bare elements (`.title`, `button`). No `__element`, `--modifier`, `.is-*`, `.has-*`. Sass nesting below a part is fine.
- Variants: `data-variant` on the root. State: ARIA/native first (`[aria-pressed="true"]`, `:disabled`, `[open]`), else `data-state`.
- Boundary: a component never styles a nested `c-*` component or slotted content. Every element directly wrapping a `<slot>` carries `data-slot`.
- A parent places a child via its own layout (`grid`, `gap`) and adjusts it only through the child's public properties (`--button-bg`). No parent rule on a child's class. If that is impossible: report, do not widen the boundary.
- JS and tests never select part classes: JS uses `js-` classes or `data-` attributes; tests use roles and text first, the `c-` root second.
- jsdom ignores `@scope`: assert scoped styles in Playwright only.
- Form controls (`input`, `textarea`): Safari 26.0-26.3 does not apply `@scope` rules to them (fixed in 26.4; MDN browser-compat-data `css/at-rules/scope`). Check them there or keep their base styling in `base/_inputs.scss`.
- Browser floor: Firefox >= 146 (`@scope`); unsupported browsers get the notice generated from browserslist.

## Responsive: container queries vs. `mx.breakpoint`

- In components: the root is the container (`container: <name> / inline-size`), parts use `@container <name> (inline-size >= 30rem)`. A container query cannot style the container itself: a root whose own padding or grid must respond gets an inner wrapper part (`.inner`).
- `@include mx.breakpoint("sm")` (`@use "@styles/mixins" as mx;`, never raw `@media`) only in `objects/` (page shell) and legacy files. Map: `src/styles/variables/_layout.scss`.

## Commands (pnpm only; the style scripts exist in `website/` only, root has just `pnpm test:unit`)

- `pnpm tokens:build` regenerates the token file; `pnpm tokens:check` fails when it is stale (CI runs it).
- `pnpm lint:style:check` = Stylelint without fixing. Never use `pnpm lint` to check: it auto-fixes and modifies files.
- `pnpm test:unit` runs the contract test (`website/src/tests/unit/styles/contract.test.ts`) and the Stylelint fixtures.
- Visual baseline: `website/src/tests/e2e/visual-baseline.spec.ts`, local gate only (ignored in CI), chromium; run command in its header. A snapshot update must name the reason.
- Every migrated page: light + dark check at 390px and 1280px.

## Add a token

1. Add the path to `primitive.tokens.json` if a new raw value is needed (`$type` on the group, `$value` on the token).
2. Semantic token: add the same path to both `semantic.light.tokens.json` and `semantic.dark.tokens.json` (aliases `{group.token}`; a path missing in one file fails the build; one path may not exist in both tiers).
3. `pnpm tokens:build`, then commit the JSON files and the generated file together.

## Legacy files

Applies only to files listed in `website/stylelint.legacy-files.mjs` (not yet migrated). Do not extend them with new features; migrate them whole instead.

- Vue styles: not scoped, `<style lang="scss">` with `@use "@styles/components/name"` only; each component owns `src/styles/components/_name.scss`.
- Every partial wraps its rules in `@layer legacy { ... }` below its `@use` lines.
- [BEMIT](https://gist.github.com/stephenway/a6145d9b4430e8c55a77) naming:

| Prefix           | Purpose                    | Example                       |
| ---------------- | -------------------------- | ----------------------------- |
| `.c-`            | Components (reusable UI)   | `.c-word-card__title--active` |
| `.o-`            | Objects (structural)       | `.o-grid__item`               |
| `.u-`            | Utilities (single-purpose) | `.u-hidden`                   |
| `.is-` / `.has-` | State                      | `.is-active`, `.has-dropdown` |
| `.js-`           | JS hooks (no styling)      | `.js-scroll-target`           |

Pattern `.c-block__element--modifier`, hyphens inside each part, never plain BEM without prefix.

- Old palette and aliases (`var(--orange-600)`) and `butler-mx.dark-mode-class` still work here (aliases in `src/styles/tokens/_legacy-aliases.scss`).
- Breakpoints: `mx.breakpoint`; container queries where the behaviour is about a component's own width (`objects/_word.scss`).
- Shared: `mx.paper-card` / `mx.paper-card-title` (`mixins/_paper-card.scss`); `c-button` with `data-variant="primary"` = orange CTA; `var(--color-muted)` = secondary text. Word page controls (`docs/design/wortseite/SPEC.md`): `.c-choice` (`aria-pressed`), `c-link` (an `@scope` component), `.c-icon-button`, only the submit has `data-variant="primary"`. Focus ring: `.o-word-page` and `.c-lightbox` set the public `--focus-ring-style: dashed`; form controls with their own focus rule read it (`var(--focus-ring-style, solid)`), so set it instead of overriding their outline.
- `@use "@styles/path"`, never `@import`.
