## Context

Astro's `<ClientRouter />` (View Transitions) manages same-origin navigation by
intercepting link clicks, fetching the target page, swapping the DOM, and calling
`history.pushState`/`replaceState` with its own tracking object as `state`
(observed shape: `{ index: number, scrollX: number, scrollY: number }`). It listens
for `popstate` to handle browser back/forward, using `event.state` to determine
navigation direction and prior scroll position.

The very first history entry of a tab session — reached via a hard/full page load
(direct URL, bookmark, external link, search result — i.e. how essentially all real
users arrive at the site) — is never touched by the router's `pushState`/
`replaceState` calls, because no transition happens for it; it's just the browser's
native initial load. Its `history.state` therefore stays `null` forever.

Live reproduction (Chrome DevTools MCP, this session) confirmed: when `popstate`
fires with `event.state === null`, Astro's router recognizes it doesn't own this
entry and returns immediately — none of its 5 documented lifecycle events
(`astro:before-preparation` → `astro:after-preparation` → `astro:before-swap` →
`astro:after-swap` → `astro:page-load`) fire. The browser's own address bar/
`location.href` updates regardless (native, unstoppable), leaving the DOM stuck on
the previous page's content with a mismatched URL. Confirmed via isolated,
cleanly-timed tests that navigation between two entries that BOTH carry the
`{index, ...}` state works correctly and smoothly — this is specifically about the
null-state entry, not a general back/forward failure.

No newer Astro version resolves this (checked); it matches a known class of
upstream issues (withastro/astro#13943, #12237) that remain open, and is not
documented as a caveat in Astro's View Transitions guide.

## Goals / Non-Goals

**Goals:**
- Guarantee that browser back/forward navigation always results in the correct page
  being visible — recovering specifically from the null-history-state case Astro's
  router doesn't handle.
- Detect the broken case deterministically and synchronously, without relying on
  timing/guesswork that could misfire during a legitimate (if slow) transition.
- Leave every case Astro's router already handles correctly (any `popstate` where
  `event.state` carries its tracking shape) completely untouched — no double-firing,
  no interference, no risk to the existing smooth/animated behavior.

**Non-Goals:**
- Preserving the View Transition animation for the recovered navigation. A full
  reload is a visually different but functionally correct outcome for this rare edge
  case (only affects the tab's very first history entry).
- Investigating or handling `pageshow`/bfcache separately — no evidence surfaced of a
  distinct bug there; scope is strictly the confirmed `popstate` + null-state case.
- Patching, forking, or monkey-patching Astro's `ClientRouter` module itself.

## Decisions

**Decision: Detect via synchronous `event.state` shape inspection, not a timing-based
"did the pipeline start" grace period.**
Two detection strategies were considered:
1. *(Chosen)* On `popstate`, synchronously check whether `event.state` is a
   non-null object with a numeric `.index` property (the shape Astro's router
   itself produces via `pushState`/`replaceState`). If it doesn't match, we know —
   with certainty, not inference — that Astro's router will not act on this
   navigation, and we can trigger the fallback immediately in the same event-handler
   tick.
2. *(Rejected)* Listen for `popstate`, then wait a short grace period (e.g. a
   `setTimeout`/`requestAnimationFrame`) checking whether any of Astro's lifecycle
   events fired; if none did by the deadline, assume the router bailed and fall
   back. Rejected because it introduces a tunable timing window that has to balance
   "long enough to not false-positive during a legitimate slow transition" against
   "short enough not to visibly delay the fix" — an inherently fuzzier, harder-to-
   verify approach than a direct, synchronous state-shape check that requires no
   waiting at all and cannot misfire due to network/device speed.

The state-shape check directly encodes the confirmed mechanism (null state → zero
lifecycle events, unconditionally) rather than inferring it indirectly through
timing, so it's both simpler and more robust.

**Decision: Fallback action is `window.location.reload()`.**
At the point `popstate` fires, the browser has already updated `location.href` to
the target URL (confirmed live — this happens natively, before any JS runs).
`location.reload()` re-requests exactly that URL from the server with no history
side effects (no new entry pushed, no forward-entries destroyed) — the simplest
correct way to force the right content to load. Alternatives considered and
rejected: `location.replace(location.href)` (adds a redundant navigation/history
operation for no benefit over `reload()`); manually re-fetching and diffing the DOM
ourselves (reimplements exactly what the router already does, for a case explicitly
scoped as "rare, full-reload-acceptable").

**Decision: Register the listener exactly once, at initial script execution — do
NOT wrap it in `astro:page-load`.**
This inverts the project's usual `<script>`-in-`.astro` convention (CLAUDE.md: wrap
re-initialization logic in `astro:page-load` since scripts only run once on initial
load). Here that's precisely correct: `window.addEventListener('popstate', ...)`
only needs to be attached once for the entire tab session — `window` itself is never
replaced by a view transition swap, only `document.head`/`body` contents are. Adding
an `astro:page-load` wrapper here would re-register the listener on every client-side
navigation, stacking duplicate listeners that each independently fire (and each
independently call `location.reload()`) on every subsequent `popstate` — the opposite
of what's needed. This is called out explicitly in code comments so a future
maintainer doesn't "fix" it by adding the usual guard.

**Decision: Implement as a plain utility module (`src/utils/`), not a Vue composable
or component.**
This logic has no Vue reactivity, no component lifecycle, and needs to run exactly
once outside any component tree — it doesn't fit the project's composable
convention (`src/composable/` is explicitly for "Vue lifecycle + reactive logic").
A small, pure, testable function (e.g. `shouldForceReload(state: unknown): boolean`)
plus a thin `initHistoryNavigationFallback()` wrapper that calls
`window.addEventListener('popstate', ...)` matches the existing pattern of plain
utilities like `src/utils/scrollSpy.ts` / `src/utils/analytics.ts`. The pure function
is unit-testable with plain object inputs (no DOM/jsdom needed for that part).

**Decision: Call the init function once from `src/layouts/Layout.astro`'s
`<script>` block.**
`Layout.astro` is the one place guaranteed to wrap every single page (it's not
itself a page-level file whose script gets swapped independently) and already hosts
the `transition:persist` header/footer — the natural home for session-lifetime,
transition-surviving script wiring in this codebase.

## Risks / Trade-offs

- [Risk] The state-shape check (`typeof state === 'object' && state !== null &&
  typeof state.index === 'number'`) is coupled to Astro's *current* internal
  `history.state` shape, which is undocumented and could change in a future Astro
  version.
  → Mitigation: the check is permissive (only requires an `index` number, not an
  exact key set), and if Astro ever changes shape, the worst-case failure mode is
  the fallback firing unnecessarily on an entry Astro actually does handle — causing
  an extra full reload instead of a smooth transition, not a broken page. That's a
  regression in polish, not correctness. Revisit if Astro's router internals change.
- [Risk] A future Astro upgrade could fix the underlying bug upstream, making this
  workaround redundant (though not harmful — the state-shape check would simply
  never match a bad case again since Astro would start stamping the genesis entry
  too, or the check becomes a permanent no-op).
  → Mitigation: none needed now; revisit if/when upgrading Astro, per proposal's
  Non-goals (not blocking on upstream).
- [Trade-off] The recovered navigation loses the transition animation and does a
  full reload (re-parses all HTML/CSS/JS, re-mounts Vue islands) — slower and more
  visually abrupt than a normal transition, but only for the rare first-entry case,
  and strictly better than the current "silently frozen" behavior.
- [Risk] If this listener is ever accidentally duplicated (e.g. copy-pasted into
  another script, or a future refactor moves the Layout script incorrectly), two
  reloads could double-fire. → Mitigation: keep the module's `initHistoryNavigationFallback()`
  idempotent (e.g. guard against double-registration via a module-level flag) as a
  defensive measure, even though the current design only calls it once.

## Migration Plan

1. Add `src/utils/historyNavigationFallback.ts` exporting `shouldForceReload(state:
   unknown): boolean` (pure, unit-testable) and `initHistoryNavigationFallback():
   void` (registers the `popstate` listener once, idempotent).
2. Call `initHistoryNavigationFallback()` from a `<script>` block in
   `src/layouts/Layout.astro`, with a comment explaining why this is NOT wrapped in
   `astro:page-load` (see Decisions above).
3. Manual verification via Chrome DevTools MCP, same method used to diagnose the
   bug: reproduce the exact broken sequence (fresh load → click into a word page →
   browser back) and confirm the page now correctly loads `/`. Also re-verify the
   already-working case (back/forward between two Astro-stamped entries) remains
   smooth and unaffected — no extra reload should fire there.
4. Add a Vitest unit test for `shouldForceReload()` covering: `null` state (true),
   valid `{index: 0, ...}` state including index `0` specifically since `0` is
   falsy in JS and a naive truthiness check would wrongly treat it as invalid
   (false), non-object state, state missing `.index`, `.index` as a non-number.
5. Rollback: delete the two additions (utility module, Layout script call) — fully
   isolated, no other code depends on this module.

## Open Questions

- None outstanding for this scope. If a distinct `pageshow`/bfcache-related issue
  surfaces later, it should be scoped as a separate investigation rather than folded
  into this fix.
