<template>
  <div
    ref="container"
    popover="manual"
    class="c-toast-container"
    :class="`c-toast-container--${position}`"
  >
    <TransitionGroup
      name="c-toast-notify"
      @before-leave="onBeforeLeave"
      @after-leave="onAfterLeave"
    >
      <ToastNotify v-for="toast in toasts" :key="toast.id" v-bind="toast" />
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import type { ToastNotify as ToastNotifyType, ToastPosition } from "@stores/toastNotify.ts";

import ToastNotify from "@components/toast/ToastNotify.vue";
import { onMounted, ref, watch } from "vue";

const props = defineProps<{
  position: ToastPosition;
  toasts: ToastNotifyType[];
}>();

const container = ref<HTMLElement | null>(null);
const isOpen = ref(false);

const open = (): void => {
  if (isOpen.value || !container.value) return;
  try {
    container.value.showPopover();
    isOpen.value = true;
  } catch (err) {
    console.error("[ToastPositionGroup] showPopover() failed:", err);
  }
};

// createToastNotify() refuses to queue toasts without popover support, so no guard is needed here.
onMounted(() => {
  if (props.toasts.length > 0) open();
});

watch(
  () => props.toasts.length,
  (newLen, oldLen) => {
    if (oldLen === 0 && newLen > 0) open();
  },
);

const onBeforeLeave = (el: Element): void => {
  const htmlEl = el as HTMLElement;
  const { top, left, width } = htmlEl.getBoundingClientRect();
  const parent = container.value?.getBoundingClientRect() ?? { left: 0, top: 0 };
  htmlEl.style.top = `${top - parent.top}px`;
  htmlEl.style.left = `${left - parent.left}px`;
  htmlEl.style.width = `${width}px`;
};

const onAfterLeave = (): void => {
  if (props.toasts.length === 0 && isOpen.value) {
    try {
      container.value?.hidePopover();
    } catch (err) {
      console.error("[ToastPositionGroup] hidePopover() failed:", err);
    } finally {
      isOpen.value = false;
    }
  }
};

defineExpose({ onAfterLeave });
</script>

<style lang="scss">
@use "@styles/components/toast-container";
</style>
