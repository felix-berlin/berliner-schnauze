<template>
  <button
    type="button"
    class="c-word-search-filter-toggle c-button c-button--center-icon"
    aria-label="Filter öffnen"
    @click="$toggleWordListFilterFlyout"
  >
    <div class="c-word-search-filter-toggle__icon-wrapper">
      <Filter class="c-word-search-filter-toggle__icon" aria-hidden="true" />
      <span v-if="activeFilterCount > 0" class="c-word-search-filter-toggle__counter">
        {{ activeFilterCount }}
      </span>
    </div>
    <span class="c-word-search-filter-toggle__text">Filter </span>
  </button>
</template>

<script setup lang="ts">
import { useStore } from "@nanostores/vue";
import { $activeFilterCount, $toggleWordListFilterFlyout } from "@stores/index.ts";
import Filter from "virtual:icons/lucide/filter";

const activeFilterCount = useStore($activeFilterCount);
</script>

<style lang="scss">
@use "@styles/components/word-search-filter-toggle";
</style>
