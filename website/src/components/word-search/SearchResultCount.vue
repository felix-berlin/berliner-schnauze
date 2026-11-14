<template>
  <!-- Always rendered: a live region must exist before its text changes, or nothing is announced. -->
  <p class="c-word-search-list__result-count" aria-live="polite" aria-atomic="true">
    <template v-if="searchState === 'ready'">
      {{ searchResultCount }} {{ `Ergebnis${searchResultCount !== 1 ? "se" : ""}` }}
    </template>
  </p>
</template>

<script setup lang="ts">
import { useStore } from "@nanostores/vue";
import { $searchResultCount, $searchState } from "@stores/wordList.ts";

const searchResultCount = useStore($searchResultCount);
const searchState = useStore($searchState);
</script>
