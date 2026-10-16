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
import { useEventListener, useTimeoutFn } from "@vueuse/core";
import { nextTick, ref } from "vue";

import {
  EXIT_ANIMATION_MS,
  HIDE_DELAY,
  syncTooltipArrow,
  type TooltipPlacement,
} from "@/directives/tooltip";

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

// Keep panel in DOM until the overlay allow-discrete exit animation completes,
// then remove it so it doesn't persist as dead DOM between interactions.
const { start: scheduleDomRemoval, stop: cancelDomRemoval } = useTimeoutFn(
  () => {
    isRendered.value = false;
  },
  EXIT_ANIMATION_MS,
  { immediate: false },
);

const hide = (): void => {
  cancelHide();
  panel.value?.hidePopover();
  isVisible.value = false;
  scheduleDomRemoval();
};

const { start: startHideTimer, stop: cancelHide } = useTimeoutFn(hide, HIDE_DELAY, {
  immediate: false,
});
const scheduleHide = (): void => startHideTimer();

const show = async (): Promise<void> => {
  cancelHide();
  cancelDomRemoval();
  if (!isRendered.value) {
    isRendered.value = true;
    await nextTick();
  }
  panel.value?.showPopover();
  isVisible.value = true;
  requestAnimationFrame(() => {
    if (container.value && panel.value && arrow.value) {
      syncTooltipArrow(container.value, panel.value, arrow.value);
    }
  });
};

// WCAG 1.4.13: tooltip must be dismissible without moving pointer/focus (Escape key)
useEventListener(document, "keydown", (e: KeyboardEvent) => {
  if (e.key === "Escape" && isVisible.value) hide();
});

defineExpose({ hide, show });
</script>
