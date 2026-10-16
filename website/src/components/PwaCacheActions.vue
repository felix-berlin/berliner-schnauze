<template>
  <div class="c-pwa-cache__actions">
    <button
      type="button"
      class="c-button c-button--center-icon"
      :disabled="isLoading"
      @click="emit('refresh')"
    >
      <component :is="RefreshCw" width="16" height="16" />
      Aktualisieren
    </button>
    <button
      type="button"
      class="c-button c-button--center-icon"
      :disabled="isLoading || hasNoBuckets"
      @click="emit('clear-all')"
    >
      <component :is="Trash2" width="16" height="16" />
      Alles leeren
    </button>
    <button type="button" class="c-button c-button--center-icon" @click="emit('resync')">
      <component :is="RotateCcw" width="16" height="16" />
      Re-sync
    </button>
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";

const RefreshCw = defineAsyncComponent(() => import("virtual:icons/lucide/refresh-cw"));
const RotateCcw = defineAsyncComponent(() => import("virtual:icons/lucide/rotate-ccw"));
const Trash2 = defineAsyncComponent(() => import("virtual:icons/lucide/trash-2"));

defineProps<{
  isLoading: boolean;
  hasNoBuckets: boolean;
}>();

const emit = defineEmits<{
  refresh: [];
  "clear-all": [];
  resync: [];
}>();
</script>
