## 1. Fix panel id generation

- [x] 1.1 **REVISED during implementation.** `useId()` was tried first but discovered to collide across separate Astro islands (Vue's root-instance id counter always starts at `["", 0, 0]`, so the first `useId()` call in any island is always `v-0` — verified live: `MainMenu`'s panel and `WordSearchList`'s first `WordOptionDropdown` panel both got `id="dropdown-v-0"` simultaneously). Fixed instead with a **required `name: string` prop** on `DropdownPopoverProps` — deterministic across SSR/CSR by construction (no Vue-internal counter involved), and each consumer supplies a value unique across the page (`main-menu`, `word-options-${slug}`, `alphabetical-filter`). Verified live: all 8 panels on the homepage now have unique ids.
- [x] 1.2 N/A with the prop-based approach — no CSS-ident validity concern since `name` values are plain kebab-case/slug strings supplied by consumers, not a Vue-generated format

## 2. Verify shared-component regressions across all four consumers

- [x] 2.1 Manually check `src/components/word/WordOptionDropdown.vue` in browser: panel opens, arrow points correctly, fade transition plays — verified via Chrome DevTools MCP, panel ids now unique (`dropdown-word-options-<slug>`), opens independently of other panels
- [x] 2.2 (AlphabeticalFilterDropdown is dead code — not reachable from any page — skipped live check; type-checked only, see §1 note)
- [x] 2.3 Manually check `src/components/header/MainMenu.vue` in browser: same checks — verified, opens/closes correctly, unaffected by other panels
- [x] 2.4 N/A — `ColorModeToggle.vue` does not use `DropdownPopover` at all (confirmed via grep, no match); removed from this change's scope, see corrected proposal
- [x] 2.5 Ran targeted `pnpm vitest run` on all 5 test files touching these components (DropdownPopover, WordOptionDropdown, AlphabeticalFilterDropdown, MainMenu, MainHeader): 95/95 pass, no changes needed

## 3. Switch affected dropdown islands to server-rendered hydration

**REVISED scope during implementation:** `ColorModeToggle.vue` does not use `DropdownPopover` — dropped from scope (see proposal correction). `WordOptionDropdown` via `WordHero.astro` was discovered to share the identical `client:only` root cause as the reported header-menu bug — added to scope per user decision.

- [x] 3.1 In `src/components/header/MainHeader.astro`, change `<MainMenu client:only="vue" ...>` to `<MainMenu client:load ...>`
- [x] 3.2 In `src/components/word/WordHero.astro`, change `<WordOptionDropdown ... client:only='vue' ...>` to `<WordOptionDropdown ... client:load ...>`
- [x] 3.3 Confirmed `MainMenuButton`'s `slot="fallback"` usage was dead once `client:load` server-renders the real component; removed it (and the now-unused import) from `MainHeader.astro`. `MainMenuButton.vue` itself stays — it's also `MainMenu.vue`'s real internal trigger button, a separate live usage. `WordHero.astro`'s `WordOptionDropdown` had no fallback slot, so no equivalent cleanup was needed there

## 4. Live verification of the fix

- [x] 4.1 **Second design issue found and fixed during this step:** switching to `client:load` made Astro actually SSR `DropdownPopover`, which crashed with `document is not defined` — `useResizeObserver([triggerEl, panel, document.documentElement as HTMLElement], ...)` at setup-scope evaluates `document` synchronously regardless of render target, which only ever worked before because `client:only` skipped SSR entirely. Fixed by wrapping the call in `onMounted()` (`src/components/DropdownPopover.vue`), which only ever runs client-side.
- [x] 4.2 Confirmed via raw `curl` of the server-rendered HTML (no JS/browser involved): homepage now includes `component-url="/src/components/header/MainMenu.vue"` with `popovertarget="dropdown-main-menu"` matching `id="dropdown-main-menu"` in the same response — first click works with zero JS.
- [x] 4.3 Repeated for `/wort/aasen`: SSR HTML contains `component-url=".../WordOptionDropdown.vue"` with `popovertarget="dropdown-word-options-aasen"` matching `id="dropdown-word-options-aasen"`. Browser console clean (no errors) on both pages; menu opens correctly via real pointer-event sequences (arrow positioned, 6 items rendered, placement correct).

## 5. Final checks

- [x] 5.1 `pnpm lint` — clean (oxlint + stylelint, no issues). `pnpm typechecking` — 1 pre-existing error, unrelated to this change (in `tests/unit/coverage/prettify.js`, a vendored/generated coverage artifact not touched by this diff; confirmed via `git status` — not part of the 6 files this change modified)
- [x] 5.2 `pnpm test:unit` — 162/162 test files, 1806/1806 tests pass
- [x] 5.3 `pnpm build:local` — succeeded (1375 pages built; first attempt hit an unrelated transient network failure fetching an external Amazon affiliate image, second attempt succeeded). Verified static output directly (`dist/index.html`, `dist/wort/aasen.html`): both contain correctly matched `popovertarget`/`id` pairs for `dropdown-main-menu` and `dropdown-word-options-aasen`
