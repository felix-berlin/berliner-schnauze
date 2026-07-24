## Why

Browser back/forward navigation silently does nothing when the target history entry
is the very first ("genesis") entry of a tab session — the one reached via a hard
page load (direct link, bookmark, search-engine result), as opposed to entries
reached via Astro ClientRouter's client-side link transitions. Live reproduction and
lifecycle-event instrumentation (Chrome DevTools MCP) confirmed the root cause:
Astro's ClientRouter only stamps `history.state` with its own tracking object
(`{index, scrollX, scrollY}`) when it performs the transition itself via
`pushState`/`replaceState`. The initial hard-loaded entry never receives this stamp,
so `history.state` stays `null` for it permanently. When the browser later fires
`popstate` navigating to that entry, Astro's router doesn't recognize the state shape
and aborts before starting its transition pipeline — confirmed by instrumenting all 5
documented lifecycle events (`astro:before-preparation` through `astro:page-load`):
zero of them fire during the broken navigation. The browser's own address bar updates
natively (unstoppable), but the DOM/title/content never updates, so the page appears
frozen until the user triggers a real click-based navigation (e.g. the logo), which
uses a completely different, working code path.

This is a real, user-facing bug matching an exact repro report
(`/wort/aalen` ↔ `/` via back/forward), confirmed as a known class of upstream Astro
limitation (related GitHub issues withastro/astro#13943, #12237; PR #8491) that is not
addressed in any currently available Astro release, and is not documented as a
caveat in Astro's own View Transitions guide.

## What Changes

- Add a small, targeted `popstate` fallback listener that detects when Astro's
  ClientRouter did not handle a back/forward navigation (i.e., the browser's URL no
  longer matches the currently rendered page) and performs a full page reload to
  correctly load the target URL.
- Scope this narrowly: normal back/forward navigation between two Astro-stamped
  history entries must continue to work exactly as today (smooth, animated,
  client-side) — the fallback must only activate for the specific broken case
  (unstamped/unrecognized history state), never double-handle or interfere with
  transitions Astro already manages correctly.
- Register the listener once, at the layout level, since it must survive every
  client-side transition (the header/footer pattern via `transition:persist` already
  establishes this convention for persistent script wiring in this codebase).

## Non-goals

- Not attempting to patch or monkey-patch Astro's `ClientRouter` internals, fork the
  package, or reimplement view-transition swapping logic — this is a narrow
  workaround for one broken case, not a replacement router.
- Not attempting to preserve the View Transition animation for the recovered
  navigation — a full reload is an acceptable (visually different but functionally
  correct) fallback for this rare edge case; smooth animation is not achievable
  without reimplementing what the router itself fails to do here.
- Not filing or waiting on an upstream Astro fix — user confirmed no newer Astro
  version resolves this; this proposal is the workaround, not a stopgap "until
  upstream fixes it."
- Not touching any other back/forward-related code path — no existing custom
  history/popstate handling exists anywhere in the codebase today (confirmed via
  full-tree search), so this introduces the first and only such handler.

## Capabilities

### New Capabilities
- `history-navigation-fallback`: behavior guaranteeing that browser back/forward
  navigation always results in the correct page being displayed, including recovery
  from Astro ClientRouter's known genesis-entry gap, without breaking or duplicating
  the router's own correctly-handled transitions.

### Modified Capabilities
- (none — no pre-existing spec covers browser history/navigation behavior)

## Impact

- **Code**: a new client-side script (exact location decided in design.md — likely
  `src/layouts/Layout.astro` or a new composable, given the layout is the one place
  guaranteed to persist across every transition) plus its registration point.
- **Dependencies**: none new — implemented with native `popstate`/`history` APIs
  already used elsewhere in the codebase (e.g. `src/components/NavigateBack.vue`,
  `src/composable/useSearchQuerySync.ts`).
- **Risk**: the detection heuristic (distinguishing "Astro didn't handle this
  navigation" from "Astro is still mid-transition" or "this navigation doesn't need
  handling at all") is the crux of the design and must avoid false positives that
  would force an unnecessary full reload during otherwise-working transitions.
- **Testing**: manual/browser verification via Chrome DevTools MCP (the same method
  used to diagnose this bug) for both the broken case (now fixed) and the
  already-working case (must remain unaffected) — plus a targeted Vitest unit test
  for the detection logic if it can be isolated into a testable function.
