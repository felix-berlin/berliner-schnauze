<template>
  <div
    v-if="searchState === 'ready' && searchResultCount === 0"
    class="c-word-search-list__no-result"
  >
    <SearchXIcon width="50" height="50" />
    <p>Da biste anjemeiat. Keen Treffer.</p>
  </div>
</template>

<script setup lang="ts">
import { useStore } from "@nanostores/vue";
import { $searchResultCount, $searchState } from "@stores/wordList.ts";
import SearchXIcon from "virtual:icons/lucide/search-x";

const searchResultCount = useStore($searchResultCount);
const searchState = useStore($searchState);
</script>

<style scoped></style>
