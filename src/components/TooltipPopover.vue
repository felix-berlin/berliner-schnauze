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

    <Teleport to="body">
      <div
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
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { syncTooltipArrow } from "@/directives/tooltip";
import { useEventListener } from "@vueuse/core";
import { ref } from "vue";

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

let hideTimer: ReturnType<typeof setTimeout> | null = null;

const cancelHide = (): void => {
  if (hideTimer !== null) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
};

const hide = (): void => {
  cancelHide();
  panel.value?.hidePopover();
  isVisible.value = false;
};

// Delay lets the pointer move from trigger to tooltip panel without dismissing (WCAG 1.4.13)
const HIDE_DELAY = 200;

const scheduleHide = (): void => {
  hideTimer = setTimeout(() => {
    hide();
  }, HIDE_DELAY);
};

const show = (): void => {
  cancelHide();
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
