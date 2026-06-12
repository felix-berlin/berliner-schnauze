<template>
  <div
    :id="`toast-${id}`"
    ref="toast"
    popover="manual"
    class="c-toast-notify"
    :class="`c-toast-notify--${status} c-toast-notify--${position}`"
    :style="{ 'anchor-name': anchorName, 'position-anchor': anchorSource }"
  >
    <Component
      :is="toastIconMap[status]"
      v-if="showStatusIcon"
      class="c-toast-notify__icon"
      aria-hidden="true"
    />

    <Pin
      v-if="timeout === null"
      class="c-toast-notify__persistent-badge"
      :width="14"
      :height="14"
      aria-label="Permanente Benachrichtigung"
    />

    <div class="c-toast-notify__message">
      {{ message }}
    </div>

    <button
      v-if="mustShowClose"
      type="button"
      class="c-toast-notify__close c-button c-button--center-icon"
      aria-label="schließen"
      @click="triggerHide()"
    >
      <Close :width="12" :height="12" />
    </button>
  </div>
</template>

<script setup lang="ts">
import type { ToastNotify } from "@stores/toastNotify.ts";

import { markClosing, removeToast } from "@stores/toastNotify.ts";
import { useSwipe, useTimeoutFn } from "@vueuse/core";
import { computed, defineAsyncComponent, onMounted, ref, watch } from "vue";

// Module-level singletons — defineAsyncComponent per module, not per instance
const Close = defineAsyncComponent(() => import("virtual:icons/lucide/x"));
const Pin = defineAsyncComponent(() => import("virtual:icons/lucide/pin"));
const toastIconMap = {
  error: defineAsyncComponent(() => import("virtual:icons/lucide/x-circle")),
  info: defineAsyncComponent(() => import("virtual:icons/lucide/info")),
  success: defineAsyncComponent(() => import("virtual:icons/lucide/check-circle-2")),
  warning: defineAsyncComponent(() => import("virtual:icons/lucide/alert-circle")),
};

const {
  closeOnSwipe = true,
  id,
  message,
  position = "top-right",
  showClose = true,
  showStatusIcon = true,
  status = "info",
  timeout,
  anchorName,
  anchorSource,
} = defineProps<ToastNotify & { anchorName?: string; anchorSource?: string }>();

// Must match CSS: 0.3s exit transition + 0.1s buffer before store removal
const REMOVE_DELAY = 400;
const DEFAULT_TIMEOUT = 5000;

const mustShowClose = computed(() => timeout === null || showClose !== false);

const toast = ref<HTMLElement | null>(null);
const { isSwiping } = useSwipe(toast);

// Step 2 of dismiss sequence: purge from store after exit animation completes
const { start: startRemove, stop: stopRemove } = useTimeoutFn(
  () => removeToast(id!),
  REMOVE_DELAY,
  { immediate: false },
);

// Auto-dismiss: fires at (timeout - REMOVE_DELAY) so store removal lands at timeout ms
const autoHideDelay = (timeout ?? DEFAULT_TIMEOUT) - REMOVE_DELAY;
const { start: startAutoHide, stop: stopAutoHide } = useTimeoutFn(
  () => {
    toast.value?.hidePopover();
    // markClosing must be synchronous with hidePopover — toasts below this one
    // update their anchor source immediately, before display:none (T+300ms) could
    // invalidate this element as an anchor and cause them to snap off-screen.
    markClosing(id!);
    startRemove();
  },
  autoHideDelay,
  { immediate: false },
);

const triggerHide = (): void => {
  stopAutoHide();
  stopRemove();
  toast.value?.hidePopover();
  markClosing(id!); // synchronous — same reasoning as above
  startRemove();
};

onMounted(() => {
  toast.value?.showPopover();
  if (timeout !== null) startAutoHide();
});

watch(isSwiping, (swiping) => {
  if (swiping && closeOnSwipe) triggerHide();
});
</script>

<style lang="scss">
@use "@styles/components/toast-notify";
</style>
