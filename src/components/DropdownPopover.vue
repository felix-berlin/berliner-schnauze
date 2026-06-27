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
      @focusin="cancelClose"
    >
      <span
        v-if="arrow && (!lazy || hasContent)"
        class="c-dropdown__arrow"
        :style="arrowDynamicStyle"
        aria-hidden="true"
      />
      <template v-if="!lazy || hasContent">
        <slot name="panel" />
      </template>
    </component>
  </div>
</template>

<script setup lang="ts">
import { useResizeObserver } from "@vueuse/core";
import { computed, nextTick, ref } from "vue";

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
  haspopup?: boolean | "dialog" | "grid" | "listbox" | "menu" | "tree";
};

const {
  lazy = true,
  offset = 8,
  placement = "bottom-start",
  skidding = 0,
  triggers = ["click"],
  panelClass,
  panelTag = "div",
  arrow = true,
  arrowPadding = 12,
  haspopup = true,
} = defineProps<DropdownPopoverProps>();

defineOptions({ inheritAttrs: false });

const id = crypto.randomUUID();
const panelId = `dropdown-${id}`;

const triggerEl = ref<HTMLElement | null>(null);
const panel = ref<HTMLElement | null>(null);
const isOpen = ref(false);
const hasContent = ref(false); // lags isOpen by close-animation duration so lazy content stays during fade-out

const arrowX = ref<number | null>(null);
const arrowAbove = ref(false);

const arrowDynamicStyle = computed((): Record<string, string> => {
  if (arrowX.value === null) return {};
  return {
    bottom: arrowAbove.value ? "calc(-1 * var(--arrow-half))" : "auto",
    left: `${arrowX.value}px`,
    top: arrowAbove.value ? "auto" : "calc(-1 * var(--arrow-half))",
  };
});

const ARROW_SIZE = 8;

const syncArrow = (): void => {
  if (!arrow || !panel.value || !triggerEl.value) return;
  const panelRect = panel.value.getBoundingClientRect();
  const triggerRect = triggerEl.value.getBoundingClientRect();
  const triggerCenterX = (triggerRect.left + triggerRect.right) / 2;
  const rawX = triggerCenterX - panelRect.left - ARROW_SIZE / 2;
  arrowX.value = Math.max(
    arrowPadding,
    Math.min(rawX, panelRect.width - arrowPadding - ARROW_SIZE),
  );
  arrowAbove.value = panelRect.bottom <= triggerRect.top;
};

useResizeObserver([triggerEl, panel, document.documentElement as HTMLElement], () => {
  if (isOpen.value) syncArrow();
});

const triggerProps = computed(() => ({
  "aria-controls": panelId,
  "aria-expanded": isOpen.value,
  "aria-haspopup": haspopup,
  ...(triggers.includes("click") && { popovertarget: panelId }),
}));

const panelStyle = computed(() => ({
  "--c-dropdown-arrow-padding": `${arrowPadding}px`,
  "--c-dropdown-offset": `${offset}px`,
  "--c-dropdown-skidding": `${skidding}px`,
  "position-anchor": `--${panelId}`,
}));

const onToggle = (event: ToggleEvent): void => {
  isOpen.value = event.newState === "open";
  if (event.newState === "open") {
    hasContent.value = true;
    void nextTick(syncArrow);
    return;
  }
  arrowX.value = null;
  setTimeout(() => {
    if (!isOpen.value) hasContent.value = false;
  }, 150);
  // Escape leaves focus on <body>; panel content losing focus also qualifies.
  // Don't steal focus when the user clicked somewhere else (activeElement already moved).
  if (document.activeElement === document.body || panel.value?.contains(document.activeElement)) {
    const focusable = triggerEl.value?.querySelector<HTMLElement>(FOCUSABLE);
    (focusable ?? triggerEl.value)?.focus();
  }
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
@use "@styles/components/dropdown-popover-themes";
</style>
