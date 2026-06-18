<template>
  <div
    v-if="isSupported"
    ref="container"
    popover="manual"
    class="c-toast-container"
    :class="`c-toast-container--${position}`"
  >
    <TransitionGroup name="c-toast-notify" @after-leave="onAfterLeave">
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
  if (isOpen.value) return;
  container.value?.showPopover();
  isOpen.value = true;
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
    if (oldLen === 0 && newLen > 0) {
      open();
    }
  },
);

const onAfterLeave = (): void => {
  if (props.toasts.length === 0) {
    container.value?.hidePopover();
    isOpen.value = false;
  }
};

defineExpose({ onAfterLeave });
</script>

<style lang="scss">
@use "@styles/components/toast-container";
</style>
