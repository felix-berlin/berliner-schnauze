<template>
  <div v-if="searchResultCount === 0" class="c-word-search-list__no-result">
    <SearchXIcon width="50" height="50" />
    <p>Da biste anjemeiat. Keen Treffer.</p>
  </div>
</template>

<script setup lang="ts">
import { useStore } from "@nanostores/vue";
import { $searchResultCount } from "@stores/index";
import SearchXIcon from "virtual:icons/lucide/search-x";

const searchResultCount = useStore($searchResultCount);
</script>

<style scoped></style>
