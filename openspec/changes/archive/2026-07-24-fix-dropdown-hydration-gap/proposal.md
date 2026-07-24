## Why

Users sometimes need multiple clicks to open the header menu dropdown. Live browser
testing (Chrome DevTools MCP, native Popover API instrumentation) confirmed the native
Popover toggle logic itself is sound — no exit-transition race, no light-dismiss
double-toggle. The real cause is a hydration gap: `DropdownPopover.vue` generated its
panel id with `crypto.randomUUID()`, which produces a different value on the server
than on the client. That mismatch is why `MainMenu.vue` was mounted with
`client:only="vue"` — it couldn't be safely server-rendered. Until Vue hydrates
client-side, the header showed an inert fallback button (`MainMenuButton.vue` via
`slot="fallback"`) with no `popovertarget` attribute at all, so clicks during that
window were silently lost. On a slow chunk load, cold cache, or flaky dynamic-import
retry, that window is long enough for a user to click and see nothing happen.

**Corrections made during implementation** (this document reflects the final,
verified state — see `design.md` for the full trace of what was tried and ruled out):
- `ColorModeToggle.vue` was initially assumed to be a second affected consumer (it
  sits next to `MainMenu` in the header and shares `client:only`). Verified via grep
  that it does not use `DropdownPopover` at all — it's an unrelated toggle button.
  Dropped from scope.
- `WordOptionDropdown.vue`, rendered via `WordHero.astro` on every word detail page,
  was discovered to have the identical `client:only="vue"` root cause (a separate,
  unreported instance of the same bug). Added to scope on user confirmation, since
  the fix is the same one-line change.
- The originally chosen fix (`useId()`) was implemented, then found — via live
  browser testing, not just review — to produce **duplicate DOM ids across separate
  Astro islands** (Vue's per-app root id counter always starts at the same value, so
  two different islands' first `useId()` call both yield `"v-0"`). This is worse than
  the original bug: two elements sharing an `id` makes `popovertarget` resolve to the
  wrong panel. Replaced with a required `name` prop supplied by each consumer instead.

## What Changes

- Add a required `name: string` prop to `DropdownPopoverProps` in
  `DropdownPopover.vue`; panel id becomes `dropdown-${name}`. Deterministic across
  SSR/CSR by construction (no Vue-internal counter involved), and unique across
  islands as long as each call site supplies a distinct value.
- Each consumer passes a page-unique `name`: `MainMenu.vue` → `"main-menu"`,
  `WordOptionDropdown.vue` → `` `word-options-${slug}` `` (slug is already unique per
  word), `AlphabeticalFilterDropdown.vue` → `"alphabetical-filter"` (currently dead
  code — see Impact).
- Guard `DropdownPopover.vue`'s one synchronous `document` access
  (`useResizeObserver([..., document.documentElement, ...])`, previously safe only
  because `client:only` skipped SSR entirely) inside `onMounted()` — this was a second
  blocker found during implementation once the component was actually server-rendered
  for the first time (`document is not defined` crash under real SSR).
- Switch `MainMenu.vue` (`MainHeader.astro`) and `WordOptionDropdown.vue`
  (`WordHero.astro`) from `client:only="vue"` to `client:load`, now that the component
  is SSR-safe. The real `DropdownPopover` markup ships in the initial HTML with a
  correctly wired `popovertarget`, so the native Popover API can toggle it on the very
  first click even before Vue hydration completes.
- Remove the now-dead `MainMenuButton` fallback-slot usage in `MainHeader.astro` (only
  relevant to `client:only`). `MainMenuButton.vue` itself is kept — it's also
  `MainMenu.vue`'s actual internal trigger button, unrelated to the fallback slot.

## Non-goals

- Not changing the native Popover API usage, the CSS exit-transition timing, or the
  anchor-positioning logic in `DropdownPopover.vue` — testing showed these work
  correctly today.
- Not touching `ColorModeToggle.vue` — confirmed unrelated to `DropdownPopover`.
- Not deleting `AlphabeticalFilterDropdown.vue` despite it being confirmed dead code
  (unused outside its own test) — only patched for type-correctness, per explicit
  decision to keep this change scoped to the reported bug.
- Not adding a loading/skeleton state for the hydration window — the fix removes the
  window itself rather than papering over it.

## Capabilities

### New Capabilities
- `dropdown-popover`: current-state + fixed-state behavior of the shared
  `DropdownPopover` component — deterministic panel identity unique across the whole
  page (not just one Vue app/island), native Popover-API-driven open/close before and
  after hydration, and SSR-safety for any consumer that chooses to drop `client:only`.

### Modified Capabilities
- (none — no pre-existing spec covers this component; establishing baseline spec via
  the new capability above)

## Impact

- **Code**: `src/components/DropdownPopover.vue` (id generation + SSR-safe
  `useResizeObserver`), `src/components/header/MainHeader.astro` (client directive +
  removed fallback slot), `src/components/header/MainMenu.vue`,
  `src/components/word/WordHero.astro` (client directive), `src/components/word/
  WordOptionDropdown.vue`, `src/components/filter/AlphabeticalFilterDropdown.vue`
  (type-correctness patch only, dead code).
- **Dependencies**: none new.
- **Risk**: low — verified live via Chrome DevTools MCP (browser click behavior,
  arrow/placement rendering) and via raw SSR HTML inspection (`curl`, and the actual
  `pnpm build:local` static output) that `popovertarget`/`id` pairs match correctly
  with zero JS required for the first click, on both the homepage and a word detail
  page.
- **Testing**: full existing Vitest suite passes unchanged (162 files / 1806 tests) —
  no test updates were needed. `pnpm lint`, `pnpm typechecking` (1 pre-existing,
  unrelated error in a vendored coverage artifact), and `pnpm build:local` all pass.
