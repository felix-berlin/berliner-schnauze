# Plan 02 — Toast Notify Optimization

## Phase 0: Documentation Review (Complete)

**CSS Anchor Positioning — Baseline 2026 (Verified)**

| Browser | Since | Notes |
| --- | --- | --- |
| Chrome/Edge | 125 (May 2024) | Full support |
| Firefox | 147 | Enabled by default |
| Safari | 26 (iOS 26 / macOS Tahoe) | Full support |

Global coverage ≈ 76% (Jun 2026). Polyfill: `@oddbird/css-anchor-positioning` for older versions. **Use CSS Anchor Positioning — it is Baseline 2026.**

**Verified API surface (MDN, W3C spec):**

| Property / Function | Syntax | Notes |
| --- | --- | --- |
| `anchor-name` | `anchor-name: --my-anchor` | `<dashed-ident>`, sets element as anchor |
| `position-anchor` | `position-anchor: --my-anchor` | Default anchor for positioned element |
| `anchor()` | `top: anchor(bottom)` / `anchor(--name side, fallback)` | Inset value relative to anchor edge |
| `anchor-size()` | `width: anchor-size(width)` | Dimension relative to anchor |
| `position-area` | `position-area: top right` | 9-cell grid shorthand, alternative to `anchor()` |
| `anchor-scope` | `anchor-scope: all` | Scopes names inside subtree (for repeated components) |
| `@position-try` | `@position-try --name { ... }` | Named fallback position block |
| `position-try-fallbacks` | `position-try-fallbacks: --name, flip-block` | Ordered fallback list |
| `position-visibility` | `position-visibility: anchors-valid` | Auto-hide if anchor invalid |

**Anti-patterns (MUST avoid):**

- Popovers have `margin: auto` + `inset: 0` from UA stylesheet — **overrides anchor calculations**. Always set `margin: unset; inset: unset;` on `[popover]` before applying anchor positioning.
- Do NOT use `position-area` + `margin: auto` together — conflicts.
- Anchor must appear in same CSS style tree as positioned element (no cross-shadow-DOM anchoring).
- `@position-try` block: if using inset props (`top`, `left`) alongside `position-area`, set `position-area: none` in that block.

**Popover API — verified facts:**

| API | Signature | Notes |
|-----|-----------|-------|
| `popover="manual"` | HTML attr | Multiple simultaneous popovers — correct for toasts |
| `showPopover()` | `el.showPopover()` | Adds to top layer |
| `hidePopover()` | `el.hidePopover()` | Removes from top layer |
| `beforetoggle` | `ToggleEvent { oldState, newState }` | Cancelable on show only |
| `toggle` | same shape, fires after | Not cancelable |

**Allowed transition pattern (MDN):**

```css
[popover] {
  margin: unset;
  inset: unset;
  opacity: 0;
  transform: translateX(100%);
  transition:
    opacity 0.3s,
    transform 0.3s,
    overlay 0.3s allow-discrete,
    display 0.3s allow-discrete;
}
[popover]:popover-open {
  opacity: 1;
  transform: translateX(0);
}
@starting-style {
  [popover]:popover-open {
    opacity: 0;
    transform: translateX(100%);
  }
}
```

---

## Phase 1: CSS Anchor Positioning — Toast Stacking

**Files:** `src/components/toast/ToastNotify.vue`, `src/components/toast/ToastNotifyContainer.vue`, `src/styles/components/_toast-notify.scss`

### 1a. Corner anchor elements in `ToastNotifyContainer.vue`

Render 4 invisible fixed divs — one per corner. These are the anchor roots for the first toast in each corner group.

```html
<!-- One per corner, rendered in ToastNotifyContainer -->
<div
  v-for="corner in CORNERS"
  :key="corner"
  class="c-toast-corner-anchor"
  :data-corner="corner"
/>
```

```scss
// Fixed, zero-size, invisible — position only
.c-toast-corner-anchor {
  position: fixed;
  width: 0;
  height: 0;
  pointer-events: none;

  &[data-corner="top-right"]    { top: 20px;                                       right: 20px; anchor-name: --toast-corner-top-right; }
  &[data-corner="top-left"]     { top: 20px;                                       left: 20px;  anchor-name: --toast-corner-top-left; }
  &[data-corner="bottom-right"] { bottom: max(20px, env(safe-area-inset-bottom, 0px)); right: 20px; anchor-name: --toast-corner-bottom-right; }
  &[data-corner="bottom-left"]  { bottom: max(20px, env(safe-area-inset-bottom, 0px)); left: 20px;  anchor-name: --toast-corner-bottom-left; }
}
```

### 1b. Anchor chain computation in `ToastNotifyContainer.vue`

Each toast gets a unique `anchor-name` (`--toast-${id}`). First toast in a group anchors to its corner; subsequent toasts anchor to the previous toast.

```ts
const CORNERS = ["top-right", "top-left", "bottom-right", "bottom-left"] as const;
type Corner = (typeof CORNERS)[number];

const anchorChain = computed(() => {
  const chain: Record<number, { anchorName: string; anchorSource: string }> = {};

  CORNERS.forEach((corner: Corner) => {
    const group = toastStore.value.filter(
      (t) => (t.position ?? "top-right") === corner
    );
    group.forEach((toast, index) => {
      chain[toast.id!] = {
        anchorName: `--toast-${toast.id}`,
        anchorSource:
          index === 0 ? `--toast-corner-${corner}` : `--toast-${group[index - 1].id}`,
      };
    });
  });

  return chain;
});
```

Pass `anchorName` and `anchorSource` as props to each `<ToastNotify>`.

### 1c. Inline styles in `ToastNotify.vue`

Apply `anchor-name` and `position-anchor` via inline style binding on the popover element:

```ts
const anchorStyle = computed(() => ({
  anchorName: props.anchorName,
  positionAnchor: props.anchorSource,
}));
```

```html
<div
  :id="`toast-${id}`"
  popover="manual"
  :class="[...]"
  :style="anchorStyle"
>
```

**Remove** `setPosition()`, `setDynamicPosition()`, `stylePosition` reactive object, and `initOffset` prop — CSS anchors handle all positioning.

### 1d. CSS anchor positioning per corner in `_toast-notify.scss`

Override UA popover defaults first. Then position each corner variant.

```scss
.c-toast-notify {
  // Critical: reset UA popover defaults that break anchor positioning
  margin: unset;
  inset: unset;
  position: fixed;
  position: fixed; // redundant but defensive

  // Top corners: appear below anchor's bottom edge
  &--top-right {
    position-anchor: var(--toast-source); // overridden by inline style
    top: calc(anchor(bottom) + var(--toast-gap, 10px));
    right: anchor(right);
  }
  &--top-left {
    top: calc(anchor(bottom) + var(--toast-gap, 10px));
    left: anchor(left);
  }

  // Bottom corners: appear above anchor's top edge
  &--bottom-right {
    bottom: calc(anchor(top) + var(--toast-gap, 10px));
    right: anchor(right);
  }
  &--bottom-left {
    bottom: calc(anchor(top) + var(--toast-gap, 10px));
    left: anchor(left);
  }
}
```

Note: `position-anchor` is set via inline style (from Vue binding), not in SCSS — this is correct since it must be dynamic per toast.

**Verification checklist:**

- [ ] Multiple toasts at `top-right` stack downward with gap, no JS `top` overrides
- [ ] Multiple toasts at `bottom-left` stack upward with gap
- [ ] Mixed positions (top-right + bottom-left simultaneously) don't interfere
- [ ] When middle toast is removed, subsequent toast re-anchors to predecessor automatically
- [ ] No `stylePosition`, `setDynamicPosition`, `setPosition` calls remain
- [ ] `pnpm lint` passes

---

## Phase 2: Persistent Notifications

**Files:** `src/stores/toastNotify.ts`, `src/components/toast/ToastNotify.vue`, `src/styles/components/_toast-notify.scss`

### 2a. `timeout: null` = persistent (already in store)

`ToastPayload.timeout: null | number` already supports persistent. Verify:

```ts
// createToastNotify — no timers set when timeout === null
if (timeout !== null) {
  setTimeout(() => hidePopover(toast.id!), (timeout ?? defaultTimeout) - removeToastTimeout);
  setTimeout(() => removeToastById(toast.id!), timeout ?? defaultTimeout);
}
```

No changes needed to the store logic itself.

### 2b. Mandatory close button for persistent toasts

When `timeout === null`, the close button **must** render regardless of `showClose` prop. The user has no other way to dismiss.

```ts
// ToastNotify.vue — computed
const mustShowClose = computed(() => props.timeout === null || props.showClose !== false);
```

```html
<button v-if="mustShowClose" class="c-toast-notify__close" @click="hideToast">
  <!-- lucide: X icon -->
</button>
```

Add `timeout` to the `ToastNotify` props (pass-through from store):

```ts
// props
timeout?: null | number;
```

### 2c. Visual indicator for persistent toasts

Persistent toasts need a clear visual distinction — users must understand they require manual action.

```html
<!-- Add to template when timeout === null -->
<span v-if="timeout === null" class="c-toast-notify__persistent-badge" aria-label="Permanent notification">
  <!-- lucide: pin icon -->
</span>
```

```scss
.c-toast-notify__persistent-badge {
  flex: 0 0 auto;
  color: var(--c-toast-icon-color);
  opacity: 0.7;
}
```

### 2d. No swipe-to-dismiss for persistent toasts

If `closeOnSwipe` is true but `timeout === null`, swipe should still dismiss (user intent). No change needed — the existing swipe handler calls `hideToast()` which calls `removeToastById()`. This is correct.

**Verification checklist:**

- [ ] `createToastNotify({ message: "...", timeout: null })` — toast stays until close button clicked
- [ ] `showClose: false` on persistent toast still renders close button (override)
- [ ] Pin badge visible on persistent, absent on timed toasts
- [ ] Swipe still dismisses persistent toast
- [ ] `pnpm test:unit` passes

---

## Phase 3: Direction-Aware Transitions

**File:** `src/styles/components/_toast-notify.scss`

### 3a. Default exit direction per corner

Right-anchored toasts slide out to the right. Left-anchored toasts slide out to the left. Use `@starting-style` for entry.

```scss
.c-toast-notify {
  @include butler-mx.feature("motion") {
    opacity: 0;
    // Default exit: slide right (top-right, bottom-right)
    transform: translateX(110%);

    transition:
      opacity 0.3s ease,
      transform 0.3s ease,
      display 0.3s allow-discrete,
      overlay 0.3s allow-discrete;
  }

  // Left-anchored corners: exit left
  &--top-left,
  &--bottom-left {
    @include butler-mx.feature("motion") {
      transform: translateX(-110%);
    }
  }

  &:popover-open {
    @include butler-mx.feature("motion") {
      opacity: 1;
      transform: translateX(0);
    }
  }

  // Entry animation — @starting-style must be inside :popover-open
  &--top-right,
  &--bottom-right {
    &:popover-open {
      @include butler-mx.feature("motion") {
        @starting-style {
          opacity: 0;
          transform: translateX(110%);
        }
      }
    }
  }

  &--top-left,
  &--bottom-left {
    &:popover-open {
      @include butler-mx.feature("motion") {
        @starting-style {
          opacity: 0;
          transform: translateX(-110%);
        }
      }
    }
  }
}
```

**Note:** Do NOT add `top`/`bottom` to the transition — CSS anchor positioning updates positions instantly when the anchor moves; transitioning these would cause layout thrash and fight with the anchor recalculation.

**Verification checklist:**

- [ ] `top-right` toast slides in from right, exits to right
- [ ] `top-left` toast slides in from left, exits to left
- [ ] `bottom-right` toast slides in from right, exits to right
- [ ] `bottom-left` toast slides in from left, exits to left
- [ ] Stacking reflow (anchor re-calculation) happens without transition artifact
- [ ] Reduced-motion users see no translate animation

---

## Phase 4: Correctness Fixes

**Files:** `src/stores/toastNotify.ts`, `src/components/toast/ToastNotify.vue`

### 4a. `data-closing` guard during exit animation

When `hideToast()` fires, the popover starts its exit animation. The toast is still in the DOM and in `$toastNotify` for 400ms. Add a `data-closing` attribute so the anchor chain skips it.

```ts
// toastNotify.ts — removeToastById
const removeToastById = (id: number): void => {
  const el = document.getElementById(`toast-${id}`);
  if (el) el.dataset.closing = "true";
  el?.hidePopover();
  setTimeout(() => {
    $toastNotify.set($toastNotify.get().filter((t) => t.id !== id));
  }, removeToastTimeout);
};
```

In `ToastNotifyContainer.vue` anchor chain computation, exclude closing toasts:

```ts
// filter out closing toasts (they animate out but shouldn't participate in chain)
const group = toastStore.value
  .filter((t) => (t.position ?? "top-right") === corner)
  .filter((t) => !document.getElementById(`toast-${t.id}`)?.dataset.closing);
```

### 4b. `box-sizing` and width

```scss
.c-toast-notify {
  box-sizing: border-box;
  width: max-content;
  max-width: min(400px, 88vw);
}
```

### 4c. Remove stray `z-index`

Popovers live in top layer — `z-index` is irrelevant. Grep and remove:

```bash
grep -n "z-index" src/styles/components/_toast-notify.scss
```

**Verification checklist:**
- [ ] `pnpm test:unit` passes (all existing tests green)
- [ ] `pnpm lint` passes
- [ ] `pnpm typechecking` — no new errors

---

## Phase 5: Final Verification

```bash
pnpm lint
pnpm test:unit
```

**Manual test matrix:**

| Scenario | Expected |
|----------|----------|
| Single toast `top-right` | Appears anchored to top-right corner, slides in from right |
| Single toast `bottom-left` | Appears anchored to bottom-left corner, slides in from left |
| 3 toasts `top-right` | Stack downward with gap via anchor chain |
| 3 toasts `bottom-right` | Stack upward via anchor chain |
| Remove middle toast | Next toast re-anchors to predecessor automatically, no JS restack |
| Auto-timeout toast | Slides out correct direction, anchor chain updates |
| Swipe-to-dismiss | Toast removed, chain updates |
| Persistent toast (`timeout: null`) | Stays until close button clicked; pin badge visible; close button always rendered |
| Persistent toast + `showClose: false` | Close button still renders (override) |
| Mixed corners simultaneously | No cross-corner interference |
| Mobile 360px | No horizontal overflow |
| iOS safe area | Bottom corner anchors respect home bar (`env(safe-area-inset-bottom)`) |
| Reduced motion | No translate animation; opacity fade only |

**Anti-pattern audit (grep — should find no results):**

```bash
# UA popover overrides not reset
grep -rn "popover.*margin" src/styles/ | grep -v "unset"

# Old JS positioning still present
grep -rn "setDynamicPosition\|setPosition\|stylePosition\|initOffset" src/components/toast/

# Wrong popover mode
grep -r 'popover="auto"' src/components/toast/

# z-index on toast
grep -n "z-index" src/styles/components/_toast-notify.scss
```
