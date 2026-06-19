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
