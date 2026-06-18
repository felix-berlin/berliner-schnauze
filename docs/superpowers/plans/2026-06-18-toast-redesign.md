# Toast Redesign: Container-als-Popover, 6 Positionen, FLIP-Stacking

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ersetze manuelle JS-Pixel-Kalkulation durch einen `popover`-Container pro Position, der Toasts via Vue `<TransitionGroup>` mit FLIP-Stacking und richtungs-aware Animationen rendert.

**Architecture:** `ToastNotifyContainer` rendert immer 6 `ToastPositionGroup`-Instanzen (eine pro Ecke). Jede ist ein `popover="manual"` Flex-Container mit dem gefilterten Store-Slice. `showPopover()`/`hidePopover()` wird durch einen `watch` + `@after-leave`-Guard gesteuert. `ToastNotify` wird zu einem reinen Content-Element ohne Positioning-Logik. `<TransitionGroup>` übernimmt Enter/Leave/Move.

**Tech Stack:** Vue 3 Composition API, Nanostores, Vue TransitionGroup, SCSS (`@sass-butler/mixins`), Vitest + @vue/test-utils

## Global Constraints

- Import-Aliase immer verwenden (nie relative Pfade): `@stores/*`, `@components/*`, `@styles/*`, `@composables/*`
- CSS-Klassen: BEM mit `c-`-Prefix; SCSS mit `@use`, kein `scoped`
- Block-Order in `.vue`: `<template>` → `<script>` → `<style>`; jede Komponente lädt ihr SCSS selbst via `@use` im eigenen `<style>`-Block
- Tests laufen mit: `pnpm vitest run src/tests/unit/path/to/file.test.ts`
- Lint nach jedem Task: `pnpm lint`
- `id` auf `ToastNotify` ist jetzt `string` (UUID) — nie mehr `number`

---

## File Map

| Datei | Aktion | Verantwortung |
|---|---|---|
| `src/stores/toastNotify.ts` | Modify | `ToastPosition` +2 Werte; `id: string` (UUID); `MAX_PER_POSITION=3`; `removeToastById` vereinfacht |
| `src/components/toast/ToastPositionGroup.vue` | **Create** | `popover="manual"` Container; `showPopover`/`hidePopover` Lifecycle; `<TransitionGroup>` |
| `src/components/toast/ToastNotify.vue` | Modify | Entfernt: `popover`, Inline-Styles, `initOffset`, `outerSpacing`, `gapBetween`, `setDynamicPosition`, `isOpen` |
| `src/components/toast/ToastNotifyContainer.vue` | Modify | Rendert 6 fixe `ToastPositionGroup`; kein `v-for` über flachen Store mehr |
| `src/styles/components/_toast-container.scss` | **Create** | UA-Reset, Corner-Positioning, TransitionGroup-Klassen |
| `src/styles/components/_toast-notify.scss` | Modify | Entfernt: `popover`-Animations-Block (`overlay allow-discrete`, `@starting-style`, `translateX`) |
| `src/tests/unit/stores/toastNotify.test.ts` | **Create** | UUID-id, MAX\_PER\_POSITION, neue Positionen, `removeToastById` |
| `src/tests/unit/components/toast/ToastPositionGroup.test.ts` | **Create** | `showPopover`/`hidePopover` Lifecycle, `@after-leave` Guard |
| `src/tests/unit/components/toast/ToastNotify.test.ts` | Modify | Vollständig ersetzen: kein Popover, kein `isOpen`, kein `showToast`; `id` ist string |
| `src/tests/unit/components/toast/ToastNotifyContainer.test.ts` | Modify | Vollständig ersetzen: 6 `ToastPositionGroup` statt flache `ToastNotify`-Liste |

---

### Task 1: Store — UUID-id, 6 Positionen, MAX_PER_POSITION=3

**Files:**
- Modify: `src/stores/toastNotify.ts`
- Create: `src/tests/unit/stores/toastNotify.test.ts`

**Interfaces:**
- Produces:
  - `ToastPosition = "bottom-center" | "bottom-left" | "bottom-right" | "top-center" | "top-left" | "top-right"`
  - `ToastNotify.id: string`
  - `createToastNotify(payload)` — verdrängt ältesten Toast wenn Position voll (MAX=3)
  - `removeToastById(id: string): void` — synchron, kein setTimeout, kein hidePopover

- [ ] **Schreibe failing Tests**

```ts
// src/tests/unit/stores/toastNotify.test.ts
import { $toastNotify, createToastNotify, removeToastById } from "@stores/toastNotify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const enablePopoverSupport = () => {
  Object.defineProperty(HTMLElement.prototype, "popover", {
    configurable: true,
    get() { return this.getAttribute("popover"); },
    set(v) { this.setAttribute("popover", v); },
  });
};

describe("createToastNotify", () => {
  beforeEach(() => {
    enablePopoverSupport();
    $toastNotify.set([]);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("assigns a UUID string id", () => {
    createToastNotify({ message: "Hello" });
    const [toast] = $toastNotify.get();
    expect(typeof toast.id).toBe("string");
    expect(toast.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("prepends new toast (newest at index 0)", () => {
    createToastNotify({ message: "First" });
    createToastNotify({ message: "Second" });
    expect($toastNotify.get()[0].message).toBe("Second");
  });

  it("accepts top-center and bottom-center as valid positions", () => {
    createToastNotify({ message: "A", position: "top-center" });
    createToastNotify({ message: "B", position: "bottom-center" });
    const positions = $toastNotify.get().map((t) => t.position);
    expect(positions).toContain("top-center");
    expect(positions).toContain("bottom-center");
  });

  it("removes oldest toast of the position when MAX_PER_POSITION (3) is exceeded", () => {
    createToastNotify({ message: "A", position: "top-right" });
    createToastNotify({ message: "B", position: "top-right" });
    createToastNotify({ message: "C", position: "top-right" });
    createToastNotify({ message: "D", position: "top-right" });

    const forPos = $toastNotify.get().filter((t) => (t.position ?? "top-right") === "top-right");
    expect(forPos).toHaveLength(3);
    expect(forPos.map((t) => t.message)).not.toContain("A");
  });

  it("does not remove toasts from other positions when one position is full", () => {
    createToastNotify({ message: "A", position: "top-right" });
    createToastNotify({ message: "B", position: "top-right" });
    createToastNotify({ message: "C", position: "top-right" });
    createToastNotify({ message: "Left", position: "top-left" });
    createToastNotify({ message: "D", position: "top-right" });

    expect($toastNotify.get().some((t) => t.message === "Left")).toBe(true);
  });
});

describe("removeToastById", () => {
  beforeEach(() => {
    enablePopoverSupport();
    $toastNotify.set([]);
  });

  it("removes the toast with the given id synchronously", () => {
    createToastNotify({ message: "Remove me", position: "top-right" });
    const id = $toastNotify.get()[0].id!;
    removeToastById(id);
    expect($toastNotify.get().find((t) => t.id === id)).toBeUndefined();
  });
});
```

- [ ] **Run — erwarte FAIL**

```bash
pnpm vitest run src/tests/unit/stores/toastNotify.test.ts
```

Erwartet: FAIL — `top-center`/`bottom-center` nicht im Typ, `id` ist number, MAX nicht implementiert.

- [ ] **Implementiere Store-Änderungen**

```ts
// src/stores/toastNotify.ts
import { atom } from "nanostores";

export type ToastPosition =
  | "bottom-center" | "bottom-left" | "bottom-right"
  | "top-center"    | "top-left"    | "top-right";

export type ToastNotify = {
  actionLabel?: string;
  closeOnSwipe?: boolean;
  id?: string;
  message: string;
  onAction?: () => void;
  position?: ToastPosition;
  showClose?: boolean;
  showStatusIcon?: boolean;
  status?: ToastStatus;
};

export type ToastPayload = Omit<ToastNotify, "id"> & {
  timeout?: null | number;
};

export type ToastStatus = "error" | "info" | "success" | "warning";

const MAX_PER_POSITION = 3;
const defaultTimeout = 5000;

export const $toastNotify = atom<ToastNotify[]>([]);

export const supportsPopover = (): boolean =>
  Object.prototype.hasOwnProperty.call(HTMLElement.prototype, "popover");

const createToast = (payload: ToastPayload): ToastNotify => ({
  id: crypto.randomUUID(),
  ...payload,
});

export const createToastNotify = (payload: ToastPayload): void => {
  if (!supportsPopover()) return;

  const pos = payload.position ?? "top-right";
  const current = $toastNotify.get();
  const forPos = current.filter((t) => (t.position ?? "top-right") === pos);

  let updated = current;
  if (forPos.length >= MAX_PER_POSITION) {
    const oldest = forPos.at(-1)!;
    updated = current.filter((t) => t.id !== oldest.id);
  }

  const toast = createToast(payload);
  $toastNotify.set([toast, ...updated]);

  const { timeout } = payload;
  if (timeout !== null) {
    setTimeout(() => {
      $toastNotify.set($toastNotify.get().filter((t) => t.id !== toast.id));
    }, timeout ?? defaultTimeout);
  }
};

export const removeToastById = (id: string): void => {
  $toastNotify.set($toastNotify.get().filter((t) => t.id !== id));
};
```

- [ ] **Run — erwarte PASS**

```bash
pnpm vitest run src/tests/unit/stores/toastNotify.test.ts
```

- [ ] **Lint**

```bash
pnpm lint
```

- [ ] **Commit**

```bash
git add src/stores/toastNotify.ts src/tests/unit/stores/toastNotify.test.ts
git commit -m "feat(toast): extend store — 6 positions, UUID id, MAX_PER_POSITION=3"
```

---

### Task 2: Simplify `ToastNotify.vue` — Remove Positioning Logic

**Files:**
- Modify: `src/components/toast/ToastNotify.vue`
- Modify: `src/styles/components/_toast-notify.scss`
- Modify: `src/tests/unit/components/toast/ToastNotify.test.ts`

**Interfaces:**
- Consumes: `ToastNotify` type (Task 1) — `id: string`, keine `initOffset`/`outerSpacing`/`gapBetween`-Props
- Produces: `<div class="c-toast-notify">` ohne `popover`-Attribut; ruft `removeToastById(id!)` on dismiss; Swipe-to-dismiss bleibt

- [ ] **Ersetze die gesamte Testdatei**

```ts
// src/tests/unit/components/toast/ToastNotify.test.ts
import ToastNotify from "@components/toast/ToastNotify.vue";
import { removeToastById } from "@stores/toastNotify.ts";
import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@stores/toastNotify.ts", () => ({
  removeToastById: vi.fn(),
}));
vi.mock("virtual:icons/lucide/x", () => ({ default: { template: "<svg />" } }));
vi.mock("virtual:icons/lucide/info", () => ({ default: { template: "<svg />" } }));
vi.mock("virtual:icons/lucide/check-circle-2", () => ({ default: { template: "<svg />" } }));
vi.mock("virtual:icons/lucide/x-circle", () => ({ default: { template: "<svg />" } }));
vi.mock("virtual:icons/lucide/alert-circle", () => ({ default: { template: "<svg />" } }));

afterEach(() => vi.clearAllMocks());

describe("ToastNotify.vue", () => {
  it("renders as a plain div — no popover attribute", () => {
    const wrapper = mount(ToastNotify, { props: { id: "abc-123", message: "Hi" } });
    expect(wrapper.find(".c-toast-notify").attributes("popover")).toBeUndefined();
  });

  it("displays the message", () => {
    const wrapper = mount(ToastNotify, { props: { id: "abc-123", message: "Test message" } });
    expect(wrapper.find(".c-toast-notify__message").text()).toBe("Test message");
  });

  it("calls removeToastById with string id when close button clicked", async () => {
    const wrapper = mount(ToastNotify, {
      props: { id: "test-uuid-1", message: "Hi", showClose: true },
    });
    await wrapper.find(".c-toast-notify__close").trigger("click");
    expect(removeToastById).toHaveBeenCalledWith("test-uuid-1");
  });

  it("calls onAction and removeToastById when action button clicked", async () => {
    const onAction = vi.fn();
    const wrapper = mount(ToastNotify, {
      props: { id: "test-uuid-2", message: "Hi", actionLabel: "Aktualisieren", onAction },
    });
    await wrapper.find(".c-toast-notify__action").trigger("click");
    expect(onAction).toHaveBeenCalledOnce();
    expect(removeToastById).toHaveBeenCalledWith("test-uuid-2");
  });

  it("calls removeToastById even when onAction is absent", async () => {
    const wrapper = mount(ToastNotify, {
      props: { id: "test-uuid-3", message: "Hi", actionLabel: "Aktualisieren" },
    });
    await wrapper.find(".c-toast-notify__action").trigger("click");
    expect(removeToastById).toHaveBeenCalledWith("test-uuid-3");
  });

  it("does not render action button without actionLabel", () => {
    const wrapper = mount(ToastNotify, { props: { id: "abc", message: "Hi" } });
    expect(wrapper.find(".c-toast-notify__action").exists()).toBe(false);
  });

  it("sets role=alert and aria-live=assertive for error status", () => {
    const wrapper = mount(ToastNotify, { props: { id: "e", message: "Err", status: "error" } });
    expect(wrapper.find(".c-toast-notify").attributes("role")).toBe("alert");
    expect(wrapper.find(".c-toast-notify").attributes("aria-live")).toBe("assertive");
  });

  it("sets role=status and aria-live=polite for non-error status", () => {
    const wrapper = mount(ToastNotify, { props: { id: "s", message: "Ok", status: "success" } });
    expect(wrapper.find(".c-toast-notify").attributes("role")).toBe("status");
    expect(wrapper.find(".c-toast-notify").attributes("aria-live")).toBe("polite");
  });
});
```

- [ ] **Run — erwarte FAIL**

```bash
pnpm vitest run src/tests/unit/components/toast/ToastNotify.test.ts
```

Erwartet: FAIL — Komponente hat noch `popover`, `removeToastById` bekommt noch number-id.

- [ ] **Ersetze `ToastNotify.vue` vollständig**

```vue
<!-- src/components/toast/ToastNotify.vue -->
<template>
  <div
    :id="`toast-${id}`"
    ref="toast"
    class="c-toast-notify"
    :class="`c-toast-notify--${status}`"
    :role="ariaRole"
    :aria-live="ariaLive"
    aria-atomic="true"
  >
    <Component
      :is="toastIconMap[status]"
      v-if="showStatusIcon"
      class="c-toast-notify__icon"
      aria-hidden="true"
    />

    <div class="c-toast-notify__body">
      <div class="c-toast-notify__message">
        {{ message }}
      </div>

      <button
        v-if="actionLabel"
        type="button"
        class="c-toast-notify__action c-button"
        @click="handleAction()"
      >
        {{ actionLabel }}
      </button>
    </div>

    <button
      v-if="showClose"
      type="button"
      class="c-toast-notify__close c-button c-button--center-icon"
      aria-label="schließen"
      @click="dismiss()"
    >
      <Close :width="12" :height="12" />
    </button>
  </div>
</template>

<script setup lang="ts">
import type { ToastNotify } from "@stores/toastNotify.ts";

import { removeToastById } from "@stores/toastNotify";
import { useSwipe } from "@vueuse/core";
import { computed, defineAsyncComponent, ref, watch } from "vue";

const Close = defineAsyncComponent(() => import("virtual:icons/lucide/x"));

const {
  actionLabel,
  closeOnSwipe = true,
  id,
  message,
  onAction,
  showClose = true,
  showStatusIcon = true,
  status = "info",
} = defineProps<ToastNotify>();

const toast = ref<HTMLElement | null>(null);
const { isSwiping } = useSwipe(toast);

const ariaRole = computed(() => (status === "error" ? "alert" : "status"));
const ariaLive = computed(() => (status === "error" ? "assertive" : "polite"));

const toastIconMap = {
  error: defineAsyncComponent(() => import("virtual:icons/lucide/x-circle")),
  info: defineAsyncComponent(() => import("virtual:icons/lucide/info")),
  success: defineAsyncComponent(() => import("virtual:icons/lucide/check-circle-2")),
  warning: defineAsyncComponent(() => import("virtual:icons/lucide/alert-circle")),
};

const dismiss = (): void => {
  removeToastById(id!);
};

const handleAction = (): void => {
  onAction?.();
  dismiss();
};

watch(isSwiping, () => {
  if (isSwiping.value && closeOnSwipe) {
    dismiss();
  }
});
</script>

<style lang="scss">
@use "@styles/components/toast-notify";
</style>
```

- [ ] **Entferne den Animations-Block aus `_toast-notify.scss`**

Ersetze den gesamten `@include butler-mx.feature("motion") { ... }` Block und den `&:popover-open { ... }` Block. Das Resultat:

```scss
// src/styles/components/_toast-notify.scss
@use "@sass-butler/mixins" as butler-mx;

.c-toast-notify {
  display: flex;
  align-items: center;
  gap: 1rem;
  color: var(--color);
  background-color: var(--color-background, var(--orange-300));
  border: 1px solid var(--color-border);
  padding: 0.7rem 1.4rem;
  max-width: 88vw;

  @include butler-mx.breakpoint("xs") {
    max-width: 400px;
  }

  @include butler-mx.dark-mode-class {
    --color: var(--color-body);
    --color-background: var(--new-blue-600);
    --color-border: color-mix(in srgb, var(--blue) 80%, white);
  }

  &__icon {
    flex: 0 0 auto;
  }

  &__body {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 0.5rem;
  }

  &__close {
    border: none;
  }

  &__action {
    align-self: flex-start;
    font-size: 0.85em;
    white-space: nowrap;

    --padding: 0.3rem 0.75rem;
  }
}
```

- [ ] **Run — erwarte PASS**

```bash
pnpm vitest run src/tests/unit/components/toast/ToastNotify.test.ts
```

- [ ] **Lint**

```bash
pnpm lint
```

- [ ] **Commit**

```bash
git add src/components/toast/ToastNotify.vue \
        src/styles/components/_toast-notify.scss \
        src/tests/unit/components/toast/ToastNotify.test.ts
git commit -m "refactor(toast): simplify ToastNotify — remove popover and positioning logic"
```

---

### Task 3: Neue `ToastPositionGroup.vue` + `_toast-container.scss`

**Files:**
- Create: `src/components/toast/ToastPositionGroup.vue`
- Create: `src/styles/components/_toast-container.scss`
- Create: `src/tests/unit/components/toast/ToastPositionGroup.test.ts`

**Interfaces:**
- Consumes: `ToastPosition`, `ToastNotify` (Task 1); `<ToastNotify>` (Task 2); `supportsPopover` aus Store
- Produces: `<ToastPositionGroup position="top-right" :toasts="[...]" />` — `popover="manual"` Container mit positionierten Flex-Toasts; `defineExpose({ onAfterLeave })` für Testbarkeit

- [ ] **Schreibe failing Tests**

```ts
// src/tests/unit/components/toast/ToastPositionGroup.test.ts
import ToastPositionGroup from "@components/toast/ToastPositionGroup.vue";
import { supportsPopover } from "@stores/toastNotify.ts";
import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@stores/toastNotify.ts", () => ({
  supportsPopover: vi.fn(() => true),
}));
vi.mock("@components/toast/ToastNotify.vue", () => ({
  default: { template: '<div class="c-toast-notify" />' },
}));

const mockShowPopover = vi.fn();
const mockHidePopover = vi.fn();

const toast = (id: string) => ({
  id,
  message: `Toast ${id}`,
  position: "top-right" as const,
  status: "info" as const,
});

describe("ToastPositionGroup.vue", () => {
  beforeEach(() => {
    HTMLElement.prototype.showPopover = mockShowPopover;
    HTMLElement.prototype.hidePopover = mockHidePopover;
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders container with correct position modifier class", () => {
    const wrapper = mount(ToastPositionGroup, {
      props: { position: "bottom-left", toasts: [] },
    });
    expect(wrapper.find(".c-toast-container--bottom-left").exists()).toBe(true);
  });

  it("renders one ToastNotify per toast", () => {
    const wrapper = mount(ToastPositionGroup, {
      props: { position: "top-right", toasts: [toast("a"), toast("b")] },
    });
    expect(wrapper.findAll(".c-toast-notify")).toHaveLength(2);
  });

  it("calls showPopover on mount when toasts are already present", async () => {
    mount(ToastPositionGroup, {
      props: { position: "top-right", toasts: [toast("a")] },
    });
    await import("vue").then((v) => v.nextTick());
    expect(mockShowPopover).toHaveBeenCalledOnce();
  });

  it("calls showPopover when toasts go from 0 to 1", async () => {
    const wrapper = mount(ToastPositionGroup, {
      props: { position: "top-right", toasts: [] },
    });
    await wrapper.setProps({ toasts: [toast("a")] });
    expect(mockShowPopover).toHaveBeenCalledOnce();
  });

  it("does not call hidePopover via onAfterLeave when toasts still remain", async () => {
    const wrapper = mount(ToastPositionGroup, {
      props: { position: "top-right", toasts: [toast("a"), toast("b")] },
    });
    await wrapper.setProps({ toasts: [toast("b")] });
    await (wrapper.vm as any).onAfterLeave();
    expect(mockHidePopover).not.toHaveBeenCalled();
  });

  it("calls hidePopover via onAfterLeave when last toast has exited", async () => {
    const wrapper = mount(ToastPositionGroup, {
      props: { position: "top-right", toasts: [toast("a")] },
    });
    await wrapper.setProps({ toasts: [] });
    await (wrapper.vm as any).onAfterLeave();
    expect(mockHidePopover).toHaveBeenCalledOnce();
  });

  it("renders nothing when popover is not supported", () => {
    vi.mocked(supportsPopover).mockReturnValueOnce(false);
    const wrapper = mount(ToastPositionGroup, {
      props: { position: "top-right", toasts: [] },
    });
    expect(wrapper.find(".c-toast-container").exists()).toBe(false);
  });
});
```

- [ ] **Run — erwarte FAIL**

```bash
pnpm vitest run src/tests/unit/components/toast/ToastPositionGroup.test.ts
```

Erwartet: FAIL — Datei existiert nicht.

- [ ] **Erstelle `ToastPositionGroup.vue`**

```vue
<!-- src/components/toast/ToastPositionGroup.vue -->
<template>
  <div
    v-if="isSupported"
    ref="container"
    popover="manual"
    class="c-toast-container"
    :class="`c-toast-container--${position}`"
  >
    <TransitionGroup name="c-toast-notify" @after-leave="onAfterLeave">
      <ToastNotify
        v-for="toast in toasts"
        :key="toast.id"
        v-bind="toast"
      />
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import type { ToastNotify as ToastNotifyType, ToastPosition } from "@stores/toastNotify.ts";

import ToastNotify from "@components/toast/ToastNotify.vue";
import { supportsPopover } from "@stores/toastNotify";
import { onBeforeMount, onMounted, ref, watch } from "vue";

const props = defineProps<{
  position: ToastPosition;
  toasts: ToastNotifyType[];
}>();

const container = ref<HTMLElement | null>(null);
const isSupported = ref(false);

onBeforeMount(() => {
  isSupported.value = supportsPopover();
});

onMounted(() => {
  if (!isSupported.value) return;
  if (props.toasts.length > 0) {
    container.value?.showPopover();
  }
});

watch(
  () => props.toasts.length,
  (newLen, oldLen) => {
    if (oldLen === 0 && newLen > 0) {
      container.value?.showPopover();
    }
  },
);

const onAfterLeave = (): void => {
  if (props.toasts.length === 0) {
    container.value?.hidePopover();
  }
};

defineExpose({ onAfterLeave });
</script>

<style lang="scss">
@use "@styles/components/toast-container";
</style>
```

- [ ] **Erstelle `_toast-container.scss`**

```scss
// src/styles/components/_toast-container.scss
@use "@sass-butler/mixins" as butler-mx;

.c-toast-container {
  // UA-Popover-Reset
  margin: 0;
  border: none;
  background: transparent;
  padding: 0;
  overflow: visible;
  max-width: none;
  max-height: none;

  // Layout
  position: fixed;
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: max-content;

  // Bottom: neuester Toast unten (nearest edge) via column-reverse
  &--bottom-right,
  &--bottom-left,
  &--bottom-center {
    flex-direction: column-reverse;
  }

  // Corner-Positioning
  &--top-right     { top: 20px; right: 20px; }
  &--top-left      { top: 20px; left: 20px; }
  &--top-center    { top: 20px; left: 50%; translate: -50% 0; }
  &--bottom-right  { bottom: 20px; right: 20px; }
  &--bottom-left   { bottom: 20px; left: 20px; }
  &--bottom-center { bottom: 20px; left: 50%; translate: -50% 0; }
}

// TransitionGroup-Animations — Leave-active braucht position: absolute
// damit verbleibende Toasts via FLIP nahtlos nachrücken können
.c-toast-notify-leave-active {
  position: absolute;
}

@include butler-mx.feature("motion") {
  .c-toast-notify-enter-active,
  .c-toast-notify-leave-active {
    transition: transform 0.3s ease, opacity 0.3s ease;
  }

  .c-toast-notify-move {
    transition: transform 0.3s ease;
  }

  // Richtungs-aware Enter/Leave via Container-Modifier
  .c-toast-container--top-right,
  .c-toast-container--bottom-right {
    .c-toast-notify-enter-from,
    .c-toast-notify-leave-to {
      transform: translateX(110%);
      opacity: 0;
    }
  }

  .c-toast-container--top-left,
  .c-toast-container--bottom-left {
    .c-toast-notify-enter-from,
    .c-toast-notify-leave-to {
      transform: translateX(-110%);
      opacity: 0;
    }
  }

  .c-toast-container--top-center {
    .c-toast-notify-enter-from,
    .c-toast-notify-leave-to {
      transform: translateY(-110%);
      opacity: 0;
    }
  }

  .c-toast-container--bottom-center {
    .c-toast-notify-enter-from,
    .c-toast-notify-leave-to {
      transform: translateY(110%);
      opacity: 0;
    }
  }
}
```

- [ ] **Run — erwarte PASS**

```bash
pnpm vitest run src/tests/unit/components/toast/ToastPositionGroup.test.ts
```

- [ ] **Lint**

```bash
pnpm lint
```

- [ ] **Commit**

```bash
git add src/components/toast/ToastPositionGroup.vue \
        src/styles/components/_toast-container.scss \
        src/tests/unit/components/toast/ToastPositionGroup.test.ts
git commit -m "feat(toast): add ToastPositionGroup — popover container with TransitionGroup stacking"
```

---

### Task 4: Refactor `ToastNotifyContainer.vue` + Update Container-Test

**Files:**
- Modify: `src/components/toast/ToastNotifyContainer.vue`
- Modify: `src/tests/unit/components/toast/ToastNotifyContainer.test.ts`

**Interfaces:**
- Consumes: `$toastNotify` Store (Task 1); `<ToastPositionGroup>` (Task 3)
- Produces: Rendert immer 6 `ToastPositionGroup`-Instanzen; jede erhält den gefilterten Store-Slice für ihre Position

- [ ] **Ersetze die gesamte Testdatei**

```ts
// src/tests/unit/components/toast/ToastNotifyContainer.test.ts
import ToastNotifyContainer from "@components/toast/ToastNotifyContainer.vue";
import ToastPositionGroup from "@components/toast/ToastPositionGroup.vue";
import { $toastNotify } from "@stores/toastNotify.ts";
import { mount } from "@vue/test-utils";
import { cleanStores } from "nanostores";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@components/toast/ToastPositionGroup.vue", () => ({
  default: {
    props: ["position", "toasts"],
    template: '<div class="c-toast-position-group" :data-position="position" />',
  },
}));

beforeEach(() => {
  $toastNotify.set([]);
});
afterEach(() => {
  cleanStores($toastNotify);
});

describe("ToastNotifyContainer.vue", () => {
  it("always renders exactly 6 ToastPositionGroup components", () => {
    const wrapper = mount(ToastNotifyContainer);
    expect(wrapper.findAllComponents(ToastPositionGroup)).toHaveLength(6);
  });

  it("renders one group per position including all 6 positions", () => {
    const wrapper = mount(ToastNotifyContainer);
    const positions = wrapper
      .findAllComponents(ToastPositionGroup)
      .map((c) => c.props("position"));
    expect(positions).toContain("top-left");
    expect(positions).toContain("top-center");
    expect(positions).toContain("top-right");
    expect(positions).toContain("bottom-left");
    expect(positions).toContain("bottom-center");
    expect(positions).toContain("bottom-right");
  });

  it("passes only matching toasts to each position group", async () => {
    $toastNotify.set([
      { id: "a", message: "A", position: "top-right" },
      { id: "b", message: "B", position: "top-right" },
      { id: "c", message: "C", position: "bottom-left" },
    ]);
    const wrapper = mount(ToastNotifyContainer);
    await import("vue").then((v) => v.nextTick());

    const groups = wrapper.findAllComponents(ToastPositionGroup);
    const topRight = groups.find((g) => g.props("position") === "top-right");
    const bottomLeft = groups.find((g) => g.props("position") === "bottom-left");
    const topLeft = groups.find((g) => g.props("position") === "top-left");

    expect(topRight!.props("toasts")).toHaveLength(2);
    expect(bottomLeft!.props("toasts")).toHaveLength(1);
    expect(topLeft!.props("toasts")).toHaveLength(0);
  });
});
```

- [ ] **Run — erwarte FAIL**

```bash
pnpm vitest run src/tests/unit/components/toast/ToastNotifyContainer.test.ts
```

Erwartet: FAIL — Container rendert noch flache `ToastNotify`-Liste.

- [ ] **Ersetze `ToastNotifyContainer.vue` vollständig**

```vue
<!-- src/components/toast/ToastNotifyContainer.vue -->
<template>
  <ToastPositionGroup
    v-for="position in positions"
    :key="position"
    :position="position"
    :toasts="toastsByPosition(position)"
  />
</template>

<script setup lang="ts">
import type { ToastPosition } from "@stores/toastNotify.ts";

import ToastPositionGroup from "@components/toast/ToastPositionGroup.vue";
import { useStore } from "@nanostores/vue";
import { $toastNotify } from "@stores/toastNotify.ts";

const toastStore = useStore($toastNotify);

const positions: ToastPosition[] = [
  "top-left",
  "top-center",
  "top-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
];

const toastsByPosition = (pos: ToastPosition) =>
  toastStore.value.filter((t) => (t.position ?? "top-right") === pos);
</script>

<style lang="scss"></style>
```

- [ ] **Run — erwarte PASS**

```bash
pnpm vitest run src/tests/unit/components/toast/ToastNotifyContainer.test.ts
```

- [ ] **Gesamte Test-Suite**

```bash
pnpm test:unit
```

Erwartet: alle Tests grün, inkl. bestehende PWA-Tests.

- [ ] **Lint**

```bash
pnpm lint
```

- [ ] **Visuell verifizieren**

Öffne die App, führe `__testUpdateToast()` in der Browser-Konsole aus (falls vorhanden) oder dispatch einen Toast manuell:

```js
// In der Browser-Konsole:
window.__createToast?.({ message: "Top right ✓", position: "top-right", status: "success" })
window.__createToast?.({ message: "Bottom left ✓", position: "bottom-left", status: "info" })
window.__createToast?.({ message: "Top center ✓", position: "top-center", status: "warning" })
```

Prüfen: Toast slides in aus der richtigen Richtung; FLIP beim Schließen eines mittleren Toasts; max. 3 pro Position.

- [ ] **Commit**

```bash
git add src/components/toast/ToastNotifyContainer.vue \
        src/tests/unit/components/toast/ToastNotifyContainer.test.ts
git commit -m "refactor(toast): ToastNotifyContainer — 6 fixed position groups with filtered store slice"
```

- [ ] **Alte leere Testdatei löschen (falls vorhanden)**

```bash
git rm src/tests/unit/components/ToastNotify.test.ts 2>/dev/null || true
git commit -m "chore(test): remove obsolete top-level ToastNotify test duplicate" 2>/dev/null || true
```
