# Design System: tokens, layers, scope, lint

Status: approved by the user (2026-11-13). Replaces the draft `docs/design/design-system/SPEC.md`.

Paths are relative to `website/` unless they start with `docs/` or `.claude/`. Visual language (palette, Postcard Rule, voice) stays in `DESIGN.md`; page specs stay in `docs/design/wortseite/SPEC.md` and `docs/design/bon/SPEC.md`.

## 1. Intent

A new visual design is being built. It follows the word page, the BON game and (roughly, less tidy) the Anki page. Before the redesign spreads, the styles get one foundation that lasts: every value comes from a token, the cascade order is fixed, components cannot leak into each other, and a linter refuses anything that bypasses this. A cheaper model must be able to build a component correctly from this document alone.

Measured today (273 style files): 384 semantic colour references against 363 direct palette references, 99 `color-mix()` calls and 84 dark-mode blocks inside components; 221 raw font sizes (40 distinct), 682 raw spacing values (68 distinct), no tokens for spacing, type, layers or durations.

## 2. Goals, non-goals, anti-goals

**Goals**

- One token source in the Design Tokens format (DTCG 2025.10) for colour, space, type, radius, shadow, duration, easing and stacking.
- Light and dark from the tokens alone: no dark-mode block in any component.
- All CSS in named cascade layers; `@scope` isolates components and replaces BEM elements and modifiers.
- Container queries for everything that depends on a component's own width.
- Stylelint and one contract test fail on every bypass, in CI.
- Old and new styles coexist safely until the last page has moved.

**Non-goals**

- New visual values. The reference pages move with today's values; the redesign then edits token files.
- Migrating pages that will be rebuilt anyway. They move with their redesign.
- A token tool (Terrazzo, Style Dictionary), Figma sync, Storybook.
- Changes to the `@felix_berlin/sass-butler` package.

**Anti-goals** (failure even if it technically works)

- A visible change on a migrated reference page that nobody decided.
- A "system" with escape hatches that are used routinely (raw values, primitives in components, per-line lint disables without a reason).
- A browser below the floor showing a silently unstyled page instead of the unsupported-browser notice.

## 3. Constraints

- No new npm dependency without asking the user.
- Feature rule of `website/CLAUDE.md`: Baseline Widely and Newly available features are used natively, no polyfill. A feature the page needs in order to work must be supported by the whole browser floor (§9).
- `postcss-preset-env` keeps transpiling for the browserslist target; `"cascade-layers": false` stays.
- Vue style blocks stay without the `scoped` attribute and contain only `@use`.
- Every migrated page passes the light + dark check at 390px and 1280px.
- `pnpm lint` auto-fixes; checks use the check-only scripts of §11.

## 4. Approaches

**System vs. redesign.** (1) Migrate everything with today's values, redesign later. (2) Build the new system beside the old one with new values, pages move when redesigned. (3) Foundation plus the reference pages move with today's values, every other page moves with its redesign. **Chosen: 3.** The foundation is proven on the best pages and nothing is migrated that is thrown away soon.

**Coexistence of old and new.** (A) All existing styles go into one `legacy` cascade layer below the new component layer; old token names stay as aliases. (B) Two separate stylesheets, a page loads one or the other. (C) Leave old styles unlayered. **Chosen: A.** C is impossible (unlayered CSS beats every layer). B needs header, footer and modal twice and swaps stylesheets during client-side navigation.

**Token build.** A small Node script in the repo, or a token tool. **Chosen (Claude's call): the script.** No dependency, exactly testable; the files are standard DTCG, so a tool can replace the script later.

**BEM.** Keep BEMIT and add `@scope` only around foreign content, or replace BEM by `@scope`. **Chosen by the user: replace.**

## 5. Tokens

### 5.1 Format and files

- DTCG 2025.10, files `tokens/primitive.tokens.json`, `tokens/semantic.light.tokens.json`, `tokens/semantic.dark.tokens.json`.
- Every token has `$value`; `$type` sits on the group. Aliases: `{group.token}`.
- Colour: `{ "colorSpace": "srgb", "components": [r, g, b], "alpha": a, "hex": "#rrggbb" }`, components 0 to 1. Dimension: `{ "value": 4, "unit": "px" }` (`px` or `rem`). Duration: `{ "value": 300, "unit": "ms" }`.
- The format has no modes. The two semantic files have identical token paths; a path missing in one is a build error.

### 5.2 Three tiers

1. **Primitive**: raw values, no meaning (`color.orange.600`, `space.4`).
2. **Semantic**: meaning → primitive, per theme (`color.surface.paper`). The only tier components may use.
3. **Component**: custom properties inside a component. Private ones start with `--_` (`--_bg`); public ones, which a parent may set, are named after the component (`--button-bg`).

### 5.3 CSS output

- `scripts/build-tokens.mjs` writes `src/styles/tokens/_tokens.generated.scss`: `@layer tokens { :root { … } }`.
- Name = token path joined with `-`: `color.surface.paper` → `--color-surface-paper`.
- Themed value: `light-dark(<light>, <dark>)`; one plain value when both agree. Aliases become `var(--…)`, never inlined.
- `light-dark()` takes colours only. A themed shadow keeps one geometry for both themes and gets `light-dark()` per colour inside it (`0 0 12px 0 light-dark(…, …)`); a shadow whose geometry differs between themes is a build error.
- Theme switch stays as today: `html[class~="dark"]` sets `color-scheme: dark`, otherwise `light`. The blocking inline script in `SetColorMode.astro` resolves the stored choice or the system setting to that class before first paint, so `light-dark()` never follows the system against the stored choice.
- The generated file is committed; a test fails when it differs from a fresh build. There is no `predev`/`prebuild` step.
- No colour math in components: `color-mix()` is not allowed there. A wash is a semantic token with `alpha`.

### 5.4 Primitives

| Group                                         | Tokens                                                                                                                                                                       | Source                                  |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `color.white`                                 | `100`, `200`, `pure` (#ffffff); `color.black.pure`                                                                                                                           | `src/styles/variables/_colors.scss`     |
| `color.orange`                                | `100` to `900`                                                                                                                                                               | same                                    |
| `color.red`                                   | `100`, `200`, `500`; `color.red-berlin.500/600/700`                                                                                                                          | same                                    |
| `color.cream`                                 | `500` (today `yellow-500`)                                                                                                                                                   | same                                    |
| `color.grey`                                  | `100`, `200`                                                                                                                                                                 | same                                    |
| `color.ink`                                   | `100`–`1000` (the old generated `--blue-*`), `base` (#2b333b), `200m`, `300m`, `400m`, `600m` (the old `--new-blue-*` `color-mix()` results, stored as fixed `srgb` colours) | computed values read in the browser     |
| `color.danger`, `color.success`, `color.gold` | one token each (not `color.status.*`: that path belongs to the semantic tier, and one path in both tiers is a build error)                                                   | same file                               |
| `space`                                       | `1` 0.25rem, `2` 0.5, `3` 0.75, `4` 1, `5` 1.25, `6` 1.5, `8` 2, `12` 3, `16` 4                                                                                              | `DESIGN.md` spacing                     |
| `font.size`                                   | `2xs` 0.7rem, `xs` 0.75, `sm` 0.8, `md` 0.9, `base` 1, `lg` 1.1, `xl` 1.25, `2xl` 1.6, `3xl` 2, `4xl` 2.25                                                                   | word page type scale + most used values |
| `font.family`                                 | `display`, `body`, `mono`                                                                                                                                                    | `variables/_fonts.scss`                 |
| `font.weight`                                 | `regular` 400, `bold` 700, `black` 900                                                                                                                                       | word page spec §4                       |
| `radius`                                      | `none` 0, `xxs` 2px, `xs` 3px, `sm` 4px, `pill` 999px                                                                                                                        | `variables/_base.scss`                  |
| `duration`                                    | `fast` 150ms, `base` 300ms, `slow` 600ms                                                                                                                                     | most used values                        |
| `ease`                                        | `standard` (cubic-bezier 0.42, 0, 0.58, 1)                                                                                                                                   | `_button.scss`                          |
| `z`                                           | `below` -1, `raised` 1, `sticky` 10, `overlay` 20, `header` 100                                                                                                              | today 1–5 and 11000                     |

The scales are Claude's call, derived from the most used values.

### 5.5 Semantic tokens

Values are the ones in `src/styles/base/_colors.scss` at the start, copied, not redesigned. This table is the subset planned before the colour inventory; the source of truth for the semantic tokens is `website/tokens/*.tokens.json`.

| Token                                                                            | Replaces                                                                                                  |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `color.text.body` / `strong` / `muted` / `accent`                                | `--color-body` / `--color-ink-strong` / `--color-muted` / `--color-accent-text`                           |
| `color.text.on-accent`                                                           | `--white-100` as text on orange (new)                                                                     |
| `color.surface.hero` / `sheet` / `paper` / `chip` / `callout` / `badge` / `wash` | `--surface-*`                                                                                             |
| `color.surface.tint`                                                             | `rgb(0 0 0 / 10%)` light, `rgb(255 255 255 / 10%)` dark (new)                                             |
| `color.surface.floating`                                                         | `--floating-color-background`                                                                             |
| `color.surface.overlay`, `color.text.on-overlay`                                 | `--overlay-base`, `--overlay-ink`                                                                         |
| `color.accent.solid` / `color.accent.icon`                                       | `--orange-600` as a full surface / `--orange-400` on icons                                                |
| `color.border.card` / `inner` / `control`                                        | `--rule-card` / `--rule-inner` / `--control-border`                                                       |
| `color.control.bg` / `text`                                                      | `--control-bg` / `--control-color`                                                                        |
| `color.focus.ring`                                                               | `--focus-ring`                                                                                            |
| `color.status.danger` / `success` / `gold`                                       | `--danger` / `--success` / `--gold`                                                                       |
| `shadow.paper-lift` / `shadow.hover-glow`                                        | `--paper-lift` / `--shadow-hover-glow`                                                                    |
| `color.border.accent` / `accent-soft`                                            | `--orange-300` on accent borders and icons / `--orange-200` on dashed dividers (colour inventory R7 / R6) |
| `color.surface.placeholder`                                                      | `--orange-200` light, `--new-blue-200` dark on placeholder and skeleton fills (R12, R13)                  |
| `color.surface.inverse`                                                          | `--new-blue-200` / `--grey-100` dark panels in both themes (R14, R15)                                     |
| `color.surface.chrome`                                                           | header and footer background: `--orange-200` light, `--blue` dark (R38)                                   |
| `color.surface.wash-strong`                                                      | `--orange-500` at 22 % (R18, R19; `wash` is 15 %)                                                         |
| `color.text.emphasis` / `badge`                                                  | `--color-ink-strong` light, `--orange-300` / `--orange-200` dark (R16 / R29)                              |

The full row-by-row decisions (token, merge or private one-off) are in `docs/design/design-system/colour-inventory.md`.

`--primary` and `--accent` get no successor. **Missing tokens are settled once, before wave 2 (user decision).** The colour inventory (§10, wave 1b) lists every colour in the files of waves 2 to 5 that has no semantic token; the user decides each one, and the token files are extended from that. After it, a builder who still meets a colour without a token stops and reports it: no invented token, no primitive, no `--_` property holding a raw colour (a `--_` may alias a semantic token, or hold a one-off colour only with a colour-inventory disable comment).

### 5.6 Mapping rule for existing values

- Equals a token: use it.
- Font size or spacing between two steps: the nearer step; exactly in the middle, the smaller.
- No step within 0.1rem (hero headword, `clamp()` sizes, one-off widths, 1px borders): keep it in a `--_` property at the top of the component with a one-line reason.

## 6. Cascade layers

Order, declared once inline in the document head (`BaseHead.astro`) so no chunk order can change it:

```css
@layer reset, tokens, vendor, base, legacy, objects, components, utilities;
```

| Layer        | Content                                                                              |
| ------------ | ------------------------------------------------------------------------------------ |
| `reset`      | `base/_reset.scss`                                                                   |
| `tokens`     | generated tokens, legacy aliases                                                     |
| `vendor`     | third-party CSS (`@vueform/multiselect`)                                             |
| `base`       | element defaults, fonts, inputs, scrollbar (migrated with the foundation)            |
| `legacy`     | every not yet migrated file from `styles/{components,objects,layouts,pages,plugins}` |
| `objects`    | migrated page shell: header, footer, page grids                                      |
| `components` | migrated components                                                                  |
| `utilities`  | `u-` classes (migrated with the foundation)                                          |

- `legacy` sits above `base` and below `objects`/`components`: old components still beat element defaults, new components always beat old ones.
- Mechanism: in wave 1 every existing partial wraps its own rules in `@layer legacy { … }` below its `@use` lines (Vue style blocks keep their plain `@use`). `.astro` and `.vue` style blocks hold no rules of their own today; the contract test keeps it that way. The multiselect theme is loaded into `vendor` with `meta.load-css`.
- `stylelint.legacy-files.mjs` lists the legacy files. It only shrinks; lint strictness and the contract test both read it. Migrated files stay at their path.
- The 7 existing `!important` declarations are checked one by one in wave 1, because importance reverses layer order.
- A file leaves `legacy` only by being migrated completely. When `legacy` is empty, the layer, the alias file and the old Sass colour variables are deleted.
- `!important` only in the reduced-motion reset in `base`; migrated files have none.

## 7. Components: `@scope` instead of BEM

### 7.1 Rules

- One component = one file = one `@include mx.component("<name>") { … }`. The mixin emits:

```css
@layer components {
  @scope (.c-<name>) to (:scope [class^="c-"], :scope [class*=" c-"], :scope [data-slot] > *) {
    …
  }
}
```

- The root keeps its namespaced class `c-<name>` (objects `o-`, utilities `u-`, JS hooks `js-`). `__element`, `--modifier`, `is-` and `has-` classes do not exist in migrated code.
- Inside the block: the root is always written `:scope`, never as the root class and never as a top-level `&` (that would reach the browser as a CSS nesting selector, whose specificity inside `@scope` differs between engines). Parts are plain lowercase-hyphen classes or bare elements. Sass nesting below a part (`.title { &:hover { … } }`) is fine: Sass resolves it.
- Variants: `data-variant` on the root. State: ARIA or native state first (`[aria-pressed="true"]`, `:disabled`, `[open]`), otherwise `data-state`.
- The boundary means: a component never styles a nested component, and never styles what was passed into one of its slots. Every element that directly wraps a `<slot>` carries `data-slot`.
- A parent places a child through its own layout (grid, `gap`) and adjusts it only through the child's public custom properties.
- JS and tests do not select part classes: JS uses `js-` classes or `data-` attributes; tests use roles and text first, the `c-` root second.
- Responsive: the root is the container (`container: <name> / inline-size`), and `@container <name> (…)` rules apply to its parts. A container query cannot style the container itself, so a root whose own padding or grid must respond gets one inner wrapper part (`.inner`) that carries that layout. A root that sits in a content-sized track (its own width follows its content, so it cannot be the container) may query a named ancestor container instead: `menu-nav` sits in the header's `max-content` column and queries `@container header` on `.o-header-inner`. `mx.breakpoint` only in `objects` (page shell).

### 7.2 Example

Before (`_section-card.scss`, markup `class="c-section-card c-section-card--note"`):

```scss
.c-section-card {
  background: white;
  &__title {
    font-size: 1.25rem;
    color: var(--new-blue-400);
    @include butler-mx.dark-mode-class {
      color: var(--orange-300);
    }
  }
  &--note {
    border-inline-start: 3px solid var(--orange-300);
  }
}
```

After (markup `class="c-section-card" data-variant="note"`, title `class="title"`, slot wrapper `<div class="body" data-slot>`):

```scss
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

### 7.3 The slot case

A page passes `<h3 class="title">` into the card's body slot. The card's `.title` rule must not hit it: the element is a child of `[data-slot]`, so it lies outside the scope. The page styles it from its own component root. A parent rule like `.c-word-hero__actions .c-button { margin: 0 }` cannot be written any more: the parent uses `gap`, or sets `--button-…` if the button offers it. If neither works, the builder reports the case instead of widening the boundary.

## 8. Modern CSS used

Logical properties only; `:has()` instead of mirrored state classes; `gap` instead of margin chains; `subgrid` for aligned rows; `text-wrap: balance` (headings) and `pretty` (paragraphs); `:focus-visible` with `outline: 2px solid var(--color-focus-ring)`; on `.o-word-page` and `.c-lightbox` the public `--focus-ring-style` (`dashed`) sets the line style, and form controls with their own focus rule read it (`var(--focus-ring-style, solid)`); `@starting-style` with `transition-behavior: allow-discrete` for enter animations; `@property` only for tokens that are animated as values; `cqi` units where a size follows the container.

Newly available features (Baseline 2025/2026). Only `@scope` and Popover are load-bearing and inside the floor of §9; every other "adopt" is an enhancement whose fallback is named and must keep working:

| Feature                              | Decision                                                                                                                                                                            |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@scope`                             | Adopt, load-bearing                                                                                                                                                                 |
| Popover (`popover`, `popovertarget`) | Adopt, load-bearing: dropdown, comment menu, tooltip                                                                                                                                |
| Custom highlights                    | Planned, with the home/search redesign (not in this migration, ruling R16): search-term highlighting to replace `v-html` in `SingleWord.vue`; no support = no highlight             |
| `field-sizing: content`              | Enhancement for comment and suggest textareas; fallback fixed rows                                                                                                                  |
| `::details-content`                  | Enhancement for the accordion animation; fallback opens without animation                                                                                                           |
| `content-visibility: auto`           | Not adopted on the word page: it blocks Astro `client:visible` hydration in WebKit (the skipped subtree's placeholder height moves islands out of view after a programmatic scroll) |
| `scrollbar-color`                    | Add next to the existing `::-webkit-scrollbar` rules, which stay until Safari below 26.2 leaves the floor                                                                           |
| `:active-view-transition-type()`     | Adopt in the BON game instead of `html[data-vt]`; fallback no morph                                                                                                                 |
| Container style queries              | Not for variants; allowed where the fallback is the default look                                                                                                                    |
| Invoker commands                     | Not yet (outside the Safari floor)                                                                                                                                                  |
| `contrast-color()`                   | No: the design fixes `color.text.on-accent`                                                                                                                                         |

## 9. Browser floor

`@scope` is load-bearing, so the floor rises: `.browserslistrc` becomes the current query (`baseline widely available with downstream`) plus the exclusion of Firefox versions without `@scope`. Expected effect: Firefox 125–145 drop out, Chrome (124) and Safari (17.5) stay. Excluded browsers get the existing unsupported-browser notice, which is generated from browserslist.

## 10. Migration

| Wave  | Content                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Result                                    |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| 0     | Screenshot baseline (Playwright, chromium, 390 and 1280, light and dark, reduced motion, service workers blocked) against the e2e seed database: `/`, `/wort/anmachen`, `/wort/wa`, `/games/berliner-oder-nicht`, `/games/berliner-oder-nicht/rangliste`, `/anki`, `/wort-vorschlagen`. Snapshots are committed                                                                                                                                                                                                                                                                                                          | Proof for "no undecided visual change"    |
| 1     | Foundation: tokens + build, layer order, everything existing into `legacy` with aliases, `base` and `utilities` migrated, `mx.component`, browser floor, Stylelint gate, contract test                                                                                                                                                                                                                                                                                                                                                                                                                                   | No visual change                          |
| 1b    | Colour inventory: a script lists, for every file of waves 2 to 5, each colour value without a semantic token (palette reference, `color-mix()`, literal, keyword), in light and dark as computed today, grouped by identical value pair, with file and line and the number of uses. Output: `docs/design/design-system/colour-inventory.md`, one table row per value pair with an empty column "decision". The user fills it in: an existing token, a new token name (by role, not by colour), or "keep as private one-off" for decoration such as the confetti colours. The token files are then extended in one commit | Waves 2 to 5 run without colour questions |
| 2     | Global controls (`button`, `choice`, `link`, `icon-button`, `reaction`, `band`, `state`, `skeleton`, `badge`, `section-card`, `switch`, `tooltip`, `modal`, toast) and page shell (header, footer, main menu)                                                                                                                                                                                                                                                                                                                                                                                                            | The reference set every later wave copies |
| 3     | Word page                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |                                           |
| 4     | BON game                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |                                           |
| 5     | Anki page (already close to the new design, untidy: 651 lines, 40 palette references)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |                                           |
| later | Every other page, together with its redesign                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | `legacy` empties, then is removed         |

- A wave changes styles, markup, unit tests and e2e selectors of its components in the same commits (about 1,100 class references in templates, 550 in unit tests, 40 in e2e, 20 in JS across all waves).
- Waves 3 to 5 touch disjoint files and may run in parallel after wave 2.
- The inventory groups near-identical values (same hue, alpha or mix within 5 percentage points) next to each other and proposes merging them; the user confirms or rejects each merge.
- Allowed visual difference in waves 2 to 5: what the mapping rule (§5.6) causes; each snapshot update names the reason.

## 11. Enforcement

- **Stylelint (core rules, no plugin)**, strict for every file not in `stylelint.legacy-files.mjs` (the generated token file is ignored): no hex, no named colours, no `rgb()`/`hsl()`/`color-mix()`; no raw value for font size, spacing, radius, shadow, z-index, duration, font family; no primitive or legacy custom property; no Sass variable or `#{…}` interpolation in a declaration value (lint reads the source, so a variable would hide a raw value); no physical properties; no `@media`, `@import`, `@extend`; class pattern without `__` and `--`.
- **Contract test (Vitest)** for what lint cannot see: only the layer names of §6 occur; every style file sits in the layer its folder demands (or in `legacy` while listed there); no `.vue` or `.astro` style block holds rules; a migrated component file is exactly one `mx.component` whose name matches the file; no `&` and no root class inside it; no dark-mode mixin outside `legacy`; the inline layer statement comes first in the head; the generated token file is current.
- **Scripts:** `tokens:build`, `tokens:check`, `lint:style:check` (no `--fix`); CI runs the two checks.
- A per-line lint disable needs a reason in the same comment.

## 12. Documentation and visual tests (optional wave)

A styleguide page, served only in dev and e2e builds, renders every token from the JSON files and every global control in all variants and states. Playwright screenshots it per section; the page also prints the WCAG contrast of the text-on-surface pairs the word page spec lists, and the test asserts at least 4.5. After wave 2 at the earliest.

`.claude/rules/website-styles.md`, `DESIGN.md` (front matter) and `website/CLAUDE.md` are rewritten in wave 1 to describe this system and the `legacy` rule.

## 13. Left to the builder

- Internals of the build script and of the mixin.
- Exact regular expressions of the lint rules, as long as §11 holds.
- Part class names inside a component.
- Which pairs of slot and public property a component offers, guided by what its current parents need.

## 14. To verify before or during wave 1

| Assumption                                                                                                   | How to check                                                                                                                                                                                                 | If wrong                                             |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| `@scope` needs Firefox 146, Chrome 118, Safari 17.4                                                          | MDN compatibility table                                                                                                                                                                                      | Use MDN's versions in §9                             |
| `postcss-preset-env` rewrites `light-dark()` for the target                                                  | Build once, inspect the CSS. Checked in wave 1 (Task 1): every browserslist target supports `light-dark()`, so the built CSS keeps it native (no `csstools` toggles) and it follows `color-scheme` on `html` | Emit both theme blocks from the build script instead |
| Sass passes `@scope … to (…)` and nested rules through unchanged                                             | Mixin test in wave 1                                                                                                                                                                                         | Write the component files as plain `.css`            |
| Playwright's Firefox and WebKit support `@scope`                                                             | `typeof CSSScopeRule` in each project                                                                                                                                                                        | Update Playwright before wave 2                      |
| jsdom ignores `@scope`, so unit tests cannot assert scoped styles                                            | —                                                                                                                                                                                                            | Scoped-style assertions live in Playwright only      |
| The production CSS minifier keeps `@scope (…) to (…)` and `:scope` intact                                    | Build once, inspect the CSS                                                                                                                                                                                  | Change the minifier setting for CSS                  |
| The inline `@layer` statement keeps the order across `ClientRouter` navigations                              | Playwright: navigate client-side, then check that a `components` rule still beats a `legacy` rule                                                                                                            | Mark the `<style>` with `transition:persist`         |
| The unsupported-browser regex (`scripts/generate-supported-browsers.mjs`) follows the new browserslist query | Unit test with a Firefox 140 and a Firefox 146 user agent                                                                                                                                                    | Fix the generator in wave 1                          |
