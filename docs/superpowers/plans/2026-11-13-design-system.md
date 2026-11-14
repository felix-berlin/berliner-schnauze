# Design System (tokens, layers, scope, lint) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the foundation of the design system (DTCG tokens, cascade layers with a `legacy` layer, `@scope` components, Stylelint gate) and move the global controls, the page shell, the word page, the BON game and the Anki page onto it.

**Architecture:** Token JSON files are compiled by a small Node script into one committed file of CSS custom properties with `light-dark()` pairs. All existing styles are wrapped into a `legacy` cascade layer; migrated files leave it one by one and become `@scope` components that use semantic tokens only. A shrinking list of legacy files tells Stylelint and a Vitest contract test what is still old.

**Tech Stack:** DTCG 2025.10 (`*.tokens.json`), Node script without new dependencies, Sass (`@use`, mixins, nesting), native CSS (`@layer`, `@scope`, `light-dark()`, `@container`, `:has()`, logical properties), Stylelint 18 core rules, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-13-design-system-design.md` (approved). Read it completely before any task; "§N" below refers to it. Also read `.claude/rules/website-styles.md` and `website/CLAUDE.md`.

## Global Constraints

- Paths are relative to `website/` unless they start with `docs/` or `.claude/`. Run commands in `website/`.
- The spec wins over this plan. A task that must deviate changes the spec in the same commit and says why.
- No new npm dependency without asking the user.
- Only the pages of §10 are migrated. Every other style file stays in `legacy`, untouched except for the wrapper of Task 2.
- Tasks 1 to 6 cause no visual change. Tasks 8 to 11 may differ only by the mapping rule (§5.6); each snapshot update names the reason in the commit message.
- A colour without a semantic token after Task 7: stop and report. Never a primitive, never an invented token, never a `--_` property holding a colour (§5.5).
- Never run `pnpm lint` to check (it auto-fixes). Use `pnpm lint:style:check`, `pnpm tokens:check`, `pnpm exec vitest run <file>`.
- UI tasks end with the light + dark check at 390px and 1280px (`website/CLAUDE.md`).
- E2E and screenshots run against the e2e seed database with the recipe in `website/CLAUDE.md` ("E2E"), never against the worktree database.
- Commits: Conventional Commits; `refactor(dev)` for foundation, `refactor(word|bon|anki)` for pages, `build(dev)` for browserslist, `test(dev)` for test-only commits. Commit only the files of the task.

## File structure

| File                                                                                                    | Responsibility                                                       |
| ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `tokens/primitive.tokens.json`, `tokens/semantic.light.tokens.json`, `tokens/semantic.dark.tokens.json` | Token source (§5)                                                    |
| `scripts/build-tokens.mjs`                                                                              | DTCG → CSS                                                           |
| `src/styles/tokens/_tokens.generated.scss`                                                              | Generated, committed                                                 |
| `src/styles/tokens/_legacy-aliases.scss`                                                                | Old custom property names → new ones, until `legacy` is empty        |
| `src/styles/mixins/_component.scss`                                                                     | `mx.component($name)` (§7.1)                                         |
| `stylelint.legacy-files.mjs`                                                                            | `export default [ …paths ]`: files still in `legacy`; only shrinks   |
| `stylelint.config.mjs`                                                                                  | Strict rules for all, switched off for the legacy list               |
| `src/tests/unit/scripts/build-tokens.test.ts`                                                           | Token build                                                          |
| `src/tests/unit/styles/contract.test.ts`                                                                | What lint cannot see (§11)                                           |
| `src/tests/unit/styles/component-mixin.test.ts`                                                         | Mixin output                                                         |
| `src/tests/e2e/visual-baseline.spec.ts`                                                                 | Screenshots of the reference pages                                   |
| `src/tests/e2e/design-system.spec.ts`                                                                   | Layer order after client navigation, slot boundary, `@scope` support |
| `scripts/colour-inventory.mjs`, `docs/design/design-system/colour-inventory.md`                         | Task 7                                                               |

## Review Focus

1. **CSS outside every layer** beats all layers. Expected: the contract test fails for an unwrapped file or a rule in a `.vue`/`.astro` style block (Task 2).
2. **Client-side navigation.** Expected: after an Astro `ClientRouter` navigation a `components` rule still beats a `legacy` rule (Task 2, e2e).
3. **A token path missing in one theme file, or a shadow whose geometry differs per theme.** Expected: the build exits non-zero and names the path (Task 1).
4. **Markup passed into a slot.** Expected: a slotted `.title` is not styled by the receiving component (Task 8, e2e).
5. **A browser below the floor.** Expected: the unsupported-browser regex rejects Firefox 140 and accepts Firefox 146 (Task 5, unit).
6. **A raw value hidden in a Sass variable.** Expected: `padding: vars.$spacer` and `margin: #{$x}` are lint errors in a non-legacy file (Task 3, fixture).
7. **Stored theme against system theme.** Expected: with the system in dark and `darkMode=false` stored, a `light-dark()` token resolves to its light value (Task 1, e2e in `design-system.spec.ts`).

---

### Task 0: Screenshot baseline

**Files:** Create `src/tests/e2e/visual-baseline.spec.ts`.

- [ ] **Step 1:** Write the spec for the pages, sizes and settings of §10 wave 0 (chromium only; set the theme by toggling the `dark` class on `html`; `toHaveScreenshot({ fullPage: true, maxDiffPixelRatio: 0.002 })`; mask nothing unless a region is time-dependent, then mask that region and say why in a comment).
- [ ] **Step 2:** Run with `--update-snapshots`, then again without. Expected: second run passes with 28 screenshots (7 pages × 2 sizes × 2 themes).
- [ ] **Step 3:** Commit spec and snapshots: `test(dev): add visual baseline for the design system`.

### Task 1: Token source and build

**Files:** Create the three token files, `scripts/build-tokens.mjs`, `src/styles/tokens/_tokens.generated.scss`, `src/styles/tokens/_legacy-aliases.scss`, `src/tests/unit/scripts/build-tokens.test.ts`, `src/tests/e2e/design-system.spec.ts`. Modify `package.json`, `src/styles/app.scss`, `src/styles/base/_colors.scss`.

**Interfaces — Produces:** `export default function buildTokens(input: { primitive: object; light: object; dark: object }): string`; CLI `node scripts/build-tokens.mjs [--check]` (`--check` exits 1 on drift); scripts `tokens:build`, `tokens:check`; custom properties named per §5.3.

- [ ] **Step 1: Record today's values.** In the running dev server read from `getComputedStyle(document.documentElement)` in both themes every custom property that `base/_colors.scss` defines (mixes via a probe element's `background-color`), plus `--blue-100` … `--blue-500`. Keep the list in the task notes.
- [ ] **Step 2: Write the failing unit test:**

```ts
it("emits a primitive", () => expect(css).toContain("--color-orange-600: #b23b27;"));
it("pairs light and dark", () => expect(css).toContain(
  "--color-text-accent: light-dark(var(--color-orange-600), var(--color-orange-300));"));
it("emits one value when both themes agree", () =>
  expect(css).toContain("--color-accent-solid: var(--color-orange-600);"));
it("writes alpha colours as rgb()", () =>
  expect(css).toContain("--color-surface-wash: light-dark(rgb(207 87 54 / 15%), "));
it("writes dimension, duration, number, cubicBezier", () => {
  expect(css).toContain("--space-4: 1rem;");
  expect(css).toContain("--duration-base: 300ms;");
  expect(css).toContain("--z-header: 100;");
  expect(css).toContain("--ease-standard: cubic-bezier(0.42, 0, 0.58, 1);");
});
it("puts light-dark() around each colour of a themed shadow", () =>
  expect(css).toMatch(/--shadow-hover-glow: 0 0 12px 0 light-dark\(.+, .+\);/));
it("throws when a themed shadow differs in geometry", …toThrow("shadow.hover-glow: geometry differs between themes"));
it("throws on a path missing in one theme", …toThrow("color.text.body: missing in dark"));
it("throws on an unknown alias, a cycle, and a token without $type", …);
it("wraps everything in @layer tokens", () => expect(css.trimStart().startsWith("@layer tokens {")).toBe(true));
it("the committed file is current", () => expect(readFileSync(generated, "utf8")).toBe(buildTokens(readSources())));
```

- [ ] **Step 3:** Run `pnpm exec vitest run src/tests/unit/scripts/build-tokens.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 4:** Implement `buildTokens` (supported `$type`: `color`, `dimension`, `duration`, `number`, `fontFamily`, `fontWeight`, `cubicBezier`, `shadow`; anything else throws; properties sorted by path; header comment `// GENERATED by scripts/build-tokens.mjs — do not edit`).
- [ ] **Step 5:** Write the token files from §5.4, §5.5 and Step 1; run `pnpm tokens:build`.
- [ ] **Step 6:** Write `_legacy-aliases.scss` (`@layer tokens { :root { --surface-paper: var(--color-surface-paper); … } }`, one line for every old property of Step 1 whose name changed). Reduce `base/_colors.scss` to the `color-scheme` switch. Load both token files first in `app.scss`.
- [ ] **Step 7:** Add to `design-system.spec.ts`: Review Focus 7 (emulate `colorScheme: "dark"`, set `localStorage.darkMode = "false"`, reload, read `--color-text-body` on `html`: equals the light value).
- [ ] **Step 8:** Run unit test (PASS), full unit suite, Task 0 spec (no diff), and compare Step 1's values in the browser (identical). Then build once and check §14 row 2: if the built CSS no longer contains working `light-dark()` handling for the target, stop and report.
- [ ] **Step 9:** Commit: `refactor(dev): generate css custom properties from dtcg token files`.

### Task 2: Cascade layers and the `legacy` layer

**Files:** Modify `src/components/BaseHead.astro`, `src/styles/app.scss`, every partial under `src/styles/{base,components,objects,layouts,pages,plugins,utilities}`. Create `stylelint.legacy-files.mjs`, `src/tests/unit/styles/contract.test.ts`.

**Interfaces — Produces:** layer names of §6; `stylelint.legacy-files.mjs` default-exports an array of paths relative to `website/`, initially every partial under `src/styles/{components,objects,layouts,pages,plugins}`.

- [ ] **Step 1: Write the failing contract test:**
  - `BaseHead.astro` contains `<style is:inline>@layer reset, tokens, vendor, base, legacy, objects, components, utilities;</style>` before any other `<style>` or stylesheet link;
  - every partial has, below its `@use`/`@forward` lines, exactly one top-level block: `@layer legacy` if listed in the legacy file, else the layer of its folder (`base/_reset` → `reset`, `base/*` → `base`, `utilities/*` → `utilities`, `objects|layouts|pages` → `objects`, `components` → `components`); files in `mixins/`, `variables/`, `tokens/` and index files are exempt;
  - only layer names of §6 occur anywhere in `src/`;
  - no `.vue` or `.astro` style block contains anything but `@use` lines;
  - every path in the legacy file exists.
- [ ] **Step 2:** Run it. Expected: FAIL listing the files.
- [ ] **Step 3:** Add the inline statement. Wrap each partial's rules (keep `@use` above the wrapper). Load the multiselect theme with `@layer vendor { @include meta.load-css("@vueform/multiselect/themes/default.css"); }`.
- [ ] **Step 4:** Check the 7 `!important` declarations (`base/_body.scss` ×4, `_toast-container.scss`, `_filter-search.scss`, `_modal.scss`): for each, confirm in the browser that the behaviour it protects still holds; fix by moving the declaration, not by adding importance.
- [ ] **Step 5:** Add to `design-system.spec.ts`: inject a test stylesheet with `@layer legacy { body { outline-color: rgb(1 1 1) } } @layer components { body { outline-color: rgb(2 2 2) } }`, navigate client-side from `/` to a word page, expect computed `outline-color` `rgb(2, 2, 2)`. If it fails, add `transition:persist` to the inline `<style>` (§14).
- [ ] **Step 6:** Run contract test, stylelint check, unit suite, Task 0 spec. Expected: all pass, no screenshot diff. A diff means a rule changed rank between `base`, `legacy` and `utilities`; fix it in the file that should win.
- [ ] **Step 7:** Commit: `refactor(dev): put all styles into cascade layers with a legacy layer`.

### Task 3: Stylelint gate

**Files:** Modify `stylelint.config.mjs`, `package.json`, `.github/workflows/ci.yml`. Create `src/tests/unit/styles/stylelint-gate.test.ts` and fixtures `src/tests/unit/styles/fixtures/{bad,good}.scss`.

- [ ] **Step 1:** Write `bad.scss` with one violation per item of §11 (hex, named colour, `rgb()`, `color-mix()`, raw font size, raw spacing, raw radius, raw box-shadow, raw z-index, raw duration, raw font family, `var(--orange-600)`, `var(--surface-paper)`, `vars.$spacer`, `#{$x}`, `margin-left`, `width`, `@media`, class `.c-a__b`, class `.c-a--b`, `.is-open`) and `good.scss` (a small `mx.component` using tokens, one `--_` length, one 1px border). Write the test: Stylelint's Node API with the project config reports at least one warning per listed line of `bad.scss` and none for `good.scss`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Put the strict rules into the base `rules` using `color-no-hex`, `color-named`, `function-disallowed-list`, `declaration-property-value-disallowed-list`, `property-disallowed-list`, `at-rule-disallowed-list`, `selector-class-pattern` (`^((c|o|u|js)-)?[a-z][a-z0-9]*(-[a-z0-9]+)*$`), `selector-disallowed-list`. A raw length stays legal in a `--_` declaration and for `1px` in border properties. Add `overrides: [{ files: legacyFiles, rules: { <each strict rule>: null } }]`, the same for `src/styles/{variables,mixins}/**` until Task 8 migrates the mixins, and `ignoreFiles: ["src/styles/tokens/_tokens.generated.scss"]`.
- [ ] **Step 4:** Add script `"lint:style:check": "stylelint \"**/*.{scss,sass}\" --ignore-path ../.gitignore"`. Run it. Expected: violations only in `base/*` and `utilities/*` (Task 4 fixes them). Until then add those two globs to the override with a `// Task 4` comment.
- [ ] **Step 5:** CI: add steps `pnpm run lint:style:check` and `pnpm run tokens:check` to `.github/workflows/ci.yml`.
- [ ] **Step 6:** Run the gate test (PASS). Commit: `chore(ci): enforce design tokens with stylelint`.

### Task 4: Migrate `base` and `utilities`

**Files:** `src/styles/base/{_body,_global,_inputs,_typo,_scrollbar}.scss`, `src/styles/utilities/*`, `stylelint.config.mjs`.

- [ ] **Step 1:** Remove the `// Task 4` globs from the override; run `pnpm lint:style:check`. Expected: FAIL; the list is the work.
- [ ] **Step 2:** Replace values by tokens (§5.5, §5.6); delete dark-mode blocks. `base/_inputs.scss:28` `outline: none`: keep only if a `:focus-visible` outline with `var(--color-focus-ring)` exists for the same elements, else add it. Add `scrollbar-color` next to the `::-webkit-scrollbar` rules (§8).
- [ ] **Step 3:** Run lint check (clean), unit suite, Task 0 spec (diffs only per §5.6; update snapshots with reasons).
- [ ] **Step 4:** Commit: `refactor(dev): move base and utility styles to tokens`.

### Task 5: `@scope` foundation

**Files:** Modify `.browserslistrc`, `src/styles/mixins/index.scss`, `contract.test.ts`, `design-system.spec.ts`. Create `src/styles/mixins/_component.scss`, `src/tests/unit/styles/component-mixin.test.ts`; add cases to the existing unit test of `src/lib/unsupportedBrowser.ts`.

**Interfaces — Produces:** `@mixin component($name)`, used as `@include mx.component("section-card") { … }`.

- [ ] **Step 1:** Confirm the `@scope` versions on MDN (§14 row 1). Append the Firefox exclusion to `.browserslistrc` (`not firefox < 146`, `not and_ff < 146`, or MDN's number). Run `pnpm run supportedBrowsers`.
- [ ] **Step 2:** Failing tests: (a) unsupported-browser check rejects a Firefox 140 user agent and accepts Firefox 146, Chrome 124, Safari 17.5; (b) the mixin compiled with the project's Sass importer yields, whitespace collapsed, exactly the block of §7.1 with `.c-demo`.
- [ ] **Step 3:** Run (FAIL), implement the mixin and fix the generator if (a) fails, run (PASS).
- [ ] **Step 4:** Extend `contract.test.ts` for every file under `src/styles/components` that is not in the legacy list: exactly one `@include mx.component("<file name>")` below the `@use` lines; inside it no top-level `&`, no `.c-` selector, no `__`, no `--` in class names; and nowhere outside legacy files `dark-mode-class` or `dark-mode-override`.
- [ ] **Step 5:** `design-system.spec.ts`: `typeof CSSScopeRule !== "undefined"` in chromium, firefox and webkit. A false means Playwright's browser is below the floor: stop and report (§14).
- [ ] **Step 6:** Build once (`E2E_BUILD=1 pnpm build`) with a throwaway component file using the mixin; check the emitted CSS still contains `@scope (.c-…) to (` and `:scope` (§14 minifier row). Remove the throwaway file.
- [ ] **Step 7:** Commit: `build(dev): raise the browser floor for @scope and add the component mixin`.

### Task 6: Documentation of the foundation

**Files:** `.claude/rules/website-styles.md`, `DESIGN.md` (front matter), `website/CLAUDE.md`.

- [ ] **Step 1:** Rewrite the rule file in this order: tiers and token files; "semantic tokens only"; layer order and the `legacy` rule (a file leaves it only fully migrated, the list only shrinks); `mx.component`, parts, `data-variant`, state, slots, public and private properties; container queries vs. `mx.breakpoint`; commands; how to add a token (both theme files → `pnpm tokens:build` → commit). Keep the BEMIT section only under a heading "Legacy files".
- [ ] **Step 2:** `DESIGN.md`: replace the colour/spacing/radius front matter by a pointer to `website/tokens/`. `website/CLAUDE.md`: one bullet pointing to the spec.
- [ ] **Step 3:** Commit: `docs(dev): describe the token, layer and scope system`.

### Task 7: Colour inventory — STOP for the user

**Files:** Create `scripts/colour-inventory.mjs`, `docs/design/design-system/colour-inventory.md`. Later modify the token files.

- [ ] **Step 1:** Write the script per §10 wave 1b over the files of Tasks 8 to 11 (lists below). It resolves each colour to its computed light and dark value (reuse the token JSON for palette references; evaluate `color-mix(in srgb, …)` arithmetically; for a value inside a dark-mode block pair it with the light value of the same property and selector). Output columns: light, dark, uses, files:lines, nearest existing token (exact match or none), merge proposal, decision (empty).
- [ ] **Step 2:** Self-check in the script (`node scripts/colour-inventory.mjs --self-test`): `color-mix(in srgb, #cf5736 15%, transparent)` → `rgb(207 87 54 / 15%)`; `color-mix(in srgb, #fcead7 60%, white)` → `rgb(253 242 231)`.
- [ ] **Step 3:** Run it, commit the table: `docs(dev): add colour inventory for the design system migration`.
- [ ] **Step 4:** **Stop. Report to the user that the table needs their decisions. Do not start Task 8 before the "decision" column is filled.**
- [ ] **Step 5 (after the decisions):** Extend the token files accordingly, `pnpm tokens:build`, update §5.5 of the spec with the new tokens, commit: `refactor(dev): add semantic tokens from the colour inventory`.

### Tasks 8 to 11: migrate components

**Recipe per component file** (one commit per component or small group):

- [ ] Remove the file from `stylelint.legacy-files.mjs`. Run `pnpm exec stylelint <file>` and the contract test. Expected: FAIL; the output is the work list.
- [ ] Rewrite as `@include mx.component("<name>")` (§7): root → `:scope`; `&__part` → `.part`; `&--variant` → `:scope[data-variant="…"]`; `.is-x`/`.has-x` → ARIA, native state or `data-state`. A file with two blocks becomes two files.
- [ ] Values → semantic tokens (§5.5, Task 7), scales by §5.6, knobs as `--_` properties at the top of `:scope`. Delete dark-mode blocks and `:where()` wrappers. `mx.breakpoint` → `@container` on the root's container (§7.1); a root that must respond itself gets an `.inner` part.
- [ ] Update in the same commit every use of the old classes: `src/components`, `src/pages`, `src/layouts`; then `src/tests/unit` and `src/tests/e2e` (role/text queries first, else `.c-<name> .part`); then `src/{composable,utils,stores,services,lib,directives}` (`js-` class or `data-` attribute). Add `data-slot` to every element directly wrapping a `<slot>`.
- [ ] Grep the old class names in the remaining legacy SCSS files too (for example `.c-button--primary` or `--color-background` overrides in a page file). Such a rule now loses against the `components` layer or sets a property nobody reads. Change only that selector or property in the legacy file so the page looks as before (`[data-variant="primary"]`, the control's public property); the file stays in `legacy`. The Task 0 spec covers the reference pages; check every other page that uses the control by hand in light and dark and list the pages checked in the commit body.
- [ ] A parent rule that reached into a child component: replace by the parent's own layout or the child's public property; otherwise stop and report (§7.3).
- [ ] Apply the §8 feature rows that name this component.
- [ ] Verify: `pnpm exec stylelint <file>` clean, contract test, the component's unit tests, Task 0 spec (diffs explained by §5.6), light + dark check.

**Task 8 — global controls and page shell** (must be complete before 9 to 11; it is the reference set).
Files: `mixins/{_paper-card,_surfaces,_typo,_badge-wash,_skeleton-loader}.scss` (rewritten to tokens; then remove the `mixins` glob from the lint override), `components/{_button,_choice,_link,_icon-button,_reaction,_band,_state,_skeleton,_badge,_section-card,_switch,_tooltip,_modal,_toast-container,_toast-notify,_dropdown-popover,_dropdown-popover-themes,_options-dropdown,_main-menu,_menu-nav,_scroll-to-top,_floating-label}.scss`, `layouts/{_header,_footer}.scss` (layer `objects`, `mx.breakpoint` allowed).
Extra steps:

- [ ] Dropdown, comment menu trigger and tooltip move to the Popover API (§8); delete the click-outside and manual focus code they replace, keep their unit tests green by adapting them.
- [ ] `design-system.spec.ts`: Review Focus 4. Render a page where a `.title` element is passed into `SectionCard`'s body slot (the word page has one; else add a case to the e2e seed page list); assert its computed `font-size` differs from the card title's.

**Task 9 — word page.** Files: the 35 files matching `components/_{word-*,comment*,book-shelf,berlin-area-map,next-links,letter-*,lightbox}.scss`, `objects/_word.scss`. Extra: custom highlights in `SingleWord.vue` instead of `v-html` (§8), `field-sizing` on the comment textarea, `content-visibility` on sections below the fold with `contain-intrinsic-size`. Run `src/tests/e2e/word-v3.spec.ts`, `word-detail.spec.ts`, `word-comments.spec.ts`, `word-feedback.spec.ts`.

**Task 10 — BON game.** Files: the 11 files matching `components/_{bon-*,confetti}.scss`. Extra: `:active-view-transition` instead of `html[data-vt]` where the fallback is "no morph" (§8); view-transition names stay. Run `bon-game.spec.ts`, `bon-share.spec.ts` (chromium only, few games: in-memory rate limits).

**Task 11 — Anki page.** Files: `pages/_anki.scss`, `pages/_anki-danke.scss`, `components/_anki-{coverage,dev-hours,flashcard}.scss`. `_anki.scss` (651 lines) is split into one component file per block it styles; `--anki-color-accent-text` is replaced by `--color-text-accent`. Page-level grid stays in `pages/_anki.scss` (layer `objects`).

Tasks 9, 10 and 11 touch disjoint files and may run in parallel workers after Task 8; `stylelint.legacy-files.mjs` is the only shared file (each worker only deletes its own lines).

### Task 12 (optional): styleguide and visual tests

**Files:** Create `src/pages/styleguide.astro`, `src/tests/e2e/styleguide.spec.ts`.

- [ ] **Step 1:** Page per §12: 404 unless `import.meta.env.DEV` or `E2E_BUILD`, `noindex`; renders every token from the JSON files and every Task 8 control in all variants and states.
- [ ] **Step 2:** Spec: one screenshot per section (light, dark, 390, 1280, chromium) and the contrast assertion of §12 (≥ 4.5 for the pairs in `docs/design/wortseite/SPEC.md` §4).
- [ ] **Step 3:** Commit: `test(dev): add styleguide page with visual and contrast checks`.

## Not in this plan

- Every page not named in §10 (magazine, donation page, settings, changelog, legal pages, home page lists): they stay in `legacy` and move with their redesign.
- Deleting the `legacy` layer, `_legacy-aliases.scss`, the Sass colour variables and the dark-mode mixins: only when the legacy list is empty.
- New design values, a token tool, Figma sync, Storybook, changes to sass-butler.
