<template>
  <button
    type="button"
    class="c-word-search-filter-toggle c-button"
    data-variant="center-icon"
    aria-label="Filter öffnen"
    :aria-expanded="showWordListFilterFlyout"
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
import {
  $activeFilterCount,
  $showWordListFilterFlyout,
  $toggleWordListFilterFlyout,
} from "@stores/wordList.ts";
import Filter from "virtual:icons/lucide/filter";

const activeFilterCount = useStore($activeFilterCount);
const showWordListFilterFlyout = useStore($showWordListFilterFlyout);
</script>

<style lang="scss">
@use "@styles/components/word-search-filter-toggle";
</style>
