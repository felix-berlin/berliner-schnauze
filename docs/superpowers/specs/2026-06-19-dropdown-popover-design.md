# DropdownPopover — Native Dropdown via Popover API + CSS Anchor Positioning

**Date:** 2026-06-19
**Status:** Approved

## Goal

Replace the existing stub `DropdownPopover.vue` with a production-ready, generic dropdown component that uses the native Popover API and CSS Anchor Positioning (incl. `position-try-fallbacks`). Zero JS for positioning — the browser handles all placement logic.

---

## Scope

**In scope:**
- Full replacement of `src/components/DropdownPopover.vue`
- New SCSS file `src/styles/components/_dropdown-popover.scss`
- New test file `src/tests/unit/components/DropdownPopover.test.ts`

**Out of scope:**
- Migrating `WordOptionDropdown.vue` from FloatingVue to this component (separate task)
- Keyboard arrow-key navigation within the panel (consumer responsibility)
- `role="menu"` scaffolding (consumer responsibility)

---

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Content model | Arbitrary slot | Maximum flexibility; ARIA semantics owned by consumer |
| Placement API | `placement` prop → CSS class | BEM modifier keeps positioning in CSS, not JS |
| Fallbacks | `flip-inline, flip-block, flip-block flip-inline` | Covers all 4 quadrants without manual `@position-try` rules |
| Browser support | Baseline Newly Available (no polyfill) | Project already targets Popover API with same baseline |
| Trigger | Internal `<button>` with default slot | Covers all current use cases; attrs inherited via `inheritAttrs: false` |

---

## Component API

### Props

```ts
type PlacementValue =
  | "bottom-start" | "bottom-end" | "bottom"
  | "top-start"    | "top-end"    | "top";

type DropdownPopoverProps = {
  placement?: PlacementValue;  // default: "bottom-start"
  offset?: number;             // gap trigger ↔ panel in px, default: 8
  lazy?: boolean;              // defer slot render until first open, default: true
};
```

### Slots

| Slot | Purpose |
|---|---|
| `default` | Trigger button content (icon, label) |
| `panel` | Panel content — arbitrary, consumer owns ARIA |

### Exposes

```ts
close(): void  // programmatically hide the panel
```

### Usage

```vue
<DropdownPopover placement="bottom-end">
  <MoreVerticalIcon />
  <template #panel>
    <button type="button" @click="copy()">Kopieren</button>
    <button type="button" @click="share()">Teilen</button>
  </template>
</DropdownPopover>
```

---

## Architecture

### Template structure

```html
<div class="c-dropdown">
  <button
    v-bind="$attrs"
    type="button"
    class="c-dropdown__trigger"
    :popovertarget="panelId"
    :style="`anchor-name: --${panelId}`"
    :aria-expanded="isOpen"
    :aria-controls="panelId"
  >
    <slot />
  </button>

  <div
    ref="panel"
    :id="panelId"
    popover="auto"
    class="c-dropdown__panel"
    :class="`c-dropdown__panel--${placement}`"
    :style="`position-anchor: --${panelId}; --c-dropdown-offset: ${offset}px`"
    @toggle="onToggle"
  >
    <!-- Panel div always in DOM (needed for popovertarget ref).
         Slot content deferred until first open when lazy=true. -->
    <template v-if="!lazy || hasOpened">
      <slot name="panel" />
    </template>
  </div>
</div>
```

### Script

```ts
// inheritAttrs: false — $attrs (e.g. aria-haspopup) land on trigger button, not wrapper div
const { placement = "bottom-start", offset = 8, lazy = true } = defineProps<DropdownPopoverProps>();

const id = useId();               // Vue 3.5 — SSR-safe unique ID
const panelId = `dropdown-${id}`;

const panel = ref<HTMLElement | null>(null);
const isOpen = ref(false);
const hasOpened = ref(false);    // lazy sentinel — never resets to false

const onToggle = (event: ToggleEvent): void => {
  isOpen.value = event.newState === "open";
  if (event.newState === "open") hasOpened.value = true;
};

const close = (): void => {
  panel.value?.hidePopover();
};

defineExpose({ close });
```

### State

| State | Type | Source |
|---|---|---|
| `isOpen` | `ref<boolean>` | Native `toggle` event on panel |
| `hasOpened` | `ref<boolean>` | Set `true` on first open — never resets |
| `panelId` | `string` | `useId()` — stable, SSR-safe |

**Lazy invariant:** `hasOpened` is write-once — it transitions `false → true` on the first `toggle` to `"open"` and never returns to `false`. This means slot content stays mounted across subsequent open/close cycles (no remount cost, no lost scroll state).

---

## CSS Anchor Positioning

### `placement` → `position-area`

| Prop value | `position-area` | Description |
|---|---|---|
| `bottom-start` | `block-end span-inline-end` | below, left-aligned |
| `bottom-end` | `block-end span-inline-start` | below, right-aligned |
| `bottom` | `block-end` | below, centered |
| `top-start` | `block-start span-inline-end` | above, left-aligned |
| `top-end` | `block-start span-inline-start` | above, right-aligned |
| `top` | `block-start` | above, centered |

### Fallback strategy

```css
position-try-fallbacks: flip-inline, flip-block, flip-block flip-inline;
position-try-order: most-block-size;
```

For primary `bottom-start`, the browser automatically tries in order:
1. `bottom-start` (primary)
2. `bottom-end` (flip-inline)
3. `top-start` (flip-block)
4. `top-end` (flip-block flip-inline)

No `@position-try` rules needed.

### Offset

```css
margin-block-start: var(--c-dropdown-offset, 8px);
```

`flip-block` automatically swaps `margin-block-start` ↔ `margin-block-end` when the panel flips to a top placement.

### SCSS skeleton

```scss
// src/styles/components/_dropdown-popover.scss
@use "@sass-butler/mixins" as butler-mx;

.c-dropdown {
  display: inline-flex;
}

.c-dropdown__panel {
  // UA Popover reset
  margin: 0; border: none; padding: 0;
  background: transparent; overflow: visible; max-width: none; max-height: none;

  // Anchor Positioning
  position: fixed;
  margin-block-start: var(--c-dropdown-offset, 8px);
  position-try-fallbacks: flip-inline, flip-block, flip-block flip-inline;
  position-try-order: most-block-size;

  // Placements
  &--bottom-start { position-area: block-end span-inline-end; }
  &--bottom-end   { position-area: block-end span-inline-start; }
  &--bottom       { position-area: block-end; }
  &--top-start    { position-area: block-start span-inline-end; }
  &--top-end      { position-area: block-start span-inline-start; }
  &--top          { position-area: block-start; }

  // Non-supporting browsers (Chrome < 125 — very rare)
  @supports not (position-area: block-end) {
    inset-block-start: 50%;
    inset-inline-start: 50%;
    translate: -50% -50%;
  }
}

// Fade via @starting-style (Baseline Newly Available)
@include butler-mx.feature("motion") {
  .c-dropdown__panel {
    opacity: 1;
    transition:
      opacity 0.15s ease,
      display 0.15s allow-discrete,
      overlay 0.15s allow-discrete;

    &:not(:popover-open) { opacity: 0; }

    @starting-style {
      &:popover-open { opacity: 0; }
    }
  }
}
```

---

## Accessibility

### What the component provides

| Attribute | Element | Value |
|---|---|---|
| `aria-expanded` | Trigger `<button>` | reactive `"true"` / `"false"` |
| `aria-controls` | Trigger `<button>` | `{panelId}` |
| `id` | Panel `<div>` | `{panelId}` |

### What `popover="auto"` provides for free

- `ESC` closes the panel
- Click-outside closes the panel (light dismiss)
- Focus returns to trigger on close

### Consumer responsibilities

- `role="menu"` + `role="menuitem"` on panel content when appropriate
- Arrow-key navigation within the panel
- `aria-haspopup` on the trigger (passable via `$attrs` — `inheritAttrs: false`)

---

## Tests

**File:** `src/tests/unit/components/DropdownPopover.test.ts`

**Mock setup:**
```ts
beforeEach(() => {
  HTMLElement.prototype.showPopover = vi.fn();
  HTMLElement.prototype.hidePopover = vi.fn();
});
afterEach(() => vi.clearAllMocks());
```

**Test cases:**

```
renders default slot content inside trigger button
renders panel slot content inside panel element
panel has popover="auto" attribute
trigger popovertarget matches panel id
trigger aria-controls matches panel id
aria-expanded is "false" initially
aria-expanded becomes "true" after toggle event with newState="open"
aria-expanded becomes "false" after toggle event with newState="closed"
applies correct c-dropdown__panel--{placement} class for each placement value
sets --c-dropdown-offset to offset prop value in panel inline style
close() calls hidePopover on panel element
inherited attrs (e.g. aria-haspopup) are applied to trigger button, not wrapper div

// lazy prop
panel slot is NOT rendered before first open when lazy=true (default)
panel slot renders after first toggle to newState="open" when lazy=true
panel slot stays mounted after close (hasOpened remains true, no remount)
panel slot renders immediately on mount when lazy=false
```

---

## Browser Support

| Browser | Min version | Notes |
|---|---|---|
| Chrome | 125 | CSS Anchor Positioning GA |
| Firefox | 131 | CSS Anchor Positioning GA |
| Safari | 18.2 | CSS Anchor Positioning GA |

Baseline Newly Available (September 2024). Aligns with existing Popover API usage in the project.

---

## Future Considerations

- **`WordOptionDropdown.vue` migration** — replace FloatingVue (`VDropdown`) with `DropdownPopover` + `role="menu"` on panel
- **`AlphabeticalFilterDropdown.vue`** — candidate for migration once this component is stable
- **`aria-haspopup` prop** — add if multiple consumers need it; skip for now (YAGNI)
- **Directional slide animations** — currently fade only; slide-from-direction possible with `@starting-style` + placement class, but conflicts with flip fallbacks
