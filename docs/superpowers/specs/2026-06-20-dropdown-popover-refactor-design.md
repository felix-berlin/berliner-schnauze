# DropdownPopover Refactor Design

**Date:** 2026-06-20  
**Scope:** Refactor `DropdownPopover.vue` — remove internal trigger button, expose trigger via scoped slot, add `panelTag`, `panelClass`, `triggers`, `skidding`, `arrow`, and `arrowPadding` props.

---

## Goals

1. Remove the opinionated internal `<button>` — consumers supply their own trigger element.
2. Match FloatingVue's ergonomics: default slot = trigger, `#panel` = panel content.
3. Make the panel configurable via props (`panelTag`, `panelClass`).
4. Support multiple trigger events: `click` (native `popovertarget`), `hover`, `focus`.
5. Add optional visual arrow with `skidding` (lateral shift) and `arrowPadding` (edge clearance).

---

## Architecture

### DOM structure

```html
<div class="c-dropdown" v-bind="$attrs">

  <span
    class="c-dropdown__trigger"
    ref="triggerEl"
    :style="`anchor-name: --${panelId}`"
    <!-- hover/focus event listeners added via JS when triggers includes them -->
  >
    <!-- default slot — consumer provides their own button or element -->
    <slot :trigger-props="triggerProps" :is-open="isOpen" :panel-id="panelId" />
  </span>

  <component
    :is="panelTag"
    ref="panel"
    :id="panelId"
    popover="auto"
    class="c-dropdown__panel"
    :class="[`c-dropdown__panel--${placement}`, panelClass]"
    :style="panelStyle"
    @toggle="onToggle"
  >
    <span v-if="arrow" class="c-dropdown__arrow" aria-hidden="true" />
    <template v-if="!lazy || hasOpened">
      <slot name="panel" />
    </template>
  </component>

</div>
```

Key structural decisions:
- `anchor-name` lives on `.c-dropdown__trigger` (tighter to the actual trigger element, better panel positioning).
- `$attrs` (including `class`) bind to the outer `.c-dropdown` wrapper — `inheritAttrs: false` stays.
- The outer wrapper no longer carries the anchor; `.c-dropdown__trigger` span does.

### Trigger event model

The `triggers` prop accepts an array of `'click' | 'hover' | 'focus'`. Each trigger type wires a different mechanism:

| Trigger | Mechanism | Where |
|---|---|---|
| `'click'` (default) | Native `popovertarget` attribute in `triggerProps` | User's button inside default slot |
| `'hover'` | `mouseenter` / `mouseleave` listeners → `showPopover()` / `hidePopover()` | `.c-dropdown__trigger` span |
| `'focus'` | `focusin` / `focusout` listeners → `showPopover()` / `hidePopover()` | `.c-dropdown__trigger` span |

`popovertarget` is only included in `triggerProps` when `'click'` is in `triggers` — using the native browser toggle avoids the double-fire that occurs when click delegation fights `popover="auto"` light-dismiss (which fires on `pointerdown`).

For hover/focus, `hidePopover()` uses a short delay (`setTimeout(100ms)`) to avoid flickering when the pointer briefly leaves the trigger to enter the panel.

### Slot scope

Default slot exposes:

```ts
{
  triggerProps: {
    'aria-controls': string;      // always
    'aria-expanded': boolean;     // always
    popovertarget?: string;       // only when triggers includes 'click'
  };
  isOpen: boolean;   // for consumers that need to react (e.g., rotate a chevron icon)
  panelId: string;   // rarely needed, exposed for custom aria wiring
}
```

### CSS custom properties (panel inline style)

```ts
const panelStyle = computed(() => ({
  'position-anchor': `--${panelId}`,
  '--c-dropdown-offset':        `${offset}px`,
  '--c-dropdown-skidding':      `${skidding}px`,
  '--c-dropdown-arrow-padding': `${arrowPadding}px`,
}));
```

---

## Props

```ts
type TriggerEvent = 'click' | 'hover' | 'focus';
type PlacementValue =
  | 'bottom-start' | 'bottom-end' | 'bottom'
  | 'top-start'    | 'top-end'    | 'top';

type DropdownPopoverProps = {
  // Behavior
  lazy?:      boolean;         // default: true — defer panel slot render until first open
  placement?: PlacementValue;  // default: 'bottom-start'
  offset?:    number;          // px — perpendicular distance trigger→panel, default: 8
  skidding?:  number;          // px — lateral shift along placement axis, default: 0 (positive = inline-end / right, negative = inline-start / left)
  triggers?:  TriggerEvent[];  // default: ['click']

  // Panel
  panelClass?: string | string[] | Record<string, boolean>;
  panelTag?:   string;         // HTML tag for the panel element, default: 'div'

  // Arrow
  arrow?:        boolean;  // show arrow pointing to trigger, default: false
  arrowPadding?: number;   // px — min distance from arrow to panel corners, default: 4
};
```

---

## Usage

### Minimal (click trigger)

```html
<DropdownPopover v-slot="{ triggerProps }">
  <button v-bind="triggerProps" type="button">Open</button>
  <template #panel>…content…</template>
</DropdownPopover>
```

### With isOpen (for animated chevron or indicator)

```html
<DropdownPopover v-slot="{ triggerProps, isOpen }">
  <button v-bind="triggerProps" type="button">
    Menu <ChevronDown :class="{ 'is-open': isOpen }" />
  </button>
  <template #panel>…</template>
</DropdownPopover>
```

### With hover trigger + arrow

```html
<DropdownPopover :triggers="['hover', 'focus']" arrow :arrow-padding="6">
  <template #default="{ triggerProps }">
    <a v-bind="triggerProps" href="#">Hover me</a>
  </template>
  <template #panel>…</template>
</DropdownPopover>
```

### Full options

```html
<DropdownPopover
  placement="bottom-end"
  :offset="6"
  :skidding="-4"
  panel-class="c-my-menu"
  panel-tag="menu"
  arrow
  :arrow-padding="8"
  class="c-nav__item"
  v-slot="{ triggerProps, isOpen }"
>
  <button v-bind="triggerProps" type="button" :class="{ 'is-active': isOpen }">
    Nav
  </button>
  <template #panel>…</template>
</DropdownPopover>
```

---

## SCSS changes

### `.c-dropdown__trigger` (updated)

```scss
&__trigger {
  display: inline-flex;
  cursor: pointer;
  // anchor-name set via inline style (dynamic per instance)
}
```

### Panel: add skidding support

```scss
.c-dropdown__panel {
  translate: var(--c-dropdown-skidding, 0) 0;
  // existing position-anchor, position-area, offset etc. unchanged
}
```

### Arrow element (new)

```scss
.c-dropdown__arrow {
  --arrow-size: 8px;
  --arrow-half: calc(var(--arrow-size) / 2);

  position: absolute;
  width: var(--arrow-size);
  height: var(--arrow-size);
  background: var(--color-background);
  transform: rotate(45deg);
  box-shadow: inherit;   // picks up panel shadow for seamless look

  // Position at the panel edge facing the trigger, per placement group:
}

// Arrow at top edge (panel is below trigger)
.c-dropdown__panel--bottom-start,
.c-dropdown__panel--bottom-end,
.c-dropdown__panel--bottom {
  .c-dropdown__arrow {
    top: calc(-1 * var(--arrow-half));
    left: clamp(
      var(--c-dropdown-arrow-padding, 4px),
      50%,
      calc(100% - var(--c-dropdown-arrow-padding, 4px) - var(--arrow-size))
    );
  }
}

// Arrow at bottom edge (panel is above trigger)
.c-dropdown__panel--top-start,
.c-dropdown__panel--top-end,
.c-dropdown__panel--top {
  .c-dropdown__arrow {
    bottom: calc(-1 * var(--arrow-half));
    left: clamp(
      var(--c-dropdown-arrow-padding, 4px),
      50%,
      calc(100% - var(--c-dropdown-arrow-padding, 4px) - var(--arrow-size))
    );
  }
}
```

---

## Removed

- Internal `<button class="c-dropdown__trigger">` — gone
- `trigger` ref (`HTMLButtonElement`) — replaced by `triggerEl` ref (`HTMLElement`)
- `anchor-name` style from internal button — now on `.c-dropdown__trigger` span

## Kept

- `defineExpose({ close })` — programmatic close API unchanged
- `panelId` pattern (`dropdown-${useId()}`) — unchanged
- `lazy` / `hasOpened` pattern — unchanged
- `popover="auto"` + `@toggle` — unchanged
- `position-try-fallbacks` / `position-try-order` in SCSS — unchanged

---

## Migration at usage sites

| File | Required change |
|---|---|
| `WordOptionDropdown.vue` | Add `v-slot="{ triggerProps }"`, wrap `<span>` in `<button v-bind="triggerProps" type="button">` |
| `AlphabeticalFilterDropdown.vue` | Add `v-slot="{ triggerProps }"`, wrap `<span>Filter</span> alphabetisch` in `<button v-bind="triggerProps" type="button">` |
| `MainMenu.vue` | Add `v-slot="{ triggerProps }"`, pass `v-bind="triggerProps"` to `<MainMenuButton>` (must accept attrs) |

---

## Testing

- Existing DropdownPopover tests: update to reflect new slot API (no internal button in DOM).
- New test cases:
  - `triggers=['hover']` — mousenter shows, mouseleave hides after delay
  - `triggers=['focus']` — focusin shows, focusout hides after delay
  - `arrow=true` — `.c-dropdown__arrow` rendered inside panel
  - `panelTag='menu'` — panel renders as `<menu>` element
  - `panelClass` — class forwarded to panel element
  - `skidding` — CSS custom property set on panel style
  - `arrowPadding` — CSS custom property set on panel style
  - `triggerProps` does not include `popovertarget` when triggers does not include `'click'`
