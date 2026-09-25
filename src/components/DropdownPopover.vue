<template>
  <div v-bind="$attrs" class="c-dropdown">
    <span ref="triggerEl" class="c-dropdown__trigger" :style="`anchor-name: --${panelId}`">
      <slot :trigger-props="triggerProps" :is-open="isOpen" :panel-id="panelId" />
    </span>

    <div
      ref="panel"
      :id="panelId"
      popover="auto"
      class="c-dropdown__panel"
      :class="`c-dropdown__panel--${placement}`"
      :style="panelStyle"
      @toggle="onToggle"
    >
      <template v-if="hasContent">
        <span class="c-dropdown__arrow" :style="arrowDynamicStyle" aria-hidden="true" />
        <slot name="panel" />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useResizeObserver } from "@vueuse/core";
import { computed, nextTick, ref } from "vue";

import { computeArrowOffset } from "@/directives/tooltip";

export type PlacementValue =
  | "bottom-start"
  | "bottom-end"
  | "bottom"
  | "top-start"
  | "top-end"
  | "top";

export type DropdownPopoverProps = {
  /** Unique identifier for this instance, e.g. "main-menu" or `word-options-${slug}`.
   * Must be unique across every DropdownPopover rendered on a page — each Astro
   * island mounts its own Vue app, so a generated id (e.g. useId()) is NOT
   * guaranteed unique across islands, only within one. */
  name: string;
  offset?: number;
  placement?: PlacementValue;
};

const { name, offset = 8, placement = "bottom-start" } = defineProps<DropdownPopoverProps>();

defineOptions({ inheritAttrs: false });

const panelId = `dropdown-${name}`;
const ARROW_PADDING = 12;

const triggerEl = ref<HTMLElement | null>(null);
const panel = ref<HTMLElement | null>(null);
const isOpen = ref(false);
const hasContent = ref(false); // lags isOpen by close-animation duration so content stays during fade-out

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

const syncArrow = (): void => {
  if (!panel.value || !triggerEl.value) return;
  const panelRect = panel.value.getBoundingClientRect();
  const triggerRect = triggerEl.value.getBoundingClientRect();
  arrowX.value = computeArrowOffset(
    triggerRect.left,
    triggerRect.right,
    panelRect.left,
    panelRect.width,
    ARROW_PADDING,
  );
  arrowAbove.value = panelRect.bottom <= triggerRect.top;
};

// Observe only while open; the getter is lazy, so `document` is never touched during SSR.
useResizeObserver(
  () => (isOpen.value ? [triggerEl.value, panel.value, document.documentElement] : []),
  syncArrow,
);

const triggerProps = computed(() => ({
  "aria-controls": panelId,
  "aria-expanded": isOpen.value,
  "aria-haspopup": true,
  popovertarget: panelId,
}));

const panelStyle = computed(() => ({
  "--c-dropdown-offset": `${offset}px`,
  "position-anchor": `--${panelId}`,
}));

const FOCUSABLE =
  'button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

const focusTrigger = (): void => {
  const focusable = triggerEl.value?.querySelector<HTMLElement>(FOCUSABLE);
  (focusable ?? triggerEl.value)?.focus();
};

const onToggle = (event: ToggleEvent): void => {
  isOpen.value = event.newState === "open";
  if (isOpen.value) {
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
    focusTrigger();
  }
};

const close = (): void => {
  panel.value?.hidePopover();
  focusTrigger();
};

</script>

<style lang="scss">
@use "@styles/components/dropdown-popover";
@use "@styles/components/dropdown-popover-themes";
</style>
