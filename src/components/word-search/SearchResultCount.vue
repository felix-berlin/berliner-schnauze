<template>
  <p class="c-word-search-list__result-count">
    {{ searchResultCount }} {{ `Ergebnis${searchResultCount > 1 ? "se" : ""}` }}
  </p>
</template>

<script setup lang="ts">
import { useStore } from "@nanostores/vue";
import { $searchResultCount } from "@stores/index";

const searchResultCount = useStore($searchResultCount);
</script>

<style scoped></style>
