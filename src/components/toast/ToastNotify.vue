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
      @click="hideToast()"
    >
      <Close :width="12" :height="12" />
    </button>
  </div>
</template>

<script setup lang="ts">
import type { ToastNotify } from "@stores/toastNotify.ts";

import { removeToastById } from "@stores/toastNotify.ts";
import { useSwipe } from "@vueuse/core";
import { computed, defineAsyncComponent, onMounted, ref, watch } from "vue";

const Close = defineAsyncComponent(() => import("virtual:icons/lucide/x"));
const Pin = defineAsyncComponent(() => import("virtual:icons/lucide/pin"));

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

const mustShowClose = computed(() => timeout === null || showClose !== false);

const toast = ref<HTMLElement | null>(null);
const { isSwiping } = useSwipe(toast);

const toastIconMap = {
  error: defineAsyncComponent(() => import("virtual:icons/lucide/x-circle")),
  info: defineAsyncComponent(() => import("virtual:icons/lucide/info")),
  success: defineAsyncComponent(() => import("virtual:icons/lucide/check-circle-2")),
  warning: defineAsyncComponent(() => import("virtual:icons/lucide/alert-circle")),
};

const hideToast = (): void => {
  removeToastById(id!);
};

onMounted(() => {
  toast.value?.showPopover();
});

watch(isSwiping, () => {
  if (isSwiping.value && closeOnSwipe) {
    hideToast();
  }
});
</script>

<style lang="scss">
@use "@styles/components/toast-notify";
</style>
