## ADDED Requirements

### Requirement: Stable panel identity across server and client render
`DropdownPopover.vue` SHALL generate its panel/anchor identifier using a mechanism
that produces the identical value during server-side rendering and during client-side
hydration for a given component instance, so that `popovertarget`, the panel's `id`,
and the CSS `anchor-name`/`position-anchor` pair always reference each other
correctly regardless of render environment.

#### Scenario: Server-rendered id matches client-hydrated id
- **WHEN** a page containing a `DropdownPopover` instance is server-rendered and then
  hydrated on the client
- **THEN** the `popovertarget` attribute on the trigger element and the `id` attribute
  on the panel element are identical strings in both the server-rendered HTML and the
  post-hydration DOM

#### Scenario: Multiple instances on one page do not collide
- **WHEN** a page renders more than one `DropdownPopover` instance
- **THEN** each instance has a distinct panel id, and no trigger's `popovertarget`
  resolves to another instance's panel

### Requirement: Trigger is functional in server-rendered markup before hydration
Any consumer of `DropdownPopover` that is capable of being server-rendered SHALL ship
server-rendered markup where the trigger element carries a valid `popovertarget`
attribute pointing to the accompanying panel's `id`, so that a user click opens the
panel via the native Popover API even if the page's JavaScript has not yet finished
loading or hydrating.

#### Scenario: Click before hydration completes opens the panel
- **WHEN** a user clicks a `DropdownPopover` trigger on a page where the Vue client
  bundle for that island has not yet finished loading
- **THEN** the associated panel opens on that first click, without requiring a retry

#### Scenario: No inert fallback trigger is shown for a server-renderable consumer
- **WHEN** a `DropdownPopover` consumer does not require `client:only` hydration (i.e.
  it can be safely server-rendered per the stable-id requirement above)
- **THEN** the initial server-rendered HTML for that consumer does not substitute an
  inert placeholder trigger (a trigger lacking `popovertarget`/`aria-controls`) in
  place of the real, functional trigger

### Requirement: Popover open/close behavior is unaffected by render origin
Whether a `DropdownPopover` instance's initial markup was server-rendered or inserted
client-side by Vue, its open/close behavior (native Popover toggle, exit-transition
fade, anchor-based placement, light-dismiss on outside click) SHALL behave
identically.

#### Scenario: Placement and fade transition work when server-rendered
- **WHEN** a `DropdownPopover` instance is server-rendered and then opened by the user
- **THEN** it positions itself relative to its trigger using the same
  anchor-positioning placement rules as when the instance was purely client-rendered,
  and the open/close fade transition plays without visual glitches

#### Scenario: Repeated rapid toggling does not desync open state
- **WHEN** a user clicks a trigger to open, then clicks again to close, then clicks
  again to reopen in quick succession
- **THEN** each click produces exactly one corresponding open or close state change,
  with no missed or duplicated toggles
