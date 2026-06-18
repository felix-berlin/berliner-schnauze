<template>
  <div
    :id="`toast-${id}`"
    ref="toast"
    class="c-toast-notify"
    :class="`c-toast-notify--${status}`"
    :role="ariaRole"
    :aria-live="ariaLive"
    aria-atomic="true"
  >
    <Component
      :is="toastIconMap[status]"
      v-if="showStatusIcon"
      class="c-toast-notify__icon"
      aria-hidden="true"
    />

    <div class="c-toast-notify__body">
      <div class="c-toast-notify__message">
        {{ message }}
      </div>

      <button
        v-if="actionLabel"
        type="button"
        class="c-toast-notify__action c-button"
        @click="handleAction()"
      >
        {{ actionLabel }}
      </button>
    </div>

    <button
      v-if="showClose"
      type="button"
      class="c-toast-notify__close c-button c-button--center-icon"
      aria-label="schließen"
      @click="dismiss()"
    >
      <Close :width="12" :height="12" />
    </button>
  </div>
</template>

<script setup lang="ts">
import type { ToastNotify } from "@stores/toastNotify.ts";

import { removeToastById } from "@stores/toastNotify";
import { useSwipe } from "@vueuse/core";
import { computed, defineAsyncComponent, ref, watch } from "vue";

const Close = defineAsyncComponent(() => import("virtual:icons/lucide/x"));

const {
  actionLabel,
  closeOnSwipe = true,
  id,
  message,
  onAction,
  showClose = true,
  showStatusIcon = true,
  status = "info",
} = defineProps<ToastNotify>();

const toast = ref<HTMLElement | null>(null);
const { isSwiping } = useSwipe(toast);

const ariaRole = computed(() => (status === "error" ? "alert" : "status"));
const ariaLive = computed(() => (status === "error" ? "assertive" : "polite"));

const toastIconMap = {
  error: defineAsyncComponent(() => import("virtual:icons/lucide/x-circle")),
  info: defineAsyncComponent(() => import("virtual:icons/lucide/info")),
  success: defineAsyncComponent(() => import("virtual:icons/lucide/check-circle-2")),
  warning: defineAsyncComponent(() => import("virtual:icons/lucide/alert-circle")),
};

const dismiss = (): void => {
  if (!id) return;
  removeToastById(id);
};

const handleAction = (): void => {
  onAction?.();
  dismiss();
};

watch(isSwiping, () => {
  if (isSwiping.value && closeOnSwipe) {
    dismiss();
  }
});
</script>

<style lang="scss">
@use "@styles/components/toast-notify";
</style>
