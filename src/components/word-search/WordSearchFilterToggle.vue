<template>
  <button
    type="button"
    class="c-word-search-filter-toggle c-button c-button--center-icon"
    @click="$toggleWordListFilterFlyout"
  >
    <Filter />
    <span>Filter</span>
  </button>
</template>

<script setup lang="ts">
import Filter from "virtual:icons/lucide/filter";
import { $toggleWordListFilterFlyout } from "@stores/index";
</script>

<style scoped></style>
