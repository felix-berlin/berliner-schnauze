<template>
  <div
    ref="toast"
    popover="manual"
    class="c-toast-notify is-newest"
    :class="`c-toast-notify--${status} c-toast-notify--${position}`"
    :style="stylePosition"
  >
    <Component :is="toastIconMap[status]" class="toaster__inner-icon" />
    <div>{{ message }}</div>
    <button v-if="showClose" type="button" class="c-toast-notify__close" @click="hideToast()">
      X
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

type ToastNotifyProps = {
  message: string;
  id: number;
  status?: "info" | "success" | "warning" | "error";
  showClose?: boolean;
  closeOnSwipe?: boolean;
  closeAfterTimeout?: boolean;
  closeTimeout?: number;
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
  outerSpacing?: string;
  gapBetween?: number;
};

const {
  message,
  id,
  status = "info",
  position = "top-right",
  outerSpacing = "20px",
  gapBetween = 10,
  showClose = true,
  closeOnSwipe = true,
} = defineProps<ToastNotifyProps>();

const toast = ref();
const isSupported = ref(false);
const isOpen = ref(false);
const { isSwiping, direction, lengthX } = useSwipe(toast);
const stylePosition = reactive({
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
const hideToast = async () => {
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
const showToast = () => {
  isOpen.value = true;
  toast.value.showPopover();
};

const setPosition = () => {
  const positions = position.split("-");

  positions.forEach((pos) => {
    stylePosition[pos] = outerSpacing;
  });
};

const setDynamicPosition = () => {
  const toasts = document.querySelectorAll(".c-toast-notify");
  let offset = 5; // initial offset

  toasts.forEach((toast, index) => {
    if (!toast || !toast.style) {
      console.error("Invalid toast element:", toast);
      return;
    }

    // Set the top position of the toast
    toast.style.top = `${offset}px`;

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
