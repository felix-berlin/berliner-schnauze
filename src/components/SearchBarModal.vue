<template>
  <button
    class="c-searchbar c-button c-button--outline"
    type="button"
    aria-label="Suche aktivieren"
    @click="clickCallback()"
  >
    <SearchIcon class="c-searchbar__search-icon" />
    <span class="c-searchbar__label">Suche</span>
    <kbd class="c-searchbar__slash-icon">/</kbd>
  </button>
</template>

<script setup lang="ts">
import SearchIcon from "virtual:icons/lucide/search";

const { clickCallback } = defineProps({
  clickCallback: {
    type: Function,
    default: () => {},
  },
});
</script>
<style lang="scss">
@use "@styles/components/searchbar.scss";
</style>
