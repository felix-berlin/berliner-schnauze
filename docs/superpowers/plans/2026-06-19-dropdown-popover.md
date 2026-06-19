# DropdownPopover — Native Dropdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing `DropdownPopover.vue` stub with a production-ready, generic dropdown using the Popover API and CSS Anchor Positioning — zero JS for positioning.

**Architecture:** The component renders a native `<button>` trigger with CSS `anchor-name` (inline style) and a `popover="auto"` panel with `position-anchor` (inline style). The `placement` prop maps to a BEM modifier class that sets `position-area`; `position-try-fallbacks: flip-inline, flip-block, flip-block flip-inline` covers all 4 quadrant fallbacks without manual `@position-try` rules. Panel slot content is deferred until first open via a write-once `hasOpened` sentinel when `lazy=true` (default).

**Tech Stack:** Vue 3.5 Composition API, `<script setup lang="ts">`, SCSS (`@sass-butler/mixins`), Vitest + `@vue/test-utils`, jsdom

## Global Constraints

- Import aliases always: `@components/*`, `@styles/*` — never relative paths
- CSS: BEM with `c-` prefix; SCSS with `@use`, not `@import`; no `scoped`
- Block order in `.vue`: `<template>` → `<script>` → `<style>`
- Each component loads its own SCSS via `@use "@styles/components/..."` in its own `<style>` block
- Run single test file: `pnpm vitest run src/tests/unit/components/DropdownPopover.test.ts`
- Lint: `pnpm lint`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/components/DropdownPopover.vue` | Replace entirely | Template, script, `@use` for SCSS |
| `src/styles/components/_dropdown-popover.scss` | Create | UA reset, anchor positioning, placement modifiers, fade animation |
| `src/tests/unit/components/DropdownPopover.test.ts` | Create | All component tests |

---

### Task 1: Tests + SCSS + Component — Full TDD Cycle

**Files:**
- Create: `src/tests/unit/components/DropdownPopover.test.ts`
- Create: `src/styles/components/_dropdown-popover.scss`
- Modify: `src/components/DropdownPopover.vue` (full replacement)

**Interfaces:**
- Produces:
  - `export type PlacementValue = "bottom-start" | "bottom-end" | "bottom" | "top-start" | "top-end" | "top"`
  - `export type DropdownPopoverProps = { placement?: PlacementValue; offset?: number; lazy?: boolean }`
  - `<DropdownPopover>` — default slot = trigger button content; `#panel` slot = panel content
  - `defineExpose({ close(): void })` — programmatically hide the panel

---

- [ ] **Step 1: Write failing tests**

Create `src/tests/unit/components/DropdownPopover.test.ts`:

```ts
import DropdownPopover from "@components/DropdownPopover.vue";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockShowPopover = vi.fn();
const mockHidePopover = vi.fn();

beforeEach(() => {
  HTMLElement.prototype.showPopover = mockShowPopover;
  HTMLElement.prototype.hidePopover = mockHidePopover;
});
afterEach(() => vi.clearAllMocks());

const openToggle = (wrapper: ReturnType<typeof mount>) =>
  wrapper
    .find(".c-dropdown__panel")
    .element.dispatchEvent(new ToggleEvent("toggle", { newState: "open", bubbles: false }));

const closeToggle = (wrapper: ReturnType<typeof mount>) =>
  wrapper
    .find(".c-dropdown__panel")
    .element.dispatchEvent(new ToggleEvent("toggle", { newState: "closed", bubbles: false }));

describe("DropdownPopover.vue", () => {
  it("renders default slot content inside trigger button", () => {
    const wrapper = mount(DropdownPopover, { slots: { default: "<span>Open</span>" } });
    expect(wrapper.find(".c-dropdown__trigger span").text()).toBe("Open");
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

  it("trigger popovertarget matches panel id", () => {
    const wrapper = mount(DropdownPopover);
    const panelId = wrapper.find(".c-dropdown__panel").attributes("id");
    expect(wrapper.find(".c-dropdown__trigger").attributes("popovertarget")).toBe(panelId);
  });

  it("trigger aria-controls matches panel id", () => {
    const wrapper = mount(DropdownPopover);
    const panelId = wrapper.find(".c-dropdown__panel").attributes("id");
    expect(wrapper.find(".c-dropdown__trigger").attributes("aria-controls")).toBe(panelId);
  });

  it("aria-expanded is 'false' initially", () => {
    const wrapper = mount(DropdownPopover);
    expect(wrapper.find(".c-dropdown__trigger").attributes("aria-expanded")).toBe("false");
  });

  it("aria-expanded becomes 'true' after toggle newState='open'", async () => {
    const wrapper = mount(DropdownPopover);
    openToggle(wrapper);
    await nextTick();
    expect(wrapper.find(".c-dropdown__trigger").attributes("aria-expanded")).toBe("true");
  });

  it("aria-expanded becomes 'false' after toggle newState='closed'", async () => {
    const wrapper = mount(DropdownPopover);
    openToggle(wrapper);
    await nextTick();
    closeToggle(wrapper);
    await nextTick();
    expect(wrapper.find(".c-dropdown__trigger").attributes("aria-expanded")).toBe("false");
  });

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

  it("trigger style contains anchor-name", () => {
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

  it("close() calls hidePopover on panel element", () => {
    const wrapper = mount(DropdownPopover);
    (wrapper.vm as any).close();
    expect(mockHidePopover).toHaveBeenCalledOnce();
  });

  it("inherited attrs land on trigger button, not wrapper div", () => {
    const wrapper = mount(DropdownPopover, { attrs: { "aria-haspopup": "menu" } });
    expect(wrapper.find(".c-dropdown__trigger").attributes("aria-haspopup")).toBe("menu");
    expect(wrapper.find(".c-dropdown").attributes("aria-haspopup")).toBeUndefined();
  });

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
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
pnpm vitest run src/tests/unit/components/DropdownPopover.test.ts
```

Expected: FAIL — the existing stub has no `.c-dropdown__trigger`, no `popover` attribute, no `aria-expanded`.

- [ ] **Step 3: Create `_dropdown-popover.scss`**

Create `src/styles/components/_dropdown-popover.scss`:

```scss
@use "@sass-butler/mixins" as butler-mx;

.c-dropdown {
  display: inline-flex;
}

.c-dropdown__panel {
  // UA Popover reset — browsers add margin/border/padding to [popover] elements
  margin: 0;
  border: none;
  padding: 0;
  background: transparent;
  overflow: visible;
  max-width: none;
  max-height: none;
  color: inherit;

  // Anchor Positioning — position-anchor is set via inline style (dynamic anchor name per instance)
  position: fixed;
  margin-block-start: var(--c-dropdown-offset, 8px);
  position-try-fallbacks: flip-inline, flip-block, flip-block flip-inline;
  position-try-order: most-block-size;

  // Placement modifier classes
  &--bottom-start { position-area: block-end span-inline-end; }
  &--bottom-end   { position-area: block-end span-inline-start; }
  &--bottom       { position-area: block-end; }
  &--top-start    { position-area: block-start span-inline-end; }
  &--top-end      { position-area: block-start span-inline-start; }
  &--top          { position-area: block-start; }

  // Fallback for browsers without CSS Anchor Positioning (Chrome <125, very rare)
  @supports not (position-area: block-end) {
    position: fixed;
    inset-block-start: 50%;
    inset-inline-start: 50%;
    translate: -50% -50%;
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

- [ ] **Step 4: Replace `DropdownPopover.vue` entirely**

Replace all content of `src/components/DropdownPopover.vue`:

```vue
<template>
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
      <template v-if="!lazy || hasOpened">
        <slot name="panel" />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, useId } from "vue";

export type PlacementValue =
  | "bottom-start"
  | "bottom-end"
  | "bottom"
  | "top-start"
  | "top-end"
  | "top";

export type DropdownPopoverProps = {
  lazy?: boolean;
  offset?: number;
  placement?: PlacementValue;
};

const { lazy = true, offset = 8, placement = "bottom-start" } = defineProps<DropdownPopoverProps>();

defineOptions({ inheritAttrs: false });

const id = useId();
const panelId = `dropdown-${id}`;

const panel = ref<HTMLElement | null>(null);
const isOpen = ref(false);
const hasOpened = ref(false);

const onToggle = (event: ToggleEvent): void => {
  isOpen.value = event.newState === "open";
  if (event.newState === "open") hasOpened.value = true;
};

const close = (): void => {
  panel.value?.hidePopover();
};

defineExpose({ close });
</script>

<style lang="scss">
@use "@styles/components/dropdown-popover";
</style>
```

- [ ] **Step 5: Run — expect PASS**

```bash
pnpm vitest run src/tests/unit/components/DropdownPopover.test.ts
```

Expected: all 16 tests pass.

- [ ] **Step 6: Run full test suite**

```bash
pnpm test:unit
```

Expected: all tests pass, no regressions in other components.

- [ ] **Step 7: Lint**

```bash
pnpm lint
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/components/DropdownPopover.vue \
        src/styles/components/_dropdown-popover.scss \
        src/tests/unit/components/DropdownPopover.test.ts
git commit -m "feat(dropdown): native DropdownPopover — Popover API + CSS Anchor Positioning"
```
