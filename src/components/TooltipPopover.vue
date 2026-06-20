<template>
  <div
    class="c-tooltip"
    :style="`anchor-name: --${tooltipId}`"
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
      :style="`position-anchor: --${tooltipId}; --c-tooltip-offset: ${offset}px`"
    >
      <slot name="tooltip">{{ content }}</slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, useId } from "vue";

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

const id = useId();
const tooltipId = `tooltip-${id}`;

const panel = ref<HTMLElement | null>(null);

const show = (): void => {
  panel.value?.showPopover();
};

const hide = (): void => {
  panel.value?.hidePopover();
};

defineExpose({ hide, show });
</script>

<style lang="scss">
@use "@styles/components/tooltip";
</style>
