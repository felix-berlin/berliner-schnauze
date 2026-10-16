<template>
  <ToastPositionGroup
    v-for="position in positions"
    :key="position"
    :position="position"
    :toasts="toastsByPosition(position)"
  />
</template>

<script setup lang="ts">
import type { ToastPosition } from "@stores/toastNotify.ts";

import ToastPositionGroup from "@components/toast/ToastPositionGroup.vue";
import { useStore } from "@nanostores/vue";
import { $toastNotify } from "@stores/toastNotify";

const toastStore = useStore($toastNotify);

const positions: ToastPosition[] = [
  "top-left",
  "top-center",
  "top-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
];

const toastsByPosition = (pos: ToastPosition) =>
  toastStore.value.filter((t) => (t.position ?? "top-right") === pos);
</script>
