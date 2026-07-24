## Why

Keyboard-shortcut hint bars ("↵ zum auswählen", "↑↓ zum navigieren", "ESC zum
schließen") are shown unconditionally on every device, including touch/mobile, in
**two** places: the search modal's footer, and the always-visible inline word list on
the homepage. Most phones and tablets have no physical keyboard attached, so these
hints are meaningless clutter for the majority of visitors — confirmed by a codebase
sweep that found no existing conditional hiding for this content on any device type.

**Scope correction during implementation:** the initial investigation only found the
search-modal usage (`SearchModal.vue`). Implementation revealed a second, previously
missed consumer — `WordSearchList.vue`'s inline homepage word list — rendering the
same `ShortcutSelect`/`ShortcutNavigating` components unconditionally in a
`.c-filter-search__shortcuts` div. This is arguably the more visible instance of the
problem, since it requires no click to reveal (unlike the modal). Scope is expanded to
cover both.

## What Changes

- Hide the keyboard-shortcut hint components in **both** locations when the device has
  no keyboard-input signal, instead of showing them unconditionally:
  - `SearchModal.vue`'s footer: `ShortcutSelect.vue`, `ShortcutNavigating.vue`,
    `ShortcutClose.vue` (the modal's own close button stays visible regardless — see
    design.md).
  - `WordSearchList.vue`'s inline homepage word list: `ShortcutSelect.vue`,
    `ShortcutNavigating.vue` (no `ShortcutClose` here — there's no modal to close).
- The underlying `onKeyStroke` arrow-key/Enter navigation logic in `WordList.vue`
  stays registered regardless — hiding the hint text does not remove the
  functionality, so an external/Bluetooth keyboard paired with a touch device still
  works, it just won't be advertised via the hint bar.

## Non-goals

- No change to the actual keyboard navigation behavior (arrow-key highlight, Enter to
  select) — purely a visibility change for the instructional text/icons.
- No touch-equivalent replacement for the arrow-key highlight/select flow (e.g. swipe
  gestures) — search results remain directly tappable as plain links regardless, which
  already covers the touch use case without new interaction design.
- No decision yet on the exact detection mechanism — that's the core open question for
  design.md (see below); this proposal doesn't lock in a technical approach.
- No wiring-up of the existing unused `DeviceDetector` class as a blanket policy for
  other parts of the app — scoped strictly to this hint bar.

## Capabilities

### New Capabilities
- `search-shortcut-hints`: visibility behavior of the search modal's keyboard-shortcut
  hint bar — when it should and shouldn't be shown based on input capability.

### Modified Capabilities
- (none — no pre-existing spec covers search UI)

## Impact

- **Code**: `src/components/modals/search/SearchModal.vue` (footer conditional) and
  `src/components/word-search/WordSearchList.vue` (inline homepage list conditional).
  The `ShortcutSelect.vue`/`ShortcutNavigating.vue`/`ShortcutClose.vue` components
  themselves and `WordList.vue`'s `onKeyStroke` listeners are not modified.
- **Dependencies**: none new expected — VueUse is already a project dependency; the
  three candidate approaches (media query, VueUse composable, existing `DeviceDetector`
  class) all use what's already available.
- **Risk**: the detection heuristic is the crux of this change — see design.md's open
  question. A wrong choice could hide hints from users who do have a keyboard (e.g.
  touch-first laptops) or fail to hide them for touch-only users, so the tradeoffs need
  explicit review before implementation.
- **Testing**: existing Vitest coverage for `SearchModal`/shortcut components, extended
  to assert the hint bar's visibility under different simulated input-capability
  states; manual verification across a real touch device (or Chrome DevTools device
  emulation) and a real desktop/keyboard session.
