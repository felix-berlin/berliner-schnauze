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
      <span v-if="arrow" class="c-dropdown__arrow" aria-hidden="true" />
      <template v-if="!lazy || isOpen">
        <slot name="panel" />
      </template>
    </component>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";

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
  arrow = true,
  arrowPadding = 12,
} = defineProps<DropdownPopoverProps>();

defineOptions({ inheritAttrs: false });

const id = crypto.randomUUID();
const panelId = `dropdown-${id}`;

const triggerEl = ref<HTMLElement | null>(null);
const panel = ref<HTMLElement | null>(null);
const isOpen = ref(false);

const triggerProps = computed(() => ({
  "aria-controls": panelId,
  "aria-expanded": isOpen.value,
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
