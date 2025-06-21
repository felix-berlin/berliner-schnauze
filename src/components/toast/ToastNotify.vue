<template>
  <div
    v-if="isSupported"
    :id="`toast-${id}`"
    ref="toast"
    popover="manual"
    class="c-toast-notify is-newest"
    :class="`c-toast-notify--${status} c-toast-notify--${position}`"
    :style="stylePosition"
  >
    <Component
      :is="toastIconMap[status]"
      v-if="showStatusIcon"
      class="c-toast-notify__icon"
      aria-hidden="true"
    />

    <div class="c-toast-notify__message">
      {{ message }}
    </div>

    <button
      v-if="showClose"
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
import type { ToastNotify } from "@stores/index.ts";

import { removeToastById, supportsPopover } from "@stores/index.ts";
import { useSwipe } from "@vueuse/core";
import {
  defineAsyncComponent,
  nextTick,
  onBeforeMount,
  onMounted,
  reactive,
  ref,
  watch,
} from "vue";

const Close = defineAsyncComponent(() => import("virtual:icons/lucide/x"));

type Position = "bottom" | "left" | "right" | "top";

type StylePositionType = {
  [key in Position]?: string;
};

const {
  closeOnSwipe = true,
  gapBetween = 10,
  id = crypto.randomUUID(),
  initOffset = 100,
  message,
  outerSpacing = "20px",
  position = "top-right",
  showClose = true,
  showStatusIcon = true,
  status = "info",
} = defineProps<ToastNotify>();

const toast = ref<HTMLElement | null>(null);
const isSupported = ref(false);
const isOpen = ref(false);
const { isSwiping } = useSwipe(toast);
const stylePosition: StylePositionType = reactive({
  bottom: "auto",
  left: "auto",
  right: "auto",
  top: "auto",
});

const toastIconMap = {
  error: defineAsyncComponent(() => import("virtual:icons/lucide/x-circle")),
  info: defineAsyncComponent(() => import("virtual:icons/lucide/info")),
  success: defineAsyncComponent(() => import("virtual:icons/lucide/check-circle-2")),
  warning: defineAsyncComponent(() => import("virtual:icons/lucide/alert-circle")),
};

/**
 * Hides the toast
 *
 * @return  {void}
 */
const hideToast = async (): Promise<void> => {
  await nextTick();
  setDynamicPosition(); // Recalculate the position of the toasts

  removeToastById(id);
};

/**
 * Shows the toast
 *
 * @return  {void}
 */
const showToast = (): void => {
  isOpen.value = true;
  toast.value?.showPopover();
};

/**
 * Gets the props string and converts it to inset styles
 *
 * @return  {void}
 */
const setPosition = (): void => {
  const positions = position.split("-");

  positions.forEach((pos) => {
    stylePosition[pos as keyof StylePositionType] = outerSpacing;
  });
};

/**
 * Sets the dynamic position of the toast
 *
 * @return  {void}
 */
const setDynamicPosition = (): void => {
  const toasts = document.querySelectorAll(".c-toast-notify");
  let offset = initOffset; // initial offset

  toasts.forEach((toast) => {
    const htmlToast = toast as HTMLElement;

    if (!htmlToast || !htmlToast.style) {
      console.error("Invalid toast element:", htmlToast);
      return;
    }

    // Set the top position of the toast
    htmlToast.style.top = `${offset}px`;

    // Calculate the offset for the next toast
    const toastHeight = toast.getBoundingClientRect().height;

    offset += toastHeight + gapBetween; // 10 is the margin between toasts
  });
};

onBeforeMount(() => {
  isSupported.value = supportsPopover();
});

onMounted(async () => {
  if (!isSupported.value) return;

  showToast();

  setPosition();

  await nextTick();
  setDynamicPosition();
});

watch(isSwiping, async () => {
  if (isSwiping.value && closeOnSwipe) {
    await hideToast();
  }
});
</script>

<style lang="scss">
@use "@styles/components/toast-notify";
</style>
