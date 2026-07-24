## Context

Two components render keyboard-shortcut hints unconditionally:
- `SearchModal.vue`'s footer: `ShortcutSelect.vue` (↵ "zum auswählen"),
  `ShortcutNavigating.vue` (↑↓ "zum navigieren"), `ShortcutClose.vue` (ESC "zum
  schließen").
- `WordSearchList.vue`'s inline homepage word list (`.c-filter-search__shortcuts`
  div): `ShortcutSelect.vue` and `ShortcutNavigating.vue` only (no `ShortcutClose` —
  there's no modal to close here). **Found during implementation**, not in the
  original investigation — the first pass only checked the modal.

Both describe real `onKeyStroke` (VueUse) listeners in `WordList.vue` —
ArrowDown/ArrowUp move an active result highlight, Enter navigates to the highlighted
result. On touch, results remain directly tappable regardless, so the arrow-key
highlight flow is keyboard-only but not load-bearing for touch users.

No conditional visibility exists today for this content on any axis (device type,
viewport, input capability), in either location. A codebase sweep found no
`useBreakpoints`, no `pointer: coarse`/`hover: none` media query, and no active use of
device detection anywhere near these files. One relevant artifact exists but is
unused: `src/utils/device.ts` exports a `DeviceDetector` class (UA-sniffing via
`navigator.userAgent`) referenced only in its own test file — dead code today.

## Goals / Non-Goals

**Goals:**
- Hide the shortcut hint bar when the device has no meaningful keyboard-input signal
  (typical touch-only phone/tablet).
- Keep it visible whenever a keyboard is plausibly present (desktop, laptop, or a
  touch device with an attached/Bluetooth keyboard), since the hints remain accurate
  and useful in those cases.
- Keep the underlying keyboard listeners functioning regardless of hint visibility.

**Non-Goals:**
- Perfect keyboard detection — no browser API reports "a keyboard is currently
  attached" directly; any approach is a heuristic with edge cases, which is
  acceptable given this is a low-stakes cosmetic decision (worst case: an unnecessary
  hint shown, or a hint hidden for someone who could have used it — either result is
  a UX nicety miss, not a functional break).
- Replacing the keyboard-only highlight/select interaction with a touch equivalent.

## Decisions

**RESOLVED during implementation: use VueUse's `useMediaQuery('(pointer: fine)')`.**
Confirmed via context7 (VueUse docs) that `useMediaQuery(query)` is a generic,
reactive `ComputedRef<boolean>` wrapper around any CSS media query — this is exactly
option 3 below, and it turns out to directly wrap option 1's correct signal (pointer
capability) rather than being a genuinely different measurement. Named `hasKeyboard`
for readability (`pointer: fine` reads as "affirmatively has a precise pointer," the
natural proxy for "has a keyboard-equipped device," rather than a negated
`!isCoarsePointer`). Being reactive by default costs nothing — no one-time-snapshot
logic was added (see Migration Plan) — so a paired Bluetooth keyboard connecting
mid-session can correctly bring the hints back without a remount.

The below (options 1-3) is kept as a record of the tradeoff analysis that led here.

**Original open question, now resolved above:**
how to detect "no physical keyboard likely present." Three candidates, with tradeoffs:

1. **CSS media query: `(pointer: coarse)` and/or `(hover: none)`.**
   - *For*: pure CSS, zero JS, Baseline widely-available, matches the project's
     stated preference for native platform features over hand-rolled JS (CLAUDE.md).
     Simplest to implement and reason about — no state, no composable, just a class
     toggle or `@include mx.breakpoint`-style container/media rule.
   - *Against*: a touch device with a paired Bluetooth/external keyboard still reports
     `pointer: coarse` (the primary pointing mechanism is still touch) — the media
     query can't see the keyboard, so it would hide the hint even though it's still
     accurate. Conversely, a touch-first laptop (rare, but exists) could report
     differently than expected depending on OS/browser pointer-capability reporting.
   - This is the front-runner given the codebase's stated conventions, but the false-
     negative case (Bluetooth keyboard + touch primary pointer) is a real, if
     uncommon, miss.

2. **Wire up the existing `DeviceDetector` class (`src/utils/device.ts`).**
   - *For*: reuses code that already exists in the repo rather than adding new logic.
   - *Against*: it's UA-string regex sniffing — generally fragile and discouraged
     (user-agent strings are inconsistent, spoofable, and increasingly frozen/reduced
     by browsers for privacy). It's also currently unused and unmaintained — reviving
     dead code as the basis for a new user-facing behavior adds risk rather than
     reducing it. Doesn't solve the Bluetooth-keyboard case any better than option 1.

3. **A VueUse composable (`useBreakpoints` or similar).**
   - *For*: matches the project's explicit preference for VueUse over hand-rolled
     browser-API wrappers (CLAUDE.md).
   - *Against*: `useBreakpoints` measures viewport **width**, not input capability —
     conflates "narrow screen" with "no keyboard," which are different signals (a
     narrow desktop browser window still has a keyboard; a large-viewport tablet in
     landscape may still be touch-only). VueUse doesn't appear to expose a
     pointer/hover-capability-specific composable distinct from the raw media query
     itself — need to confirm during implementation whether `usePointer` or a generic
     `useMediaQuery('(pointer: coarse)')` wrapper is the closer fit, which would
     effectively become option 1 wrapped in VueUse's reactive primitive rather than a
     genuinely different signal.

**Recommendation to weigh during implementation, not locked in:** option 1 (or option
3 as its VueUse-wrapped reactive equivalent, if `useMediaQuery` is available) is the
more defensible choice — it's the only one that directly measures the right signal
(pointer/hover capability) rather than proxying through viewport size or an unreliable
UA string. The Bluetooth-keyboard edge case is a known, accepted limitation either way.

**Decision: implement as a shared toggle at each usage site's wrapper, not
per-component — applied independently in both `SearchModal.vue` and
`WordSearchList.vue`.**
In each location, the shortcut components already render together as one hint group;
conditioning visibility once at the wrapper (rather than duplicating the check inside
each `Shortcut*.vue`) is simpler and keeps those components themselves free of
device-detection concerns. The two locations are not refactored into a shared
component in this change — `SearchModal.vue`'s footer also wraps the real
`ModalCloseButton` (which must stay visible on touch — see the modal-specific note
below), while `WordSearchList.vue`'s wrapper has no such button. Consolidating them
into one reusable "shortcut hint bar" component is a reasonable future refactor but
out of scope here (would touch more files than this fix needs to).

**Decision (`SearchModal.vue` specific): gate only the three `Shortcut*` components,
not the whole `<footer>`.**
The footer also contains `ModalCloseButton` — the actual functional close control.
Touch users have no ESC key, so they need the tap-to-close button *more*, not less;
hiding the entire footer on touch would have broken the modal's primary close
mechanism for exactly the audience this change targets. Only
`ShortcutSelect`/`ShortcutNavigating`/`ShortcutClose` are wrapped in the
`hasKeyboard`-gated block; `ModalCloseButton` remains outside it, always visible
(subject to the pre-existing `!showWordListFilterFlyout` condition on the whole
footer, unchanged).

## Risks / Trade-offs

- [Risk] Whichever heuristic is chosen, it will misjudge some real device
  configurations (Bluetooth keyboard + touch, touch-first laptop). → Mitigation:
  accepted as a low-stakes cosmetic miss, not a functional regression — the keyboard
  listeners keep working either way; only the hint text visibility is affected.
- [Risk] If the detection is reactive (e.g. tied to a media query that can change,
  such as attaching/detaching a keyboard mid-session), consider whether the hint bar
  should update live or only be evaluated once per modal open. A live update is more
  correct but likely unnecessary complexity for this cosmetic feature — default to a
  one-time check unless review decides otherwise.
- [Trade-off] Choosing option 1/3 (pointer/hover-based) over reviving `DeviceDetector`
  means the existing dead code in `src/utils/device.ts` remains unused. That's
  acceptable — this change isn't responsible for finding a use for pre-existing dead
  code, only for solving its own scoped problem correctly.

## Migration Plan (as executed)

1. Resolved the detection mechanism via context7: `useMediaQuery('(pointer: fine)')`
   from `@vueuse/core`, named `hasKeyboard`.
2. Added it to `SearchModal.vue`, gating only the three `Shortcut*` components inside
   the existing `<footer v-if="!showWordListFilterFlyout">` (the `ModalCloseButton`
   stays outside the new gate — see Decisions).
3. **Scope expanded mid-implementation**: found `WordSearchList.vue` renders
   `ShortcutSelect`/`ShortcutNavigating` unconditionally in its own
   `.c-filter-search__shortcuts` wrapper on the homepage — added the identical
   `hasKeyboard` gate there.
4. Verify: real desktop with keyboard (hints shown in both locations); Chrome
   DevTools device emulation / touch profile (hints hidden in both locations);
   underlying `onKeyStroke` navigation still functions when hints are hidden.
5. Extend existing `SearchModal`/`WordSearchList`/shortcut component tests to cover
   the new conditional visibility in both locations.
6. Rollback: revert the two independent conditionals — fully isolated, no
   shared/foundational changes, no new dependency (VueUse already installed).

## Open Questions

None outstanding. The detection mechanism is resolved (`useMediaQuery('(pointer:
fine)')`, reactive). The reactive-vs-one-time question resolved itself: `useMediaQuery`
is inherently reactive at no extra implementation cost, so there was no reason to add
snapshot logic to force a one-time check.
