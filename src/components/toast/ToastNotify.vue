<template>
  <div
    :id="`toast-${id}`"
    ref="toast"
    class="c-toast-notify"
    :class="`c-toast-notify--${status}`"
    :role="ariaRole"
    :aria-live="ariaLive"
    aria-atomic="true"
    @mouseenter="pauseTimer"
    @mouseleave="resumeTimer"
    @focusin="pauseTimer"
    @focusout="resumeTimer"
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
      aria-label="Benachrichtigung schließen"
      @click="dismiss()"
    >
      <Close :width="12" :height="12" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { removeToastById } from "@stores/toastNotify";
import { useSwipe, useTimeoutFn } from "@vueuse/core";
import { computed, defineAsyncComponent, onMounted, ref, watch } from "vue";

// Relative import (not the usual `@stores/*` alias) is required here: under
// TypeScript 7, @vue/compiler-sfc's cross-file type resolution for
// `defineProps<T>()` falls back to `ts.findConfigFile`/tsconfig path-alias
// resolution for non-relative specifiers, and that classic API no longer
// exists in TS7. Relative specifiers skip that path entirely. Revert once
// @vue/compiler-sfc supports TS7's native compiler.
import type { ToastNotify } from "../../stores/toastNotify.ts";

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
  timeout,
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
  if (!id) {
    console.error(
      "[ToastNotify] dismiss() called on a toast with no id — store invariant violated",
    );
    return;
  }
  removeToastById(id);
};

let remaining = typeof timeout === "number" ? timeout : 5000;
let timerStart = 0;

const { start: startTimeout, stop: stopTimeout } = useTimeoutFn(dismiss, () => remaining, {
  immediate: false,
});

const pauseTimer = (): void => {
  if (timerStart === 0) return;
  stopTimeout();
  remaining = Math.max(0, remaining - (Date.now() - timerStart));
  timerStart = 0;
};

const resumeTimer = (): void => {
  if (timeout === null || remaining <= 0) return;
  timerStart = Date.now();
  startTimeout();
};

onMounted(() => {
  if (timeout !== null) resumeTimer();
});

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
