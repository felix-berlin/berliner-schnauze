## ADDED Requirements

### Requirement: Shortcut hints hidden when no keyboard is likely present
Both the search modal's footer and the homepage's inline word-search list SHALL NOT
display their keyboard-shortcut hints (select, navigate, and — for the modal only —
close) when the current device shows no meaningful signal of having a physical
keyboard available.

#### Scenario: Touch-only device, search modal
- **WHEN** a user opens the search modal on a device whose primary input is touch and no keyboard signal is present
- **THEN** the keyboard-shortcut hint bar (↵/↑↓/ESC hints) is not shown in the modal footer

#### Scenario: Touch-only device, homepage inline word list
- **WHEN** a user views the homepage's inline word-search list on a device whose primary input is touch and no keyboard signal is present
- **THEN** the keyboard-shortcut hints (↵/↑↓) are not shown in that list's shortcut area

#### Scenario: Desktop or laptop with keyboard
- **WHEN** a user views the search modal or the homepage inline word list on a device with a keyboard as the primary input method
- **THEN** the keyboard-shortcut hints are shown as before, in both locations

#### Scenario: Modal close control unaffected
- **WHEN** the search modal's shortcut hints are hidden because no keyboard signal is present
- **THEN** the modal's close button remains visible and functional, since touch users without a keyboard have no ESC key and rely on it

### Requirement: Keyboard navigation remains functional regardless of hint visibility
Hiding the shortcut hint bar SHALL NOT disable or alter the underlying keyboard
navigation behavior in the search results list.

#### Scenario: Keyboard navigation still works when hints are hidden
- **WHEN** the shortcut hint bar is hidden (e.g. on a touch-primary device) and the user has a physical or paired keyboard available
- **THEN** ArrowUp/ArrowDown still move the active result highlight and Enter still navigates to the highlighted result

#### Scenario: Touch interaction unaffected
- **WHEN** the shortcut hint bar is hidden
- **THEN** search results remain directly tappable as before, with no change to touch interaction

### Requirement: Hint visibility does not regress the existing filter-flyout condition
The new input-capability condition SHALL combine with, not replace, the existing
`showWordListFilterFlyout`-based visibility rule for the modal footer.

#### Scenario: Filter flyout open on a keyboard device
- **WHEN** the word-list filter flyout is open, regardless of input-capability state
- **THEN** the shortcut hint bar remains hidden exactly as it does today (existing behavior preserved)
