<template>
  <div
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
import { ref, onMounted, watch, nextTick, reactive } from "vue";
import { useSwipe } from "@vueuse/core";
import { removeToastById } from "@stores/index";
import Info from "virtual:icons/lucide/info";
import Error from "virtual:icons/lucide/x-circle";
import Warning from "virtual:icons/lucide/alert-circle";
import Success from "virtual:icons/lucide/check-circle-2";
import Close from "virtual:icons/lucide/x";

type ToastNotifyProps = {
  message: string;
  id: number;
  status?: "info" | "success" | "warning" | "error";
  showStatusIcon?: boolean;
  showClose?: boolean;
  closeOnSwipe?: boolean;
  closeAfterTimeout?: boolean;
  closeTimeout?: number;
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
  outerSpacing?: string;
  gapBetween?: number;
  initOffset?: number;
};

type Position = "bottom" | "left" | "right" | "top";

type StylePositionType = {
  [key in Position]?: string;
};

const {
  message,
  id,
  status = "info",
  showStatusIcon = true,
  position = "top-right",
  outerSpacing = "20px",
  gapBetween = 10,
  initOffset = 100,
  showClose = true,
  closeOnSwipe = true,
} = defineProps<ToastNotifyProps>();

const toast = ref();
const isSupported = ref(false);
const isOpen = ref(false);
const { isSwiping, direction, lengthX } = useSwipe(toast);
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
 * Checks if the browser supports the popover
 *
 * @return  {boolean}
 */
const supportsPopover = (): boolean => {
  return Object.prototype.hasOwnProperty.call(HTMLElement.prototype, "popover");
};

/**
 * Hides the toast
 *
 * @return  {void}
 */
const hideToast = async (): Promise<void> => {
  // toast.value.hidePopover();
  removeToastById(id);
  await nextTick();
  setDynamicPosition();
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

onMounted(async () => {
  isSupported.value = supportsPopover();
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
