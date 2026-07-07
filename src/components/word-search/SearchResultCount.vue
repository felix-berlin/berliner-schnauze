<template>
  <p v-if="searchState === 'ready'" class="c-word-search-list__result-count">
    {{ searchResultCount }} {{ `Ergebnis${searchResultCount !== 1 ? "se" : ""}` }}
  </p>
</template>

<script setup lang="ts">
import { useStore } from "@nanostores/vue";
import { $searchResultCount, $searchState } from "@stores/wordList.ts";

const searchResultCount = useStore($searchResultCount);
const searchState = useStore($searchState);
</script>

<style scoped></style>
