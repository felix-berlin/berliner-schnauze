<template>
  <div
    v-for="corner in CORNERS"
    :key="corner"
    class="c-toast-corner-anchor"
    :data-corner="corner"
    aria-hidden="true"
  />

  <ToastNotify
    v-for="toast in toastStore"
    :key="toast.id"
    v-bind="toast"
    :anchor-name="anchorChain[toast.id!]?.anchorName"
    :anchor-source="anchorChain[toast.id!]?.anchorSource"
  />
</template>

<script setup lang="ts">
import ToastNotify from "@components/toast/ToastNotify.vue";
import { useStore } from "@nanostores/vue";
import { $toastNotify } from "@stores/toastNotify.ts";
import { computed } from "vue";

const toastStore = useStore($toastNotify);

const CORNERS = ["top-right", "top-left", "bottom-right", "bottom-left"] as const;

type Corner = (typeof CORNERS)[number];

const anchorChain = computed(() => {
  const chain: Record<number, { anchorName: string; anchorSource: string }> = {};

  CORNERS.forEach((corner: Corner) => {
    const group = toastStore.value
      .filter((t) => (t.position ?? "top-right") === corner)
      .filter((t) => !t.closing);

    group.forEach((toast, index) => {
      chain[toast.id!] = {
        anchorName: `--toast-${toast.id}`,
        anchorSource: index === 0 ? `--toast-corner-${corner}` : `--toast-${group[index - 1].id}`,
      };
    });
  });

  return chain;
});
</script>
