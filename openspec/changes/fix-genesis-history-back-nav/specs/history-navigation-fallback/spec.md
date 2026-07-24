## ADDED Requirements

### Requirement: Recovery from unhandled back/forward navigation
The system SHALL detect when a browser `popstate` navigation event is not going to
be handled by Astro's ClientRouter (View Transitions) — specifically when the
event's `state` does not carry the router's own navigation-tracking shape — and
SHALL force a full page reload of the current location so the correct page content
is displayed, rather than leaving the DOM unchanged while the address bar has
already updated.

#### Scenario: Back navigation to the tab's first (hard-loaded) history entry
- **WHEN** a user hard-loads a page (direct link, bookmark, or search result),
  navigates forward via a client-side link click to another page, and then uses the
  browser back button to return to the original hard-loaded page
- **THEN** the page content, title, and rendered DOM update to correctly reflect the
  original page, matching the address bar

#### Scenario: Forward navigation back to the tab's first history entry
- **WHEN** a user is on a later, Astro-transition-managed history entry and
  navigates forward past intervening entries such that the resulting target is the
  tab's original hard-loaded entry
- **THEN** the page content updates correctly to match that entry, the same as the
  back-navigation scenario

### Requirement: No interference with Astro-managed navigation
The fallback mechanism SHALL NOT trigger, duplicate, or otherwise interfere with any
`popstate` navigation that Astro's ClientRouter already handles correctly (i.e., any
navigation where `event.state` carries the router's own tracking shape).

#### Scenario: Back/forward between two client-side-transitioned pages
- **WHEN** a user navigates via client-side link clicks across two or more pages
  (each producing an Astro-managed history entry) and then uses browser back or
  forward to move between any of those entries
- **THEN** Astro's normal client-side transition handles the navigation (smooth,
  animated, no full reload), and the fallback mechanism takes no action

#### Scenario: Fallback listener is registered exactly once per session
- **WHEN** the page loads initially and the user performs any number of client-side
  transitions afterward
- **THEN** the fallback's `popstate` listener is attached exactly once for the
  lifetime of the tab/document — it is not re-registered on each transition, and
  never fires more than once per genuine unhandled `popstate` event

### Requirement: Deterministic, non-timing-based detection
The detection of whether a given `popstate` event will be handled by Astro SHALL be
based on synchronously inspecting the shape of `event.state`, not on waiting for a
timeout or observing whether lifecycle events eventually fire.

#### Scenario: Detection function is pure and independently testable
- **WHEN** the detection logic is given a `history.state` value directly (without a
  real `popstate` event or DOM)
- **THEN** it returns a boolean decision synchronously, based solely on the shape of
  that value (e.g. `null`, a valid Astro-tracking object with a numeric `index`
  field including `index: 0`, or any other non-conforming value)
