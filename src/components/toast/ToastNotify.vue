<template>
  <div
    :id="`toast-${id}`"
    ref="toast"
    popover="manual"
    class="c-toast-notify"
    :class="[`c-toast-notify--${status}`, `c-toast-notify--${position}`, { 'is-entering': isEntering, 'is-exiting': isExiting }]"
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
  stackIndex = 0,
} = defineProps<
  ToastNotify & { anchorName?: string; anchorSource?: string; stackIndex?: number }
>();

// Duration of the .is-exiting CSS animation — must match transition in SCSS.
const ANIMATION_DURATION = 300;
// Buffer after hidePopover() before purging from store (allows display:none to settle).
const REMOVE_DELAY = 400;
const DEFAULT_TIMEOUT = 5000;

// Staggered auto-dismiss: when several toasts are created in a burst their timers
// would otherwise fire in the same frame and all slide out together. Offsetting
// each toast's auto-hide by its stack position makes a stack leave one after
// another (oldest first). Capped so deep stacks don't linger too long. Manual
// close (swipe / click) is never staggered — stays instant.
const EXIT_STAGGER_STEP = 180;
const MAX_STAGGER_STEPS = 9;
const exitStagger = Math.min(stackIndex, MAX_STAGGER_STEPS) * EXIT_STAGGER_STEP;

const mustShowClose = computed(() => timeout === null || showClose !== false);

const toast = ref<HTMLElement | null>(null);
// isEntering: true on mount so the toast starts hidden (.is-entering class).
// Removed after a double rAF (see onMounted) — browser paints the hidden state
// once, then the class removal triggers the CSS entry transition cleanly
// (no @starting-style flash).
const isEntering = ref(true);
const isExiting = ref(false);
const { isSwiping } = useSwipe(toast);

// Step 3: purge from store after hidePopover() + display:none settle
const { start: startRemove, stop: stopRemove } = useTimeoutFn(
  () => removeToast(id!),
  REMOVE_DELAY,
  { immediate: false },
);

// Step 2: called after the .is-exiting animation finishes — toast is already
// invisible, so markClosing + hidePopover + restack are all imperceptible.
const { start: startExitComplete, stop: stopExitComplete } = useTimeoutFn(
  () => {
    // markClosing must be synchronous with hidePopover — toasts below this one
    // update their anchor source immediately so they don't snap when the anchor
    // becomes invalid at display:none time.
    markClosing(id!);
    toast.value?.hidePopover();
    startRemove();
  },
  ANIMATION_DURATION,
  { immediate: false },
);

// Step 1: begin the visible exit — add class (fires CSS transition), then schedule step 2.
const startExitAnimation = (): void => {
  isExiting.value = true;
  startExitComplete();
};

// Auto-dismiss: start exit animation early enough that store removal still lands
// at ~timeout ms. exitStagger cascades bursted toasts one after another.
// Clamped: a timeout below the exit pipeline (700ms) would yield a negative delay.
const autoHideDelay = Math.max(
  0,
  (timeout ?? DEFAULT_TIMEOUT) - ANIMATION_DURATION - REMOVE_DELAY + exitStagger,
);
const { start: startAutoHide, stop: stopAutoHide } = useTimeoutFn(
  () => startExitAnimation(),
  autoHideDelay,
  { immediate: false },
);

const triggerHide = (): void => {
  stopAutoHide();
  stopExitComplete();
  stopRemove();
  startExitAnimation();
};

onMounted(() => {
  toast.value?.showPopover();
  // Two rAFs required. A single rAF fires *before* the browser paints the current
  // frame, so the "opacity:0 / is-entering" state is never painted and the
  // transition has no clean starting point — produces a one-frame flash, especially
  // visible for tall toasts on mobile. The nested rAF guarantees:
  //   Frame N  : rAF₁ fires → schedules rAF₂; browser paints opacity:0 ✓
  //   Frame N+1: rAF₂ fires → removes is-entering → transition starts from 0
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      // Guard: component may have unmounted between mount and the second frame —
      // don't start timers on a disposed scope.
      if (!toast.value) return;
      isEntering.value = false;
      if (timeout !== null) startAutoHide();
    });
  });
});

watch(isSwiping, (swiping) => {
  if (swiping && closeOnSwipe) triggerHide();
});
</script>

<style lang="scss">
@use "@styles/components/toast-notify";
</style>
