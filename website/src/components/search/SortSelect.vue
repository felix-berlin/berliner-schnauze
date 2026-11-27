<template>
  <label class="c-sort-select">
    <IconSort class="icon" aria-hidden="true" />
    <span class="text" :class="{ 'u-sr-only': compact }">Sortieren</span>
    <select
      aria-label="Sortieren"
      :value="effectiveSort(state)"
      @change="emit('update', { sort: ($event.target as HTMLSelectElement).value as SortKey })"
    >
      <!-- „Beste Treffer“ needs a query: without one it would mean A–Z (effectiveSort). -->
      <option
        v-for="[key, text] in SORTS"
        :key="key"
        :value="key"
        :disabled="key === 'beste' && !state.q"
      >
        {{ text }}
      </option>
    </select>
  </label>
</template>

<script setup lang="ts">
import type { SortKey } from "@lib/search/types";

import { SORTS } from "@lib/search/labels";
import { effectiveSort, type SearchState } from "@lib/search/state";
import { defineAsyncComponent } from "vue";

defineProps<{
  state: SearchState;
  /** Hide the „Sortieren“ text visually (a crowded bar). */ compact?: boolean;
}>();
const emit = defineEmits<{ update: [patch: Partial<SearchState>] }>();

const IconSort = defineAsyncComponent(() => import("virtual:icons/lucide/arrow-up-down"));
</script>

<style lang="scss">
@use "@styles/components/sort-select";
</style>
