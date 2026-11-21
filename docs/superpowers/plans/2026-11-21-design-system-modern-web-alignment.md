# Design System: Modern Web Guidance Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the gaps between the migrated (non-legacy) design system and the `modern-web-guidance` guides `color`, `dark-mode`, `dark-mode-toggle`, `browser-ui-theming`, `brand-consistent-forms`, `motion`, `typography`, `respect-os-text-scale` and `visual-effects`, and bring the rules and docs in line with the result.

**Architecture:** Fixes land in the token pipeline (`website/tokens`, `scripts/build-tokens.mjs`), `base/` partials (global behaviour), `BaseHead.astro` / `SetColorMode.astro` (document level) and the migrated component partials. Legacy files (`website/stylelint.legacy-files.mjs`, 37 entries) are out of scope. Every behavioural change gets a contract or Playwright test; every rule change gets a docs change in the same commit.

**Tech Stack:** Astro, Vue 3, SCSS with `@layer` / `@scope`, DTCG tokens, Stylelint (`strictRules`), Vitest contract tests, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-13-design-system-design.md` (§5 tokens, §6 layers, §8 modern CSS, §9 floor), `.claude/rules/website-styles.md`, `DESIGN.md`, `docs/design/design-system/colour-inventory.md`. Findings: audit of 2026-11-21 in this session (not saved elsewhere).

## Global Constraints

- Colour in components: only `var(--color-<semantic>)` / `var(--shadow-…)`; no hex, `rgb()`, `color-mix()` (spec §5, `strictRules`). Raw one-offs exist only as `colour inventory R<n>` disables.
- No dark-mode code in components; the only `color-scheme` switch lives in `base/_colors.scss` (rule file, "Semantic tokens only").
- Browser floor: Firefox >= 146, Safari 17.5+ stays inside it (spec §9). A feature outside the floor needs a named fallback.
- `contrast-color()` stays rejected: the design fixes `color.text.on-accent` (spec §8). Not revisited here.
- Generated `_tokens.generated.scss` is never edited; change `website/tokens/*.json` or `scripts/build-tokens.mjs` and rebuild (a test compares it with a fresh build).
- `!important` only in the reduced-motion reset (rule file) until Task 5 decides otherwise.
- Commits: `<type>(<scope>): <description>`, English, scopes from CLAUDE.md. Run `pnpm lint` and the touched unit tests before each commit; `pnpm typechecking` once at the end.
- Light AND dark check in the browser for every UI change (`website/CLAUDE.md`).

## Review Focus

- JS disabled or blocked storage: page must still follow the system scheme (no hard `light`).
- Stored choice differs from system (stored `false`, system dark): no flash of dark, native controls and scrollbars match the chosen scheme.
- Windows High Contrast / `forced-colors: active`: focus ring, dashed hover border, badges and the dot map stay distinguishable; nothing relies on `box-shadow` alone.
- `prefers-reduced-motion: reduce`: no spatial motion, content still reaches its final state (no element stuck at `opacity: 0`), `animationend`-driven JS still completes.
- 200% text scale / 320 px reflow: no clipped text in badges, tabs, buttons (fixed block sizes).

---

## File Structure

| File                                                                                                  | Responsibility                                                                           |
| ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `website/src/components/BaseHead.astro`                                                               | `<meta name="color-scheme">`, `<meta name="text-scale">`, static `theme-color` fallbacks |
| `website/src/components/SetColorMode.astro`, `website/src/stores/darkMode.ts`                         | Scheme resolution, `theme-color` upsert, system-change listener                          |
| `website/src/styles/base/_colors.scss`                                                                | `color-scheme` default `light dark`, `accent-color`                                      |
| `website/src/styles/base/_forced-colors.scss` (new)                                                   | Forced-colors and `prefers-contrast` rules, loaded in `app.scss`                         |
| `website/src/styles/base/_scrollbar.scss`, `_body.scss`, `_inputs.scss`                               | scrollbar width, reduced motion, form control theming                                    |
| `website/tokens/*.tokens.json`, `website/scripts/build-tokens.mjs`                                    | Promoted semantic tokens (inventory, band), single output format                         |
| `website/src/tests/unit/styles/contract.test.ts`, `website/src/tests/e2e/design-system.spec.ts` (new) | Guards for everything above                                                              |
| `docs/…`, `.claude/rules/website-styles.md`, `DESIGN.md`                                              | Task 9                                                                                   |

---

### Task 1: Document-level colour scheme (meta + root default)

**Files:** Modify `website/src/components/BaseHead.astro`, `website/src/styles/base/_colors.scss`, `website/src/components/SetColorMode.astro`; Test `website/src/tests/unit/styles/contract.test.ts`.

**Interfaces:** Produces: `<meta name="color-scheme" content="light dark">` in every page head; `html { color-scheme: light dark }` as the no-JS default.

- [ ] **Step 1: Write failing contract tests** `BaseHead declares meta color-scheme "light dark"` (read `BaseHead.astro` source, assert the tag) and `base/_colors.scss root default is "light dark"` (assert `color-scheme: light dark` on `html`, no bare `color-scheme: light`).
- [ ] **Step 2: Run** `(cd website && rtk vitest run src/tests/unit/styles/contract.test.ts)`; expect both FAIL.
- [ ] **Step 3: Implement.** Add the meta in `BaseHead.astro` before the first stylesheet. In `_colors.scss` the `html` default becomes `light dark`; the `html[class~="dark"]` rule stays, and a new `html:not([class~="dark"])[style*="light"]` is NOT needed because `SetColorMode.astro` already writes an inline `color-scheme` (`light` or `dark`) from the resolved choice, which wins over the stylesheet. Keep that inline write; it is the override the `dark-mode-toggle` guide asks for.
- [ ] **Step 4: Run** the contract test; PASS. Playwright check with JS disabled (`javaScriptEnabled: false`) and system dark: computed `color-scheme` is `light dark`, body background dark.
- [ ] **Step 5: Commit** `fix(dev): declare light dark color scheme in head and on root`.

### Task 2: System-change listener and `theme-color`

**Files:** Modify `SetColorMode.astro`, `website/src/stores/darkMode.ts`, `BaseHead.astro`; Test `website/src/tests/unit/store/darkMode.test.ts`.

**Interfaces:** Consumes Task 1. Produces: `THEME_COLORS = { light: "#fad0b0", dark: "#2b333b" }` exported once from `website/src/stores/darkMode.ts`; the inline script cannot import, so the values are injected into it with Astro `define:vars` from that single constant.

- [ ] **Step 1: Write failing tests** in `darkMode.test.ts`: `follows system change when nothing is stored` (dispatch a `change` on the mocked `matchMedia`, expect class and meta updated) and `ignores system change when a choice is stored`.
- [ ] **Step 2: Run** `(cd website && rtk vitest run src/tests/unit/store/darkMode.test.ts)`; FAIL.
- [ ] **Step 3: Implement** a `change` listener on `(prefers-color-scheme: dark)` in `darkMode.ts` that re-applies only if `localStorage` holds no `darkMode` value (guide: do not clear stored values on system change). Replace the two literal hex strings in `SetColorMode.astro:25` and the store with `THEME_COLORS`. Add two static `<meta name="theme-color" media="(prefers-color-scheme: …)">` in `BaseHead.astro` as no-JS fallback.
- [ ] **Step 4: Run** tests PASS; manual: toggle OS scheme with DevTools emulation on a fresh profile.
- [ ] **Step 5: Commit** `fix(dev): follow system scheme changes and share theme-color values`.

### Task 3: `accent-color` and native control theming

**Files:** Modify `website/src/styles/base/_colors.scss` (or `_inputs.scss`); Test `website/src/tests/e2e/design-system.spec.ts`.

**Interfaces:** Consumes the semantic token `--color-accent-solid`. Produces `html { accent-color: var(--color-accent-solid) }`.

- [ ] **Step 1: Write failing Playwright test** `accent-color is the brand accent`: `getComputedStyle(document.documentElement).accentColor` equals the resolved `--color-accent-solid`, in light and dark.
- [ ] **Step 2: Run** `pnpm --filter ./website exec playwright test design-system` as `(cd website && rtk playwright test design-system)`; FAIL.
- [ ] **Step 3: Implement** the one-line rule in `base/_inputs.scss`. Then check `WordSwitch.vue`, `WordFeedbackPrivacy.vue`, `AppSettingsNotifications.vue` (`AppSettings…` is legacy: leave): if a hand-built checkbox can be replaced by the native control plus `accent-color`, do it only where the Safari indicator contrast (guide: test in Safari, both schemes) is at least 3:1; otherwise leave and note it in the commit body.
- [ ] **Step 4: Run** PASS; screenshot checkbox/radio in light and dark.
- [ ] **Step 5: Commit** `feat(dev): tint native form controls with the accent token`.

### Task 4: Forced colors and `prefers-contrast`

**Files:** Create `website/src/styles/base/_forced-colors.scss`; Modify `website/src/styles/app.scss`, hover rules named below; Test `design-system.spec.ts`.

**Interfaces:** Produces a `base` layer file with `@media (forced-colors: active)` rules; no new tokens (system colour keywords only, allowed by `color-named` exemption via a Stylelint disable with reason `forced-colors system colour`).

- [ ] **Step 1: Write failing Playwright test** `forced colors keep hover and focus visible`: `page.emulateMedia({ forcedColors: "active" })`, tab to the first `c-button`, assert computed `outline-style` is not `none` and `outline-color` is a system colour; hover a `c-card` whose hover is `box-shadow` only (find with `rg "box-shadow" website/src/styles/components` filtered to `:hover`) and assert `border-style` is `dashed` or an outline exists.
- [ ] **Step 2: Run**; FAIL.
- [ ] **Step 3: Implement** the global ring as `outline` (already per spec §8, verify in `base/_global.scss`), add a `forced-colors: active` block giving every box-shadow-only hover/active/selected state an `outline` or `border` in `Highlight` / `CanvasText`. Add `@media (prefers-contrast: more)` only for the low-contrast pieces found in Step 1 (muted secondary text, card rim); no blanket rule.
- [ ] **Step 4: Run** PASS; manual pass with Edge/Chrome "Emulate forced colors" on home, word page, BON.
- [ ] **Step 5: Commit** `feat(dev): keep focus and hover states visible in forced colors`.

### Task 5: Reduced motion without the global `0.01ms` reset (decision gate)

**Files:** Modify `website/src/styles/base/_body.scss:30-44`, migrated components with `animation`/`transition`; Test `website/src/tests/e2e/word-v3.spec.ts:234` (existing reduced-motion block) plus `design-system.spec.ts`.

**Decision needed from the owner before Step 3:** the guide marks the global `0.01ms !important` net as DO NOT (can make animations more jarring); spec §6 sanctions it and `animationend` code relies on it. Options: (A) keep the net, document the deviation (zero work, lowest risk); (B) per-component `@media (prefers-reduced-motion: no-preference)` for spatial motion, keep colour/opacity transitions, remove the net once all migrated components are converted (recommended, staged). Steps below assume B.

- [ ] **Step 1: Inventory.** `rg -l "animation|transition" website/src/styles` minus legacy; list spatial ones (transform, translate, scroll-behavior, keyframes). Save the list in the PR description, not in the repo.
- [ ] **Step 2: Write failing test** `no spatial motion under reduce`: emulate `reducedMotion: "reduce"`, for each element in the inventory assert `getAnimations()` has no running transform animation and the end state is applied (`opacity` not 0).
- [ ] **Step 3: Implement** per component: spatial animations nested in `@media (prefers-reduced-motion: no-preference)`; JS that waits for `animationend` continues when `el.getAnimations().length === 0` (`revealOnView.ts`, `BonTeaser.vue`, `viewTransition.ts` already check `matchMedia`; verify the rest).
- [ ] **Step 4: Remove the net** from `_body.scss` and the matching sentence from the rule file only after Step 2 passes for the whole inventory; otherwise keep it.
- [ ] **Step 5: Commit** one commit per component group, `fix(dev): scope spatial motion to no-preference`.

### Task 6: Scrollbar width

**Files:** Modify `website/src/styles/base/_scrollbar.scss:5`; check `_word-images.scss:36`, `_book-shelf.scss:43`, `_word-tabbar.scss:14`.

- [ ] **Step 1: Write failing contract test** `no scrollbar-width other than auto in migrated styles unless the same file carries a "scroll alternative" comment`.
- [ ] **Step 2: Run**; FAIL on the four files.
- [ ] **Step 3: Implement.** Global rule: `scrollbar-width: auto` plus the existing `scrollbar-color`. For the three horizontal scrollers that hide the bar, confirm a visible alternative exists (arrow buttons, snap affordance); if not, keep `none` and add the comment, because the guide allows `none` only with another way to scroll.
- [ ] **Step 4: Run** PASS; check a long page in Firefox and Safari (thumb target size).
- [ ] **Step 5: Commit** `fix(dev): stop thinning the global scrollbar`.

### Task 7: Colour inventory into tokens, single generator format

**Files:** Modify `website/tokens/semantic.light.tokens.json`, `semantic.dark.tokens.json`, `primitive.tokens.json`, `website/scripts/build-tokens.mjs:35-43`, the migrated partials listed by `rg "colour inventory" website/src/styles`; Test existing generated-file test and `home-tokens.test.ts`.

**Interfaces:** Produces one semantic token per inventory row that appears in two or more files or in a band/hero; rows used once stay as inventory disables. Candidate tokens already marked `TODO(startseite)`: band text `#c9cfd6`, band card2 `#232a31`, BON card `#fff8f0`, BON text `#2b333b`, band-dark bg (exists as `--band-dark-bg`).

- [ ] **Step 1: Write failing test** extending `home-tokens.test.ts`: `home partials use no colour disable` (grep `_home-results.scss`, `_home-bon.scss` for `function-disallowed-list|color-no-hex`).
- [ ] **Step 2: Run**; FAIL.
- [ ] **Step 3: Implement.** Add the tokens (both paths in light and dark files, identical structure), run `pnpm build:tokens`, replace values in the partials. For the 20 `rgb()` one-offs (`_badge`, `_toast-notify`, `_word-sidebar`, `_main-menu`, `_word-meanings`, `_comment-form`, …) promote only values already equal to an existing primitive (the generator output shows which); do not change any colour value (no visual diff allowed).
- [ ] **Step 4: Generator format.** In `build-tokens.mjs`, emit opaque colours as hex and alpha colours as `rgb(r g b / a%)` consistently; the 19 `color(srgb …)` values come from non-8-bit components in the DTCG source: round them to 8 bit in the JSON and verify with a before/after screenshot diff. Do NOT convert to `oklch` (guide: no reliable gamut mapping for lightness adjustments; no benefit for fixed brand values). Note this in the colour inventory doc (Task 9).
- [ ] **Step 5: Run** the token tests and Playwright visual spec; PASS.
- [ ] **Step 6: Commit** `refactor(dev): promote inventory colours and band palette to tokens`.

### Task 8: Typography, text scale, gradients, JS colours

**Files:** Modify `BaseHead.astro`; migrated partials with gradients (`rg "gradient" website/src/styles` minus legacy); `PwaCacheTypeBar.vue`, `BonPlayerCode.vue`, `_confetti.scss`; the one `px` font size (`rg "font-size:\s*[0-9.]+px" website/src`).

- [ ] **Step 1: Write failing contract tests**: `BaseHead has meta text-scale "scale"`; `no px font-size in migrated styles`; `gradients with two or more colour stops declare an interpolation space` (`in oklab`).
- [ ] **Step 2: Run**; FAIL.
- [ ] **Step 3: Implement.** Add `<meta name="text-scale" content="scale">` (Chrome/Edge only, harmless elsewhere; verify no `font-size` on `html`/`:root`, none found in the audit). Add `in oklab` to the 11 gradients, checking each in a screenshot. Replace the 8 chart hexes in `PwaCacheTypeBar.vue` with a token-backed series (CSS custom properties read at mount, as `payload/src/components/stats/readThemeColors` does) if the palette fits the tokens, else leave and justify in a comment.
- [ ] **Step 4: Run** PASS. Manual: 200 % browser zoom and 320 px viewport on home, word page, BON: no clipped text.
- [ ] **Step 5: Commit** `fix(dev): opt into OS text scale and interpolate gradients in oklab`.

### Task 9: Docs and rules

**Files:** Modify `docs/superpowers/specs/2026-11-13-design-system-design.md`, `.claude/rules/website-styles.md`, `DESIGN.md`, `docs/design/design-system/colour-inventory.md`, `website/CLAUDE.md`, `CLAUDE.md` (project, one line).

- [ ] **Step 1: Spec.** §5: theme switch text (`color-scheme` default `light dark`, inline override from the script, system-change listener); §8 table: add rows `accent-color` (adopt), `forced-colors` / `prefers-contrast` (adopt, scoped), `<meta name="text-scale">` (enhancement, Chrome/Edge), `color-scheme` meta (adopt); container style queries row: note Baseline since 2026-05-19, wording otherwise unchanged; §6/§8: reduced-motion text per Task 5 outcome (A or B).
- [ ] **Step 2: Rule file.** Update bullets "No dark-mode code" (new `base/_colors.scss` content), "`!important`" (per Task 5), add `scrollbar-width: auto` and `accent-color` bullets and "states conveyed by `box-shadow` need a forced-colors outline".
- [ ] **Step 3: Inventory and design docs.** `colour-inventory.md`: mark promoted rows with the token name and the commit; add a "Format" note (hex/rgb, no `oklch`, why). `DESIGN.md:132`: forced-colors behaviour of the dashed-hover signature.
- [ ] **Step 4: Verification rule.** `website/CLAUDE.md:127` adds a forced-colors emulation check next to the light/dark check; root `CLAUDE.md` gets one line pointing at spec §9 as the browser-support policy (`modern-web-guidance` reads it).
- [ ] **Step 5: Run** `pnpm format:check` and the contract tests; PASS.
- [ ] **Step 6: Commit** `docs(dev): align design system docs with modern web guidance`.

---

## Self-Review

- **Coverage:** audit items 1-2 (Task 1), 5-6 (Task 2), 3 (Task 3), 4 (Task 4), 8 and the guide's reset rule (Task 5), `scrollbar-width` (Task 6), hex/format/inventory (Task 7), gradients, text-scale, px font, JS colours (Task 8), docs (Task 9). `toSorted()` (audit item 9) is not in this plan: it is a JS tidy-up outside the design system.
- **Correction to the audit:** the `rgb()` values in migrated files are documented colour-inventory exceptions, not lint escapes; Task 7 shrinks that list rather than fixing violations.
- **Open decisions:** Task 5 (A or B); whether Task 3 replaces any hand-built control.
- **Order:** 1 → 2 (shared constant), 7 before 9 (docs cite final token names), 5 last of the code tasks (largest). Tasks 3, 4, 6, 8 are independent.

---

## Outcome and follow-ups (2026-11-21, after execution)

Tasks 1-9 are done (commits `cdfd3419`..`1ae882d3` on `felix-berlin/kalle`). What did not go as planned, and what is still open, so later redesign steps pick it up:

**Deviations from the plan**

- Root `color-scheme` stays `light` (not `light dark`): legacy files hide dark overrides behind the `.dark` class, so without JS `light dark` renders a dark system half dark. The `<meta name="color-scheme">` is in. **Switch the root default to `light dark` when `stylelint.legacy-files.mjs` is empty.**
- The global `0.01ms !important` reduced-motion net stays: legacy files rely on it. **Remove it with the last legacy file**, then drop the rule-file sentence about it. Migrated files already guard motion (contract test).
- Generator format is unchanged (hex, `rgb()`, `color(srgb …)`); no `oklch`. Plan Task 7 step 4 dropped on purpose.
- Task 3 and 4 are covered by contract tests and compiled CSS, not by Playwright (no browser run for accent-color, forced colors, or no-JS).

**Open (decide per redesign step)**

- Promote the remaining `rgb()` one-offs of migrated files (`_badge`, `_toast-notify`, `_word-sidebar`, `_main-menu`, …) and the `--_ring` `color-mix` in `_home-results.scss` to tokens; needs a visual diff per value.
- Gradient interpolation (`in oklab`) was judged unnecessary for the current hard-stop and colour-to-transparent gradients; revisit when a smooth colour-to-colour gradient is added.
- `PwaCacheTypeBar.vue` has 8 raw chart hexes; needs a categorical chart palette decision.
- `base/_inputs.scss` switch thumb `transition: transform` is not motion-guarded (shares a list with colour transitions); `_berliner-baer.scss` was not audited beyond its existing guards.
- `TurnStile.vue` reads raw `$isDarkMode` (`null` = follow system renders a light widget on a dark system). Pre-existing.
- Verify in a real browser once: forced colors on home, word page, BON; no-JS with dark system; the four hidden scrollers (`scroll alternative:` claim); `accent-color` in Safari, both schemes.
- No `prefers-contrast` block was added; add one only when a low-contrast pair is found.
