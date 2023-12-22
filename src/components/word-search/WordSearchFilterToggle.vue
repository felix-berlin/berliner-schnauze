<template>
  <button
    type="button"
    class="c-word-search-filter-toggle c-button c-button--center-icon"
    @click="$toggleWordListFilterFlyout"
  >
    <Filter class="c-word-search-filter-toggle__icon" />
    <span class="c-word-search-filter-toggle__text">Filter</span>
  </button>
</template>

<script setup lang="ts">
import Filter from "virtual:icons/lucide/filter";
import { $toggleWordListFilterFlyout } from "@stores/index";
</script>

<style lang="scss">
@use "@styles/components/word-search-filter-toggle";
</style>
