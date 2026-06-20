# DropdownPopover Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor `DropdownPopover.vue` to remove the internal trigger button, expose the trigger via a scoped default slot (FloatingVue-style), and add `skidding`, `triggers`, `panelClass`, `panelTag`, `arrow`, and `arrowPadding` props.

**Architecture:** The component renders a thin `.c-dropdown` wrapper (receives `$attrs`) containing a `.c-dropdown__trigger` span (receives the CSS anchor, hover/focus listeners, and wraps the user-provided trigger element). The user's trigger element receives `triggerProps` from the scoped slot, which includes `popovertarget` for native click toggling. Hover and focus triggers are wired via JS event listeners on the trigger span.

**Tech Stack:** Vue 3 Composition API (`<script setup lang="ts">`), native Popover API, CSS Anchor Positioning, Vitest + `@vue/test-utils`.

## Global Constraints

- Block order in Vue SFCs: `<template>`, `<script>`, `<style>`
- Styles are NOT scoped — BEMIT class naming (`c-dropdown__*`) provides isolation
- Component SCSS lives in `src/styles/components/_dropdown-popover.scss`, loaded via `@use "@styles/components/dropdown-popover"` inside the component's `<style>` block
- Import aliases always — never relative paths (`@components/`, `@styles/`, etc.)
- Only Baseline Widely/Newly Available CSS — no polyfills
- `defineOptions({ inheritAttrs: false })` stays — `$attrs` bind to outer wrapper div manually
- Git commit format: `type(scope): description` — type one of: feat, fix, refactor, test, style, docs

---

## File Map

| File | Action | What changes |
|---|---|---|
| `src/tests/unit/components/DropdownPopover.test.ts` | Rewrite | Reflect new slot API; add trigger/arrow/panel tests |
| `src/components/DropdownPopover.vue` | Refactor | Remove internal button; add trigger span, new props, scoped slot |
| `src/styles/components/_dropdown-popover.scss` | Modify | Trigger span styles, `--c-dropdown-skidding`, arrow element |
| `src/components/word/WordOptionDropdown.vue` | Modify | Adopt scoped slot API |
| `src/components/filter/AlphabeticalFilterDropdown.vue` | Modify | Adopt scoped slot API |
| `src/components/header/MainMenu.vue` | Modify | Adopt scoped slot API |

---

## Task 1: Rewrite tests for the new API

**Files:**
- Rewrite: `src/tests/unit/components/DropdownPopover.test.ts`

**Interfaces:**
- Consumes: existing `DropdownPopover` component (tests will FAIL until Task 2 is done — that is expected)
- Produces: complete test suite covering old and new behaviour

**Context for the agent:**  
The existing test file (`src/tests/unit/components/DropdownPopover.test.ts`) was written for the OLD API where the component itself rendered a `<button class="c-dropdown__trigger">`. The new API:
- Replaces the internal `<button>` with a `<span class="c-dropdown__trigger">` wrapper
- Default slot is now **scoped** — it exposes `{ triggerProps, isOpen, panelId }`
- `$attrs` now bind to the outer `.c-dropdown` div, NOT the trigger span
- `anchor-name` inline style is now on `.c-dropdown__trigger` (the span), not the button
- `popovertarget` / `aria-*` live in `triggerProps` — passed to the user's button, NOT on the trigger span
- New: `triggers`, `skidding`, `panelClass`, `panelTag`, `arrow`, `arrowPadding` props

Run command: `pnpm vitest run src/tests/unit/components/DropdownPopover.test.ts`

- [ ] **Step 1: Replace the test file with the full rewritten suite**

```typescript
import DropdownPopover from "@components/DropdownPopover.vue";
import { mount } from "@vue/test-utils";
import { h, nextTick } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockShowPopover = vi.fn();
const mockHidePopover = vi.fn();

beforeEach(() => {
  HTMLElement.prototype.showPopover = mockShowPopover;
  HTMLElement.prototype.hidePopover = mockHidePopover;
});
afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

// Helper: dispatch a ToggleEvent on the panel element
const openToggle = (wrapper: ReturnType<typeof mount>) =>
  wrapper
    .find(".c-dropdown__panel")
    .element.dispatchEvent(new ToggleEvent("toggle", { newState: "open", bubbles: false }));

const closeToggle = (wrapper: ReturnType<typeof mount>) =>
  wrapper
    .find(".c-dropdown__panel")
    .element.dispatchEvent(new ToggleEvent("toggle", { newState: "closed", bubbles: false }));

// Helper: mount with a default scoped slot that renders a button receiving triggerProps
const mountWithTrigger = (options: Parameters<typeof mount>[1] = {}) =>
  mount(DropdownPopover, {
    ...options,
    slots: {
      default: (slotProps: { triggerProps: Record<string, unknown> }) =>
        h("button", { ...slotProps.triggerProps, "data-testid": "trigger-btn" }, "Open"),
      ...((options as any).slots ?? {}),
    },
  });

describe("DropdownPopover.vue", () => {
  // --- Structure ---

  it("renders a .c-dropdown wrapper as the root element", () => {
    const wrapper = mount(DropdownPopover);
    expect(wrapper.find(".c-dropdown").exists()).toBe(true);
  });

  it("renders a .c-dropdown__trigger span wrapping the default slot", () => {
    const wrapper = mount(DropdownPopover, {
      slots: { default: "<span>label</span>" },
    });
    expect(wrapper.find(".c-dropdown__trigger span").text()).toBe("label");
  });

  it("renders panel slot content inside panel element when lazy=false", () => {
    const wrapper = mount(DropdownPopover, {
      props: { lazy: false },
      slots: { panel: "<button>Action</button>" },
    });
    expect(wrapper.find(".c-dropdown__panel button").text()).toBe("Action");
  });

  it("panel has popover='auto' attribute", () => {
    const wrapper = mount(DropdownPopover);
    expect(wrapper.find(".c-dropdown__panel").attributes("popover")).toBe("auto");
  });

  // --- Slot scope: triggerProps ---

  it("triggerProps.popovertarget matches panel id when triggers includes 'click'", () => {
    const wrapper = mountWithTrigger({ props: { triggers: ["click"] } });
    const panelId = wrapper.find(".c-dropdown__panel").attributes("id");
    expect(wrapper.find("[data-testid=trigger-btn]").attributes("popovertarget")).toBe(panelId);
  });

  it("triggerProps does not include popovertarget when triggers is ['hover']", () => {
    const wrapper = mountWithTrigger({ props: { triggers: ["hover"] } });
    expect(wrapper.find("[data-testid=trigger-btn]").attributes("popovertarget")).toBeUndefined();
  });

  it("triggerProps.aria-controls matches panel id", () => {
    const wrapper = mountWithTrigger();
    const panelId = wrapper.find(".c-dropdown__panel").attributes("id");
    expect(wrapper.find("[data-testid=trigger-btn]").attributes("aria-controls")).toBe(panelId);
  });

  it("triggerProps.aria-expanded is 'false' initially", () => {
    const wrapper = mountWithTrigger();
    expect(wrapper.find("[data-testid=trigger-btn]").attributes("aria-expanded")).toBe("false");
  });

  it("triggerProps.aria-expanded becomes 'true' after toggle newState='open'", async () => {
    const wrapper = mountWithTrigger();
    openToggle(wrapper);
    await nextTick();
    expect(wrapper.find("[data-testid=trigger-btn]").attributes("aria-expanded")).toBe("true");
  });

  it("triggerProps.aria-expanded becomes 'false' after toggle newState='closed'", async () => {
    const wrapper = mountWithTrigger();
    openToggle(wrapper);
    await nextTick();
    closeToggle(wrapper);
    await nextTick();
    expect(wrapper.find("[data-testid=trigger-btn]").attributes("aria-expanded")).toBe("false");
  });

  it("slot prop isOpen is false initially", () => {
    let capturedIsOpen: boolean | undefined;
    mount(DropdownPopover, {
      slots: {
        default: (slotProps: { isOpen: boolean }) => {
          capturedIsOpen = slotProps.isOpen;
          return h("button", "Open");
        },
      },
    });
    expect(capturedIsOpen).toBe(false);
  });

  it("slot prop panelId matches the panel element id", () => {
    let capturedPanelId: string | undefined;
    const wrapper = mount(DropdownPopover, {
      slots: {
        default: (slotProps: { panelId: string }) => {
          capturedPanelId = slotProps.panelId;
          return h("button", "Open");
        },
      },
    });
    const panelId = wrapper.find(".c-dropdown__panel").attributes("id");
    expect(capturedPanelId).toBe(panelId);
  });

  // --- Anchor & positioning ---

  it("trigger span style contains anchor-name", () => {
    const wrapper = mount(DropdownPopover);
    expect(wrapper.find(".c-dropdown__trigger").attributes("style")).toContain("anchor-name:");
  });

  it("panel style contains position-anchor", () => {
    const wrapper = mount(DropdownPopover);
    expect(wrapper.find(".c-dropdown__panel").attributes("style")).toContain("position-anchor:");
  });

  it("anchor-name on trigger matches position-anchor on panel", () => {
    const wrapper = mount(DropdownPopover);
    const triggerStyle = wrapper.find(".c-dropdown__trigger").attributes("style") ?? "";
    const panelStyle = wrapper.find(".c-dropdown__panel").attributes("style") ?? "";
    const anchorName = triggerStyle.match(/anchor-name:\s*([^;]+)/)?.[1]?.trim();
    expect(anchorName).toBeTruthy();
    expect(panelStyle).toContain(`position-anchor: ${anchorName}`);
  });

  // --- Props: placement, offset, skidding ---

  it("applies correct CSS class for each placement value", () => {
    const placements = [
      "bottom-start", "bottom-end", "bottom",
      "top-start", "top-end", "top",
    ] as const;
    for (const placement of placements) {
      const wrapper = mount(DropdownPopover, { props: { placement } });
      expect(wrapper.find(`.c-dropdown__panel--${placement}`).exists()).toBe(true);
    }
  });

  it("sets --c-dropdown-offset in panel inline style from offset prop", () => {
    const wrapper = mount(DropdownPopover, { props: { offset: 16 } });
    expect(wrapper.find(".c-dropdown__panel").attributes("style")).toContain(
      "--c-dropdown-offset: 16px",
    );
  });

  it("sets --c-dropdown-skidding in panel inline style from skidding prop", () => {
    const wrapper = mount(DropdownPopover, { props: { skidding: 12 } });
    expect(wrapper.find(".c-dropdown__panel").attributes("style")).toContain(
      "--c-dropdown-skidding: 12px",
    );
  });

  it("--c-dropdown-skidding defaults to 0px", () => {
    const wrapper = mount(DropdownPopover);
    expect(wrapper.find(".c-dropdown__panel").attributes("style")).toContain(
      "--c-dropdown-skidding: 0px",
    );
  });

  // --- Props: panelClass, panelTag ---

  it("panelClass is applied to the panel element", () => {
    const wrapper = mount(DropdownPopover, { props: { panelClass: "my-custom-panel" } });
    expect(wrapper.find(".c-dropdown__panel.my-custom-panel").exists()).toBe(true);
  });

  it("panelTag changes the panel element tag (default is div)", () => {
    const wrapper = mount(DropdownPopover, { props: { panelTag: "menu" } });
    expect(wrapper.find("menu.c-dropdown__panel").exists()).toBe(true);
  });

  // --- Props: arrow, arrowPadding ---

  it("arrow element is NOT rendered by default", () => {
    const wrapper = mount(DropdownPopover);
    expect(wrapper.find(".c-dropdown__arrow").exists()).toBe(false);
  });

  it("arrow element IS rendered when arrow=true", () => {
    const wrapper = mount(DropdownPopover, { props: { arrow: true } });
    expect(wrapper.find(".c-dropdown__arrow").exists()).toBe(true);
  });

  it("arrow element has aria-hidden='true'", () => {
    const wrapper = mount(DropdownPopover, { props: { arrow: true } });
    expect(wrapper.find(".c-dropdown__arrow").attributes("aria-hidden")).toBe("true");
  });

  it("sets --c-dropdown-arrow-padding in panel style from arrowPadding prop", () => {
    const wrapper = mount(DropdownPopover, { props: { arrow: true, arrowPadding: 8 } });
    expect(wrapper.find(".c-dropdown__panel").attributes("style")).toContain(
      "--c-dropdown-arrow-padding: 8px",
    );
  });

  // --- $attrs ---

  it("inherited attrs land on outer .c-dropdown wrapper, not trigger span", () => {
    const wrapper = mount(DropdownPopover, { attrs: { "data-custom": "yes" } });
    expect(wrapper.find(".c-dropdown").attributes("data-custom")).toBe("yes");
    expect(wrapper.find(".c-dropdown__trigger").attributes("data-custom")).toBeUndefined();
  });

  // --- close() ---

  it("close() calls hidePopover and focuses first focusable element inside trigger", () => {
    const wrapper = mountWithTrigger({ attachTo: document.body });
    const btnEl = wrapper.find("[data-testid=trigger-btn]").element as HTMLElement;
    const focusSpy = vi.spyOn(btnEl, "focus");
    (wrapper.vm as InstanceType<typeof DropdownPopover>).close();
    expect(mockHidePopover).toHaveBeenCalledOnce();
    expect(focusSpy).toHaveBeenCalledOnce();
    wrapper.unmount();
  });

  // --- lazy prop ---

  describe("lazy prop", () => {
    it("panel slot is NOT rendered before first open when lazy=true (default)", () => {
      const wrapper = mount(DropdownPopover, {
        slots: { panel: '<button class="panel-item">Action</button>' },
      });
      expect(wrapper.find(".panel-item").exists()).toBe(false);
    });

    it("panel slot renders after first toggle to open when lazy=true", async () => {
      const wrapper = mount(DropdownPopover, {
        slots: { panel: '<button class="panel-item">Action</button>' },
      });
      openToggle(wrapper);
      await nextTick();
      expect(wrapper.find(".panel-item").exists()).toBe(true);
    });

    it("panel slot stays mounted after close (hasOpened stays true)", async () => {
      const wrapper = mount(DropdownPopover, {
        slots: { panel: '<button class="panel-item">Action</button>' },
      });
      openToggle(wrapper);
      await nextTick();
      closeToggle(wrapper);
      await nextTick();
      expect(wrapper.find(".panel-item").exists()).toBe(true);
    });

    it("panel slot renders immediately on mount when lazy=false", () => {
      const wrapper = mount(DropdownPopover, {
        props: { lazy: false },
        slots: { panel: '<button class="panel-item">Action</button>' },
      });
      expect(wrapper.find(".panel-item").exists()).toBe(true);
    });
  });

  // --- triggers: hover ---

  describe("hover trigger", () => {
    beforeEach(() => vi.useFakeTimers());

    it("mouseenter on trigger calls showPopover", async () => {
      const wrapper = mount(DropdownPopover, { props: { triggers: ["hover"] } });
      await wrapper.find(".c-dropdown__trigger").trigger("mouseenter");
      expect(mockShowPopover).toHaveBeenCalledOnce();
    });

    it("mouseleave on trigger hides popover after 100ms delay", async () => {
      const wrapper = mount(DropdownPopover, { props: { triggers: ["hover"] } });
      await wrapper.find(".c-dropdown__trigger").trigger("mouseleave");
      expect(mockHidePopover).not.toHaveBeenCalled();
      vi.advanceTimersByTime(100);
      expect(mockHidePopover).toHaveBeenCalledOnce();
    });

    it("mouseenter on panel cancels the close timer", async () => {
      const wrapper = mount(DropdownPopover, { props: { triggers: ["hover"] } });
      await wrapper.find(".c-dropdown__trigger").trigger("mouseleave");
      await wrapper.find(".c-dropdown__panel").trigger("mouseenter");
      vi.advanceTimersByTime(100);
      expect(mockHidePopover).not.toHaveBeenCalled();
    });

    it("mouseleave on panel re-schedules the close", async () => {
      const wrapper = mount(DropdownPopover, { props: { triggers: ["hover"] } });
      await wrapper.find(".c-dropdown__trigger").trigger("mouseleave");
      await wrapper.find(".c-dropdown__panel").trigger("mouseenter");
      await wrapper.find(".c-dropdown__panel").trigger("mouseleave");
      vi.advanceTimersByTime(100);
      expect(mockHidePopover).toHaveBeenCalledOnce();
    });

    it("mouseenter does not call showPopover when triggers does not include 'hover'", async () => {
      const wrapper = mount(DropdownPopover, { props: { triggers: ["click"] } });
      await wrapper.find(".c-dropdown__trigger").trigger("mouseenter");
      expect(mockShowPopover).not.toHaveBeenCalled();
    });
  });

  // --- triggers: focus ---

  describe("focus trigger", () => {
    beforeEach(() => vi.useFakeTimers());

    it("focusin on trigger calls showPopover", async () => {
      const wrapper = mount(DropdownPopover, { props: { triggers: ["focus"] } });
      await wrapper.find(".c-dropdown__trigger").trigger("focusin");
      expect(mockShowPopover).toHaveBeenCalledOnce();
    });

    it("focusout on trigger hides popover after 100ms delay", async () => {
      const wrapper = mount(DropdownPopover, { props: { triggers: ["focus"] } });
      await wrapper.find(".c-dropdown__trigger").trigger("focusout");
      expect(mockHidePopover).not.toHaveBeenCalled();
      vi.advanceTimersByTime(100);
      expect(mockHidePopover).toHaveBeenCalledOnce();
    });

    it("focusin does not call showPopover when triggers does not include 'focus'", async () => {
      const wrapper = mount(DropdownPopover, { props: { triggers: ["click"] } });
      await wrapper.find(".c-dropdown__trigger").trigger("focusin");
      expect(mockShowPopover).not.toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Run tests and confirm expected failures**

```bash
pnpm vitest run src/tests/unit/components/DropdownPopover.test.ts
```

Expected: multiple failures — tests reference new slot API and new props that the component doesn't have yet. Tests covering unchanged behavior (lazy, placement class, popover attribute) may still pass.

- [ ] **Step 3: Commit the test file**

```bash
git add src/tests/unit/components/DropdownPopover.test.ts
git commit -m "test(dropdown): rewrite DropdownPopover tests for new scoped slot API"
```

---

## Task 2: Refactor DropdownPopover.vue

**Files:**
- Modify: `src/components/DropdownPopover.vue`

**Interfaces:**
- Consumes: `useId()` from Vue, `ref`, `computed` from Vue
- Produces:
  - `close(): void` — exposed, hides panel and focuses first focusable child in trigger span
  - Default slot scope: `{ triggerProps: TriggerProps, isOpen: boolean, panelId: string }`
  - Props: `DropdownPopoverProps` (see below)

**Context for the agent:**  
The current `src/components/DropdownPopover.vue` renders an internal `<button class="c-dropdown__trigger">` with `$attrs`, `popovertarget`, and `anchor-name`. Replace it with a `<span class="c-dropdown__trigger">` that:
- Holds the `anchor-name` inline style
- Fires `mouseenter`/`mouseleave`/`focusin`/`focusout` event handlers (only effective when the relevant trigger type is in `triggers`)
- Wraps the default scoped slot (which exposes `triggerProps`, `isOpen`, `panelId`)

`$attrs` move to the outer `.c-dropdown` div. The internal `trigger` ref (HTMLButtonElement) becomes `triggerEl` ref (HTMLElement, pointing to the span).

The hover/focus close uses a 100ms debounced timer (`closeTimer`). `cancelClose` is also called on panel `mouseenter`/`focusin` to prevent premature close when the pointer moves from trigger into the panel.

`close()` uses a querySelector to focus the first focusable child rather than the span itself (which is not naturally focusable):
```ts
const FOCUSABLE = 'button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
```

- [ ] **Step 1: Replace DropdownPopover.vue with the refactored implementation**

```vue
<template>
  <div v-bind="$attrs" class="c-dropdown">
    <span
      ref="triggerEl"
      class="c-dropdown__trigger"
      :style="`anchor-name: --${panelId}`"
      @mouseenter="onMouseEnter"
      @mouseleave="onMouseLeave"
      @focusin="onFocusIn"
      @focusout="onFocusOut"
    >
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
      @mouseenter="cancelClose"
      @mouseleave="onMouseLeave"
    >
      <span v-if="arrow" class="c-dropdown__arrow" aria-hidden="true" />
      <template v-if="!lazy || hasOpened">
        <slot name="panel" />
      </template>
    </component>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useId } from "vue";

export type PlacementValue =
  | "bottom-start"
  | "bottom-end"
  | "bottom"
  | "top-start"
  | "top-end"
  | "top";

export type TriggerEvent = "click" | "hover" | "focus";

export type DropdownPopoverProps = {
  lazy?: boolean;
  offset?: number;
  placement?: PlacementValue;
  skidding?: number;
  triggers?: TriggerEvent[];
  panelClass?: string | string[] | Record<string, boolean>;
  panelTag?: string;
  arrow?: boolean;
  arrowPadding?: number;
};

const {
  lazy = true,
  offset = 8,
  placement = "bottom-start",
  skidding = 0,
  triggers = ["click"],
  panelClass,
  panelTag = "div",
  arrow = false,
  arrowPadding = 4,
} = defineProps<DropdownPopoverProps>();

defineOptions({ inheritAttrs: false });

const id = useId();
const panelId = `dropdown-${id}`;

const triggerEl = ref<HTMLElement | null>(null);
const panel = ref<HTMLElement | null>(null);
const isOpen = ref(false);
const hasOpened = ref(false);

const triggerProps = computed(() => ({
  "aria-controls": panelId,
  "aria-expanded": isOpen.value,
  ...(triggers.includes("click") && { popovertarget: panelId }),
}));

const panelStyle = computed(() => ({
  "position-anchor": `--${panelId}`,
  "--c-dropdown-offset": `${offset}px`,
  "--c-dropdown-skidding": `${skidding}px`,
  "--c-dropdown-arrow-padding": `${arrowPadding}px`,
}));

const onToggle = (event: ToggleEvent): void => {
  isOpen.value = event.newState === "open";
  if (event.newState === "open") hasOpened.value = true;
};

// Hover / focus close timer
let closeTimer: ReturnType<typeof setTimeout> | null = null;

const cancelClose = (): void => {
  if (closeTimer !== null) {
    clearTimeout(closeTimer);
    closeTimer = null;
  }
};

const scheduleClose = (): void => {
  closeTimer = setTimeout(() => {
    panel.value?.hidePopover();
  }, 100);
};

const onMouseEnter = (): void => {
  if (!triggers.includes("hover")) return;
  cancelClose();
  panel.value?.showPopover();
};

const onMouseLeave = (): void => {
  if (!triggers.includes("hover")) return;
  scheduleClose();
};

const onFocusIn = (): void => {
  if (!triggers.includes("focus")) return;
  cancelClose();
  panel.value?.showPopover();
};

const onFocusOut = (): void => {
  if (!triggers.includes("focus")) return;
  scheduleClose();
};

const FOCUSABLE =
  'button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

const close = (): void => {
  panel.value?.hidePopover();
  const focusable = triggerEl.value?.querySelector<HTMLElement>(FOCUSABLE);
  (focusable ?? triggerEl.value)?.focus();
};

defineExpose({ close });
</script>

<style lang="scss">
@use "@styles/components/dropdown-popover";
</style>
```

- [ ] **Step 2: Run tests**

```bash
pnpm vitest run src/tests/unit/components/DropdownPopover.test.ts
```

Expected: all tests PASS.

- [ ] **Step 3: Run full test suite to check for regressions**

```bash
pnpm test:unit
```

Expected: all tests pass (usage site components may have snapshot or rendering failures — those are fixed in Task 4).

- [ ] **Step 4: Commit**

```bash
git add src/components/DropdownPopover.vue
git commit -m "refactor(dropdown): remove internal trigger button, expose scoped slot API"
```

---

## Task 3: Update SCSS

**Files:**
- Modify: `src/styles/components/_dropdown-popover.scss`

**Interfaces:**
- Consumes: CSS custom properties `--c-dropdown-skidding`, `--c-dropdown-arrow-padding` set by the component's `panelStyle`
- Produces: visual arrow element, skidding applied, trigger span styled

**Context for the agent:**  
The `.c-dropdown__trigger` is now a `<span>` (not a button). It needs `display: inline-flex` and `cursor: pointer` back. The panel now has `translate: var(--c-dropdown-skidding, 0) 0` for lateral shifting. The `.c-dropdown__arrow` is a new element inside the panel — a rotated square (diamond) positioned at the edge of the panel that faces the trigger, using `clamp()` to respect `--c-dropdown-arrow-padding`.

The `@use` imports at the top of the file are: `@use "@styles/variables" as vars` and `@use "@styles/mixins" as mx` and `@use "@sass-butler/mixins" as butler-mx`.

- [ ] **Step 1: Update _dropdown-popover.scss**

Replace the entire file content with:

```scss
@use "@styles/variables" as vars;
@use "@styles/mixins" as mx;
@use "@sass-butler/mixins" as butler-mx;

.c-dropdown {
  display: inline-flex;

  &__trigger {
    display: inline-flex;
    cursor: pointer;
    // anchor-name set via inline style (dynamic per instance)
  }

  // Theme modifier classes
  &--theme-word-options {
    .c-dropdown__panel {
      --padding: #{vars.$spacer * 0.5} #{vars.$spacer * 0.6};

      display: flex;
      flex-direction: column;
      gap: var(--gap, #{vars.$spacer * 0.4});

      a,
      .c-button {
        --color-border: transparent;

        transition: border 200ms ease-in-out;
        border-bottom: 1px dashed var(--color-border, transparent);

        @include butler-mx.hover {
          --color-border: var(--blue);

          box-shadow: none;

          @include butler-mx.dark-mode-class {
            --color-border: var(--yellow-500);
          }
        }
      }
    }
  }
}

.c-dropdown__panel {
  // UA Popover reset — browsers add margin/border/padding to [popover] elements
  margin: 0;
  border: none;
  background: transparent;
  overflow: visible;
  max-width: none;
  max-height: none;

  // Anchor Positioning — position-anchor is set via inline style (dynamic anchor name per instance)
  position: fixed;
  margin-block-start: var(--c-dropdown-offset, 8px);
  position-try-fallbacks: flip-inline, flip-block, flip-block flip-inline;
  position-try-order: most-block-size;

  --color-background: var(--floating-color-background);

  box-shadow:
    0 0.5px 0.6px color-mix(in srgb, var(--color-box-shadow, var(--orange-900)) 8%, transparent),
    0 4px 5px color-mix(in srgb, var(--color-box-shadow, var(--orange-900)) 16%, transparent);
  background-color: var(--color-background);
  padding: var(--padding, #{vars.$spacer * 0.5 vars.$spacer * 0.5});
  color: var(--color, var(--color-body));

  @include butler-mx.dark-mode-class {
    --color-box-shadow: black;
  }

  // Skidding — lateral shift; only meaningful with anchor positioning
  @supports (position-area: block-end) {
    translate: var(--c-dropdown-skidding, 0) 0;
  }

  // Fallback for browsers without CSS Anchor Positioning (Chrome <125, very rare)
  @supports not (position-area: block-end) {
    position: fixed;
    inset-block-start: 50%;
    inset-inline-start: 50%;
    translate: -50% -50%;
  }

  // Placement modifier classes
  &--bottom-start {
    position-area: block-end span-inline-end;
  }

  &--bottom-end {
    position-area: block-end span-inline-start;
  }

  &--bottom {
    position-area: block-end;
  }

  &--top-start {
    position-area: block-start span-inline-end;
  }

  &--top-end {
    position-area: block-start span-inline-start;
  }

  &--top {
    position-area: block-start;
  }
}

// Arrow element — rendered when arrow=true prop is set
.c-dropdown__arrow {
  --arrow-size: 8px;
  --arrow-half: calc(var(--arrow-size) / 2);

  position: absolute;
  width: var(--arrow-size);
  height: var(--arrow-size);
  background: var(--color-background);
  box-shadow: inherit;
  transform: rotate(45deg);

  // Position arrow at the panel edge facing the trigger
  .c-dropdown__panel--bottom-start &,
  .c-dropdown__panel--bottom-end &,
  .c-dropdown__panel--bottom & {
    top: calc(-1 * var(--arrow-half));
    left: clamp(
      var(--c-dropdown-arrow-padding, 4px),
      50%,
      calc(100% - var(--c-dropdown-arrow-padding, 4px) - var(--arrow-size))
    );
  }

  .c-dropdown__panel--top-start &,
  .c-dropdown__panel--top-end &,
  .c-dropdown__panel--top & {
    bottom: calc(-1 * var(--arrow-half));
    left: clamp(
      var(--c-dropdown-arrow-padding, 4px),
      50%,
      calc(100% - var(--c-dropdown-arrow-padding, 4px) - var(--arrow-size))
    );
  }
}

// Fade via @starting-style + allow-discrete (Baseline Newly Available, 2024)
@include butler-mx.feature("motion") {
  .c-dropdown__panel {
    opacity: 1;
    transition:
      opacity 0.15s ease,
      display 0.15s allow-discrete,
      overlay 0.15s allow-discrete;

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

- [ ] **Step 2: Run linter to check SCSS**

```bash
pnpm lint
```

Expected: no SCSS errors.

- [ ] **Step 3: Run tests to confirm nothing broke**

```bash
pnpm vitest run src/tests/unit/components/DropdownPopover.test.ts
```

Expected: all tests pass (SCSS changes don't affect unit tests, but confirms no import errors).

- [ ] **Step 4: Commit**

```bash
git add src/styles/components/_dropdown-popover.scss
git commit -m "style(dropdown): update trigger span styles, add skidding and arrow SCSS"
```

---

## Task 4: Migrate usage sites to the new API

**Files:**
- Modify: `src/components/word/WordOptionDropdown.vue`
- Modify: `src/components/filter/AlphabeticalFilterDropdown.vue`
- Modify: `src/components/header/MainMenu.vue`

**Interfaces:**
- Consumes: `DropdownPopover` with scoped default slot exposing `{ triggerProps, isOpen, panelId }`
- Produces: all 3 consumers updated, test suite green

**Context for the agent:**  
Each file currently puts slot content directly as the trigger (the old component wrapped it in a `<button>`). Now the component exposes a scoped slot — each consumer needs `v-slot="{ triggerProps }"` and must provide an explicit `<button v-bind="triggerProps">` (or use `v-bind="triggerProps"` on a component whose root is a button).

`MainMenuButton.vue` has `inheritAttrs: true` (default), so `v-bind="triggerProps"` on `<MainMenuButton>` automatically flows to its root `<button>`.

After migrating, run the full test suite. There are no dedicated tests for these wrapper components, but the overall suite catches import/compilation errors.

- [ ] **Step 1: Update WordOptionDropdown.vue**

The current default slot is a `<span>` acting as button label. Wrap it in an explicit `<button>`.

Change the `<DropdownPopover ...>` section from:
```html
<DropdownPopover placement="bottom-end" class="c-options-dropdown c-dropdown--theme-word-options">

    <span
      class="c-options-dropdown__options-icon c-button--center-icon c-icon c-icon--lucide-more-vertical"
    />


  <template #panel>
```

To:
```html
<DropdownPopover
  placement="bottom-end"
  class="c-options-dropdown c-dropdown--theme-word-options"
  v-slot="{ triggerProps }"
>
  <button
    v-bind="triggerProps"
    type="button"
    class="c-button--center-icon"
  >
    <span class="c-options-dropdown__options-icon c-icon c-icon--lucide-more-vertical" />
  </button>

  <template #panel>
```

- [ ] **Step 2: Update AlphabeticalFilterDropdown.vue**

The current default slot has `<span>` + text. The `dropdownRef.value?.close()` usage in the script stays — `close()` is still exposed.

Change the `<DropdownPopover ...>` section from:
```html
<DropdownPopover
  ref="dropdownRef"
  placement="bottom"
  :offset="9"
  :class="{ 'has-active-filter': wordSearch.activeLetterFilter }"
  class="c-filter-dropdown__trigger-wrapper"
>
  <span class="c-button--center-icon">
    <Filter />
  </span>
  alphabetisch

  <template #panel>
```

To:
```html
<DropdownPopover
  ref="dropdownRef"
  placement="bottom"
  :offset="9"
  :class="{ 'has-active-filter': wordSearch.activeLetterFilter }"
  class="c-filter-dropdown__trigger-wrapper"
  v-slot="{ triggerProps }"
>
  <button
    v-bind="triggerProps"
    type="button"
    class="c-button c-button--center-icon"
  >
    <span class="c-button--center-icon">
      <Filter />
    </span>
    alphabetisch
  </button>

  <template #panel>
```

- [ ] **Step 3: Update MainMenu.vue**

`<MainMenuButton />` is the trigger — its root is a `<button>`, `inheritAttrs: true`, so `v-bind="triggerProps"` flows through automatically.

Change:
```html
<DropdownPopover
  placement="bottom-end"
  :offset="13"
  class="c-menu-nav__item c-menu-more"
>
  <MainMenuButton />
```

To:
```html
<DropdownPopover
  placement="bottom-end"
  :offset="13"
  class="c-menu-nav__item c-menu-more"
  v-slot="{ triggerProps }"
>
  <MainMenuButton v-bind="triggerProps" />
```

- [ ] **Step 4: Run full test suite**

```bash
pnpm test:unit
```

Expected: all tests pass with no regressions.

- [ ] **Step 5: Run linter**

```bash
pnpm lint
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/word/WordOptionDropdown.vue \
        src/components/filter/AlphabeticalFilterDropdown.vue \
        src/components/header/MainMenu.vue
git commit -m "refactor(dropdown): migrate all usage sites to scoped slot trigger API"
```
