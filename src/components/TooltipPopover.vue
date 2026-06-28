<template>
  <div
    ref="container"
    class="c-tooltip"
    :style="`anchor-name: --${tooltipId}`"
    :aria-describedby="tooltipId"
    @pointerenter="show"
    @pointerleave="scheduleHide"
    @focusin="show"
    @focusout="scheduleHide"
  >
    <slot :tooltip-id="tooltipId" />

    <div
      v-if="isRendered"
      :id="tooltipId"
      ref="panel"
      popover="manual"
      role="tooltip"
      class="c-tooltip__panel"
      :class="`c-tooltip__panel--${placement}`"
      :style="`position-anchor: --${tooltipId}; --c-tooltip-offset: ${offset}px`"
      @pointerenter="cancelHide"
      @pointerleave="scheduleHide"
    >
      <span ref="arrow" class="c-tooltip__arrow" aria-hidden="true" />
      <slot name="tooltip">{{ content }}</slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { syncTooltipArrow } from "@/directives/tooltip";
import { useEventListener } from "@vueuse/core";
import { nextTick, ref } from "vue";

export type TooltipPlacement =
  | "top"
  | "top-start"
  | "top-end"
  | "bottom"
  | "bottom-start"
  | "bottom-end"
  | "left"
  | "right";

export type TooltipPopoverProps = {
  content?: string;
  placement?: TooltipPlacement;
  offset?: number;
};

const { content, placement = "top", offset = 8 } = defineProps<TooltipPopoverProps>();

// crypto.randomUUID() is safe here: component is client:only, no SSR hydration needed
const tooltipId = `tooltip-${crypto.randomUUID().slice(0, 8)}`;

const container = ref<HTMLElement | null>(null);
const panel = ref<HTMLElement | null>(null);
const arrow = ref<HTMLElement | null>(null);
const isVisible = ref(false);
const isRendered = ref(false);

let hideTimer: ReturnType<typeof setTimeout> | null = null;
let domRemovalTimer: ReturnType<typeof setTimeout> | null = null;

// Matches the CSS exit transition duration in _tooltip.scss
const EXIT_ANIMATION_MS = 100;

const cancelHide = (): void => {
  if (hideTimer !== null) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
};

const cancelDomRemoval = (): void => {
  if (domRemovalTimer !== null) {
    clearTimeout(domRemovalTimer);
    domRemovalTimer = null;
  }
};

const hide = (): void => {
  cancelHide();
  panel.value?.hidePopover();
  isVisible.value = false;
  // Keep panel in DOM until the overlay allow-discrete exit animation completes,
  // then remove it so it doesn't persist as dead DOM between interactions.
  domRemovalTimer = setTimeout(() => {
    isRendered.value = false;
    domRemovalTimer = null;
  }, EXIT_ANIMATION_MS);
};

// Delay lets the pointer move from trigger to tooltip panel without dismissing (WCAG 1.4.13)
const HIDE_DELAY = 200;

const scheduleHide = (): void => {
  hideTimer = setTimeout(hide, HIDE_DELAY);
};

const show = async (): Promise<void> => {
  cancelHide();
  cancelDomRemoval();
  if (!isRendered.value) {
    isRendered.value = true;
    await nextTick();
  }
  panel.value?.showPopover();
  isVisible.value = true;
  if (container.value && panel.value && arrow.value) {
    requestAnimationFrame(() => {
      if (container.value && panel.value && arrow.value) {
        syncTooltipArrow(container.value, panel.value, arrow.value);
      }
    });
  }
};

// WCAG 1.4.13: tooltip must be dismissible without moving pointer/focus (Escape key)
useEventListener(document, "keydown", (e: KeyboardEvent) => {
  if (e.key === "Escape" && isVisible.value) hide();
});

defineExpose({ hide, show });
</script>
