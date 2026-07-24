## Context

`DropdownPopover.vue` is a shared Vue component wrapping the native HTML Popover API
(`popover="auto"` + `popovertarget`) with CSS Anchor Positioning for placement. It is
used by four consumers: `WordOptionDropdown.vue`, `AlphabeticalFilterDropdown.vue`,
`MainMenu.vue`, and `ColorModeToggle.vue`.

Each instance needs a unique id to link its trigger (`popovertarget="<id>"`) to its
panel (`id="<id>"`) and to name its CSS anchor (`anchor-name: --<id>` /
`position-anchor: --<id>`). The component currently generates this id with
`crypto.randomUUID()` at `<script setup>` scope (module-instance scope, evaluated once
per component instance). Because this runs independently during SSR and during client
hydration, the server-rendered id and the client-rendered id are different random
values.

Astro's `client:*` directives assume the client will hydrate the exact markup the
server sent (to attach event listeners without a re-render). A component whose output
is non-deterministic between server and client breaks that assumption — Vue's
hydration would mismatch, and worse, any HTML sent by the server would carry a
`popovertarget` that names a `panelId` the server-rendered panel doesn't actually use
once the client re-evaluates it. The two consumers most exposed to this — `MainMenu`
and `ColorModeToggle`, both header controls, both hit on nearly every page load — were
worked around by mounting with `client:only="vue"`, which skips SSR for the island
entirely. Astro then renders whatever fallback markup is given in the default slot
until the client bundle loads and Vue mounts fresh.

For `MainMenu`, that fallback is `MainMenuButton.vue`: a plain `<button>` with no
`popovertarget`, no `aria-controls`, no click handler. It is visually identical to the
real trigger button but functionally inert. Live testing (Chrome DevTools MCP)
confirmed: immediately after `DOMContentLoaded`, before the Vue client chunk for
`MainMenu` finishes loading, the button in the DOM has `popovertarget: null` and there
are zero `.c-dropdown__panel` elements on the page. Clicking it does nothing. Once the
chunk loads and Vue mounts, the real `DropdownPopover` replaces it and clicking works
immediately (0 retries needed) — the native Popover API needs no JS at all to toggle
once the markup is correct.

This fully explains the reported symptom: "sometimes needs several clicks to open."
The severity is proportional to how long the client chunk takes to load — cold cache,
slow network, or a flaky dynamic-import retry (Astro silently retries failed
hydration fetches, observed in this session as `?astro-retry=` query params) all widen
the dead-click window.

Separately, live instrumentation of the native Popover toggle itself (rapid
open→close→reopen via real `PointerEvent`/`MouseEvent` sequences, timed against the
component's 150ms `overlay allow-discrete` exit transition) showed **no bug**: every
click produced exactly one `toggle` event and the panel state was always consistent
with the last click. That rules out the exit-transition and light-dismiss code paths
as contributors — this design targets the hydration gap only.

## Goals / Non-Goals

**Goals:**
- Make `DropdownPopover.vue`'s panel/anchor id deterministic and identical between
  server render and client hydration.
- Enable `MainMenu.vue` and `ColorModeToggle.vue` to be server-rendered (drop
  `client:only`) so the real, correctly-wired trigger ships in the initial HTML and
  is clickable via native browser behavior even before Vue hydrates.
- Preserve all existing visual behavior: placement, arrow, fade transition, anchor
  positioning fallbacks, hover/focus triggers on the other two consumers.

**Non-Goals:**
- Reworking the native Popover API usage, CSS anchor positioning, or the exit
  transition — all confirmed working correctly.
- Adding a loading skeleton or spinner for any residual hydration window — the id fix
  is expected to remove the dead-click window entirely, not shrink it.
- Touching `WordOptionDropdown.vue` or `AlphabeticalFilterDropdown.vue` unless
  investigation during implementation reveals they share the same root cause (they
  are not currently `client:only`, so they are believed unaffected).

## Decisions

**Decision (SUPERSEDED during implementation, kept for record): `useId()`.**
`useId()` (stable since Vue 3.5, installed version 3.5.40) was implemented first — it
generates a deterministic id, identical between server render and client hydration,
by tracking a per-component-instance incrementing counter. This looked correct in
isolation but was **wrong**: the counter's starting value (`["", 0, 0]`) is fixed for
every *root* component instance, and each Astro island is a separate Vue app root.
Live testing confirmed the first `useId()` call in any island's tree always yields
`"v-0"` — so `MainMenu`'s panel and `WordSearchList`'s first `WordOptionDropdown`
panel both got `id="dropdown-v-0"` simultaneously on the homepage. Two DOM elements
sharing an `id` means `popovertarget`/`position-anchor` can resolve to the wrong
element — worse than the original bug (silent no-op vs. opening the wrong panel).

**Decision (FINAL): Required `name: string` prop on `DropdownPopoverProps`, id =
`` `dropdown-${name}` ``.**
Deterministic across SSR/CSR by construction — no Vue-internal counter involved at
all, so no per-island reset risk. Each consumer supplies a value unique across the
whole page: `MainMenu` → `"main-menu"`, `WordOptionDropdown` → `` `word-options-
${slug}` `` (slug already unique per word), `AlphabeticalFilterDropdown` →
`"alphabetical-filter"`. This is exactly the alternative the original `useId()`
decision (below) rejected — the rejection reasoning assumed a generated id was
strictly safer than a caller-supplied one; the cross-island counter-reset behavior
proves that assumption wrong for any component that can be mounted as more than one
Astro island per page.
- *Original alternative-considered notes, still valid*: keeping `client:only` but
  giving `MainMenuButton` a non-inert, ARIA-correct fallback (e.g. a CSS-only
  `<details>` disclosure) was rejected — doubles the maintenance surface (two
  implementations of "open the menu") for a problem with a one-line root-cause fix.

**Decision: Switch `MainMenu` (`MainHeader.astro`) and `WordOptionDropdown`
(`WordHero.astro`) from `client:only="vue"` to `client:load`.**
Once the component is SSR-safe, there is no reason to skip SSR for these islands.
`client:load` hydrates immediately on page load (same eagerness as `client:only`)
but ships real, functional markup from the server first. This is the change that
actually closes the dead-click window, using the id fix as its prerequisite.
**`ColorModeToggle` was dropped from this decision** — verified during implementation
that it does not use `DropdownPopover` at all (no match for `DropdownPopover|popover`
in its source); it was wrongly assumed to be a consumer based on proximity in the
header markup and sharing `client:only`. **`WordOptionDropdown` via `WordHero.astro`
was added** — discovered during implementation to have the identical `client:only`
root cause, confirmed by the user as in-scope since the fix is identical.
- *Alternative considered*: `client:idle` or `client:visible`. Rejected — these
  controls should hydrate as early as `client:load` already does; deferring
  hydration further isn't the goal and isn't needed once SSR output is correct
  (native Popover works pre-hydration regardless).

**Decision: Guard `DropdownPopover.vue`'s `document` access inside `onMounted()`.**
Found during implementation: switching to `client:load` made Astro actually
server-render `DropdownPopover` for the first time ever. Its `useResizeObserver`
call evaluates `document.documentElement` as a plain argument at `<script setup>`
top-level scope — this only ever worked before because `client:only` skipped SSR
entirely, so the line never ran in a `document`-less (Node) environment. Under real
SSR this throws `document is not defined`, killing the whole component (and by
extension `MainMenu`'s render). Wrapping the `useResizeObserver` call in
`onMounted()` — which Vue guarantees never runs during SSR — fixes this with no
behavior change on the client (refs still resolve the same elements once mounted).

**Decision: Remove the `MainMenuButton` fallback-slot usage; keep `MainMenuButton.vue`
itself.**
Astro's `slot="fallback"` mechanism only matters for `client:only` (there's no SSR
output to show otherwise); once `MainMenu` uses `client:load`, the fallback slot is
inert dead markup. Removed the `slot="fallback"` usage in `MainHeader.astro` and its
now-unused import. `MainMenuButton.vue` the *component* is not deleted — it is also
`MainMenu.vue`'s actual internal trigger button (rendered via `DropdownPopover`'s
scoped slot), a completely separate, still-live usage.
`WordHero.astro`'s `WordOptionDropdown` had no fallback slot to begin with, so no
equivalent cleanup was needed there.

## Risks / Trade-offs

- [Risk] CSS Anchor Positioning (`anchor-name` / `position-anchor`) is keyed off the
  same id. With the final `name`-prop approach this is a non-issue — consumers pass
  plain kebab-case/slug strings, not a generated format that needs validating.
  → Verified live: arrow positioning, placement, and anchor resolution all confirmed
  working via Chrome DevTools MCP for both `MainMenu` and `WordOptionDropdown`.
- [Risk, CONFIRMED and FIXED] Server-rendering the popover panel for the first time
  (via `client:load`) exposed a real SSR crash: `DropdownPopover.vue`'s
  `useResizeObserver` call accessed `document.documentElement` synchronously at
  `<script setup>` scope, which only ever worked because `client:only` had skipped
  SSR entirely. Fixed by moving that call inside `onMounted()`. See Decisions above.
  → Verified: `curl` of raw SSR HTML and the actual `pnpm build:local` static output
  both show correct, crash-free markup with matched `popovertarget`/`id` pairs.
- [Risk, RULED OUT during implementation] `ColorModeToggle` flash-of-wrong-theme was
  a concern only under the original (incorrect) assumption that it used
  `DropdownPopover` and would be switched to `client:load`. It doesn't, and wasn't —
  moot.

## Migration Plan (as executed)

1. Added required `name: string` prop to `DropdownPopoverProps`; panel id becomes
   `` `dropdown-${name}` ``. (Superseded an initial `useId()` attempt — see Decisions.)
2. Guarded `useResizeObserver`'s `document` access inside `onMounted()` (found
   necessary only after step 4 below first exposed the SSR crash).
3. Updated the three real consumers (`MainMenu.vue`, `WordOptionDropdown.vue`,
   `AlphabeticalFilterDropdown.vue`) to pass a page-unique `name`.
4. Changed `client:only="vue"` → `client:load` for `MainMenu` (`MainHeader.astro`)
   and `WordOptionDropdown` (`WordHero.astro`). Left `ColorModeToggle` untouched
   (confirmed unrelated). Removed the dead `MainMenuButton` fallback-slot usage and
   its now-unused import in `MainHeader.astro`.
5. Verified: full targeted + full unit test suite (162 files / 1806 tests, no changes
   needed), `pnpm lint` clean, `pnpm typechecking` (1 pre-existing unrelated error in
   a vendored coverage artifact), live browser checks via Chrome DevTools MCP (click
   behavior, arrow/placement, console clean on homepage and a word detail page), raw
   SSR HTML via `curl`, and the actual `pnpm build:local` static output — all confirm
   correctly wired `popovertarget`/`id` pairs with zero JS required for the first
   click.
6. Rollback: revert independently if a regression surfaces — the `name`-prop change
   and the `client:load` switch are not tightly coupled (the id fix alone is safe even
   if a `client:load` switch is reverted, since it doesn't change anything the
   `client:only` path relies on).

## Open Questions

None outstanding — the two open questions from the original design (`ColorModeToggle`
flash risk, `MainMenuButton` fallback fate) were both resolved during implementation:
`ColorModeToggle` is unrelated (dropped from scope); `MainMenuButton` fallback-slot
usage was dead code and removed, while the component itself stays (still used as
`MainMenu.vue`'s real trigger).
