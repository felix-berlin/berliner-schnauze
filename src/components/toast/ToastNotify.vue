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
    <Component :is="toastIconMap[status]" v-if="showStatusIcon" class="c-toast-notify__icon" />

    <div class="c-toast-notify__message">{{ message }}</div>

    <button
      v-if="showClose"
      type="button"
      class="c-toast-notify__close c-button c-button--center-icon"
      @click="hideToast()"
    >
      <Close :width="12" :height="12" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeMount, watch, nextTick, reactive } from "vue";
import { useSwipe } from "@vueuse/core";
import { removeToastById, supportsPopover } from "@stores/index";
import Info from "virtual:icons/lucide/info";
import Error from "virtual:icons/lucide/x-circle";
import Warning from "virtual:icons/lucide/alert-circle";
import Success from "virtual:icons/lucide/check-circle-2";
import Close from "virtual:icons/lucide/x";
import type { ToastNotify } from "@stores/index";

type Position = "bottom" | "left" | "right" | "top";

type StylePositionType = {
  [key in Position]?: string;
};

const {
  message,
  id = crypto.randomUUID(),
  status = "info",
  showStatusIcon = true,
  position = "top-right",
  outerSpacing = "20px",
  gapBetween = 10,
  initOffset = 100,
  showClose = true,
  closeOnSwipe = true,
} = defineProps<ToastNotify>();

const toast = ref();
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
  error: Error,
  warning: Warning,
  success: Success,
  info: Info,
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
  toast.value.showPopover();
};

/**
 * Gets the props string and converts it to inset styles
 *
 * @return  {void}
 */
const setPosition = () => {
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

watch(isSwiping, () => {
  if (isSwiping.value && closeOnSwipe) {
    hideToast();
  }
});
</script>

<style lang="scss">
@use "@styles/components/toast-notify";
</style>
