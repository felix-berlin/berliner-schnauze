# Tooltip — Native v-tooltip Directive + TooltipPopover Component

**Date:** 2026-06-20
**Status:** Approved

## Goal

Replace FloatingVue's `v-tooltip` directive and `VTooltip` component with a native implementation using the Popover API and CSS Anchor Positioning — the same technique as `DropdownPopover`. Remove `floating-vue` as a dependency entirely.

---

## Scope

**In scope:**
- New directive `src/directives/tooltip.ts`
- New component `src/components/TooltipPopover.vue`
- New SCSS `src/styles/components/_tooltip.scss`
- Tests for directive and component
- Migrate all 5 `v-tooltip` usage sites
- Migrate `ToolTip.vue` usage in `WordHero.astro` → `TooltipPopover`
- Remove `floating-vue` from `_app.ts`, `setup.ts`, and `package.json`
- Delete `src/components/ToolTip.vue`

**Out of scope:**
- Touch/mobile long-press to show tooltip
- Tooltip arrow/caret (decorative pointer)
- Singleton tooltip pattern (one tooltip shared across all directive instances)

---

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Popover type | `popover="manual"` | Hover/focus controlled via JS; no auto-dismiss interference with dropdowns |
| API style | Clean break | 5 usage sites are easy to migrate; allows idiomatic API |
| `distance` rename | → `offset` | Consistent with DropdownPopover |
| `placement: "auto"` | Removed | `position-try-fallbacks` handles fallback automatically |
| Directive/Component relationship | Independent | No shared runtime; directive = DOM manipulation, component = Vue template |
| `aria-describedby` on component | Wrapper div | Slot traversal to find inner element is out of scope |

---

## Architecture

Two independent artefacts sharing one SCSS file:

```
src/directives/tooltip.ts                  ← Vue directive (DOM manipulation)
src/components/TooltipPopover.vue          ← Vue component (template-based)
src/styles/components/_tooltip.scss        ← Shared styles
src/tests/unit/directives/tooltip.test.ts
src/tests/unit/components/TooltipPopover.test.ts
```

**Mechanism (both):** The tooltip element uses `popover="manual"` and CSS Anchor Positioning. The anchor element gets an `anchor-name` inline style (`--tooltip-<id>`); the panel gets `position-anchor: --tooltip-<id>`. Placement is a BEM modifier class that sets `position-area`. `position-try-fallbacks: flip-block, flip-inline, flip-block flip-inline` provides automatic quadrant fallbacks — zero JS for positioning.

---

## Directive API

### Types

```typescript
export type TooltipPlacement =
  | "top" | "top-start" | "top-end"
  | "bottom" | "bottom-start" | "bottom-end"
  | "left" | "right";

export type TooltipOptions = {
  content: string;
  placement?: TooltipPlacement; // default: "top"
  offset?: number;              // default: 8
  disabled?: boolean;           // default: false
  shown?: boolean;              // default: false
};

export type TooltipValue = string | TooltipOptions;
```

### Usage

```html
v-tooltip="'Einfacher Tooltip-Text'"
v-tooltip="{ content: 'Text', placement: 'bottom', offset: 12 }"
v-tooltip="{ content: 'Text', disabled: !hasContent }"
v-tooltip="{ content: 'Text', shown: isVisible }"
```

### Lifecycle

| Hook | Action |
|------|--------|
| `mounted` | Create `<div popover="manual" role="tooltip" id="tooltip-<id}">` in `document.body`; set `anchor-name: --tooltip-<id>` + `aria-describedby="tooltip-<id>"` on host; add `pointerenter`, `pointerleave`, `focusin`, `focusout` listeners |
| `updated` | Sync content, placement, offset; if `disabled` changes: add/remove listeners; if `shown` changes: call `showPopover()` / `hidePopover()`. `shown: true` is a hard override — hover events are ignored while it is set; `shown: false` is the default (hover still works normally) |
| `unmounted` | Remove panel from DOM; remove all event listeners; clean up inline styles |

### Registration

```typescript
// src/pages/_app.ts
import { vTooltip } from "@/directives/tooltip";
app.directive("tooltip", vTooltip);
```

---

## Component API

### Props

```typescript
export type TooltipPopoverProps = {
  content?: string;              // Text shorthand; slot overrides
  placement?: TooltipPlacement;  // default: "top"
  offset?: number;               // default: 8
};
```

### Slots

| Slot | Purpose |
|------|---------|
| `default` | Trigger content (the element being described) |
| `#tooltip` | Rich tooltip content — overrides `content` prop |

### Expose

```typescript
defineExpose({ show(): void, hide(): void });
```

Allows parent components (e.g. `WordOfTheDay`) to show/hide programmatically:

```typescript
const tooltipRef = ref<InstanceType<typeof TooltipPopover>>();
tooltipRef.value?.show();
```

### Template structure

```html
<div
  class="c-tooltip"
  :style="`anchor-name: --${id}`"
  :aria-describedby="tooltipId"
  @mouseenter="show"
  @mouseleave="hide"
  @focusin="show"
  @focusout="hide"
>
  <slot />

  <div
    :id="tooltipId"
    ref="panel"
    popover="manual"
    role="tooltip"
    class="c-tooltip__panel"
    :class="`c-tooltip__panel--${placement}`"
    :style="`position-anchor: --${id}; --c-tooltip-offset: ${offset}px`"
  >
    <slot name="tooltip">{{ content }}</slot>
  </div>
</div>
```

### Usage

```html
<!-- String via prop -->
<TooltipPopover content="Berliner Schnauze erklärt">
  <button>?</button>
</TooltipPopover>

<!-- Rich content via slot -->
<TooltipPopover placement="bottom">
  <span>Wort des Tages</span>
  <template #tooltip>
    <strong>Klick</strong> für mehr Infos
  </template>
</TooltipPopover>

<!-- Programmatisch (WordOfTheDay pattern) -->
<TooltipPopover ref="tooltipRef" content="Klick auf das Wort um mehr zu erfahren!">
  <WordCard />
</TooltipPopover>
```

---

## SCSS

```scss
// src/styles/components/_tooltip.scss
@use "@sass-butler/mixins" as butler-mx;

.c-tooltip {
  display: inline-flex;
}

.c-tooltip__panel {
  // UA Popover reset
  margin: 0;
  border: none;
  padding: 0;
  background: transparent;
  overflow: visible;
  max-width: none;
  max-height: none;
  color: inherit;

  // Anchor Positioning
  position: fixed;
  position-try-fallbacks: flip-block, flip-inline, flip-block flip-inline;

  // Tooltip visual style
  background: var(--color-tooltip-bg, var(--gray-900));
  color: var(--color-tooltip-text, var(--gray-50));
  padding: 0.25em 0.6em;
  border-radius: 4px;
  font-size: 0.8125rem;
  max-width: 20rem;

  // Placement modifiers — each sets position-area + its own offset margin direction
  // (offset must be direction-aware; a global margin-block-start only works for bottom placement)
  &--top         { position-area: block-start; margin-block-end: var(--c-tooltip-offset, 8px); }
  &--top-start   { position-area: block-start span-inline-end; margin-block-end: var(--c-tooltip-offset, 8px); }
  &--top-end     { position-area: block-start span-inline-start; margin-block-end: var(--c-tooltip-offset, 8px); }
  &--bottom      { position-area: block-end; margin-block-start: var(--c-tooltip-offset, 8px); }
  &--bottom-start { position-area: block-end span-inline-end; margin-block-start: var(--c-tooltip-offset, 8px); }
  &--bottom-end  { position-area: block-end span-inline-start; margin-block-start: var(--c-tooltip-offset, 8px); }
  &--left        { position-area: inline-start; margin-inline-end: var(--c-tooltip-offset, 8px); }
  &--right       { position-area: inline-end; margin-inline-start: var(--c-tooltip-offset, 8px); }

  // Fallback: browsers without CSS Anchor Positioning
  @supports not (position-area: block-end) {
    position: fixed;
    inset-block-start: 50%;
    inset-inline-start: 50%;
    translate: -50% -50%;
  }
}

// Fade (identical pattern to DropdownPopover)
@include butler-mx.feature("motion") {
  .c-tooltip__panel {
    opacity: 1;
    transition:
      opacity 0.1s ease,
      display 0.1s allow-discrete,
      overlay 0.1s allow-discrete;

    &:not(:popover-open) {
      opacity: 0;
    }

    @starting-style {
      &:popover-open {
        opacity: 0;
      }
    }
  }
}
```

---

## Placement → position-area mapping

| `placement` | `position-area` |
|-------------|----------------|
| `top` | `block-start` |
| `top-start` | `block-start span-inline-end` |
| `top-end` | `block-start span-inline-start` |
| `bottom` | `block-end` |
| `bottom-start` | `block-end span-inline-end` |
| `bottom-end` | `block-end span-inline-start` |
| `left` | `inline-start` |
| `right` | `inline-end` |

---

## Migration

### `v-tooltip` usage sites

| File | Change |
|------|--------|
| `InstallApp.vue` | `distance` → `offset` |
| `WordOfTheDay.vue` | Remove `shown` + `distance`; use `ref` + `tooltipRef.value?.show()` |
| `ScrollToTop.vue` | `distance` → `offset`; remove `placement: "auto"` |
| `IsWordOfTheDay.vue` | `distance` → `offset` |
| `AudioPlayerList.vue` | No change needed (already string value) |

### Component migration

| File | Change |
|------|--------|
| `src/components/ToolTip.vue` | Delete |
| `src/components/word/WordHero.astro` | Import `TooltipPopover`; `<ToolTip>` → `<TooltipPopover>`; `#popper` → `#tooltip` |

### FloatingVue removal

| File | Change |
|------|--------|
| `src/pages/_app.ts` | Remove `FloatingVue` import + `app.use(FloatingVue, ...)`; add `vTooltip` directive registration |
| `src/tests/setup.ts` | Remove all `floating-vue` imports and directive/component registrations; add new `tooltip` directive mock |
| `package.json` | Remove `floating-vue` dependency |

---

## Testing

### Directive tests (`tooltip.test.ts`)

- Creates a `[popover="manual"]` element in the DOM on mount
- Sets `anchor-name` on host element
- Sets `aria-describedby` on host element matching panel id
- Calls `showPopover()` on `pointerenter`
- Calls `hidePopover()` on `pointerleave`
- Calls `showPopover()` on `focusin`
- Calls `hidePopover()` on `focusout`
- Applies correct `c-tooltip__panel--{placement}` class
- Applies `--c-tooltip-offset` CSS variable from `offset` prop
- Does NOT show/hide when `disabled: true`
- `shown: true` calls `showPopover()` on `updated`
- `shown: false` calls `hidePopover()` on `updated`
- Removes panel from DOM on `unmounted`

### Component tests (`TooltipPopover.test.ts`)

- Renders default slot inside `.c-tooltip`
- Renders `content` prop inside `.c-tooltip__panel`
- Renders `#tooltip` slot content inside `.c-tooltip__panel`
- Panel has `popover="manual"` and `role="tooltip"`
- `aria-describedby` on wrapper matches panel `id`
- `anchor-name` on wrapper and `position-anchor` on panel share the same ident
- Applies correct placement modifier class
- `--c-tooltip-offset` CSS variable reflects `offset` prop
- `show()` calls `showPopover()` on panel
- `hide()` calls `hidePopover()` on panel
- `mouseenter` calls `showPopover()`
- `mouseleave` calls `hidePopover()`
