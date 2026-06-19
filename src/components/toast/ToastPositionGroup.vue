<template>
  <div
    v-if="isSupported"
    ref="container"
    popover="manual"
    class="c-toast-container"
    :class="`c-toast-container--${position}`"
  >
    <TransitionGroup name="c-toast-notify" @before-leave="onBeforeLeave" @after-leave="onAfterLeave">
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
const isOpen = ref(false);

onBeforeMount(() => {
  isSupported.value = supportsPopover();
});

const open = (): void => {
  if (isOpen.value || !container.value) return;
  try {
    container.value.showPopover();
    isOpen.value = true;
  } catch (err) {
    console.error("[ToastPositionGroup] showPopover() failed:", err);
  }
};

onMounted(() => {
  if (!isSupported.value) return;
  if (props.toasts.length > 0) {
    open();
  }
});

watch(
  () => props.toasts.length,
  (newLen, oldLen) => {
    if (!isSupported.value) return;
    if (oldLen === 0 && newLen > 0) {
      open();
    }
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
